/**
 * Sync Orchestration Service
 * Main sync logic for coordinating PostgreSQL to GHL synchronization
 */

import databaseService from './database.js';
import ghlService from './ghl.js';
import mapper from '../utils/mapper.js';
import conflictDetector from '../utils/conflict.js';
import logger from '../utils/logger.js';

export class SyncStatus {
  static PENDING = 'Pending';
  static SYNCING = 'Syncing';
  static SYNCED = 'Synced';
  static FAILED = 'Sync Failed';
  static CONFLICT = 'Conflict';
  static SKIPPED = 'Skipped';
}

export class SyncType {
  static CREATE = 'Create';
  static UPDATE = 'Update';
  static SKIP = 'Skip';
  static ROLLBACK = 'Rollback';
}

export class ConflictResolution {
  static MANUAL = 'manual';
  static AUTO = 'auto';
  static IGNORE = 'ignore';
}

class SyncOrchestration {
  constructor() {
    this.dryRun = false;
    this.clientId = null;
    this.journeyId = null;
    this.syncHistory = [];
    this.batchSize = parseInt(process.env.SYNC_BATCH_SIZE) || 10;
    this.stats = {
      synced: 0,
      conflicts: 0,
      failed: 0,
      created: 0,
      updated: 0,
      skipped: 0,
      startTime: null,
      endTime: null
    };
  }

  /**
   * Initialize sync with all services
   */
  async initialize(options = {}) {
    this.dryRun = options.dryRun || process.env.SYNC_DRY_RUN === 'true';
    this.clientId = options.client || null;
    this.journeyId = options.journey || null;

    logger.info('Initializing sync engine', { 
      dryRun: this.dryRun, 
      clientId: this.clientId,
      journeyId: this.journeyId
    });

    // Connect to services
    const dbConnected = await databaseService.connect();
    const ghlConnected = await ghlService.connect();

    if (!dbConnected || !ghlConnected) {
      throw new Error('Failed to connect to required services');
    }

    return { dbConnected, ghlConnected };
  }

  /**
   * Execute full sync
   */
  async execute() {
    const startTime = Date.now();
    this.stats.startTime = startTime;

    logger.info('Starting sync execution');

    try {
      // Fetch published journeys from PostgreSQL
      const journeys = await this.fetchJourneys();
      
      if (journeys.length === 0) {
        logger.warn('No published journeys found to sync');
        return this.finishSync(startTime);
      }

      logger.info(`Found ${journeys.length} journeys to sync`);

      // Process in batches
      const results = await this.processBatch(journeys);

      // Generate summary
      this.stats.endTime = Date.now();
      this.stats.duration = this.stats.endTime - startTime;

      logger.summary({
        synced: this.stats.synced,
        conflicts: this.stats.conflicts,
        failed: this.stats.failed,
        created: this.stats.created,
        updated: this.stats.updated,
        duration: this.stats.duration
      });

      return {
        success: true,
        stats: this.stats,
        conflicts: conflictDetector.generateReport(),
        history: this.syncHistory
      };

    } catch (error) {
      logger.error('Sync execution failed', { error: error.message });
      this.stats.endTime = Date.now();
      this.stats.duration = this.stats.endTime - startTime;
      
      return {
        success: false,
        error: error.message,
        stats: this.stats
      };
    }
  }

  /**
   * Fetch journeys from PostgreSQL
   */
  async fetchJourneys() {
    if (this.journeyId) {
      const journey = await databaseService.getJourneyById(this.journeyId);
      if (journey && journey.status === 'Published') {
        return [journey];
      }
      return [];
    }

    return await databaseService.getPublishedJourneys(this.clientId);
  }

  /**
   * Process a batch of journeys
   */
  async processBatch(journeys) {
    const results = [];

    for (let i = 0; i < journeys.length; i++) {
      const journey = journeys[i];
      
      logger.progressBar(i + 1, journeys.length);
      logger.info(`Processing journey: ${journey.name}`, { 
        journeyId: journey.id,
        progress: `${i + 1}/${journeys.length}` 
      });

      try {
        const result = await this.syncJourney(journey);
        results.push(result);
      } catch (error) {
        logger.error(`Failed to sync journey: ${journey.name}`, { 
          error: error.message,
          journeyId: journey.id 
        });
        this.stats.failed++;
        results.push({
          journeyId: journey.id,
          success: false,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * Sync single journey
   */
  async syncJourney(journey) {
    const syncStartTime = Date.now();

    // Update status to syncing
    await this.updateSyncStatus(journey.id, SyncStatus.SYNCING);

    // Get existing GHL workflow if any
    const existingWorkflow = journey.ghlWorkflowId 
      ? await ghlService.getWorkflowById(journey.ghlWorkflowId)
      : null;

    // Detect conflicts
    const conflicts = conflictDetector.detectConflicts(journey, existingWorkflow);
    
    if (conflicts.length > 0) {
      for (const conflict of conflicts) {
        conflictDetector.registerConflict(journey.id, conflict);
      }
      this.stats.conflicts += conflicts.length;
    }

    // Check if we should skip due to unresolved conflicts
    if (this.hasUnresolvedConflicts(conflicts)) {
      await this.updateSyncStatus(journey.id, SyncStatus.CONFLICT);
      await this.createSyncHistory(journey, SyncType.SKIP, null, 'Unresolved conflicts', syncStartTime);
      this.stats.skipped++;
      return { journeyId: journey.id, success: false, reason: 'conflicts' };
    }

    // Dry run - just report what would happen
    if (this.dryRun) {
      logger.info(`[DRY RUN] Would sync journey: ${journey.name}`, {
        journeyId: journey.id,
        action: existingWorkflow ? 'UPDATE' : 'CREATE',
        conflicts: conflicts.length
      });
      
      await this.updateSyncStatus(journey.id, SyncStatus.SYNCED);
      await this.createSyncHistory(journey, SyncType.SKIP, null, 'Dry run - no changes made', syncStartTime);
      this.stats.synced++;
      return { journeyId: journey.id, success: true, dryRun: true };
    }

    // Perform sync
    let result;
    if (existingWorkflow) {
      result = await this.updateJourney(journey, existingWorkflow);
    } else {
      result = await this.createJourney(journey);
    }

    const duration = Date.now() - syncStartTime;

    if (result.success) {
      await this.updateSyncStatus(journey.id, SyncStatus.SYNCED, {
        'GHL Workflow ID': result.ghlWorkflowId,
        'Last Sync': new Date().toISOString()
      });
      
      await this.createSyncHistory(journey, result.action, result.ghlWorkflowId, null, duration);
      
      if (result.action === SyncType.CREATE) {
        this.stats.created++;
      } else {
        this.stats.updated++;
      }
      
      this.stats.synced++;
    } else {
      await this.updateSyncStatus(journey.id, SyncStatus.FAILED);
      await this.createSyncHistory(journey, SyncType.SKIP, null, result.error, duration);
      this.stats.failed++;
    }

    return {
      journeyId: journey.id,
      success: result.success,
      action: result.action,
      ghlWorkflowId: result.ghlWorkflowId,
      error: result.error
    };
  }

  /**
   * Create new workflow for journey
   */
  async createJourney(journey) {
    try {
      const workflowData = mapper.journeyToGHLWorkflow(journey);
      const workflow = await ghlService.createWorkflow(workflowData);

      // Store GHL workflow ID in database
      await databaseService.updateJourneyGHLId(journey.id, workflow.id);

      logger.success('Created GHL workflow', {
        journeyId: journey.id,
        workflowId: workflow.id
      });

      return {
        success: true,
        action: SyncType.CREATE,
        ghlWorkflowId: workflow.id
      };
    } catch (error) {
      logger.error('Failed to create GHL workflow', {
        journeyId: journey.id,
        error: error.message
      });
      return { success: false, error: error.message };
    }
  }

  /**
   * Update existing workflow
   */
  async updateJourney(journey, existingWorkflow) {
    try {
      const workflowData = mapper.journeyToGHLWorkflow(journey);
      const workflow = await ghlService.updateWorkflow(journey.ghlWorkflowId, workflowData);

      logger.success('Updated GHL workflow', {
        journeyId: journey.id,
        workflowId: journey.ghlWorkflowId
      });

      return {
        success: true,
        action: SyncType.UPDATE,
        ghlWorkflowId: journey.ghlWorkflowId
      };
    } catch (error) {
      logger.error('Failed to update GHL workflow', {
        journeyId: journey.id,
        workflowId: journey.ghlWorkflowId,
        error: error.message
      });
      return { success: false, error: error.message };
    }
  }

  /**
   * Update journey sync status in PostgreSQL
   */
  async updateSyncStatus(journeyId, status, additionalFields = {}) {
    try {
      await databaseService.updateJourneySyncStatus(journeyId, status, additionalFields);
    } catch (error) {
      logger.error('Failed to update sync status', { journeyId, status, error: error.message });
    }
  }

  /**
   * Create sync history record in PostgreSQL
   */
  async createSyncHistory(journey, syncType, ghlWorkflowId, error, duration) {
    try {
      const historyData = {
        status: error ? 'Failed' : 'Success',
        type: syncType,
        ghlWorkflowId: ghlWorkflowId || '',
        error: error || '',
        duration: duration || 0
      };

      await databaseService.createSyncHistoryRecord(journey.id, historyData);

      this.syncHistory.push({
        journeyId: journey.id,
        journeyName: journey.name,
        ...historyData
      });
    } catch (error) {
      logger.error('Failed to create sync history', { journeyId: journey.id, error: error.message });
    }
  }

  /**
   * Check if conflicts prevent sync
   */
  hasUnresolvedConflicts(conflicts) {
    return conflicts.some(c => 
      c.severity === 'high' && 
      c.resolution === ConflictResolution.MANUAL
    );
  }

  /**
   * Rollback sync for a journey
   */
  async rollback(journeyId, ghlWorkflowId) {
    logger.warn('Initiating rollback', { journeyId, ghlWorkflowId });

    try {
      await ghlService.deleteWorkflow(ghlWorkflowId);
      await this.updateSyncStatus(journeyId, SyncStatus.FAILED);
      
      logger.success('Rollback successful', { journeyId, ghlWorkflowId });
      return { success: true };
    } catch (error) {
      logger.error('Rollback failed', { journeyId, ghlWorkflowId, error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * Get sync history from PostgreSQL
   */
  async getHistory(journeyId = null) {
    if (journeyId) {
      return await databaseService.getVersionHistory(journeyId);
    }
    return this.syncHistory;
  }

  /**
   * Show sync status summary
   */
  getStatus() {
    return {
      dryRun: this.dryRun,
      clientId: this.clientId,
      journeyId: this.journeyId,
      stats: this.stats,
      pendingConflicts: conflictDetector.getAllConflicts()
    };
  }

  /**
   * Finish sync and cleanup
   */
  finishSync(startTime) {
    this.stats.endTime = Date.now();
    this.stats.duration = this.stats.endTime - startTime;
    
    return {
      success: true,
      stats: this.stats,
      history: this.syncHistory
    };
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    await databaseService.disconnect();
  }
}

export const syncOrchestration = new SyncOrchestration();
export default syncOrchestration;
