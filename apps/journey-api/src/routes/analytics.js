import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const router = Router();
const prisma = new PrismaClient();

// Validation schemas
const dateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  days: z.number().int().min(1).max(365).optional()
});

const eventSchema = z.object({
  journeyId: z.string().uuid(),
  touchpointId: z.string().uuid().optional(),
  clientId: z.string().uuid(),
  eventType: z.enum([
    'journey_started', 'journey_completed', 'journey_exited',
    'touchpoint_sent', 'touchpoint_delivered', 'touchpoint_opened',
    'touchpoint_clicked', 'touchpoint_replied', 'touchpoint_bounced',
    'touchpoint_unsubscribed', 'form_submitted', 'appointment_booked',
    'conversion', 'drop_off', 'ab_test_variant_shown'
  ]),
  eventData: z.record(z.any()).optional(),
  sessionId: z.string().optional(),
  contactId: z.string().optional(),
  metadata: z.record(z.any()).optional()
});

// Helper function to get date range
function getDateRange(query) {
  const now = new Date();
  let startDate, endDate;

  if (query.startDate && query.endDate) {
    startDate = new Date(query.startDate);
    endDate = new Date(query.endDate);
  } else {
    const days = parseInt(query.days) || 30;
    endDate = now;
    startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  }

  return { startDate, endDate };
}

// Helper function to generate time series data
function generateTimeSeries(startDate, endDate, dataPoints) {
  const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
  const series = [];

  for (let i = 0; i <= days; i++) {
    const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
    const dateStr = date.toISOString().split('T')[0];
    
    const point = dataPoints.find(p => {
      const pDate = new Date(p.date);
      return pDate.toISOString().split('T')[0] === dateStr;
    });

    series.push({
      date: dateStr,
      value: point ? parseFloat(point.value || point.count || 0) : 0
    });
  }

  return series;
}

// ============================================
// Dashboard Overview Endpoints
// ============================================

// GET /api/analytics/dashboard - Get overall dashboard metrics
router.get('/dashboard', async (req, res, next) => {
  try {
    const { clientId } = req.query;
    const { startDate, endDate } = getDateRange(req.query);

    // Build where clause
    const where = {
      date: {
        gte: startDate,
        lte: endDate
      }
    };

    if (clientId) {
      where.clientId = clientId;
    }

    // Aggregate metrics from client analytics summary
    const clientSummaries = await prisma.clientAnalyticsSummary.findMany({
      where,
      orderBy: { date: 'desc' }
    });

    // Aggregate from journey performance metrics for real-time data
    const journeyMetrics = await prisma.journeyPerformanceMetrics.findMany({
      where,
      include: {
        journey: {
          select: { name: true, category: true, status: true }
        }
      }
    });

    // Calculate overall metrics
    const totalJourneys = await prisma.journey.count({
      where: clientId ? { clientId } : {}
    });

    const activeJourneys = await prisma.journey.count({
      where: {
        ...(clientId && { clientId }),
        status: 'published'
      }
    });

    const totalTouchpoints = await prisma.touchpoint.count({
      where: {
        journey: {
          ...(clientId && { clientId })
        }
      }
    });

    // Aggregate metrics
    const aggregated = journeyMetrics.reduce((acc, metric) => {
      acc.totalContactsEntered += metric.totalContactsEntered;
      acc.totalContactsCompleted += metric.totalContactsCompleted;
      acc.totalContactsDropped += metric.totalContactsDropped;
      acc.totalConversions += metric.conversions;
      acc.totalTouchpointsSent += metric.touchpointsSent;
      acc.totalTouchpointsDelivered += metric.touchpointsDelivered;
      acc.totalTouchpointsOpened += metric.touchpointsOpened;
      acc.totalTouchpointsClicked += metric.touchpointsClicked;
      acc.totalRevenue += parseFloat(metric.totalValue || 0);
      return acc;
    }, {
      totalContactsEntered: 0,
      totalContactsCompleted: 0,
      totalContactsDropped: 0,
      totalConversions: 0,
      totalTouchpointsSent: 0,
      totalTouchpointsDelivered: 0,
      totalTouchpointsOpened: 0,
      totalTouchpointsClicked: 0,
      totalRevenue: 0
    });

    // Calculate rates
    const completionRate = aggregated.totalContactsEntered > 0
      ? (aggregated.totalContactsCompleted / aggregated.totalContactsEntered * 100).toFixed(2)
      : 0;

    const overallConversionRate = aggregated.totalContactsEntered > 0
      ? (aggregated.totalConversions / aggregated.totalContactsEntered * 100).toFixed(2)
      : 0;

    const openRate = aggregated.totalTouchpointsDelivered > 0
      ? (aggregated.totalTouchpointsOpened / aggregated.totalTouchpointsDelivered * 100).toFixed(2)
      : 0;

    const clickRate = aggregated.totalTouchpointsDelivered > 0
      ? (aggregated.totalTouchpointsClicked / aggregated.totalTouchpointsDelivered * 100).toFixed(2)
      : 0;

    const dropOffRate = aggregated.totalContactsEntered > 0
      ? (aggregated.totalContactsDropped / aggregated.totalContactsEntered * 100).toFixed(2)
      : 0;

    // Get top performing journeys
    const journeyPerformance = journeyMetrics.reduce((acc, metric) => {
      const existing = acc.find(j => j.journeyId === metric.journeyId);
      if (existing) {
        existing.conversions += metric.conversions;
        existing.contactsEntered += metric.totalContactsEntered;
        existing.conversionRate = existing.contactsEntered > 0
          ? (existing.conversions / existing.contactsEntered * 100).toFixed(2)
          : 0;
      } else {
        acc.push({
          journeyId: metric.journeyId,
          journeyName: metric.journey.name,
          category: metric.journey.category,
          status: metric.journey.status,
          conversions: metric.conversions,
          contactsEntered: metric.totalContactsEntered,
          conversionRate: metric.totalContactsEntered > 0
            ? (metric.conversions / metric.totalContactsEntered * 100).toFixed(2)
            : 0
        });
      }
      return acc;
    }, []);

    const topJourneys = journeyPerformance
      .sort((a, b) => b.conversions - a.conversions)
      .slice(0, 5);

    // Get daily trends
    const dailyMetrics = await prisma.journeyPerformanceMetrics.groupBy({
      by: ['date'],
      where,
      _sum: {
        totalContactsEntered: true,
        totalContactsCompleted: true,
        conversions: true,
        touchpointsSent: true,
        touchpointsOpened: true,
        touchpointsClicked: true
      },
      orderBy: { date: 'asc' }
    });

    const trends = dailyMetrics.map(day => ({
      date: day.date.toISOString().split('T')[0],
      contactsEntered: day._sum.totalContactsEntered || 0,
      contactsCompleted: day._sum.totalContactsCompleted || 0,
      conversions: day._sum.conversions || 0,
      touchpointsSent: day._sum.touchpointsSent || 0,
      touchpointsOpened: day._sum.touchpointsOpened || 0,
      touchpointsClicked: day._sum.touchpointsClicked || 0
    }));

    res.json({
      summary: {
        totalJourneys,
        activeJourneys,
        totalTouchpoints,
        totalContacts: aggregated.totalContactsEntered,
        totalConversions: aggregated.totalConversions,
        totalRevenue: aggregated.totalRevenue.toFixed(2),
        completionRate: parseFloat(completionRate),
        conversionRate: parseFloat(overallConversionRate),
        openRate: parseFloat(openRate),
        clickRate: parseFloat(clickRate),
        dropOffRate: parseFloat(dropOffRate)
      },
      topJourneys,
      trends,
      dateRange: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// Journey Analytics Endpoints
// ============================================

// GET /api/analytics/journeys/:id/metrics - Get detailed metrics for a specific journey
router.get('/journeys/:id/metrics', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { startDate, endDate } = getDateRange(req.query);

    // Get journey details
    const journey = await prisma.journey.findUnique({
      where: { id },
      include: {
        client: { select: { name: true, slug: true } },
        touchpoints: {
          orderBy: { orderIndex: 'asc' },
          select: { id: true, name: true, type: true, orderIndex: true }
        }
      }
    });

    if (!journey) {
      return res.status(404).json({ error: 'Journey not found' });
    }

    // Get performance metrics
    const metrics = await prisma.journeyPerformanceMetrics.findMany({
      where: {
        journeyId: id,
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: { date: 'asc' }
    });

    // Aggregate metrics
    const aggregated = metrics.reduce((acc, m) => {
      acc.totalContactsEntered += m.totalContactsEntered;
      acc.totalContactsCompleted += m.totalContactsCompleted;
      acc.totalContactsDropped += m.totalContactsDropped;
      acc.conversions += m.conversions;
      acc.touchpointsSent += m.touchpointsSent;
      acc.touchpointsDelivered += m.touchpointsDelivered;
      acc.touchpointsOpened += m.touchpointsOpened;
      acc.touchpointsClicked += m.touchpointsClicked;
      acc.totalValue += parseFloat(m.totalValue || 0);
      acc.avgTimeToCompletion += m.avgTimeToCompletionMinutes * m.totalContactsCompleted;
      acc.avgTimeToConversion += m.avgTimeToConversionMinutes * m.conversions;
      return acc;
    }, {
      totalContactsEntered: 0,
      totalContactsCompleted: 0,
      totalContactsDropped: 0,
      conversions: 0,
      touchpointsSent: 0,
      touchpointsDelivered: 0,
      touchpointsOpened: 0,
      touchpointsClicked: 0,
      totalValue: 0,
      avgTimeToCompletion: 0,
      avgTimeToConversion: 0
    });

    // Calculate rates
    const completionRate = aggregated.totalContactsEntered > 0
      ? (aggregated.totalContactsCompleted / aggregated.totalContactsEntered * 100).toFixed(2)
      : 0;

    const conversionRate = aggregated.totalContactsEntered > 0
      ? (aggregated.conversions / aggregated.totalContactsEntered * 100).toFixed(2)
      : 0;

    const openRate = aggregated.touchpointsDelivered > 0
      ? (aggregated.touchpointsOpened / aggregated.touchpointsDelivered * 100).toFixed(2)
      : 0;

    const clickRate = aggregated.touchpointsDelivered > 0
      ? (aggregated.touchpointsClicked / aggregated.touchpointsDelivered * 100).toFixed(2)
      : 0;

    const dropOffRate = aggregated.totalContactsEntered > 0
      ? (aggregated.totalContactsDropped / aggregated.totalContactsEntered * 100).toFixed(2)
      : 0;

    const avgTimeToCompletion = aggregated.totalContactsCompleted > 0
      ? Math.round(aggregated.avgTimeToCompletion / aggregated.totalContactsCompleted)
      : 0;

    const avgTimeToConversion = aggregated.conversions > 0
      ? Math.round(aggregated.avgTimeToConversion / aggregated.conversions)
      : 0;

    // Get touchpoint performance
    const touchpointMetrics = await prisma.touchpointPerformanceMetrics.findMany({
      where: {
        journeyId: id,
        date: {
          gte: startDate,
          lte: endDate
        }
      }
    });

    const touchpointStats = journey.touchpoints.map(tp => {
      const tpMetrics = touchpointMetrics.filter(m => m.touchpointId === tp.id);
      const aggregated = tpMetrics.reduce((acc, m) => {
        acc.sent += m.sent;
        acc.delivered += m.delivered;
        acc.opened += m.opened;
        acc.clicked += m.clicked;
        acc.replied += m.replied;
        acc.dropped += m.dropOffs;
        return acc;
      }, { sent: 0, delivered: 0, opened: 0, clicked: 0, replied: 0, dropped: 0 });

      return {
        touchpointId: tp.id,
        name: tp.name,
        type: tp.type,
        orderIndex: tp.orderIndex,
        ...aggregated,
        openRate: aggregated.delivered > 0 ? (aggregated.opened / aggregated.delivered * 100).toFixed(2) : 0,
        clickRate: aggregated.delivered > 0 ? (aggregated.clicked / aggregated.delivered * 100).toFixed(2) : 0,
        dropOffRate: aggregated.sent > 0 ? (aggregated.dropped / aggregated.sent * 100).toFixed(2) : 0
      };
    });

    // Get funnel stages
    const funnelStages = await prisma.journeyFunnelStage.findMany({
      where: {
        journeyId: id,
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: { stageOrder: 'asc' }
    });

    // Aggregate funnel data
    const funnelData = funnelStages.reduce((acc, stage) => {
      const existing = acc.find(s => s.stageName === stage.stageName);
      if (existing) {
        existing.enteredCount += stage.enteredCount;
        existing.completedCount += stage.completedCount;
        existing.droppedCount += stage.droppedCount;
        existing.conversionRate = existing.enteredCount > 0
          ? (existing.completedCount / existing.enteredCount * 100).toFixed(2)
          : 0;
      } else {
        acc.push({
          stageName: stage.stageName,
          stageOrder: stage.stageOrder,
          enteredCount: stage.enteredCount,
          completedCount: stage.completedCount,
          droppedCount: stage.droppedCount,
          conversionRate: stage.enteredCount > 0
            ? (stage.completedCount / stage.enteredCount * 100).toFixed(2)
            : 0,
          avgTimeInStage: stage.avgTimeInStageMinutes
        });
      }
      return acc;
    }, []);

    res.json({
      journey: {
        id: journey.id,
        name: journey.name,
        category: journey.category,
        status: journey.status,
        client: journey.client
      },
      metrics: {
        totalContactsEntered: aggregated.totalContactsEntered,
        totalContactsCompleted: aggregated.totalContactsCompleted,
        totalContactsDropped: aggregated.totalContactsDropped,
        conversions: aggregated.conversions,
        completionRate: parseFloat(completionRate),
        conversionRate: parseFloat(conversionRate),
        dropOffRate: parseFloat(dropOffRate),
        openRate: parseFloat(openRate),
        clickRate: parseFloat(clickRate),
        totalRevenue: aggregated.totalValue.toFixed(2),
        avgTimeToCompletion,
        avgTimeToConversion
      },
      touchpoints: touchpointStats,
      funnel: funnelData.sort((a, b) => a.stageOrder - b.stageOrder),
      dailyTrends: metrics.map(m => ({
        date: m.date.toISOString().split('T')[0],
        contactsEntered: m.totalContactsEntered,
        contactsCompleted: m.totalContactsCompleted,
        conversions: m.conversions,
        conversionRate: parseFloat(m.conversionRate || 0)
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

// GET /api/analytics/journeys/performance - Get performance comparison across journeys
router.get('/journeys/performance', async (req, res, next) => {
  try {
    const { clientId, category, limit = 10 } = req.query;
    const { startDate, endDate } = getDateRange(req.query);

    const where = {
      date: {
        gte: startDate,
        lte: endDate
      }
    };

    if (clientId) {
      where.clientId = clientId;
    }

    // Get all journey metrics
    const metrics = await prisma.journeyPerformanceMetrics.findMany({
      where,
      include: {
        journey: {
          select: { id: true, name: true, category: true, status: true, clientId: true }
        }
      }
    });

    // Filter by category if provided
    let filteredMetrics = metrics;
    if (category) {
      filteredMetrics = metrics.filter(m => m.journey.category === category);
    }

    // Aggregate by journey
    const journeyStats = filteredMetrics.reduce((acc, metric) => {
      const existing = acc.find(j => j.journeyId === metric.journeyId);
      if (existing) {
        existing.contactsEntered += metric.totalContactsEntered;
        existing.contactsCompleted += metric.totalContactsCompleted;
        existing.conversions += metric.conversions;
        existing.touchpointsSent += metric.touchpointsSent;
        existing.touchpointsOpened += metric.touchpointsOpened;
        existing.touchpointsClicked += metric.touchpointsClicked;
      } else {
        acc.push({
          journeyId: metric.journeyId,
          journeyName: metric.journey.name,
          category: metric.journey.category,
          status: metric.journey.status,
          clientId: metric.journey.clientId,
          contactsEntered: metric.totalContactsEntered,
          contactsCompleted: metric.totalContactsCompleted,
          conversions: metric.conversions,
          touchpointsSent: metric.touchpointsSent,
          touchpointsOpened: metric.touchpointsOpened,
          touchpointsClicked: metric.touchpointsClicked
        });
      }
      return acc;
    }, []);

    // Calculate rates and sort by conversion rate
    const performanceData = journeyStats
      .map(j => ({
        ...j,
        completionRate: j.contactsEntered > 0 ? (j.contactsCompleted / j.contactsEntered * 100).toFixed(2) : 0,
        conversionRate: j.contactsEntered > 0 ? (j.conversions / j.contactsEntered * 100).toFixed(2) : 0,
        openRate: j.touchpointsSent > 0 ? (j.touchpointsOpened / j.touchpointsSent * 100).toFixed(2) : 0,
        clickRate: j.touchpointsSent > 0 ? (j.touchpointsClicked / j.touchpointsSent * 100).toFixed(2) : 0
      }))
      .sort((a, b) => parseFloat(b.conversionRate) - parseFloat(a.conversionRate))
      .slice(0, parseInt(limit));

    res.json({
      journeys: performanceData,
      count: performanceData.length,
      dateRange: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// Touchpoint Analytics Endpoints
// ============================================

// GET /api/analytics/touchpoints/engagement - Get engagement metrics for touchpoints
router.get('/touchpoints/engagement', async (req, res, next) => {
  try {
    const { journeyId, clientId, type } = req.query;
    const { startDate, endDate } = getDateRange(req.query);

    const where = {
      date: {
        gte: startDate,
        lte: endDate
      }
    };

    if (journeyId) where.journeyId = journeyId;
    if (clientId) where.clientId = clientId;

    const metrics = await prisma.touchpointPerformanceMetrics.findMany({
      where,
      include: {
        touchpoint: {
          select: { name: true, type: true }
        },
        journey: {
          select: { name: true }
        }
      }
    });

    // Filter by type if provided
    let filteredMetrics = metrics;
    if (type) {
      filteredMetrics = metrics.filter(m => m.touchpoint?.type === type);
    }

    // Aggregate by touchpoint
    const touchpointStats = filteredMetrics.reduce((acc, metric) => {
      const existing = acc.find(t => t.touchpointId === metric.touchpointId);
      if (existing) {
        existing.sent += metric.sent;
        existing.delivered += metric.delivered;
        existing.opened += metric.opened;
        existing.clicked += metric.clicked;
        existing.replied += metric.replied;
        existing.bounced += metric.bounced;
        existing.dropOffs += metric.dropOffs;
      } else {
        acc.push({
          touchpointId: metric.touchpointId,
          touchpointName: metric.touchpoint?.name || 'Unknown',
          type: metric.touchpoint?.type || 'unknown',
          journeyName: metric.journey?.name || 'Unknown',
          sent: metric.sent,
          delivered: metric.delivered,
          opened: metric.opened,
          clicked: metric.clicked,
          replied: metric.replied,
          bounced: metric.bounced,
          dropOffs: metric.dropOffs
        });
      }
      return acc;
    }, []);

    // Calculate rates
    const engagementData = touchpointStats.map(t => ({
      ...t,
      deliveryRate: t.sent > 0 ? (t.delivered / t.sent * 100).toFixed(2) : 0,
      openRate: t.delivered > 0 ? (t.opened / t.delivered * 100).toFixed(2) : 0,
      clickRate: t.delivered > 0 ? (t.clicked / t.delivered * 100).toFixed(2) : 0,
      replyRate: t.delivered > 0 ? (t.replied / t.delivered * 100).toFixed(2) : 0,
      bounceRate: t.sent > 0 ? (t.bounced / t.sent * 100).toFixed(2) : 0,
      dropOffRate: t.sent > 0 ? (t.dropOffs / t.sent * 100).toFixed(2) : 0
    }));

    res.json({
      touchpoints: engagementData,
      summary: {
        totalSent: engagementData.reduce((sum, t) => sum + t.sent, 0),
        totalDelivered: engagementData.reduce((sum, t) => sum + t.delivered, 0),
        totalOpened: engagementData.reduce((sum, t) => sum + t.opened, 0),
        totalClicked: engagementData.reduce((sum, t) => sum + t.clicked, 0),
        avgOpenRate: engagementData.length > 0
          ? (engagementData.reduce((sum, t) => sum + parseFloat(t.openRate), 0) / engagementData.length).toFixed(2)
          : 0,
        avgClickRate: engagementData.length > 0
          ? (engagementData.reduce((sum, t) => sum + parseFloat(t.clickRate), 0) / engagementData.length).toFixed(2)
          : 0
      },
      dateRange: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// A/B Testing Analytics Endpoints
// ============================================

// GET /api/analytics/ab-tests - Get A/B test results
router.get('/ab-tests', async (req, res, next) => {
  try {
    const { journeyId, clientId, status } = req.query;
    const { startDate, endDate } = getDateRange(req.query);

    const where = {};

    if (journeyId) where.journeyId = journeyId;
    if (clientId) where.clientId = clientId;
    if (status) where.status = status;

    const tests = await prisma.aBTestResult.findMany({
      where,
      include: {
        journey: {
          select: { name: true, category: true }
        },
        touchpoint: {
          select: { name: true, type: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Group by test name
    const groupedTests = tests.reduce((acc, test) => {
      const key = `${test.journeyId}-${test.testName}`;
      if (!acc[key]) {
        acc[key] = {
          testName: test.testName,
          journeyId: test.journeyId,
          journeyName: test.journey?.name,
          touchpointName: test.touchpoint?.name,
          status: test.status,
          startDate: test.startDate,
          endDate: test.endDate,
          variants: []
        };
      }
      acc[key].variants.push({
        variantName: test.variantName,
        variantType: test.variantType,
        participants: test.participants,
        conversions: test.conversions,
        conversionRate: parseFloat(test.conversionRate),
        clicks: test.clicks,
        clickRate: parseFloat(test.clickRate),
        opens: test.opens,
        openRate: parseFloat(test.openRate),
        isWinner: test.isWinner,
        confidenceLevel: parseFloat(test.confidenceLevel),
        improvementPercentage: parseFloat(test.improvementPercentage)
      });
      return acc;
    }, {});

    const testResults = Object.values(groupedTests).map(test => ({
      ...test,
      totalParticipants: test.variants.reduce((sum, v) => sum + v.participants, 0),
      totalConversions: test.variants.reduce((sum, v) => sum + v.conversions, 0),
      winner: test.variants.find(v => v.isWinner)?.variantName || null
    }));

    res.json({
      tests: testResults,
      count: testResults.length
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// Drop-off Analysis Endpoints
// ============================================

// GET /api/analytics/drop-offs - Get drop-off analysis
router.get('/drop-offs', async (req, res, next) => {
  try {
    const { journeyId, clientId } = req.query;
    const { startDate, endDate } = getDateRange(req.query);

    const where = {
      date: {
        gte: startDate,
        lte: endDate
      }
    };

    if (journeyId) where.journeyId = journeyId;
    if (clientId) where.clientId = clientId;

    // Get funnel stages with drop-offs
    const funnelStages = await prisma.journeyFunnelStage.findMany({
      where,
      include: {
        journey: {
          select: { name: true, category: true }
        }
      },
      orderBy: { stageOrder: 'asc' }
    });

    // Aggregate drop-offs by stage
    const dropOffAnalysis = funnelStages.reduce((acc, stage) => {
      const key = `${stage.journeyId}-${stage.stageName}`;
      if (!acc[key]) {
        acc[key] = {
          journeyId: stage.journeyId,
          journeyName: stage.journey?.name,
          stageName: stage.stageName,
          stageOrder: stage.stageOrder,
          totalEntered: 0,
          totalDropped: 0,
          avgTimeInStage: 0
        };
      }
      acc[key].totalEntered += stage.enteredCount;
      acc[key].totalDropped += stage.droppedCount;
      acc[key].avgTimeInStage += stage.avgTimeInStageMinutes;
      return acc;
    }, {});

    const dropOffData = Object.values(dropOffAnalysis).map(stage => ({
      ...stage,
      dropOffRate: stage.totalEntered > 0
        ? (stage.totalDropped / stage.totalEntered * 100).toFixed(2)
        : 0,
      avgTimeInStage: stage.totalEntered > 0
        ? Math.round(stage.avgTimeInStage / stage.totalEntered)
        : 0
    })).sort((a, b) => parseFloat(b.dropOffRate) - parseFloat(a.dropOffRate));

    // Get touchpoint drop-offs
    const touchpointMetrics = await prisma.touchpointPerformanceMetrics.findMany({
      where,
      include: {
        touchpoint: {
          select: { name: true, type: true }
        },
        journey: {
          select: { name: true }
        }
      }
    });

    const touchpointDropOffs = touchpointMetrics
      .filter(m => m.dropOffs > 0)
      .map(m => ({
        touchpointId: m.touchpointId,
        touchpointName: m.touchpoint?.name,
        type: m.touchpoint?.type,
        journeyName: m.journey?.name,
        sent: m.sent,
        dropOffs: m.dropOffs,
        dropOffRate: m.sent > 0 ? (m.dropOffs / m.sent * 100).toFixed(2) : 0
      }))
      .sort((a, b) => parseFloat(b.dropOffRate) - parseFloat(a.dropOffRate));

    res.json({
      funnelStages: dropOffData,
      touchpoints: touchpointDropOffs,
      summary: {
        totalDropOffs: dropOffData.reduce((sum, s) => sum + s.totalDropped, 0),
        highestDropOffStage: dropOffData[0]?.stageName || null,
        highestDropOffRate: dropOffData[0]?.dropOffRate || 0
      },
      dateRange: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// Event Tracking Endpoints
// ============================================

// POST /api/analytics/events - Track an analytics event
router.post('/events', async (req, res, next) => {
  try {
    const data = eventSchema.parse(req.body);

    const event = await prisma.journeyAnalyticsEvent.create({
      data: {
        journeyId: data.journeyId,
        touchpointId: data.touchpointId,
        clientId: data.clientId,
        eventType: data.eventType,
        eventData: data.eventData || {},
        sessionId: data.sessionId,
        contactId: data.contactId,
        metadata: data.metadata || {}
      }
    });

    res.status(201).json(event);
  } catch (error) {
    next(error);
  }
});

// POST /api/analytics/events/batch - Batch track events
router.post('/events/batch', async (req, res, next) => {
  try {
    const { events } = z.object({
      events: z.array(eventSchema)
    }).parse(req.body);

    const createdEvents = await prisma.$transaction(
      events.map(event =>
        prisma.journeyAnalyticsEvent.create({
          data: {
            journeyId: event.journeyId,
            touchpointId: event.touchpointId,
            clientId: event.clientId,
            eventType: event.eventType,
            eventData: event.eventData || {},
            sessionId: event.sessionId,
            contactId: event.contactId,
            metadata: event.metadata || {}
          }
        })
      )
    );

    res.status(201).json({
      count: createdEvents.length,
      events: createdEvents
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/analytics/events - Query events
router.get('/events', async (req, res, next) => {
  try {
    const { journeyId, touchpointId, clientId, eventType, contactId, limit = 100, offset = 0 } = req.query;
    const { startDate, endDate } = getDateRange(req.query);

    const where = {
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    };

    if (journeyId) where.journeyId = journeyId;
    if (touchpointId) where.touchpointId = touchpointId;
    if (clientId) where.clientId = clientId;
    if (eventType) where.eventType = eventType;
    if (contactId) where.contactId = contactId;

    const [events, total] = await Promise.all([
      prisma.journeyAnalyticsEvent.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit),
        skip: parseInt(offset),
        include: {
          journey: {
            select: { name: true }
          },
          touchpoint: {
            select: { name: true }
          }
        }
      }),
      prisma.journeyAnalyticsEvent.count({ where })
    ]);

    res.json({
      events,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: total > parseInt(offset) + parseInt(limit)
      },
      dateRange: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// Client Summary Endpoints
// ============================================

// GET /api/analytics/clients/:id/summary - Get client analytics summary
router.get('/clients/:id/summary', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { startDate, endDate } = getDateRange(req.query);

    // Get client info
    const client = await prisma.client.findUnique({
      where: { id },
      select: { id: true, name: true, slug: true, industry: true }
    });

    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    // Get summary data
    const summaries = await prisma.clientAnalyticsSummary.findMany({
      where: {
        clientId: id,
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: { date: 'asc' }
    });

    // Aggregate metrics
    const aggregated = summaries.reduce((acc, s) => {
      acc.totalJourneyRuns += s.totalJourneyRuns;
      acc.totalConversions += s.totalConversions;
      acc.totalTouchpointsSent += s.totalTouchpointsSent;
      acc.totalRevenue += parseFloat(s.totalRevenue || 0);
      acc.avgOpenRate += parseFloat(s.avgOpenRate);
      acc.avgClickRate += parseFloat(s.avgClickRate);
      acc.count++;
      return acc;
    }, {
      totalJourneyRuns: 0,
      totalConversions: 0,
      totalTouchpointsSent: 0,
      totalRevenue: 0,
      avgOpenRate: 0,
      avgClickRate: 0,
      count: 0
    });

    // Get active journeys count
    const activeJourneys = await prisma.journey.count({
      where: {
        clientId: id,
        status: 'published'
      }
    });

    res.json({
      client,
      summary: {
        activeJourneys,
        totalJourneyRuns: aggregated.totalJourneyRuns,
        totalConversions: aggregated.totalConversions,
        overallConversionRate: aggregated.totalJourneyRuns > 0
          ? (aggregated.totalConversions / aggregated.totalJourneyRuns * 100).toFixed(2)
          : 0,
        totalTouchpointsSent: aggregated.totalTouchpointsSent,
        avgOpenRate: aggregated.count > 0 ? (aggregated.avgOpenRate / aggregated.count).toFixed(2) : 0,
        avgClickRate: aggregated.count > 0 ? (aggregated.avgClickRate / aggregated.count).toFixed(2) : 0,
        totalRevenue: aggregated.totalRevenue.toFixed(2)
      },
      dailyBreakdown: summaries.map(s => ({
        date: s.date.toISOString().split('T')[0],
        journeyRuns: s.totalJourneyRuns,
        conversions: s.totalConversions,
        conversionRate: parseFloat(s.overallConversionRate),
        touchpointsSent: s.totalTouchpointsSent,
        openRate: parseFloat(s.avgOpenRate),
        clickRate: parseFloat(s.avgClickRate),
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

// ============================================
// Real-time Metrics Endpoints
// ============================================

// GET /api/analytics/realtime - Get real-time metrics
router.get('/realtime', async (req, res, next) => {
  try {
    const { clientId, journeyId } = req.query;

    // Get events from the last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const where = {
      createdAt: {
        gte: oneHourAgo
      }
    };

    if (clientId) where.clientId = clientId;
    if (journeyId) where.journeyId = journeyId;

    // Get recent events
    const recentEvents = await prisma.journeyAnalyticsEvent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    // Get active users (unique sessions in last 5 minutes)
    const activeSessions = await prisma.journeyAnalyticsEvent.groupBy({
      by: ['sessionId'],
      where: {
        ...where,
        createdAt: { gte: fiveMinutesAgo },
        sessionId: { not: null }
      }
    });

    // Calculate event counts by type
    const eventCounts = recentEvents.reduce((acc, event) => {
      acc[event.eventType] = (acc[event.eventType] || 0) + 1;
      return acc;
    }, {});

    res.json({
      activeSessions: activeSessions.length,
      recentEvents: recentEvents.slice(0, 20),
      eventCounts,
      timeWindow: {
        start: oneHourAgo.toISOString(),
        end: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
});

export { router as analyticsRouter };
