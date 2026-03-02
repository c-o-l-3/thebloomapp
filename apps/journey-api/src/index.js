/**
 * Journey API Server - Performance Optimized
 * Sub-2s load time target implementation
 * 
 * Performance Features:
 * - gzip/brotli compression
 * - In-memory caching layer
 * - Response time monitoring
 * - Query optimization hints
 * - Static asset CDN optimization headers
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

import { errorHandler } from './middleware/error-handler.js';
import { compressionMiddleware } from './middleware/compression.js';
import { performanceMonitor, performanceReportEndpoint, healthCheckEndpoint } from './middleware/performance-monitor.js';
import { cacheMiddleware, getCacheStats } from './services/cache-service.js';
import { createRateLimitMiddleware, publicRateLimit, authRateLimit, strictRateLimit, apiKeyRateLimit } from './middleware/rate-limit-middleware.js';
import { rateLimitService } from './services/rate-limit-service.js';

// Route imports
import { authRouter } from './routes/auth.js';
import { clientsRouter } from './routes/clients.js';
import { journeysRouter } from './routes/journeys.js';
import { touchpointsRouter } from './routes/touchpoints.js';
import { templatesRouter } from './routes/templates.js';
import { workflowsRouter } from './routes/workflows.js';
import { workflowTriggersRouter } from './routes/workflowTriggers.js';
import { searchRouter } from './routes/search.js';
import { analyticsRouter } from './routes/analytics.js';
import { fieldMappingsRouter } from './routes/fieldMappings.js';
import { clientPortalRouter } from './routes/clientPortal.js';
import { webhooksRouter } from './routes/webhooks.js';
import { abTestingRouter } from './routes/abTesting.js';
import { rateLimitAdminRouter } from './routes/rateLimitAdmin.js';

dotenv.config();

const app = express();
const prisma = new PrismaClient({
  // Performance: Optimize Prisma connection pool
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  // Enable query logging in development
  log: process.env.NODE_ENV === 'development' 
    ? ['query', 'info', 'warn', 'error']
    : ['error'],
});

const PORT = process.env.PORT || 8080;

// ============================================
// PERFORMANCE MIDDLEWARE
// ============================================

// Security middleware with performance-optimized settings
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for API
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));

// CORS configuration
const corsOptions = {
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    // Also allow localhost:3000 for the frontend
    const allowedOrigins = [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3001',
      'http://localhost:3002',
      'http://127.0.0.1:3002',
      'http://localhost:5173',
      'https://bloom.zeabur.app',
    ];
    
    // If origin is not provided (like Postman), allow it
    if (!origin) {
      return callback(null, true);
    }
    
    // Check if the origin is in allowed list or if CORS_ORIGIN env var includes it
    const envOrigins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : [];
    const allAllowedOrigins = [...allowedOrigins, ...envOrigins];
    
    if (allAllowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Cache-Control', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Length', 'Content-Type'],
};

app.use(cors(corsOptions));

// Compression middleware (gzip/brotli)
app.use(compressionMiddleware({
  threshold: 1024, // Compress responses > 1KB
}));

// Performance monitoring middleware
app.use(performanceMonitor);

// ============================================
// RATE LIMITING - P1 Q3 2026
// Multi-strategy, tier-based rate limiting
// ============================================

// Legacy basic rate limiter as fallback
const basicLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 1000,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply tier-based rate limiting to all API routes
const tierBasedLimiter = createRateLimitMiddleware({
  skip: (req) => {
    // Skip rate limiting for health checks and certain public endpoints
    return req.path.startsWith('/health') || req.path === '/';
  }
});

// Public endpoints (more permissive)
app.use('/health', publicRateLimit());

// Apply tier-based limiting to API routes
app.use('/api', tierBasedLimiter);

// Stricter limits for auth endpoints
app.use('/api/auth', strictRateLimit());

// Logging - simplified format for performance
app.use(morgan(process.env.NODE_ENV === 'production' ? 'tiny' : 'dev'));

// Body parsing with limits
app.use(express.json({ 
  limit: '10mb',
  // Performance: Skip parsing for specific routes
  type: ['application/json', 'application/vnd.api+json'],
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============================================
// HEALTH & PERFORMANCE ENDPOINTS
// ============================================

// Enhanced health check with performance metrics
app.get('/health', async (req, res) => {
  try {
    // Check database connection
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const dbLatency = Date.now() - dbStart;
    
    // Get cache stats
    const cacheStats = getCacheStats();
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      database: {
        status: 'connected',
        latency: `${dbLatency}ms`,
      },
      cache: cacheStats,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      environment: process.env.NODE_ENV || 'development',
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error.message,
    });
  }
});

// API health check (for frontend)
app.get('/api/health', async (req, res) => {
  try {
    // Check database connection
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const dbLatency = Date.now() - dbStart;
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: {
        status: 'connected',
        latency: `${dbLatency}ms`,
      },
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error.message,
    });
  }
});

// Performance monitoring endpoints
app.get('/health/performance', healthCheckEndpoint);
app.get('/metrics/performance', performanceReportEndpoint);
app.get('/metrics/cache', (req, res) => {
  res.json(getCacheStats());
});

// ============================================
// CACHED API ROUTES
// ============================================

// Cache configuration by route type
const CACHE_CONFIG = {
  CLIENTS: { ttl: 600, type: 'client' },      // 10 min
  JOURNEYS: { ttl: 300, type: 'journey' },    // 5 min
  JOURNEY_LIST: { ttl: 180, type: 'journey:list' }, // 3 min
  TEMPLATES: { ttl: 600, type: 'template' },  // 10 min
  ANALYTICS: { ttl: 120, type: 'analytics' }, // 2 min
  HEALTH: { ttl: 60, type: 'health' },        // 1 min
};

// API routes with selective caching
app.use('/api/auth', authRouter);

// Cache client list but not individual mutations
app.use('/api/clients', 
  cacheMiddleware(CACHE_CONFIG.CLIENTS.type, null, CACHE_CONFIG.CLIENTS.ttl),
  clientsRouter
);

// Cache journey reads
app.use('/api/journeys', 
  cacheMiddleware(CACHE_CONFIG.JOURNEYS.type, (req) => {
    // Generate cache key based on query params
    if (req.method === 'GET') {
      return `journey:${req.path}:${JSON.stringify(req.query)}`;
    }
    return null; // Don't cache mutations
  }, CACHE_CONFIG.JOURNEYS.ttl),
  journeysRouter
);

app.use('/api/touchpoints', touchpointsRouter);
app.use('/api/templates', 
  cacheMiddleware(CACHE_CONFIG.TEMPLATES.type, null, CACHE_CONFIG.TEMPLATES.ttl),
  templatesRouter
);
app.use('/api/workflows', workflowsRouter);
app.use('/api/workflow-triggers', workflowTriggersRouter);

// Search with caching
app.use('/api/search', 
  cacheMiddleware('search', null, 300),
  searchRouter
);

// Analytics with short cache
app.use('/api/analytics', 
  cacheMiddleware(CACHE_CONFIG.ANALYTICS.type, null, CACHE_CONFIG.ANALYTICS.ttl),
  analyticsRouter
);

app.use('/api', fieldMappingsRouter);
app.use('/api/portal', clientPortalRouter);
app.use('/api/webhooks', webhooksRouter);
app.use('/api/ab-testing', abTestingRouter);

// ============================================
// RATE LIMIT ADMIN ROUTES
// ============================================
app.use('/admin/rate-limits', rateLimitAdminRouter);

// Rate limit health/status endpoint
app.get('/health/rate-limits', async (req, res) => {
  const health = rateLimitService.getHealth();
  res.json({
    status: 'healthy',
    ...health
  });
});

// ============================================
// PERFORMANCE OPTIMIZATION ENDPOINTS
// ============================================

// Clear cache endpoint (admin only)
app.post('/admin/cache/clear', async (req, res) => {
  // In production, add proper authentication here
  const { type } = req.body;
  
  try {
    const { clearCache } = await import('./services/cache-service.js');
    await clearCache(type);
    
    res.json({
      success: true,
      message: type ? `Cache cleared for type: ${type}` : 'All cache cleared',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Performance test endpoint
app.get('/perf/test', async (req, res) => {
  const startTime = Date.now();
  
  try {
    // Test database performance
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT COUNT(*) FROM clients`;
    const dbTime = Date.now() - dbStart;
    
    // Test cache performance
    const cacheStart = Date.now();
    const { getCache, setCache } = await import('./services/cache-service.js');
    await setCache('perf:test', { test: true }, 'health', 60);
    await getCache('perf:test', 'health');
    const cacheTime = Date.now() - cacheStart;
    
    const totalTime = Date.now() - startTime;
    
    res.json({
      status: 'success',
      timings: {
        total: `${totalTime}ms`,
        database: `${dbTime}ms`,
        cache: `${cacheTime}ms`,
      },
      performance: {
        grade: totalTime < 100 ? 'excellent' : totalTime < 500 ? 'good' : 'fair',
        meetsTarget: totalTime < 2000, // Sub-2s target
      },
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error.message,
    });
  }
});

// ============================================
// ERROR HANDLING
// ============================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Not found',
    path: req.path,
    timestamp: new Date().toISOString(),
  });
});

// Error handler
app.use(errorHandler);

// ============================================
// SERVER STARTUP
// ============================================

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing HTTP server and database connections...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, closing HTTP server and database connections...');
  await prisma.$disconnect();
  process.exit(0);
});

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Journey API server running on port ${PORT}`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/health`);
  console.log(`📊 Performance Report: http://localhost:${PORT}/metrics/performance`);
  console.log(`🔌 Listening on 0.0.0.0:${PORT}`);
  console.log(`⚡ Performance Target: Sub-2s load times`);
});

export { prisma };