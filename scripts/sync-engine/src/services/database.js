/**
 * PostgreSQL Database Service for Sync Engine
 * Replaces Airtable as the primary data source
 */

import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger.js';

class DatabaseService {
  constructor() {
    this.prisma = new PrismaClient();
    this.isConnected = false;
  }

  /**
   * Connect to PostgreSQL database
   */
  async connect() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      this.isConnected = true;
      logger.success('Connected to PostgreSQL database');
      return true;
    } catch (error) {
      logger.error('Failed to connect to PostgreSQL', { error: error.message });
      return false;
    }
  }

  /**
   * Disconnect from database
   */
  async disconnect() {
    await this.prisma.$disconnect();
    this.isConnected = false;
    logger.info('Disconnected from PostgreSQL');
  }

  /**
   * Get published journeys
   */
  async getPublishedJourneys(clientId = null) {
    try {
      const where = { status: 'published' };
      if (clientId) where.clientId = clientId;

      const journeys = await this.prisma.journey.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        include: {
          client: true,
          pipeline: true,
          touchpoints: {
            orderBy: { orderIndex: 'asc' }
          }
        }
      });

      logger.info(`Found ${journeys.length} published journeys`, { clientId });
      return journeys.map(j => this.transformJourney(j));
    } catch (error) {
      logger.error('Failed to fetch published journeys', { error: error.message });
      throw error;
    }
  }

  /**
   * Get journey by ID with touchpoints
   */
  async getJourneyById(journeyId) {
    try {
      const journey = await this.prisma.journey.findUnique({
        where: { id: journeyId },
        include: {
          client: true,
          pipeline: true,
          touchpoints: {
            orderBy: { orderIndex: 'asc' }
          }
        }
      });

      if (!journey) return null;
      return this.transformJourney(journey);
    } catch (error) {
      logger.error('Failed to fetch journey', { journeyId, error: error.message });
      throw error;
    }
  }

  /**
   * Get touchpoints for a journey
   */
  async getTouchpointsForJourney(journeyId) {
    try {
      const touchpoints = await this.prisma.touchpoint.findMany({
        where: { journeyId },
        orderBy: { orderIndex: 'asc' }
      });

      return touchpoints.map(tp => this.transformTouchpoint(tp));
    } catch (error) {
      logger.error('Failed to fetch touchpoints', { journeyId, error: error.message });
      throw error;
    }
  }

  /**
   * Update journey sync status
   */
  async updateJourneySyncStatus(journeyId, status, additionalFields = {}) {
    try {
      const updateData = {
        status: this.mapSyncStatusToJourneyStatus(status),
        updatedAt: new Date()
      };

      if (additionalFields['GHL Workflow ID']) {
        updateData.metadata = {
          ...updateData.metadata,
          ghlWorkflowId: additionalFields['GHL Workflow ID']
        };
      }

      await this.prisma.journey.update({
        where: { id: journeyId },
        data: updateData
      });

      logger.info('Updated journey sync status', { journeyId, status });
      return true;
    } catch (error) {
      logger.error('Failed to update sync status', { journeyId, status, error: error.message });
      throw error;
    }
  }

  /**
   * Update journey GHL workflow ID
   */
  async updateJourneyGHLId(journeyId, ghlWorkflowId) {
    try {
      await this.prisma.journey.update({
        where: { id: journeyId },
        data: {
          metadata: {
            ghlWorkflowId
          },
          updatedAt: new Date()
        }
      });

      logger.info('Updated journey GHL ID', { journeyId, ghlWorkflowId });
      return true;
    } catch (error) {
      logger.error('Failed to update journey GHL ID', { journeyId, error: error.message });
      throw error;
    }
  }

  /**
   * Create sync history record
   */
  async createSyncHistoryRecord(journeyId, syncData) {
    try {
      const journey = await this.prisma.journey.findUnique({
        where: { id: journeyId },
        select: { clientId: true }
      });

      const record = await this.prisma.syncHistory.create({
        data: {
          clientId: journey?.clientId,
          operation: syncData.type || 'sync',
          status: syncData.status === 'Success' ? 'success' : 'failed',
          itemsSynced: 1,
          errors: syncData.error || null,
          metadata: {
            journeyId,
            ghlWorkflowId: syncData.ghlWorkflowId,
            duration: syncData.duration
          }
        }
      });

      logger.info('Created sync history record', { journeyId, syncId: record.id });
      return record;
    } catch (error) {
      logger.error('Failed to create sync history record', { error: error.message });
      throw error;
    }
  }

  /**
   * Get sync history for a journey
   */
  async getVersionHistory(journeyId) {
    try {
      const history = await this.prisma.syncHistory.findMany({
        where: {
          metadata: {
            path: ['journeyId'],
            equals: journeyId
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 20
      });

      return history.map(h => this.transformSyncHistory(h));
    } catch (error) {
      logger.error('Failed to fetch version history', { journeyId, error: error.message });
      throw error;
    }
  }

  /**
   * Get client by slug
   */
  async getClientBySlug(slug) {
    try {
      return await this.prisma.client.findUnique({
        where: { slug }
      });
    } catch (error) {
      logger.error('Failed to fetch client', { slug, error: error.message });
      throw error;
    }
  }

  /**
   * Get all clients
   */
  async getClients() {
    try {
      return await this.prisma.client.findMany({
        where: { status: 'active' },
        orderBy: { name: 'asc' }
      });
    } catch (error) {
      logger.error('Failed to fetch clients', { error: error.message });
      throw error;
    }
  }

  /**
   * Transform database journey to sync format
   */
  transformJourney(journey) {
    return {
      id: journey.id,
      name: journey.name,
      description: journey.description || '',
      status: this.mapJourneyStatus(journey.status),
      client: journey.client?.name || '',
      clientId: journey.clientId,
      version: journey.version,
      lastModified: journey.updatedAt,
      ghlWorkflowId: journey.metadata?.ghlWorkflowId || null,
      syncStatus: journey.status,
      lastSync: journey.updatedAt,
      touchpoints: journey.touchpoints?.map(tp => this.transformTouchpoint(tp)) || [],
      tags: journey.metadata?.tags || [],
      category: journey.category || '',
      pipelineId: journey.pipelineId,
      pipeline: journey.pipeline
    };
  }

  /**
   * Transform database touchpoint to sync format
   */
  transformTouchpoint(tp) {
    return {
      id: tp.id,
      journeyId: tp.journeyId,
      name: tp.name,
      type: tp.type.charAt(0).toUpperCase() + tp.type.slice(1), // Capitalize
      order: tp.orderIndex,
      config: {
        delay: tp.config?.delay || 0,
        delayUnit: tp.config?.delayUnit || 'hours',
        content: tp.content,
        templateId: tp.ghlTemplateId || '',
        condition: tp.config?.condition || '',
        assignee: tp.config?.assignee || '',
        dueIn: tp.config?.dueIn || 24
      },
      nextTouchpointId: tp.nextTouchpointId
    };
  }

  /**
   * Transform sync history to legacy format
   */
  transformSyncHistory(history) {
    return {
      id: history.id,
      journeyId: history.metadata?.journeyId,
      status: history.status === 'success' ? 'Success' : 'Failed',
      syncType: history.operation,
      ghlWorkflowId: history.metadata?.ghlWorkflowId,
      errorDetails: history.errors || '',
      duration: history.metadata?.duration || 0,
      created: history.createdAt
    };
  }

  /**
   * Map internal status to sync status
   */
  mapJourneyStatus(status) {
    const map = {
      'draft': 'Draft',
      'client_review': 'In Review',
      'approved': 'Approved',
      'published': 'Published',
      'rejected': 'Rejected',
      'archived': 'Archived'
    };
    return map[status] || status;
  }

  /**
   * Map sync status to journey status
   */
  mapSyncStatusToJourneyStatus(syncStatus) {
    const map = {
      'Pending': 'draft',
      'Syncing': 'published',
      'Synced': 'published',
      'Sync Failed': 'draft',
      'Conflict': 'client_review',
      'Skipped': 'draft'
    };
    return map[syncStatus] || 'draft';
  }

  /**
   * Test database connection
   */
  async testConnection() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { success: true, message: 'Database connection successful' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
}

export const databaseService = new DatabaseService();
export default databaseService;