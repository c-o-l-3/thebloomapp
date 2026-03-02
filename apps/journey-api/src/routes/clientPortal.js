/**
 * Client Portal API Routes
 * Self-service portal for client users to manage their journeys
 */

import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authenticateClient, requireRole, generateClientToken } from '../middleware/client-auth.js';

const router = Router();
const prisma = new PrismaClient();

// Validation schemas
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  clientSlug: z.string().min(1)
});

const createChangeRequestSchema = z.object({
  journeyId: z.string().uuid().optional(),
  touchpointId: z.string().uuid().optional(),
  type: z.enum(['content_change', 'new_touchpoint', 'delete_touchpoint', 'brand_update', 'other']),
  title: z.string().min(1).max(255),
  description: z.string().min(1),
  proposedContent: z.record(z.any()).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium')
});

const updateBrandVoiceSchema = z.object({
  tone: z.enum(['professional', 'casual', 'friendly', 'formal', 'playful', 'luxury']).optional(),
  personalityTraits: z.array(z.string()).optional(),
  voiceGuidelines: z.string().optional(),
  writingStyle: z.string().optional(),
  preferredPhrases: z.array(z.string()).optional(),
  avoidedPhrases: z.array(z.string()).optional(),
  targetAudience: z.string().optional(),
  audienceToneNotes: z.string().optional(),
  goodExamples: z.array(z.string()).optional(),
  badExamples: z.array(z.string()).optional()
});

// ============================================
// Authentication Routes
// ============================================

// POST /api/portal/auth/login - Client user login
router.post('/auth/login', async (req, res, next) => {
  try {
    const { email, password, clientSlug } = loginSchema.parse(req.body);

    // Find client by slug
    const client = await prisma.client.findUnique({
      where: { slug: clientSlug }
    });

    if (!client || client.status !== 'active') {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid client or client account is inactive'
      });
    }

    // Find user by email and client
    const user = await prisma.clientPortalUser.findUnique({
      where: {
        clientId_email: {
          clientId: client.id,
          email
        }
      }
    });

    if (!user || user.status !== 'active') {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid credentials'
      });
    }

    // Verify password
    // For demo purposes, accept email as password if no hash exists
    let isValidPassword = false;
    if (user.passwordHash) {
      // Simple comparison for demo - in production use proper hashing
      isValidPassword = password === user.passwordHash;
    } else {
      // Demo mode - accept the email as password
      isValidPassword = password === email;
    }

    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid credentials'
      });
    }

    // Generate token and create session
    const token = generateClientToken(user);
    
    const session = await prisma.clientPortalSession.create({
      data: {
        userId: user.id,
        clientId: user.clientId,
        token,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      }
    });

    // Update last login
    await prisma.clientPortalUser.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        client: {
          id: client.id,
          name: client.name,
          slug: client.slug
        }
      },
      expiresAt: session.expiresAt
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/portal/auth/logout - Client user logout
router.post('/auth/logout', authenticateClient, async (req, res, next) => {
  try {
    const token = req.headers.authorization.substring(7);
    
    await prisma.clientPortalSession.deleteMany({
      where: { token }
    });

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
});

// GET /api/portal/auth/me - Get current client user
router.get('/auth/me', authenticateClient, async (req, res) => {
  res.json({
    user: {
      id: req.clientUser.id,
      email: req.clientUser.email,
      name: req.clientUser.name,
      role: req.clientUser.role,
      permissions: req.clientUser.permissions,
      client: req.clientUser.client
    }
  });
});

// ============================================
// Journeys Routes (Read-only for clients)
// ============================================

// GET /api/portal/journeys - Get client's journeys
router.get('/journeys', authenticateClient, async (req, res, next) => {
  try {
    const { status } = req.query;
    const clientId = req.clientUser.clientId;

    const where = { clientId };
    if (status) where.status = status;

    const journeys = await prisma.journey.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        pipeline: {
          select: { id: true, name: true }
        },
        _count: {
          select: { touchpoints: true }
        }
      }
    });

    // Filter out sensitive fields
    const sanitizedJourneys = journeys.map(journey => ({
      id: journey.id,
      name: journey.name,
      slug: journey.slug,
      description: journey.description,
      category: journey.category,
      status: journey.status,
      version: journey.version,
      goal: journey.goal,
      approvedAt: journey.approvedAt,
      publishedAt: journey.publishedAt,
      createdAt: journey.createdAt,
      updatedAt: journey.updatedAt,
      pipeline: journey.pipeline,
      touchpointCount: journey._count.touchpoints
    }));

    res.json(sanitizedJourneys);
  } catch (error) {
    next(error);
  }
});

// GET /api/portal/journeys/:id - Get journey details with touchpoints
router.get('/journeys/:id', authenticateClient, async (req, res, next) => {
  try {
    const { id } = req.params;
    const clientId = req.clientUser.clientId;

    const journey = await prisma.journey.findFirst({
      where: {
        id,
        clientId
      },
      include: {
        touchpoints: {
          orderBy: { orderIndex: 'asc' },
          select: {
            id: true,
            name: true,
            type: true,
            orderIndex: true,
            content: true,
            status: true,
            config: true
          }
        },
        pipeline: {
          select: { id: true, name: true }
        }
      }
    });

    if (!journey) {
      return res.status(404).json({ error: 'Journey not found' });
    }

    res.json(journey);
  } catch (error) {
    next(error);
  }
});

// ============================================
// Change Request Routes
// ============================================

// GET /api/portal/change-requests - Get client's change requests
router.get('/change-requests', authenticateClient, async (req, res, next) => {
  try {
    const { status, journeyId } = req.query;
    const clientId = req.clientUser.clientId;

    const where = { clientId };
    if (status) where.status = status;
    if (journeyId) where.journeyId = journeyId;

    const changeRequests = await prisma.changeRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        journey: {
          select: { id: true, name: true }
        }
      }
    });

    res.json(changeRequests);
  } catch (error) {
    next(error);
  }
});

// GET /api/portal/change-requests/:id - Get single change request
router.get('/change-requests/:id', authenticateClient, async (req, res, next) => {
  try {
    const { id } = req.params;
    const clientId = req.clientUser.clientId;

    const changeRequest = await prisma.changeRequest.findFirst({
      where: {
        id,
        clientId
      },
      include: {
        journey: {
          select: { id: true, name: true }
        }
      }
    });

    if (!changeRequest) {
      return res.status(404).json({ error: 'Change request not found' });
    }

    res.json(changeRequest);
  } catch (error) {
    next(error);
  }
});

// POST /api/portal/change-requests - Create new change request
router.post('/change-requests', authenticateClient, async (req, res, next) => {
  try {
    const data = createChangeRequestSchema.parse(req.body);
    const clientId = req.clientUser.clientId;

    // Verify journey belongs to client if provided
    if (data.journeyId) {
      const journey = await prisma.journey.findFirst({
        where: {
          id: data.journeyId,
          clientId
        }
      });

      if (!journey) {
        return res.status(404).json({ error: 'Journey not found' });
      }
    }

    const changeRequest = await prisma.changeRequest.create({
      data: {
        ...data,
        clientId,
        requestedBy: req.clientUser.name,
        requestedByEmail: req.clientUser.email,
        comments: [{
          id: crypto.randomUUID(),
          user: req.clientUser.name,
          email: req.clientUser.email,
          text: 'Change request submitted',
          timestamp: new Date().toISOString(),
          type: 'system'
        }]
      }
    });

    res.status(201).json(changeRequest);
  } catch (error) {
    next(error);
  }
});

// POST /api/portal/change-requests/:id/comments - Add comment to change request
router.post('/change-requests/:id/comments', authenticateClient, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { text } = z.object({ text: z.string().min(1) }).parse(req.body);
    const clientId = req.clientUser.clientId;

    const changeRequest = await prisma.changeRequest.findFirst({
      where: {
        id,
        clientId
      }
    });

    if (!changeRequest) {
      return res.status(404).json({ error: 'Change request not found' });
    }

    const newComment = {
      id: crypto.randomUUID(),
      user: req.clientUser.name,
      email: req.clientUser.email,
      text,
      timestamp: new Date().toISOString(),
      type: 'comment'
    };

    const updatedComments = [...(changeRequest.comments || []), newComment];

    const updated = await prisma.changeRequest.update({
      where: { id },
      data: { comments: updatedComments }
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

// PUT /api/portal/change-requests/:id/cancel - Cancel change request
router.put('/change-requests/:id/cancel', authenticateClient, async (req, res, next) => {
  try {
    const { id } = req.params;
    const clientId = req.clientUser.clientId;

    const changeRequest = await prisma.changeRequest.findFirst({
      where: {
        id,
        clientId,
        status: {
          in: ['pending_review', 'in_review']
        }
      }
    });

    if (!changeRequest) {
      return res.status(404).json({ 
        error: 'Change request not found or cannot be cancelled'
      });
    }

    const updatedComments = [
      ...(changeRequest.comments || []),
      {
        id: crypto.randomUUID(),
        user: req.clientUser.name,
        email: req.clientUser.email,
        text: 'Change request cancelled by user',
        timestamp: new Date().toISOString(),
        type: 'system'
      }
    ];

    const updated = await prisma.changeRequest.update({
      where: { id },
      data: {
        status: 'cancelled',
        comments: updatedComments
      }
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

// ============================================
// Analytics Routes (Client-specific)
// ============================================

// GET /api/portal/analytics/dashboard - Get client's analytics dashboard
router.get('/analytics/dashboard', authenticateClient, async (req, res, next) => {
  try {
    const clientId = req.clientUser.clientId;
    const days = parseInt(req.query.days) || 30;
    
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const endDate = new Date();

    // Get client summary
    const summary = await prisma.clientAnalyticsSummary.findMany({
      where: {
        clientId,
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: { date: 'asc' }
    });

    // Get journey performance
    const journeyMetrics = await prisma.journeyPerformanceMetrics.findMany({
      where: {
        clientId,
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        journey: {
          select: { name: true, category: true }
        }
      }
    });

    // Aggregate metrics
    const aggregated = summary.reduce((acc, s) => {
      acc.totalJourneyRuns += s.totalJourneyRuns;
      acc.totalConversions += s.totalConversions;
      acc.totalTouchpointsSent += s.totalTouchpointsSent;
      acc.totalRevenue += parseFloat(s.totalRevenue || 0);
      return acc;
    }, {
      totalJourneyRuns: 0,
      totalConversions: 0,
      totalTouchpointsSent: 0,
      totalRevenue: 0
    });

    // Get active journeys count
    const activeJourneys = await prisma.journey.count({
      where: {
        clientId,
        status: 'published'
      }
    });

    // Calculate conversion rate
    const conversionRate = aggregated.totalJourneyRuns > 0
      ? (aggregated.totalConversions / aggregated.totalJourneyRuns * 100).toFixed(2)
      : 0;

    // Get top performing journeys
    const journeyStats = journeyMetrics.reduce((acc, metric) => {
      const existing = acc.find(j => j.journeyId === metric.journeyId);
      if (existing) {
        existing.conversions += metric.conversions;
        existing.contactsEntered += metric.totalContactsEntered;
      } else {
        acc.push({
          journeyId: metric.journeyId,
          journeyName: metric.journey?.name || 'Unknown',
          category: metric.journey?.category,
          conversions: metric.conversions,
          contactsEntered: metric.totalContactsEntered
        });
      }
      return acc;
    }, []);

    const topJourneys = journeyStats
      .map(j => ({
        ...j,
        conversionRate: j.contactsEntered > 0
          ? (j.conversions / j.contactsEntered * 100).toFixed(2)
          : 0
      }))
      .sort((a, b) => b.conversions - a.conversions)
      .slice(0, 5);

    // Get touchpoint engagement
    const touchpointMetrics = await prisma.touchpointPerformanceMetrics.findMany({
      where: {
        clientId,
        date: {
          gte: startDate,
          lte: endDate
        }
      }
    });

    const engagement = touchpointMetrics.reduce((acc, m) => {
      acc.sent += m.sent;
      acc.delivered += m.delivered;
      acc.opened += m.opened;
      acc.clicked += m.clicked;
      return acc;
    }, { sent: 0, delivered: 0, opened: 0, clicked: 0 });

    const openRate = engagement.delivered > 0
      ? (engagement.opened / engagement.delivered * 100).toFixed(2)
      : 0;

    const clickRate = engagement.delivered > 0
      ? (engagement.clicked / engagement.delivered * 100).toFixed(2)
      : 0;

    res.json({
      summary: {
        activeJourneys,
        totalJourneyRuns: aggregated.totalJourneyRuns,
        totalConversions: aggregated.totalConversions,
        conversionRate: parseFloat(conversionRate),
        totalTouchpointsSent: aggregated.totalTouchpointsSent,
        openRate: parseFloat(openRate),
        clickRate: parseFloat(clickRate),
        totalRevenue: aggregated.totalRevenue.toFixed(2)
      },
      topJourneys,
      dailyBreakdown: summary.map(s => ({
        date: s.date.toISOString().split('T')[0],
        journeyRuns: s.totalJourneyRuns,
        conversions: s.totalConversions,
        conversionRate: parseFloat(s.overallConversionRate || 0),
        touchpointsSent: s.totalTouchpointsSent,
        revenue: parseFloat(s.totalRevenue || 0)
      })),
      dateRange: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/portal/analytics/journeys/:id - Get analytics for specific journey
router.get('/analytics/journeys/:id', authenticateClient, async (req, res, next) => {
  try {
    const { id } = req.params;
    const clientId = req.clientUser.clientId;
    const days = parseInt(req.query.days) || 30;

    // Verify journey belongs to client
    const journey = await prisma.journey.findFirst({
      where: {
        id,
        clientId
      },
      select: {
        id: true,
        name: true,
        status: true,
        analyticsEnabled: true
      }
    });

    if (!journey) {
      return res.status(404).json({ error: 'Journey not found' });
    }

    if (!journey.analyticsEnabled) {
      return res.status(403).json({ 
        error: 'Analytics disabled',
        message: 'Analytics are not enabled for this journey'
      });
    }

    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Get journey metrics
    const metrics = await prisma.journeyPerformanceMetrics.findMany({
      where: {
        journeyId: id,
        clientId,
        date: {
          gte: startDate
        }
      },
      orderBy: { date: 'asc' }
    });

    // Get touchpoint metrics
    const touchpointMetrics = await prisma.touchpointPerformanceMetrics.findMany({
      where: {
        journeyId: id,
        clientId,
        date: {
          gte: startDate
        }
      },
      include: {
        touchpoint: {
          select: { name: true, type: true }
        }
      }
    });

    // Aggregate metrics
    const aggregated = metrics.reduce((acc, m) => {
      acc.contactsEntered += m.totalContactsEntered;
      acc.contactsCompleted += m.totalContactsCompleted;
      acc.conversions += m.conversions;
      acc.touchpointsSent += m.touchpointsSent;
      acc.touchpointsOpened += m.touchpointsOpened;
      acc.touchpointsClicked += m.touchpointsClicked;
      return acc;
    }, {
      contactsEntered: 0,
      contactsCompleted: 0,
      conversions: 0,
      touchpointsSent: 0,
      touchpointsOpened: 0,
      touchpointsClicked: 0
    });

    // Calculate rates
    const conversionRate = aggregated.contactsEntered > 0
      ? (aggregated.conversions / aggregated.contactsEntered * 100).toFixed(2)
      : 0;

    const openRate = aggregated.touchpointsSent > 0
      ? (aggregated.touchpointsOpened / aggregated.touchpointsSent * 100).toFixed(2)
      : 0;

    const clickRate = aggregated.touchpointsSent > 0
      ? (aggregated.touchpointsClicked / aggregated.touchpointsSent * 100).toFixed(2)
      : 0;

    // Aggregate touchpoint stats
    const touchpointStats = touchpointMetrics.reduce((acc, m) => {
      const existing = acc.find(t => t.touchpointId === m.touchpointId);
      if (existing) {
        existing.sent += m.sent;
        existing.opened += m.opened;
        existing.clicked += m.clicked;
      } else {
        acc.push({
          touchpointId: m.touchpointId,
          name: m.touchpoint?.name || 'Unknown',
          type: m.touchpoint?.type,
          sent: m.sent,
          opened: m.opened,
          clicked: m.clicked
        });
      }
      return acc;
    }, []);

    const touchpointsWithRates = touchpointStats.map(t => ({
      ...t,
      openRate: t.sent > 0 ? (t.opened / t.sent * 100).toFixed(2) : 0,
      clickRate: t.sent > 0 ? (t.clicked / t.sent * 100).toFixed(2) : 0
    }));

    res.json({
      journey: {
        id: journey.id,
        name: journey.name,
        status: journey.status
      },
      summary: {
        ...aggregated,
        conversionRate: parseFloat(conversionRate),
        openRate: parseFloat(openRate),
        clickRate: parseFloat(clickRate)
      },
      touchpoints: touchpointsWithRates,
      dailyTrends: metrics.map(m => ({
        date: m.date.toISOString().split('T')[0],
        contactsEntered: m.totalContactsEntered,
        contactsCompleted: m.totalContactsCompleted,
        conversions: m.conversions,
        conversionRate: parseFloat(m.conversionRate || 0)
      }))
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// Brand Voice Routes
// ============================================

// GET /api/portal/brand-voice - Get client's brand voice settings
router.get('/brand-voice', authenticateClient, async (req, res, next) => {
  try {
    const clientId = req.clientUser.clientId;

    let settings = await prisma.brandVoiceSettings.findUnique({
      where: { clientId }
    });

    // Create default settings if not exists
    if (!settings) {
      settings = await prisma.brandVoiceSettings.create({
        data: {
          clientId,
          tone: 'professional',
          personalityTraits: [],
          voiceGuidelines: '',
          preferredPhrases: [],
          avoidedPhrases: []
        }
      });
    }

    res.json(settings);
  } catch (error) {
    next(error);
  }
});

// PUT /api/portal/brand-voice - Update brand voice settings
router.put('/brand-voice', authenticateClient, requireRole(['editor', 'admin']), async (req, res, next) => {
  try {
    const data = updateBrandVoiceSchema.parse(req.body);
    const clientId = req.clientUser.clientId;

    const settings = await prisma.brandVoiceSettings.upsert({
      where: { clientId },
      create: {
        clientId,
        ...data
      },
      update: data
    });

    res.json(settings);
  } catch (error) {
    next(error);
  }
});

// ============================================
// Asset Routes
// ============================================

// GET /api/portal/assets - Get client's assets
router.get('/assets', authenticateClient, async (req, res, next) => {
  try {
    const { type, category } = req.query;
    const clientId = req.clientUser.clientId;

    const where = { 
      clientId,
      status: 'active'
    };
    if (type) where.type = type;
    if (category) where.category = category;

    const assets = await prisma.clientAsset.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    res.json(assets);
  } catch (error) {
    next(error);
  }
});

// GET /api/portal/assets/:id - Get single asset
router.get('/assets/:id', authenticateClient, async (req, res, next) => {
  try {
    const { id } = req.params;
    const clientId = req.clientUser.clientId;

    const asset = await prisma.clientAsset.findFirst({
      where: {
        id,
        clientId
      }
    });

    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    res.json(asset);
  } catch (error) {
    next(error);
  }
});

// POST /api/portal/assets - Create asset (metadata only - actual upload separate)
router.post('/assets', authenticateClient, requireRole(['editor', 'admin']), async (req, res, next) => {
  try {
    const data = z.object({
      name: z.string().min(1).max(255),
      description: z.string().optional(),
      type: z.enum(['image', 'document', 'video', 'audio', 'other']),
      fileType: z.string(),
      fileUrl: z.string().url(),
      fileSize: z.number().int().min(0),
      thumbnailUrl: z.string().url().optional(),
      category: z.enum(['general', 'logo', 'banner', 'email_header', 'social', 'document']).default('general'),
      tags: z.array(z.string()).default([]),
      metadata: z.record(z.any()).default({})
    }).parse(req.body);

    const clientId = req.clientUser.clientId;

    const asset = await prisma.clientAsset.create({
      data: {
        ...data,
        clientId,
        uploadedBy: req.clientUser.name,
        uploadedByEmail: req.clientUser.email,
        status: 'active'
      }
    });

    res.status(201).json(asset);
  } catch (error) {
    next(error);
  }
});

// PUT /api/portal/assets/:id - Update asset
router.put('/assets/:id', authenticateClient, requireRole(['editor', 'admin']), async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = z.object({
      name: z.string().min(1).max(255).optional(),
      description: z.string().optional(),
      category: z.enum(['general', 'logo', 'banner', 'email_header', 'social', 'document']).optional(),
      tags: z.array(z.string()).optional(),
      metadata: z.record(z.any()).optional()
    }).parse(req.body);

    const clientId = req.clientUser.clientId;

    const asset = await prisma.clientAsset.findFirst({
      where: { id, clientId }
    });

    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    const updated = await prisma.clientAsset.update({
      where: { id },
      data
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/portal/assets/:id - Archive asset
router.delete('/assets/:id', authenticateClient, requireRole(['editor', 'admin']), async (req, res, next) => {
  try {
    const { id } = req.params;
    const clientId = req.clientUser.clientId;

    const asset = await prisma.clientAsset.findFirst({
      where: { id, clientId }
    });

    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    await prisma.clientAsset.update({
      where: { id },
      data: { status: 'archived' }
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// ============================================
// Client Info Routes
// ============================================

// GET /api/portal/client - Get client's own info
router.get('/client', authenticateClient, async (req, res, next) => {
  try {
    const clientId = req.clientUser.clientId;

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        slug: true,
        name: true,
        industry: true,
        website: true,
        settings: true,
        config: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            journeys: true,
            templates: true,
            assets: {
              where: { status: 'active' }
            }
          }
        }
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

export { router as clientPortalRouter };