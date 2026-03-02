/**
 * A/B Testing Routes
 * P1 Q3 2026 - Comprehensive A/B Testing API
 */

import { Router } from 'express';
import { z } from 'zod';
import { abTestingService } from '../services/ab-testing-service.js';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Validation schemas
const createTestSchema = z.object({
  clientId: z.string().uuid(),
  journeyId: z.string().uuid(),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  hypothesis: z.string().optional(),
  testType: z.enum(['journey', 'touchpoint', 'subject_line', 'content']).default('journey'),
  targetMetric: z.enum(['conversion', 'click_rate', 'open_rate', 'reply_rate']).default('conversion'),
  minConfidenceLevel: z.number().min(0.8).max(0.99).default(0.95),
  minSampleSize: z.number().int().min(10).default(100),
  autoWinnerSelection: z.boolean().default(false),
  scheduledStart: z.string().datetime().optional(),
  createdBy: z.string().optional(),
  variants: z.array(z.object({
    name: z.string().min(1).max(255),
    description: z.string().optional(),
    trafficPercentage: z.number().min(0).max(100),
    journeySnapshot: z.record(z.any()),
    touchpointChanges: z.record(z.any()).optional(),
    isControl: z.boolean().default(false)
  })).min(2).max(5)
});

const assignParticipantSchema = z.object({
  contactId: z.string(),
  sessionId: z.string().optional(),
  metadata: z.record(z.any()).optional()
});

const recordEventSchema = z.object({
  contactId: z.string(),
  eventType: z.string(),
  eventData: z.record(z.any()).optional()
});

// ============================================
// Test Management Endpoints
// ============================================

// GET /api/ab-testing/tests - List all tests
router.get('/tests', async (req, res, next) => {
  try {
    const { clientId, journeyId, status, limit, offset } = req.query;

    if (!clientId) {
      return res.status(400).json({ error: 'clientId is required' });
    }

    const result = await abTestingService.getTests(clientId, {
      journeyId,
      status,
      limit: limit ? parseInt(limit) : 50,
      offset: offset ? parseInt(offset) : 0
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

// GET /api/ab-testing/tests/:id - Get test details
router.get('/tests/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const test = await abTestingService.getTest(id);

    if (!test) {
      return res.status(404).json({ error: 'Test not found' });
    }

    res.json(test);
  } catch (error) {
    next(error);
  }
});

// POST /api/ab-testing/tests - Create a new test
router.post('/tests', async (req, res, next) => {
  try {
    const data = createTestSchema.parse(req.body);
    const test = await abTestingService.createTest(data);
    res.status(201).json(test);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    next(error);
  }
});

// PUT /api/ab-testing/tests/:id - Update test (limited fields)
router.put('/tests/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, hypothesis, autoWinnerSelection } = req.body;

    const test = await prisma.journeyABTest.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description && { description }),
        ...(hypothesis && { hypothesis }),
        ...(autoWinnerSelection !== undefined && { autoWinnerSelection }),
        updatedAt: new Date()
      },
      include: { variants: true }
    });

    res.json(test);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/ab-testing/tests/:id - Delete a test
router.delete('/tests/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    await abTestingService.deleteTest(id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// ============================================
// Test Control Endpoints
// ============================================

// POST /api/ab-testing/tests/:id/start - Start a test
router.post('/tests/:id/start', async (req, res, next) => {
  try {
    const { id } = req.params;
    const test = await abTestingService.startTest(id);
    res.json(test);
  } catch (error) {
    next(error);
  }
});

// POST /api/ab-testing/tests/:id/pause - Pause a test
router.post('/tests/:id/pause', async (req, res, next) => {
  try {
    const { id } = req.params;
    const test = await abTestingService.pauseTest(id);
    res.json(test);
  } catch (error) {
    next(error);
  }
});

// POST /api/ab-testing/tests/:id/stop - Stop a test
router.post('/tests/:id/stop', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { winnerVariantId } = req.body;
    const test = await abTestingService.stopTest(id, winnerVariantId);
    res.json(test);
  } catch (error) {
    next(error);
  }
});

// ============================================
// Test Results and Statistics
// ============================================

// GET /api/ab-testing/tests/:id/results - Get test results
router.get('/tests/:id/results', async (req, res, next) => {
  try {
    const { id } = req.params;
    const results = await abTestingService.calculateResults(id);
    res.json(results);
  } catch (error) {
    next(error);
  }
});

// GET /api/ab-testing/tests/:id/daily-stats - Get daily statistics
router.get('/tests/:id/daily-stats', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { days = 30 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const stats = await prisma.aBTestDailyStats.findMany({
      where: {
        testId: id,
        date: { gte: startDate }
      },
      include: {
        variant: {
          select: { name: true, isControl: true }
        }
      },
      orderBy: { date: 'asc' }
    });

    res.json({
      testId: id,
      days: parseInt(days),
      stats
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/ab-testing/tests/:id/participants - List participants
router.get('/tests/:id/participants', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { limit = 100, offset = 0, variantId, converted } = req.query;

    const where = { testId: id };
    if (variantId) where.variantId = variantId;
    if (converted === 'true') where.convertedAt = { not: null };
    if (converted === 'false') where.convertedAt = null;

    const [participants, total] = await Promise.all([
      prisma.aBTestParticipant.findMany({
        where,
        include: {
          variant: {
            select: { name: true, isControl: true }
          }
        },
        orderBy: { assignedAt: 'desc' },
        take: parseInt(limit),
        skip: parseInt(offset)
      }),
      prisma.aBTestParticipant.count({ where })
    ]);

    res.json({
      participants,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: total > parseInt(offset) + parseInt(limit)
      }
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// Participant Assignment and Tracking
// ============================================

// POST /api/ab-testing/tests/:id/assign - Assign participant to variant
router.post('/tests/:id/assign', async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = assignParticipantSchema.parse(req.body);

    const participant = await abTestingService.assignParticipant(
      id,
      data.contactId,
      data.sessionId,
      data.metadata
    );

    if (!participant) {
      return res.status(400).json({ error: 'Could not assign participant. Test may not be running.' });
    }

    res.json(participant);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    next(error);
  }
});

// POST /api/ab-testing/tests/:id/convert - Record conversion
router.post('/tests/:id/convert', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { contactId, value, event, timeInJourneyMinutes } = req.body;

    const participant = await abTestingService.recordConversion(id, contactId, {
      value,
      event,
      timeInJourneyMinutes
    });

    if (!participant) {
      return res.status(400).json({ error: 'Could not record conversion. Participant not found or already converted.' });
    }

    res.json(participant);
  } catch (error) {
    next(error);
  }
});

// POST /api/ab-testing/tests/:id/events - Record event
router.post('/tests/:id/events', async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = recordEventSchema.parse(req.body);

    const event = await abTestingService.recordEvent(
      id,
      data.contactId,
      data.eventType,
      data.eventData
    );

    if (!event) {
      return res.status(400).json({ error: 'Could not record event. Participant not found.' });
    }

    res.status(201).json(event);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    next(error);
  }
});

// ============================================
// Sample Size Calculator
// ============================================

// GET /api/ab-testing/sample-size-calculator
router.get('/sample-size-calculator', async (req, res, next) => {
  try {
    const {
      baselineRate = 0.1,
      minimumDetectableEffect = 0.2,
      confidenceLevel = 0.95,
      power = 0.8
    } = req.query;

    const result = abTestingService.getSampleSizeCalculator(
      parseFloat(baselineRate),
      parseFloat(minimumDetectableEffect),
      parseFloat(confidenceLevel),
      parseFloat(power)
    );

    res.json(result);
  } catch (error) {
    next(error);
  }
});

// ============================================
// Dashboard and Analytics
// ============================================

// GET /api/ab-testing/dashboard - Get A/B testing dashboard data
router.get('/dashboard', async (req, res, next) => {
  try {
    const { clientId, days = 30 } = req.query;

    if (!clientId) {
      return res.status(400).json({ error: 'clientId is required' });
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    // Get all tests for client
    const tests = await prisma.journeyABTest.findMany({
      where: { clientId },
      include: {
        variants: {
          select: {
            id: true,
            name: true,
            isControl: true,
            trafficPercentage: true,
            participantsCount: true,
            conversionsCount: true,
            status: true
          }
        },
        journey: {
          select: { name: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Get active tests
    const activeTests = tests.filter(t => t.status === 'running');

    // Calculate aggregate stats
    const totalTests = tests.length;
    const completedTests = tests.filter(t => t.status === 'completed').length;
    const totalParticipants = tests.reduce((sum, t) =>
      sum + t.variants.reduce((vSum, v) => vSum + v.participantsCount, 0), 0
    );
    const totalConversions = tests.reduce((sum, t) =>
      sum + t.variants.reduce((vSum, v) => vSum + v.conversionsCount, 0), 0
    );

    // Get recent daily stats
    const dailyStats = await prisma.aBTestDailyStats.groupBy({
      by: ['date'],
      where: {
        clientId,
        date: { gte: startDate }
      },
      _sum: {
        participantsNew: true,
        conversionsNew: true
      },
      orderBy: { date: 'asc' }
    });

    res.json({
      summary: {
        totalTests,
        activeTests: activeTests.length,
        completedTests,
        totalParticipants,
        totalConversions,
        overallConversionRate: totalParticipants > 0 ? totalConversions / totalParticipants : 0
      },
      activeTests: activeTests.map(t => ({
        id: t.id,
        name: t.name,
        journeyName: t.journey.name,
        testType: t.testType,
        targetMetric: t.targetMetric,
        startDate: t.startDate,
        variants: t.variants
      })),
      recentTests: tests.slice(0, 5),
      trends: dailyStats.map(d => ({
        date: d.date.toISOString().split('T')[0],
        participants: d._sum.participantsNew || 0,
        conversions: d._sum.conversionsNew || 0
      }))
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/ab-testing/active-tests - Get running tests for journey assignment
router.get('/active-tests', async (req, res, next) => {
  try {
    const { journeyId, clientId } = req.query;

    if (!journeyId) {
      return res.status(400).json({ error: 'journeyId is required' });
    }

    const where = {
      journeyId,
      status: 'running'
    };

    if (clientId) where.clientId = clientId;

    const tests = await prisma.journeyABTest.findMany({
      where,
      include: {
        variants: {
          where: { status: 'active' },
          select: {
            id: true,
            name: true,
            trafficPercentage: true,
            journeySnapshot: true,
            isControl: true
          }
        }
      }
    });

    res.json({ tests });
  } catch (error) {
    next(error);
  }
});

// ============================================
// Automatic Winner Selection
// ============================================

// POST /api/ab-testing/tests/:id/auto-check - Check and auto-select winner
router.post('/tests/:id/auto-check', async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await abTestingService.autoCheckAndSelectWinner(id);

    if (!result) {
      return res.json({
        message: 'No winner selected. Test continues running.',
        selected: false
      });
    }

    res.json({
      message: 'Winner automatically selected',
      selected: true,
      test: result
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/ab-testing/run-auto-checks - Run auto-checks for all running tests
router.post('/run-auto-checks', async (req, res, next) => {
  try {
    const runningTests = await prisma.journeyABTest.findMany({
      where: {
        status: 'running',
        autoWinnerSelection: true
      }
    });

    const results = await Promise.all(
      runningTests.map(test =>
        abTestingService.autoCheckAndSelectWinner(test.id)
          .then(result => ({
            testId: test.id,
            testName: test.name,
            selected: !!result
          }))
          .catch(error => ({
            testId: test.id,
            testName: test.name,
            error: error.message
          }))
      )
    );

    res.json({
      checked: runningTests.length,
      results
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// Variant Management
// ============================================

// PUT /api/ab-testing/variants/:id/traffic - Update variant traffic allocation
router.put('/variants/:id/traffic', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { trafficPercentage } = z.object({
      trafficPercentage: z.number().min(0).max(100)
    }).parse(req.body);

    // Get variant and test
    const variant = await prisma.journeyABTestVariant.findUnique({
      where: { id },
      include: { test: { include: { variants: true } } }
    });

    if (!variant) {
      return res.status(404).json({ error: 'Variant not found' });
    }

    // Calculate total traffic if we make this change
    const otherVariants = variant.test.variants.filter(v => v.id !== id);
    const totalTraffic = trafficPercentage + otherVariants.reduce((sum, v) => sum + v.trafficPercentage, 0);

    if (Math.abs(totalTraffic - 100) > 0.01) {
      return res.status(400).json({
        error: 'Traffic allocation must sum to 100%',
        currentTotal: totalTraffic
      });
    }

    const updatedVariant = await prisma.journeyABTestVariant.update({
      where: { id },
      data: { trafficPercentage }
    });

    res.json(updatedVariant);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    next(error);
  }
});

export { router as abTestingRouter };
