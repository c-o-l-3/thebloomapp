/**
 * Conflict Detection Utility
 * Detects and handles conflicts between Bloom (PostgreSQL) and GHL versions
 */

import logger from './logger.js';
import { v4 as uuidv4 } from 'uuid';

export const ConflictType = {
  EXTERNAL_MODIFICATION: 'external_modification',
  VERSION_MISMATCH: 'version_mismatch',
  CONCURRENT_EDIT: 'concurrent_edit',
  MISSING_IN_GHL: 'missing_in_ghl',
  MISSING_IN_DB: 'missing_in_db'
};

export const ConflictResolution = {
  SKIP: 'skip',
  OVERWRITE: 'overwrite',
  MERGE: 'merge',
  MANUAL: 'manual'
};

export class ConflictDetector {
  constructor() {
    this.conflicts = new Map();
  }

  /**
   * Detect conflicts between Airtable journey and GHL workflow
   */
  detectConflicts(journey, ghlWorkflow) {
    const conflicts = [];

    // Check if GHL workflow exists
    if (!ghlWorkflow) {
      const conflict = {
        id: uuidv4(),
        type: ConflictType.MISSING_IN_GHL,
        journeyId: journey.id,
        journeyName: journey.name,
        message: 'Journey exists in Airtable but not in GHL',
        severity: 'warning',
        resolution: ConflictResolution.CREATE
      };
      conflicts.push(conflict);
      logger.info('Conflict detected: Journey missing in GHL', { 
        journeyId: journey.id 
      });
      return conflicts;
    }

    // Check for external modifications
    const externalModification = this.checkExternalModification(journey, ghlWorkflow);
    if (externalModification) {
      conflicts.push(externalModification);
    }

    // Check version mismatch
    const versionConflict = this.checkVersionMismatch(journey, ghlWorkflow);
    if (versionConflict) {
      conflicts.push(versionConflict);
    }

    // Check content differences
    const contentConflict = this.checkContentDifferences(journey, ghlWorkflow);
    if (contentConflict) {
      conflicts.push(contentConflict);
    }

    if (conflicts.length > 0) {
      logger.warn('Conflicts detected', { 
        journeyId: journey.id, 
        conflictCount: conflicts.length 
      });
    }

    return conflicts;
  }

  /**
   * Check if GHL workflow was modified outside the system
   */
  checkExternalModification(journey, ghlWorkflow) {
    const airtableModified = journey.lastModified 
      ? new Date(journey.lastModified).getTime() 
      : 0;
    
    const ghlModified = ghlWorkflow.updatedAt 
      ? new Date(ghlWorkflow.updatedAt).getTime() 
      : 0;

    // If GHL was modified after our last sync, it might be externally modified
    const lastSync = journey.lastSync 
      ? new Date(journey.lastSync).getTime() 
      : 0;

    // If GHL modified is more recent than last sync AND after Airtable modified
    if (ghlModified > lastSync && ghlModified > airtableModified) {
      const conflict = {
        id: uuidv4(),
        type: ConflictType.EXTERNAL_MODIFICATION,
        journeyId: journey.id,
        journeyName: journey.name,
        ghlWorkflowId: ghlWorkflow.id,
        message: 'GHL workflow was modified outside the system',
        severity: 'high',
        resolution: ConflictResolution.MANUAL,
        details: {
          airtableModified: journey.lastModified,
          ghlModified: ghlWorkflow.updatedAt,
          lastSync: journey.lastSync
        }
      };

      logger.warn('External modification detected', {
        journeyId: journey.id,
        ghlModified: ghlWorkflow.updatedAt,
        airtableModified: journey.lastModified
      });

      return conflict;
    }

    return null;
  }

  /**
   * Check version mismatch between Airtable and GHL
   */
  checkVersionMismatch(journey, ghlWorkflow) {
    const airtableVersion = journey.version || 1;
    const ghlVersion = ghlWorkflow.settings?.journeyVersion || 1;

    if (ghlVersion > airtableVersion) {
      const conflict = {
        id: uuidv4(),
        type: ConflictType.VERSION_MISMATCH,
        journeyId: journey.id,
        journeyName: journey.name,
        ghlWorkflowId: ghlWorkflow.id,
        message: 'GHL workflow version is ahead of Airtable version',
        severity: 'medium',
        resolution: ConflictResolution.MERGE,
        details: {
          airtableVersion,
          ghlVersion
        }
      };

      logger.warn('Version mismatch detected', {
        journeyId: journey.id,
        airtableVersion,
        ghlVersion
      });

      return conflict;
    }

    return null;
  }

  /**
   * Check for content differences between touchpoints and workflow steps
   */
  checkContentDifferences(journey, ghlWorkflow) {
    const airtableSteps = journey.touchpoints?.length || 0;
    const ghlSteps = ghlWorkflow.steps?.length || 0;

    if (airtableSteps !== ghlSteps) {
      const conflict = {
        id: uuidv4(),
        type: ConflictType.CONCURRENT_EDIT,
        journeyId: journey.id,
        journeyName: journey.name,
        ghlWorkflowId: ghlWorkflow.id,
        message: `Step count mismatch: Airtable has ${airtableSteps} steps, GHL has ${ghlSteps} steps`,
        severity: 'low',
        resolution: ConflictResolution.OVERWRITE,
        details: {
          airtableSteps,
          ghlSteps
        }
      };

      logger.info('Step count difference detected', {
        journeyId: journey.id,
        airtableSteps,
        ghlSteps
      });

      return conflict;
    }

    return null;
  }

  /**
   * Register a conflict for tracking
   */
  registerConflict(journeyId, conflict) {
    if (!this.conflicts.has(journeyId)) {
      this.conflicts.set(journeyId, []);
    }
    this.conflicts.get(journeyId).push(conflict);
    return conflict;
  }

  /**
   * Get all conflicts for a journey
   */
  getConflicts(journeyId) {
    return this.conflicts.get(journeyId) || [];
  }

  /**
   * Get all conflicts
   */
  getAllConflicts() {
    const allConflicts = [];
    for (const [journeyId, conflicts] of this.conflicts) {
      for (const conflict of conflicts) {
        allConflicts.push({ journeyId, ...conflict });
      }
    }
    return allConflicts;
  }

  /**
   * Resolve a conflict
   */
  resolveConflict(conflictId, resolution) {
    for (const [journeyId, conflicts] of this.conflicts) {
      const conflictIndex = conflicts.findIndex(c => c.id === conflictId);
      if (conflictIndex !== -1) {
        conflicts[conflictIndex].resolution = resolution;
        conflicts[conflictIndex].resolvedAt = new Date().toISOString();
        
        logger.info('Conflict resolved', { 
          conflictId, 
          journeyId, 
          resolution 
        });

        return conflicts[conflictIndex];
      }
    }
    return null;
  }

  /**
   * Clear all conflicts
   */
  clearConflicts() {
    this.conflicts.clear();
  }

  /**
   * Check if journey has unresolved conflicts
   */
  hasUnresolvedConflicts(journeyId) {
    const conflicts = this.getConflicts(journeyId);
    return conflicts.some(c => c.resolution === ConflictResolution.MANUAL);
  }

  /**
   * Generate conflict report
   */
  generateReport() {
    const conflicts = this.getAllConflicts();
    const report = {
      totalConflicts: conflicts.length,
      byType: {},
      bySeverity: {},
      resolved: 0,
      unresolved: 0,
      conflicts: conflicts
    };

    for (const conflict of conflicts) {
      // Count by type
      report.byType[conflict.type] = (report.byType[conflict.type] || 0) + 1;
      
      // Count by severity
      report.bySeverity[conflict.severity] = (report.bySeverity[conflict.severity] || 0) + 1;

      // Count resolved/unresolved
      if (conflict.resolvedAt) {
        report.resolved++;
      } else {
        report.unresolved++;
      }
    }

    return report;
  }
}

export const conflictDetector = new ConflictDetector();
export default conflictDetector;
