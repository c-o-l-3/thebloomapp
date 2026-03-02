import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const router = Router();
const prisma = new PrismaClient();

const clientSchema = z.object({
  slug: z.string().min(1).max(100),
  name: z.string().min(1).max(255),
  locationId: z.string().optional(),
  ghlLocationId: z.string().optional(),
  industry: z.string().optional(),
  region: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
  status: z.enum(['active', 'inactive', 'onboarding', 'archived', 'error', 'warning']).default('active'),
  settings: z.record(z.any()).default({}),
  config: z.record(z.any()).default({}),
  healthStatus: z.record(z.any()).optional()
});

const bulkActionSchema = z.object({
  clientIds: z.array(z.string()),
  action: z.enum(['pause_journeys', 'publish_journeys', 'activate', 'deactivate', 'sync']),
  filters: z.object({
    status: z.string().optional(),
    region: z.string().optional(),
    industry: z.string().optional()
  }).optional()
});

// GET /api/clients
router.get('/', async (req, res, next) => {
  try {
    const { status, search } = req.query;
    
    const where = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } }
      ];
    }

    const clients = await prisma.client.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { journeys: true, templates: true }
        }
      }
    });

    res.json(clients);
  } catch (error) {
    next(error);
  }
});

// GET /api/clients/:slug
router.get('/:slug', async (req, res, next) => {
  try {
    const { slug } = req.params;
    
    const client = await prisma.client.findUnique({
      where: { slug },
      include: {
        journeys: {
          orderBy: { updatedAt: 'desc' },
          include: {
            _count: { select: { touchpoints: true } }
          }
        },
        pipelines: true,
        templates: true,
        workflows: true
      }
    });

    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    res.json(client);
  } catch (error) {
    next(error);
  }
});

// POST /api/clients
router.post('/', async (req, res, next) => {
  try {
    const data = clientSchema.parse(req.body);
    
    const client = await prisma.client.create({
      data: {
        ...data,
        slug: data.slug.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
      }
    });

    res.status(201).json(client);
  } catch (error) {
    next(error);
  }
});

// PUT /api/clients/:id
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = clientSchema.partial().parse(req.body);
    
    const client = await prisma.client.update({
      where: { id },
      data
    });

    res.json(client);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/clients/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    await prisma.client.delete({
      where: { id }
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// GET /api/clients/:id/stats
router.get('/:id/stats', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const [
      journeyCount,
      touchpointCount,
      templateCount,
      workflowCount
    ] = await Promise.all([
      prisma.journey.count({ where: { clientId: id } }),
      prisma.touchpoint.count({ where: { journey: { clientId: id } } }),
      prisma.template.count({ where: { clientId: id } }),
      prisma.workflow.count({ where: { clientId: id } })
    ]);

    const journeyStatusCounts = await prisma.journey.groupBy({
      by: ['status'],
      where: { clientId: id },
      _count: { status: true }
    });

    res.json({
      journeys: {
        total: journeyCount,
        byStatus: journeyStatusCounts.reduce((acc, curr) => {
          acc[curr.status] = curr._count.status;
          return acc;
        }, {})
      },
      touchpoints: touchpointCount,
      templates: templateCount,
      workflows: workflowCount
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/clients/health - Get health status for all clients
router.get('/health/all', async (req, res, next) => {
  try {
    const clients = await prisma.client.findMany({
      select: {
        id: true,
        slug: true,
        name: true,
        status: true,
        updatedAt: true,
        _count: {
          select: {
            journeys: true,
            templates: true,
            workflows: true
          }
        }
      }
    });

    // Get recent sync history for each client
    const syncHistory = await prisma.syncHistory.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Group sync history by client
    const syncByClient = syncHistory.reduce((acc, sync) => {
      if (sync.clientId) {
        if (!acc[sync.clientId]) acc[sync.clientId] = [];
        acc[sync.clientId].push(sync);
      }
      return acc;
    }, {});

    // Calculate health status for each client
    const healthData = clients.map(client => {
      const clientSyncs = syncByClient[client.id] || [];
      const recentSyncs = clientSyncs.slice(0, 5);
      
      // Determine health status
      let healthStatus = 'healthy';
      const failedSyncs = recentSyncs.filter(s => s.status === 'error').length;
      
      if (client.status === 'error' || failedSyncs >= 3) {
        healthStatus = 'error';
      } else if (client.status === 'warning' || failedSyncs >= 1) {
        healthStatus = 'warning';
      } else if (client.status === 'inactive') {
        healthStatus = 'inactive';
      }

      const lastSync = clientSyncs[0];
      
      return {
        id: client.id,
        slug: client.slug,
        name: client.name,
        status: client.status,
        healthStatus,
        lastUpdated: client.updatedAt,
        counts: client._count,
        syncStatus: {
          lastSync: lastSync ? {
            status: lastSync.status,
            time: lastSync.createdAt,
            itemsSynced: lastSync.itemsSynced,
            errors: lastSync.errors
          } : null,
          recentFailures: failedSyncs,
          totalRecentSyncs: recentSyncs.length
        }
      };
    });

    // Calculate overall system health
    const totalClients = clients.length;
    const healthyClients = healthData.filter(c => c.healthStatus === 'healthy').length;
    const warningClients = healthData.filter(c => c.healthStatus === 'warning').length;
    const errorClients = healthData.filter(c => c.healthStatus === 'error').length;
    const inactiveClients = healthData.filter(c => c.healthStatus === 'inactive').length;

    res.json({
      summary: {
        total: totalClients,
        healthy: healthyClients,
        warning: warningClients,
        error: errorClients,
        inactive: inactiveClients,
        healthPercentage: totalClients > 0 ? Math.round((healthyClients / totalClients) * 100) : 0
      },
      clients: healthData,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/clients/:id/health - Get detailed health status for a client
router.get('/:id/health', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        _count: {
          select: { journeys: true, templates: true, workflows: true }
        }
      }
    });

    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    // Get recent sync history
    const recentSyncs = await prisma.syncHistory.findMany({
      where: { clientId: id },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    // Get journey statuses
    const journeyStatuses = await prisma.journey.groupBy({
      by: ['status'],
      where: { clientId: id },
      _count: { status: true }
    });

    // Get recent errors from sync history
    const recentErrors = recentSyncs
      .filter(s => s.status === 'error' && s.errors)
      .slice(0, 5);

    // Calculate health score (0-100)
    let healthScore = 100;
    const failedSyncs = recentSyncs.filter(s => s.status === 'error').length;
    if (failedSyncs > 0) healthScore -= Math.min(failedSyncs * 10, 30);
    if (client.status === 'warning') healthScore -= 20;
    if (client.status === 'error') healthScore -= 50;
    if (client.status === 'inactive') healthScore = 0;
    healthScore = Math.max(0, healthScore);

    // Determine overall health status
    let healthStatus = 'healthy';
    if (client.status === 'error' || failedSyncs >= 3) {
      healthStatus = 'error';
    } else if (client.status === 'warning' || failedSyncs >= 1) {
      healthStatus = 'warning';
    } else if (client.status === 'inactive') {
      healthStatus = 'inactive';
    }

    res.json({
      client: {
        id: client.id,
        slug: client.slug,
        name: client.name,
        status: client.status
      },
      health: {
        status: healthStatus,
        score: healthScore,
        lastCheck: new Date().toISOString()
      },
      counts: client._count,
      journeys: journeyStatuses.reduce((acc, curr) => {
        acc[curr.status] = curr._count.status;
        return acc;
      }, {}),
      syncHistory: recentSyncs.map(s => ({
        id: s.id,
        operation: s.operation,
        status: s.status,
        itemsSynced: s.itemsSynced,
        errors: s.errors,
        createdAt: s.createdAt
      })),
      recentErrors: recentErrors.map(e => ({
        time: e.createdAt,
        operation: e.operation,
        error: e.errors
      }))
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/clients/bulk-action - Perform bulk actions on clients
router.post('/bulk-action', async (req, res, next) => {
  try {
    const { clientIds, action, filters } = bulkActionSchema.parse(req.body);
    
    let targetClientIds = clientIds || [];
    
    // If filters provided, find matching clients
    if (filters && Object.keys(filters).some(k => filters[k])) {
      const where = {};
      if (filters.status) where.status = filters.status;
      if (filters.region) where.region = filters.region;
      if (filters.industry) where.industry = filters.industry;
      
      const filteredClients = await prisma.client.findMany({
        where,
        select: { id: true }
      });
      
      targetClientIds = filteredClients.map(c => c.id);
    }

    if (targetClientIds.length === 0) {
      return res.status(400).json({ error: 'No clients selected for bulk action' });
    }

    const results = {
      action,
      totalClients: targetClientIds.length,
      processed: 0,
      failed: 0,
      errors: []
    };

    // Execute bulk action
    switch (action) {
      case 'pause_journeys':
        // Pause all published journeys for selected clients
        for (const clientId of targetClientIds) {
          try {
            await prisma.journey.updateMany({
              where: {
                clientId,
                status: 'published'
              },
              data: { status: 'draft' }
            });
            results.processed++;
          } catch (err) {
            results.failed++;
            results.errors.push({ clientId, error: err.message });
          }
        }
        break;

      case 'publish_journeys':
        // Publish all approved journeys for selected clients
        for (const clientId of targetClientIds) {
          try {
            await prisma.journey.updateMany({
              where: {
                clientId,
                status: 'approved'
              },
              data: {
                status: 'published',
                publishedAt: new Date()
              }
            });
            results.processed++;
          } catch (err) {
            results.failed++;
            results.errors.push({ clientId, error: err.message });
          }
        }
        break;

      case 'activate':
        // Activate selected clients
        try {
          await prisma.client.updateMany({
            where: { id: { in: targetClientIds } },
            data: { status: 'active' }
          });
          results.processed = targetClientIds.length;
        } catch (err) {
          results.failed = targetClientIds.length;
          results.errors.push({ error: err.message });
        }
        break;

      case 'deactivate':
        // Deactivate selected clients
        try {
          await prisma.client.updateMany({
            where: { id: { in: targetClientIds } },
            data: { status: 'inactive' }
          });
          results.processed = targetClientIds.length;
        } catch (err) {
          results.failed = targetClientIds.length;
          results.errors.push({ error: err.message });
        }
        break;

      case 'sync':
        // Trigger sync for selected clients (create sync history records)
        for (const clientId of targetClientIds) {
          try {
            await prisma.syncHistory.create({
              data: {
                clientId,
                operation: 'bulk_sync',
                status: 'pending',
                metadata: { triggeredBy: 'bulk_action' }
              }
            });
            results.processed++;
          } catch (err) {
            results.failed++;
            results.errors.push({ clientId, error: err.message });
          }
        }
        break;

      default:
        return res.status(400).json({ error: 'Unknown bulk action' });
    }

    res.json({
      success: results.failed === 0,
      ...results,
      completedAt: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/journeys/bulk-status - Bulk update journey statuses
router.post('/journeys/bulk-status', async (req, res, next) => {
  try {
    const { journeyIds, status } = z.object({
      journeyIds: z.array(z.string()),
      status: z.enum(['draft', 'client_review', 'approved', 'published', 'rejected', 'archived'])
    }).parse(req.body);

    const updateData = { status };
    if (status === 'published') {
      updateData.publishedAt = new Date();
    }
    if (status === 'approved') {
      updateData.approvedAt = new Date();
    }

    const result = await prisma.journey.updateMany({
      where: { id: { in: journeyIds } },
      data: updateData
    });

    res.json({
      success: true,
      updatedCount: result.count,
      status,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

export { router as clientsRouter };