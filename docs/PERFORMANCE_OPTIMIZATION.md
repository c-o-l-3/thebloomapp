# Performance Optimization Guide

## Overview
This document outlines the comprehensive performance optimizations implemented to achieve sub-2 second load times across the Journey Builder application.

## Implementation Summary

### ✅ Completed Optimizations

#### 1. Frontend Performance (React/Vite)

**Code Splitting & Lazy Loading**
- Implemented `React.lazy()` for all major route components
- Added Suspense boundaries with loading fallbacks
- Components are now loaded on-demand rather than upfront

**Key Changes:**
```jsx
// Before: Synchronous imports
import { JourneyFlow } from './components/JourneyFlow';

// After: Lazy loading
const JourneyFlow = lazy(() => import('./components/JourneyFlow'));
```

**Vite Build Optimization**
- Manual chunking strategy for optimal caching:
  - `vendor-react`: React core libraries
  - `vendor-ui`: UI component libraries
  - `vendor-flow`: React Flow visualization
  - `vendor-utils`: Date utilities
  - `vendor-editor`: Email/Content editors

- CDN-ready asset configuration:
  - Hashed filenames for cache busting
  - Organized output: `assets/js/`, `assets/css/`, `assets/images/`
  - Compression pre-computation (gzip/brotli)

#### 2. Backend Performance (API)

**Compression Middleware**
- Automatic gzip/brotli compression for responses > 1KB
- Encoding negotiation based on client Accept-Encoding header
- Priority: brotli > gzip > deflate

**Caching Layer**
- In-memory LRU cache (L1) with 1000 entry limit
- TTL configuration by data type:
  - Clients: 10 minutes
  - Journeys: 5 minutes
  - Journey lists: 3 minutes
  - Templates: 10 minutes
  - Analytics: 2 minutes
- Cache warming capability for frequently accessed data
- Cache invalidation by pattern

**Performance Monitoring**
- Real-time response time tracking
- P95/P99 latency metrics
- Throughput monitoring (requests/minute)
- Slow query detection (>2s threshold)
- Error rate tracking

**Query Optimization**
- Measured query execution with categorization:
  - Excellent: <100ms
  - Good: <500ms
  - Fair: <1000ms
  - Slow: <2000ms
  - Critical: >2000ms
- Optimized query builders with selective includes
- Pagination for large result sets
- Aggregation optimization for analytics

#### 3. Database Indexing

**Existing Indexes Verified:**
- `clients.slug`, `clients.status`, `clients.ghlLocationId`
- `journeys.clientId`, `journeys.status`, `journeys.category`
- `touchpoints.journeyId`, `touchpoints.orderIndex`
- `analytics_events.clientId`, `analytics_events.eventType`, `analytics_events.createdAt`

**Recommended Additional Indexes:**
- `journey_analytics_events(clientId, eventType, createdAt)` - Analytics dashboards
- `journey_performance_metrics(journeyId, date)` - Daily aggregations
- `webhook_deliveries(clientId, eventType, createdAt)` - Webhook lookups

#### 4. CDN & Static Assets

**Asset Optimization:**
- Long-term caching headers for static assets
- Content-based hashing for cache invalidation
- Image/font separation for optimal CDN rules
- Brotli compression for modern browsers

**Configuration:**
```javascript
// vite.config.js
build: {
  rollupOptions: {
    output: {
      entryFileNames: 'assets/[name]-[hash].js',
      chunkFileNames: 'assets/[name]-[hash].js',
      assetFileNames: (assetInfo) => {
        // Organized by type for CDN optimization
      }
    }
  }
}
```

## Performance Endpoints

### Health Check with Performance Metrics
```
GET /health
```

Response includes:
- Database latency
- Cache hit rate
- Memory usage
- Uptime

### Performance Report
```
GET /metrics/performance
```

Provides:
- Response time statistics (min, max, mean, p50, p75, p90, p95, p99)
- Request throughput
- Error rates
- Slow request report
- Endpoint-specific metrics

### Cache Metrics
```
GET /metrics/cache
```

Returns:
- Cache hit/miss ratio
- Memory usage
- Eviction count
- Cache health status

### Performance Test
```
GET /perf/test
```

Runs diagnostic tests:
- Database query latency
- Cache read/write speed
- Overall response time grade

## Monitoring Targets

### Sub-2s Load Time Targets

| Metric | Target | Critical Threshold |
|--------|--------|-------------------|
| Page Load | <2s | >3s |
| API Response (p95) | <500ms | >2000ms |
| Database Query (p95) | <100ms | >500ms |
| Cache Hit Rate | >80% | <50% |
| Error Rate | <1% | >5% |

### Performance Grades

- **Excellent**: <100ms response time
- **Good**: <500ms response time
- **Fair**: <1000ms response time
- **Slow**: <2000ms response time
- **Critical**: >2000ms response time

## Configuration

### Environment Variables

```bash
# Performance Tuning
CACHE_TTL_DEFAULT=300
CACHE_MAX_SIZE=1000
COMPRESSION_THRESHOLD=1024
SLOW_QUERY_THRESHOLD=2000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000

# Database
DATABASE_URL=postgresql://...
DATABASE_POOL_SIZE=20
```

### Cache Configuration

```javascript
const CACHE_CONFIG = {
  defaultTTL: 300, // 5 minutes
  maxMemoryCacheSize: 1000,
  ttl: {
    'client': 600,        // 10 min
    'journey': 300,       // 5 min
    'journey:list': 180,  // 3 min
    'template': 600,      // 10 min
    'analytics': 120,     // 2 min
  }
};
```

## Best Practices

### Frontend
1. Use lazy loading for all route components
2. Implement loading states for better UX
3. Optimize images before deployment
4. Use CDN for static assets
5. Enable gzip/brotli compression

### Backend
1. Always use cache middleware for read-heavy endpoints
2. Implement pagination for list endpoints
3. Use selective includes to avoid N+1 queries
4. Monitor slow query logs
5. Set appropriate TTL based on data volatility

### Database
1. Index frequently queried columns
2. Use compound indexes for multi-column queries
3. Monitor query performance regularly
4. Archive old data to maintain performance
5. Use connection pooling

## Testing Performance

### Load Testing
```bash
# Example using curl for API load testing
for i in {1..100}; do
  curl -s -o /dev/null -w "%{time_total}\n" http://localhost:8080/api/journeys
done
```

### Cache Testing
```bash
# First request (cache miss)
curl -I http://localhost:8080/api/journeys
# Check for: X-Cache: MISS

# Second request (cache hit)
curl -I http://localhost:8080/api/journeys
# Check for: X-Cache: HIT
```

### Compression Testing
```bash
# Test brotli compression
curl -H "Accept-Encoding: br" http://localhost:8080/api/journeys

# Test gzip compression
curl -H "Accept-Encoding: gzip" http://localhost:8080/api/journeys
```

## Troubleshooting

### High Response Times
1. Check `/metrics/performance` for slow endpoints
2. Review database query logs
3. Verify cache hit rates
4. Check for N+1 query issues

### Low Cache Hit Rates
1. Review TTL configuration
2. Check cache invalidation patterns
3. Monitor cache size vs. entry count
4. Consider increasing cache size

### High Memory Usage
1. Review cache size configuration
2. Check for memory leaks in queries
3. Monitor Prisma connection pool
4. Restart server if necessary

## Maintenance

### Regular Tasks
- Review performance reports weekly
- Monitor cache hit rates
- Check for slow queries
- Update indexes based on query patterns

### Quarterly Review
- Analyze performance trends
- Review and adjust cache TTLs
- Optimize slow queries
- Update performance targets if needed

## Support

For performance issues or questions:
1. Check `/health` endpoint for system status
2. Review `/metrics/performance` for detailed metrics
3. Check application logs for errors
4. Contact the development team

---

**Last Updated:** 2026-03-02  
**Version:** 1.0.0  
**Target:** Sub-2s Load Times (P1 Priority, Q3 Roadmap)