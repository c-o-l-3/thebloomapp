/**
 * Query Optimizer Service
 * Provides query optimization hints, slow query detection, and performance recommendations
 * Ensures sub-2s query execution times
 */

import { PrismaClient } from '@prisma/client';

// Query performance thresholds (ms)
const THRESHOLDS = {
  EXCELLENT: 100,
  GOOD: 500,
  FAIR: 1000,
  SLOW: 2000,
  CRITICAL: 5000,
};

// Query statistics
const queryStats = {
  totalQueries: 0,
  slowQueries: [],
  averageTime: 0,
  queriesByModel: new Map(),
};

/**
 * Measure query execution time
 */
export async function measureQuery(name, queryFn) {
  const start = Date.now();
  
  try {
    const result = await queryFn();
    const duration = Date.now() - start;
    
    recordQuery(name, duration);
    
    return {
      result,
      duration,
      performance: categorizePerformance(duration),
    };
  } catch (error) {
    const duration = Date.now() - start;
    recordQuery(name, duration, true);
    throw error;
  }
}

/**
 * Categorize query performance
 */
function categorizePerformance(duration) {
  if (duration <= THRESHOLDS.EXCELLENT) return 'excellent';
  if (duration <= THRESHOLDS.GOOD) return 'good';
  if (duration <= THRESHOLDS.FAIR) return 'fair';
  if (duration <= THRESHOLDS.SLOW) return 'slow';
  return 'critical';
}

/**
 * Record query statistics
 */
function recordQuery(name, duration, isError = false) {
  queryStats.totalQueries++;
  
  // Track by model
  const model = name.split(':')[0];
  if (!queryStats.queriesByModel.has(model)) {
    queryStats.queriesByModel.set(model, {
      count: 0,
      totalTime: 0,
      slowQueries: 0,
    });
  }
  
  const modelStats = queryStats.queriesByModel.get(model);
  modelStats.count++;
  modelStats.totalTime += duration;
  
  if (duration > THRESHOLDS.SLOW) {
    modelStats.slowQueries++;
    queryStats.slowQueries.push({
      name,
      duration,
      timestamp: new Date().toISOString(),
      isError,
    });
    
    // Keep only recent slow queries
    if (queryStats.slowQueries.length > 100) {
      queryStats.slowQueries.shift();
    }
  }
  
  // Update average
  queryStats.averageTime = 
    (queryStats.averageTime * (queryStats.totalQueries - 1) + duration) / 
    queryStats.totalQueries;
}

/**
 * Optimized query builders with includes
 */
export const optimizedQueries = {
  /**
   * Get client with optimized includes
   */
  async getClientWithData(prisma, clientId, options = {}) {
    const { 
      includeJourneys = false, 
      includeTemplates = false,
      journeyLimit = 50,
    } = options;
    
    return measureQuery('client:getWithData', () =>
      prisma.client.findUnique({
        where: { id: clientId },
        include: {
          journeys: includeJourneys ? {
            take: journeyLimit,
            orderBy: { updatedAt: 'desc' },
            select: {
              id: true,
              name: true,
              status: true,
              category: true,
              updatedAt: true,
              _count: { select: { touchpoints: true } },
            },
          } : false,
          templates: includeTemplates ? {
            take: 20,
            orderBy: { updatedAt: 'desc' },
            select: {
              id: true,
              name: true,
              type: true,
              status: true,
            },
          } : false,
          _count: {
            select: {
              journeys: true,
              templates: true,
              workflows: true,
            },
          },
        },
      })
    );
  },
  
  /**
   * Get journey with touchpoints (optimized)
   */
  async getJourneyWithTouchpoints(prisma, journeyId) {
    return measureQuery('journey:getWithTouchpoints', () =>
      prisma.journey.findUnique({
        where: { id: journeyId },
        include: {
          client: {
            select: { id: true, name: true, slug: true },
          },
          pipeline: {
            select: { id: true, name: true },
          },
          touchpoints: {
            orderBy: { orderIndex: 'asc' },
            select: {
              id: true,
              name: true,
              type: true,
              orderIndex: true,
              content: true,
              status: true,
              position: true,
              ghlTemplateId: true,
            },
          },
          versions: {
            orderBy: { version: 'desc' },
            take: 5,
            select: {
              id: true,
              version: true,
              createdAt: true,
              changeLog: true,
            },
          },
        },
      })
    );
  },
  
  /**
   * Get paginated journeys list
   */
  async getJourneysList(prisma, options = {}) {
    const {
      clientId,
      status,
      category,
      search,
      page = 1,
      pageSize = 20,
    } = options;
    
    const where = {};
    if (clientId) where.clientId = clientId;
    if (status) where.status = status;
    if (category) where.category = category;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }
    
    const skip = (page - 1) * pageSize;
    
    return measureQuery('journey:getList', () =>
      prisma.$transaction([
        prisma.journey.findMany({
          where,
          skip,
          take: pageSize,
          orderBy: { updatedAt: 'desc' },
          include: {
            client: {
              select: { id: true, name: true, slug: true },
            },
            pipeline: {
              select: { id: true, name: true },
            },
            _count: {
              select: { touchpoints: true },
            },
          },
        }),
        prisma.journey.count({ where }),
      ])
    );
  },
  
  /**
   * Get analytics with optimized aggregations
   */
  async getAnalyticsSummary(prisma, clientId, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    return measureQuery('analytics:getSummary', () =>
      prisma.$transaction([
        // Journey metrics aggregation
        prisma.journeyPerformanceMetrics.groupBy({
          by: ['journeyId'],
          where: {
            clientId,
            date: { gte: startDate },
          },
          _sum: {
            totalContactsEntered: true,
            totalContactsCompleted: true,
            conversions: true,
            touchpointsSent: true,
            touchpointsOpened: true,
            touchpointsClicked: true,
          },
        }),
        // Touchpoint metrics
        prisma.touchpointPerformanceMetrics.groupBy({
          by: ['touchpointId'],
          where: {
            clientId,
            date: { gte: startDate },
          },
          _sum: {
            sent: true,
            delivered: true,
            opened: true,
            clicked: true,
          },
        }),
      ])
    );
  },
  
  /**
   * Search with text index optimization
   */
  async searchContent(prisma, query, options = {}) {
    const { 
      type = 'all', 
      clientId,
      limit = 20,
    } = options;
    
    const searchPattern = `%${query}%`;
    
    return measureQuery('search:content', async () => {
      const results = { journeys: [], templates: [], touchpoints: [] };
      
      if (type === 'all' || type === 'journey') {
        results.journeys = await prisma.journey.findMany({
          where: {
            ...(clientId && { clientId }),
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { description: { contains: query, mode: 'insensitive' } },
            ],
          },
          take: limit,
          select: {
            id: true,
            name: true,
            description: true,
            status: true,
            client: { select: { name: true } },
          },
        });
      }
      
      if (type === 'all' || type === 'template') {
        results.templates = await prisma.template.findMany({
          where: {
            ...(clientId && { clientId }),
            name: { contains: query, mode: 'insensitive' },
          },
          take: limit,
          select: {
            id: true,
            name: true,
            type: true,
            status: true,
          },
        });
      }
      
      return results;
    });
  },
};

/**
 * Get query performance report
 */
export function getQueryPerformanceReport() {
  const modelStats = {};
  
  for (const [model, stats] of queryStats.queriesByModel) {
    modelStats[model] = {
      ...stats,
      averageTime: stats.count > 0 ? (stats.totalTime / stats.count).toFixed(2) : 0,
      slowQueryRate: stats.count > 0 ? ((stats.slowQueries / stats.count) * 100).toFixed(2) : 0,
    };
  }
  
  return {
    summary: {
      totalQueries: queryStats.totalQueries,
      averageTime: queryStats.averageTime.toFixed(2),
      slowQueries: queryStats.slowQueries.length,
      slowQueryRate: queryStats.totalQueries > 0 
        ? ((queryStats.slowQueries.length / queryStats.totalQueries) * 100).toFixed(2)
        : 0,
    },
    models: modelStats,
    recentSlowQueries: queryStats.slowQueries.slice(-10),
    thresholds: THRESHOLDS,
  };
}

/**
 * Database index recommendations
 */
export function getIndexRecommendations() {
  return [
    {
      table: 'journey_analytics_events',
      columns: ['clientId', 'eventType', 'createdAt'],
      reason: 'Frequently queried together for analytics dashboards',
      priority: 'high',
    },
    {
      table: 'journey_performance_metrics',
      columns: ['journeyId', 'date'],
      reason: 'Daily aggregation queries',
      priority: 'high',
    },
    {
      table: 'touchpoints',
      columns: ['journeyId', 'orderIndex'],
      reason: 'Journey loading with ordered touchpoints',
      priority: 'medium',
    },
    {
      table: 'webhook_deliveries',
      columns: ['clientId', 'eventType', 'createdAt'],
      reason: 'Webhook delivery lookups',
      priority: 'medium',
    },
  ];
}

/**
 * Get optimization recommendations
 */
export function getOptimizationRecommendations() {
  const recommendations = [];
  
  // Check for slow queries
  if (queryStats.slowQueries.length > 10) {
    recommendations.push({
      type: 'query',
      priority: 'high',
      message: `${queryStats.slowQueries.length} slow queries detected. Consider adding indexes or optimizing query patterns.`,
    });
  }
  
  // Check for high average time
  if (queryStats.averageTime > THRESHOLDS.SLOW) {
    recommendations.push({
      type: 'performance',
      priority: 'critical',
      message: `Average query time (${queryStats.averageTime.toFixed(0)}ms) exceeds threshold (${THRESHOLDS.SLOW}ms).`,
    });
  }
  
  return recommendations;
}

export default {
  measureQuery,
  optimizedQueries,
  getReport: getQueryPerformanceReport,
  getRecommendations: getOptimizationRecommendations,
  getIndexRecommendations,
};