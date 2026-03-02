/**
 * Performance Monitoring Middleware
 * Tracks API response times, throughput, and performance metrics
 * Enables sub-2s load time monitoring and alerting
 */

import { performance } from 'perf_hooks';

// Performance metrics storage
const metrics = {
  requests: {
    total: 0,
    successful: 0,
    failed: 0,
  },
  responseTimes: [],
  endpoints: new Map(),
  errors: new Map(),
  throughput: {
    requestsPerMinute: 0,
    lastMinuteRequests: [],
  },
  startTime: Date.now(),
};

// Configuration
const CONFIG = {
  // Slow request threshold (ms)
  slowRequestThreshold: 2000,
  
  // Maximum response times to store
  maxResponseTimes: 1000,
  
  // Alert threshold for error rate
  errorRateThreshold: 0.05, // 5%
  
  // Alert threshold for p95 response time
  p95Threshold: 2000, // 2 seconds
  
  // Enable detailed endpoint tracking
  trackEndpoints: true,
};

/**
 * Calculate percentile from sorted array
 */
function calculatePercentile(sortedArray, percentile) {
  if (sortedArray.length === 0) return 0;
  const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
  return sortedArray[Math.max(0, index)];
}

/**
 * Get performance statistics
 */
export function getPerformanceStats() {
  const now = Date.now();
  const uptime = now - metrics.startTime;
  
  // Calculate response time statistics
  const sortedTimes = [...metrics.responseTimes].sort((a, b) => a - b);
  
  const stats = {
    uptime: uptime,
    uptimeFormatted: formatUptime(uptime),
    requests: {
      ...metrics.requests,
      errorRate: metrics.requests.total > 0 
        ? (metrics.requests.failed / metrics.requests.total).toFixed(4)
        : 0,
    },
    responseTimes: {
      count: sortedTimes.length,
      min: sortedTimes[0] || 0,
      max: sortedTimes[sortedTimes.length - 1] || 0,
      mean: sortedTimes.length > 0 
        ? (sortedTimes.reduce((a, b) => a + b, 0) / sortedTimes.length).toFixed(2)
        : 0,
      p50: calculatePercentile(sortedTimes, 50),
      p75: calculatePercentile(sortedTimes, 75),
      p90: calculatePercentile(sortedTimes, 90),
      p95: calculatePercentile(sortedTimes, 95),
      p99: calculatePercentile(sortedTimes, 99),
    },
    throughput: calculateThroughput(),
    health: getHealthStatus(sortedTimes),
  };
  
  // Add endpoint stats if tracking enabled
  if (CONFIG.trackEndpoints) {
    stats.endpoints = getEndpointStats();
  }
  
  return stats;
}

/**
 * Format uptime to human readable
 */
function formatUptime(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
  if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

/**
 * Calculate throughput metrics
 */
function calculateThroughput() {
  const now = Date.now();
  const oneMinuteAgo = now - 60000;
  
  // Clean old entries
  metrics.throughput.lastMinuteRequests = metrics.throughput.lastMinuteRequests.filter(
    time => time > oneMinuteAgo
  );
  
  return {
    requestsPerMinute: metrics.throughput.lastMinuteRequests.length,
    requestsPerSecond: (metrics.throughput.lastMinuteRequests.length / 60).toFixed(2),
  };
}

/**
 * Get endpoint-specific statistics
 */
function getEndpointStats() {
  const stats = {};
  
  for (const [endpoint, data] of metrics.endpoints) {
    const sortedTimes = [...data.responseTimes].sort((a, b) => a - b);
    
    stats[endpoint] = {
      count: data.count,
      errors: data.errors,
      errorRate: (data.errors / data.count).toFixed(4),
      avgResponseTime: sortedTimes.length > 0
        ? (sortedTimes.reduce((a, b) => a + b, 0) / sortedTimes.length).toFixed(2)
        : 0,
      p95: calculatePercentile(sortedTimes, 95),
    };
  }
  
  return stats;
}

/**
 * Get health status based on performance metrics
 */
function getHealthStatus(sortedTimes) {
  const p95 = calculatePercentile(sortedTimes, 95);
  const errorRate = metrics.requests.total > 0 
    ? metrics.requests.failed / metrics.requests.total 
    : 0;
  
  // Determine health status
  let status = 'healthy';
  const issues = [];
  
  if (p95 > CONFIG.p95Threshold) {
    status = 'degraded';
    issues.push(`P95 response time (${p95.toFixed(0)}ms) exceeds threshold (${CONFIG.p95Threshold}ms)`);
  }
  
  if (errorRate > CONFIG.errorRateThreshold) {
    status = 'unhealthy';
    issues.push(`Error rate (${(errorRate * 100).toFixed(2)}%) exceeds threshold (${(CONFIG.errorRateThreshold * 100).toFixed(2)}%)`);
  }
  
  return { status, issues };
}

/**
 * Performance monitoring middleware
 */
export function performanceMonitor(req, res, next) {
  const startTime = performance.now();
  const endpoint = `${req.method} ${req.route?.path || req.path}`;
  
  // Track request start
  req.performanceStart = startTime;
  
  // Override res.end to capture response time
  const originalEnd = res.end.bind(res);
  
  res.end = function(chunk, encoding) {
    const endTime = performance.now();
    const responseTime = endTime - startTime;
    
    // Update metrics
    metrics.requests.total++;
    metrics.throughput.lastMinuteRequests.push(Date.now());
    
    // Track success/failure
    if (res.statusCode >= 200 && res.statusCode < 400) {
      metrics.requests.successful++;
    } else {
      metrics.requests.failed++;
      
      // Track errors
      const errorKey = `${endpoint}:${res.statusCode}`;
      metrics.errors.set(errorKey, (metrics.errors.get(errorKey) || 0) + 1);
    }
    
    // Store response time
    metrics.responseTimes.push(responseTime);
    
    // Keep only recent response times
    if (metrics.responseTimes.length > CONFIG.maxResponseTimes) {
      metrics.responseTimes.shift();
    }
    
    // Track endpoint-specific metrics
    if (CONFIG.trackEndpoints) {
      if (!metrics.endpoints.has(endpoint)) {
        metrics.endpoints.set(endpoint, {
          count: 0,
          errors: 0,
          responseTimes: [],
        });
      }
      
      const endpointData = metrics.endpoints.get(endpoint);
      endpointData.count++;
      endpointData.responseTimes.push(responseTime);
      
      if (res.statusCode >= 400) {
        endpointData.errors++;
      }
      
      // Keep only recent endpoint response times
      if (endpointData.responseTimes.length > 100) {
        endpointData.responseTimes.shift();
      }
    }
    
    // Add performance headers
    res.setHeader('X-Response-Time', `${responseTime.toFixed(2)}ms`);
    
    // Log slow requests
    if (responseTime > CONFIG.slowRequestThreshold) {
      console.warn(`[SLOW REQUEST] ${endpoint} took ${responseTime.toFixed(2)}ms`);
    }
    
    // Call original end
    return originalEnd(chunk, encoding);
  };
  
  next();
}

/**
 * Get slow requests report
 */
export function getSlowRequests(limit = 10) {
  const sortedEndpoints = [...metrics.endpoints.entries()]
    .map(([endpoint, data]) => {
      const sortedTimes = [...data.responseTimes].sort((a, b) => a - b);
      return {
        endpoint,
        p95: calculatePercentile(sortedTimes, 95),
        avg: sortedTimes.length > 0
          ? sortedTimes.reduce((a, b) => a + b, 0) / sortedTimes.length
          : 0,
        count: data.count,
      };
    })
    .sort((a, b) => b.p95 - a.p95)
    .slice(0, limit);
  
  return sortedEndpoints;
}

/**
 * Get error report
 */
export function getErrorReport() {
  const errors = {};
  
  for (const [key, count] of metrics.errors) {
    errors[key] = count;
  }
  
  return errors;
}

/**
 * Reset metrics
 */
export function resetMetrics() {
  metrics.requests = { total: 0, successful: 0, failed: 0 };
  metrics.responseTimes = [];
  metrics.endpoints.clear();
  metrics.errors.clear();
  metrics.throughput.lastMinuteRequests = [];
  metrics.startTime = Date.now();
}

/**
 * Create performance report endpoint
 */
export function performanceReportEndpoint(req, res) {
  const report = {
    timestamp: new Date().toISOString(),
    ...getPerformanceStats(),
    slowRequests: getSlowRequests(),
    errors: getErrorReport(),
    config: CONFIG,
  };
  
  res.json(report);
}

/**
 * Create health check endpoint
 */
export function healthCheckEndpoint(req, res) {
  const stats = getPerformanceStats();
  const statusCode = stats.health.status === 'healthy' ? 200 
    : stats.health.status === 'degraded' ? 200 
    : 503;
  
  res.status(statusCode).json({
    status: stats.health.status,
    timestamp: new Date().toISOString(),
    uptime: stats.uptimeFormatted,
    performance: {
      p95ResponseTime: stats.responseTimes.p95,
      errorRate: stats.requests.errorRate,
      requestsPerMinute: stats.throughput.requestsPerMinute,
    },
    issues: stats.health.issues,
  });
}

export default {
  middleware: performanceMonitor,
  getStats: getPerformanceStats,
  getSlowRequests,
  getErrorReport,
  resetMetrics,
  reportEndpoint: performanceReportEndpoint,
  healthEndpoint: healthCheckEndpoint,
};