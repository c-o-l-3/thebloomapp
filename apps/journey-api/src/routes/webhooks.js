/**
 * Webhook API Routes
 * P1 Q3 2026 - Real-time sync with GoHighLevel webhooks
 * 
 * Provides endpoints for:
 * - Receiving webhooks from GoHighLevel
 * - Managing webhook configurations
 * - Viewing webhook delivery logs and statistics
 */

import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import webhookService, { WebhookEventTypes, EventCategories } from '../services/webhook-service.js';

const router = Router();
const prisma = new PrismaClient();

// Store raw body for signature verification
const captureRawBody = (req, res, next) => {
  req.rawBody = '';
  req.setEncoding('utf8');
  
  req.on('data', (chunk) => {
    req.rawBody += chunk;
  });
  
  req.on('end', () => {
    next();
  });
};

// ============================================
// VALIDATION SCHEMAS
// ============================================

const webhookConfigSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  webhookUrl: z.string().url(),
  secretKey: z.string().min(1),
  subscribedEvents: z.array(z.string()).default([]),
  status: z.enum(['active', 'paused', 'disabled']).default('active'),
  maxRetries: z.number().min(0).max(10).default(3),
  retryDelayMs: z.number().min(1000).max(60000).default(5000),
  rateLimitPerMinute: z.number().min(10).max(1000).default(100)
});

// ============================================
// WEBHOOK RECEIVER ENDPOINTS (Public)
// ============================================

/**
 * POST /webhooks/ghl/:clientId
 * Receive webhooks from GoHighLevel
 * 
 * This endpoint receives all webhook events from GHL and processes them
 * according to the client's webhook configuration.
 */
router.post('/ghl/:clientId', captureRawBody, async (req, res, next) => {
  const startTime = Date.now();
  
  try {
    const { clientId } = req.params;
    const eventType = req.headers['x-ghl-event'] || req.headers['X-GHL-Event'] || req.body.type;
    
    if (!eventType) {
      return res.status(400).json({
        error: 'Missing event type',
        message: 'X-GHL-Event header or type field is required'
      });
    }
    
    // Parse payload from raw body if available, otherwise use req.body
    let payload;
    try {
      payload = req.rawBody ? JSON.parse(req.rawBody) : req.body;
    } catch (e) {
      payload = req.body;
    }
    
    // Process the webhook
    const result = await webhookService.processWebhook({
      clientId,
      eventType,
      payload,
      headers: req.headers,
      ipAddress: req.ip || req.connection.remoteAddress,
      rawBody: req.rawBody
    });
    
    // Return response
    res.status(200).json({
      success: true,
      received: true,
      eventType,
      processingTimeMs: Date.now() - startTime,
      ...result
    });
    
  } catch (error) {
    console.error('Webhook processing error:', error);
    
    // Always return 200 to GHL to prevent retries for unrecoverable errors
    // Log the error but acknowledge receipt
    res.status(200).json({
      success: false,
      received: true,
      error: error.message,
      processingTimeMs: Date.now() - startTime
    });
  }
});

/**
 * POST /webhooks/test/:clientId
 * Test webhook endpoint (doesn't require GHL signature)
 * 
 * Useful for testing webhook processing without sending from GHL
 */
router.post('/test/:clientId', async (req, res, next) => {
  try {
    const { clientId } = req.params;
    const { eventType, payload } = req.body;
    
    if (!eventType || !payload) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['eventType', 'payload']
      });
    }
    
    // Process without signature verification
    const result = await webhookService.processWebhook({
      clientId,
      eventType,
      payload,
      headers: req.headers,
      ipAddress: req.ip || req.connection.remoteAddress,
      rawBody: null // Skip signature verification
    });
    
    res.json({
      success: true,
      test: true,
      ...result
    });
    
  } catch (error) {
    next(error);
  }
});

// ============================================
// WEBHOOK CONFIGURATION MANAGEMENT
// ============================================

/**
 * GET /webhooks/configs
 * Get all webhook configurations (optionally filtered by client)
 */
router.get('/configs', async (req, res, next) => {
  try {
    const { clientId, status } = req.query;
    
    const where = {};
    if (clientId) where.clientId = clientId;
    if (status) where.status = status;
    
    const configs = await prisma.webhookConfig.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        client: {
          select: { id: true, name: true, slug: true }
        },
        _count: {
          select: { deliveries: true }
        }
      }
    });
    
    // Mask secret keys
    const maskedConfigs = configs.map(config => ({
      ...config,
      secretKey: config.secretKey ? '••••••••' + config.secretKey.slice(-4) : null
    }));
    
    res.json(maskedConfigs);
    
  } catch (error) {
    next(error);
  }
});

/**
 * GET /webhooks/configs/:id
 * Get a single webhook configuration
 */
router.get('/configs/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const config = await prisma.webhookConfig.findUnique({
      where: { id },
      include: {
        client: {
          select: { id: true, name: true, slug: true, ghlLocationId: true }
        },
        _count: {
          select: { deliveries: true }
        }
      }
    });
    
    if (!config) {
      return res.status(404).json({ error: 'Webhook configuration not found' });
    }
    
    // Mask secret key
    const maskedConfig = {
      ...config,
      secretKey: config.secretKey ? '••••••••' + config.secretKey.slice(-4) : null
    };
    
    res.json(maskedConfig);
    
  } catch (error) {
    next(error);
  }
});

/**
 * POST /webhooks/configs
 * Create a new webhook configuration
 */
router.post('/configs', async (req, res, next) => {
  try {
    const data = webhookConfigSchema.parse(req.body);
    const { clientId } = req.body;
    
    if (!clientId) {
      return res.status(400).json({ error: 'clientId is required' });
    }
    
    // Verify client exists
    const client = await prisma.client.findUnique({
      where: { id: clientId }
    });
    
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }
    
    const config = await prisma.webhookConfig.create({
      data: {
        ...data,
        clientId
      }
    });
    
    // Return with masked secret
    res.status(201).json({
      ...config,
      secretKey: config.secretKey ? '••••••••' + config.secretKey.slice(-4) : null
    });
    
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /webhooks/configs/:id
 * Update a webhook configuration
 */
router.put('/configs/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = webhookConfigSchema.partial().parse(req.body);
    
    const config = await prisma.webhookConfig.update({
      where: { id },
      data
    });
    
    res.json({
      ...config,
      secretKey: config.secretKey ? '••••••••' + config.secretKey.slice(-4) : null
    });
    
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /webhooks/configs/:id
 * Delete a webhook configuration
 */
router.delete('/configs/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    await prisma.webhookConfig.delete({
      where: { id }
    });
    
    res.status(204).send();
    
  } catch (error) {
    next(error);
  }
});

/**
 * POST /webhooks/configs/:id/regenerate-secret
 * Regenerate webhook secret key
 */
router.post('/configs/:id/regenerate-secret', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Generate new secret
    const crypto = await import('crypto');
    const newSecret = crypto.randomBytes(32).toString('hex');
    
    const config = await prisma.webhookConfig.update({
      where: { id },
      data: { secretKey: newSecret }
    });
    
    res.json({
      id: config.id,
      secretKey: newSecret,
      message: 'Store this secret securely. It will not be shown again.',
      updatedAt: config.updatedAt
    });
    
  } catch (error) {
    next(error);
  }
});

/**
 * POST /webhooks/configs/:id/toggle
 * Toggle webhook status (active/paused)
 */
router.post('/configs/:id/toggle', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const config = await prisma.webhookConfig.findUnique({
      where: { id }
    });
    
    if (!config) {
      return res.status(404).json({ error: 'Webhook configuration not found' });
    }
    
    const newStatus = config.status === 'active' ? 'paused' : 'active';
    
    const updated = await prisma.webhookConfig.update({
      where: { id },
      data: { status: newStatus }
    });
    
    res.json({
      id: updated.id,
      status: updated.status,
      previousStatus: config.status
    });
    
  } catch (error) {
    next(error);
  }
});

// ============================================
// WEBHOOK DELIVERY LOGS
// ============================================

/**
 * GET /webhooks/deliveries
 * Get webhook delivery logs
 */
router.get('/deliveries', async (req, res, next) => {
  try {
    const { 
      clientId, 
      configId, 
      eventType, 
      status,
      limit = 50, 
      offset = 0 
    } = req.query;
    
    const where = {};
    if (clientId) where.clientId = clientId;
    if (configId) where.configId = configId;
    if (eventType) where.eventType = eventType;
    if (status) where.status = status;
    
    const [deliveries, total] = await Promise.all([
      prisma.webhookDelivery.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit),
        skip: parseInt(offset),
        include: {
          config: {
            select: { name: true }
          }
        }
      }),
      prisma.webhookDelivery.count({ where })
    ]);
    
    res.json({
      data: deliveries,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + deliveries.length < total
      }
    });
    
  } catch (error) {
    next(error);
  }
});

/**
 * GET /webhooks/deliveries/:id
 * Get a single delivery log with full details
 */
router.get('/deliveries/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const delivery = await prisma.webhookDelivery.findUnique({
      where: { id },
      include: {
        config: {
          select: { name: true, webhookUrl: true }
        }
      }
    });
    
    if (!delivery) {
      return res.status(404).json({ error: 'Delivery not found' });
    }
    
    res.json(delivery);
    
  } catch (error) {
    next(error);
  }
});

/**
 * POST /webhooks/deliveries/:id/retry
 * Retry a failed webhook delivery
 */
router.post('/deliveries/:id/retry', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const delivery = await prisma.webhookDelivery.findUnique({
      where: { id }
    });
    
    if (!delivery) {
      return res.status(404).json({ error: 'Delivery not found' });
    }
    
    // Reset status and retry
    await prisma.webhookDelivery.update({
      where: { id },
      data: {
        status: 'pending',
        retryCount: 0,
        errorMessage: null,
        nextRetryAt: new Date()
      }
    });
    
    // Process immediately
    const result = await webhookService.processWebhook({
      clientId: delivery.clientId,
      eventType: delivery.eventType,
      payload: delivery.payload,
      headers: delivery.headers || {},
      ipAddress: delivery.ipAddress,
      rawBody: JSON.stringify(delivery.payload)
    });
    
    res.json({
      success: true,
      retried: true,
      result
    });
    
  } catch (error) {
    next(error);
  }
});

// ============================================
// WEBHOOK STATISTICS
// ============================================

/**
 * GET /webhooks/stats
 * Get webhook statistics
 */
router.get('/stats', async (req, res, next) => {
  try {
    const { clientId, period = '24h' } = req.query;
    
    if (!clientId) {
      // Return system-wide stats
      const periodMs = period === '24h' ? 24 * 60 * 60 * 1000 :
                       period === '7d' ? 7 * 24 * 60 * 60 * 1000 :
                       period === '30d' ? 30 * 24 * 60 * 60 * 1000 :
                       24 * 60 * 60 * 1000;
      
      const since = new Date(Date.now() - periodMs);
      
      const [
        totalConfigs,
        activeConfigs,
        totalDeliveries,
        successfulDeliveries,
        failedDeliveries
      ] = await Promise.all([
        prisma.webhookConfig.count(),
        prisma.webhookConfig.count({ where: { status: 'active' } }),
        prisma.webhookDelivery.count({ where: { createdAt: { gte: since } } }),
        prisma.webhookDelivery.count({ where: { status: 'completed', createdAt: { gte: since } } }),
        prisma.webhookDelivery.count({ where: { status: 'failed', createdAt: { gte: since } } })
      ]);
      
      res.json({
        period,
        configs: {
          total: totalConfigs,
          active: activeConfigs
        },
        deliveries: {
          total: totalDeliveries,
          successful: successfulDeliveries,
          failed: failedDeliveries,
          successRate: totalDeliveries > 0 ? Math.round((successfulDeliveries / totalDeliveries) * 100) : 0
        }
      });
      
    } else {
      // Return client-specific stats
      const stats = await webhookService.getWebhookStats(clientId, period);
      res.json(stats);
    }
    
  } catch (error) {
    next(error);
  }
});

/**
 * GET /webhooks/stats/:clientId
 * Get detailed webhook statistics for a client
 */
router.get('/stats/:clientId', async (req, res, next) => {
  try {
    const { clientId } = req.params;
    const { period = '24h' } = req.query;
    
    const stats = await webhookService.getWebhookStats(clientId, period);
    
    // Get recent delivery summary
    const recentDeliveries = await prisma.webhookDelivery.findMany({
      where: { clientId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        eventType: true,
        status: true,
        createdAt: true,
        processingTimeMs: true
      }
    });
    
    // Get event type breakdown
    const periodMs = period === '24h' ? 24 * 60 * 60 * 1000 :
                     period === '7d' ? 7 * 24 * 60 * 60 * 1000 :
                     period === '30d' ? 30 * 24 * 60 * 60 * 1000 :
                     24 * 60 * 60 * 1000;
    
    const since = new Date(Date.now() - periodMs);
    
    const hourlyStats = await prisma.webhookDelivery.groupBy({
      by: ['eventType'],
      where: { 
        clientId, 
        createdAt: { gte: since }
      },
      _count: { eventType: true },
      _avg: { processingTimeMs: true }
    });
    
    res.json({
      ...stats,
      recentDeliveries,
      hourlyBreakdown: hourlyStats.map(stat => ({
        eventType: stat.eventType,
        count: stat._count.eventType,
        avgProcessingTimeMs: Math.round(stat._avg.processingTimeMs || 0)
      }))
    });
    
  } catch (error) {
    next(error);
  }
});

// ============================================
// EVENT TYPES & CATEGORIES
// ============================================

/**
 * GET /webhooks/event-types
 * Get all supported webhook event types
 */
router.get('/event-types', async (req, res, next) => {
  try {
    res.json({
      eventTypes: WebhookEventTypes,
      categories: EventCategories,
      descriptions: {
        // Contact events
        [WebhookEventTypes.CONTACT_CREATE]: 'Triggered when a new contact is created in GHL',
        [WebhookEventTypes.CONTACT_UPDATE]: 'Triggered when an existing contact is updated',
        [WebhookEventTypes.CONTACT_DELETE]: 'Triggered when a contact is deleted',
        
        // Opportunity events
        [WebhookEventTypes.OPPORTUNITY_CREATE]: 'Triggered when a new opportunity is created',
        [WebhookEventTypes.OPPORTUNITY_UPDATE]: 'Triggered when an opportunity is updated',
        [WebhookEventTypes.OPPORTUNITY_DELETE]: 'Triggered when an opportunity is deleted',
        [WebhookEventTypes.OPPORTUNITY_STAGE_CHANGE]: 'Triggered when an opportunity moves to a different stage',
        [WebhookEventTypes.PIPELINE_STAGE_MOVEMENT]: 'Triggered when a contact moves between pipeline stages',
        
        // Appointment events
        [WebhookEventTypes.APPOINTMENT_CREATE]: 'Triggered when an appointment is scheduled',
        [WebhookEventTypes.APPOINTMENT_UPDATE]: 'Triggered when an appointment is modified',
        [WebhookEventTypes.APPOINTMENT_CANCEL]: 'Triggered when an appointment is cancelled',
        [WebhookEventTypes.APPOINTMENT_DELETE]: 'Triggered when an appointment is deleted',
        
        // Form events
        [WebhookEventTypes.FORM_SUBMIT]: 'Triggered when a form is submitted',
        
        // Email events
        [WebhookEventTypes.EMAIL_DELIVERED]: 'Triggered when an email is delivered',
        [WebhookEventTypes.EMAIL_OPENED]: 'Triggered when a contact opens an email',
        [WebhookEventTypes.EMAIL_CLICKED]: 'Triggered when a contact clicks a link in an email',
        [WebhookEventTypes.EMAIL_BOUNCED]: 'Triggered when an email bounces',
        [WebhookEventTypes.EMAIL_COMPLAINED]: 'Triggered when a contact marks email as spam',
        [WebhookEventTypes.EMAIL_UNSUBSCRIBED]: 'Triggered when a contact unsubscribes'
      }
    });
    
  } catch (error) {
    next(error);
  }
});

// ============================================
// SYNCED DATA ENDPOINTS
// ============================================

/**
 * GET /webhooks/synced-contacts
 * Get synced contacts
 */
router.get('/synced-contacts', async (req, res, next) => {
  try {
    const { clientId, search, status = 'active', limit = 50, offset = 0 } = req.query;
    
    if (!clientId) {
      return res.status(400).json({ error: 'clientId is required' });
    }
    
    const where = { clientId, syncStatus: status };
    
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    const [contacts, total] = await Promise.all([
      prisma.syncedContact.findMany({
        where,
        orderBy: { lastSyncedAt: 'desc' },
        take: parseInt(limit),
        skip: parseInt(offset)
      }),
      prisma.syncedContact.count({ where })
    ]);
    
    res.json({
      data: contacts,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + contacts.length < total
      }
    });
    
  } catch (error) {
    next(error);
  }
});

/**
 * GET /webhooks/synced-appointments
 * Get synced appointments
 */
router.get('/synced-appointments', async (req, res, next) => {
  try {
    const { clientId, status, from, to, limit = 50, offset = 0 } = req.query;
    
    if (!clientId) {
      return res.status(400).json({ error: 'clientId is required' });
    }
    
    const where = { clientId };
    
    if (status) where.status = status;
    if (from || to) {
      where.startTime = {};
      if (from) where.startTime.gte = new Date(from);
      if (to) where.startTime.lte = new Date(to);
    }
    
    const [appointments, total] = await Promise.all([
      prisma.syncedAppointment.findMany({
        where,
        orderBy: { startTime: 'asc' },
        take: parseInt(limit),
        skip: parseInt(offset),
        include: {
          contact: {
            select: { id: true, firstName: true, lastName: true, email: true }
          }
        }
      }),
      prisma.syncedAppointment.count({ where })
    ]);
    
    res.json({
      data: appointments,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + appointments.length < total
      }
    });
    
  } catch (error) {
    next(error);
  }
});

/**
 * GET /webhooks/form-submissions
 * Get form submissions
 */
router.get('/form-submissions', async (req, res, next) => {
  try {
    const { clientId, formId, limit = 50, offset = 0 } = req.query;
    
    if (!clientId) {
      return res.status(400).json({ error: 'clientId is required' });
    }
    
    const where = { clientId };
    if (formId) where.formId = formId;
    
    const [submissions, total] = await Promise.all([
      prisma.formSubmission.findMany({
        where,
        orderBy: { submittedAt: 'desc' },
        take: parseInt(limit),
        skip: parseInt(offset),
        include: {
          contact: {
            select: { id: true, firstName: true, lastName: true, email: true }
          }
        }
      }),
      prisma.formSubmission.count({ where })
    ]);
    
    res.json({
      data: submissions,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + submissions.length < total
      }
    });
    
  } catch (error) {
    next(error);
  }
});

/**
 * GET /webhooks/email-events
 * Get email events
 */
router.get('/email-events', async (req, res, next) => {
  try {
    const { clientId, eventType, contactId, limit = 50, offset = 0 } = req.query;
    
    if (!clientId) {
      return res.status(400).json({ error: 'clientId is required' });
    }
    
    const where = { clientId };
    if (eventType) where.eventType = eventType;
    if (contactId) where.contactId = contactId;
    
    const [events, total] = await Promise.all([
      prisma.emailEvent.findMany({
        where,
        orderBy: { eventTime: 'desc' },
        take: parseInt(limit),
        skip: parseInt(offset),
        include: {
          contact: {
            select: { id: true, firstName: true, lastName: true, email: true }
          }
        }
      }),
      prisma.emailEvent.count({ where })
    ]);
    
    res.json({
      data: events,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + events.length < total
      }
    });
    
  } catch (error) {
    next(error);
  }
});

/**
 * GET /webhooks/stage-history
 * Get opportunity stage history
 */
router.get('/stage-history', async (req, res, next) => {
  try {
    const { clientId, pipelineId, limit = 50, offset = 0 } = req.query;
    
    if (!clientId) {
      return res.status(400).json({ error: 'clientId is required' });
    }
    
    const where = { clientId };
    if (pipelineId) where.pipelineId = pipelineId;
    
    const [history, total] = await Promise.all([
      prisma.opportunityStageHistory.findMany({
        where,
        orderBy: { changedAt: 'desc' },
        take: parseInt(limit),
        skip: parseInt(offset)
      }),
      prisma.opportunityStageHistory.count({ where })
    ]);
    
    res.json({
      data: history,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + history.length < total
      }
    });
    
  } catch (error) {
    next(error);
  }
});

export { router as webhooksRouter };