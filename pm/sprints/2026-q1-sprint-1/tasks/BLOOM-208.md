# BLOOM-208: Implement GHL API Rate Limiting Backoff

## Task Metadata

| Field | Value |
|-------|-------|
| **ID** | BLOOM-208 |
| **Title** | Implement GHL API Rate Limiting Backoff |
| **Priority** | P1 (High) |
| **Story Points** | 3 |
| **Assignee** | @backend-lead |
| **Sprint** | 2026 Q1 Sprint 1 |
| **Status** | In Progress |

---

## Problem Statement

GoHighLevel (GHL) API rate limits are causing **sync delays and failures** during high-volume operations. When the sync engine exceeds GHL's rate limits (typically 100 requests per minute per location), the following issues occur:

- Sync jobs fail partially or completely
- Contact and opportunity data becomes stale
- Retry storms without backoff exacerbate the problem
- Manual intervention required to restart failed syncs
- Client data inconsistencies between systems

### GHL Rate Limits

| Resource | Limit | Window |
|----------|-------|--------|
| General API | 100 requests | 1 minute |
| Contact Creation | 100 requests | 1 minute |
| Opportunity Updates | 100 requests | 1 minute |
| Webhook Subscriptions | 50 requests | 1 minute |

### Current Behavior

The sync engine currently:
1. Processes items as fast as possible
2. Retries immediately on 429 errors (too aggressive)
3. Does not track rate limit headers
4. Fails entire batch on rate limit errors

---

## Solution: Exponential Backoff with Jitter

Implement a **rate limiter utility** with exponential backoff and jitter to gracefully handle GHL API rate limits:

1. **Detect** rate limit responses (HTTP 429)
2. **Extract** retry-after header or calculate backoff
3. **Apply** exponential backoff with random jitter
4. **Retry** with circuit breaker pattern for persistent failures
5. **Track** rate limit state across requests

### Backoff Strategy

```
Delay = min(BaseDelay × 2^Attempt + Jitter, MaxDelay)
```

Where:
- `BaseDelay`: Starting delay (default: 1000ms)
- `Attempt`: Retry attempt number (0-indexed)
- `Jitter`: Random value between 0-1000ms to prevent thundering herd
- `MaxDelay`: Maximum delay cap (default: 30000ms)

---

## Files to Modify

### 1. `scripts/sync-engine/src/services/ghl.js`

Add rate limit handling to GHL API client:

```javascript
const { RateLimiter } = require('../utils/rate-limiter');

class GHLService {
  constructor(config) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://rest.gohighlevel.com/v1';
    
    // Initialize rate limiter with GHL-specific config
    this.rateLimiter = new RateLimiter({
      maxRetries: 5,
      baseDelay: 1000,
      maxDelay: 30000,
      jitter: true
    });
  }

  async makeRequest(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    
    return this.rateLimiter.execute(async () => {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          ...options.headers
        }
      });
      
      // Check for rate limiting
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        const rateLimitReset = response.headers.get('X-RateLimit-Reset');
        
        throw new RateLimitError('GHL rate limit exceeded', {
          retryAfter: retryAfter ? parseInt(retryAfter) * 1000 : null,
          rateLimitReset: rateLimitReset ? parseInt(rateLimitReset) : null,
          endpoint
        });
      }
      
      if (!response.ok) {
        throw new Error(`GHL API error: ${response.status} ${response.statusText}`);
      }
      
      return response.json();
    });
  }

  async syncContact(contact) {
    return this.makeRequest('/contacts', {
      method: 'POST',
      body: JSON.stringify(contact)
    });
  }

  async updateOpportunity(opportunityId, data) {
    return this.makeRequest(`/opportunities/${opportunityId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async getContacts(since) {
    const params = since ? `?startAfter=${since}` : '';
    return this.makeRequest(`/contacts${params}`);
  }
}

class RateLimitError extends Error {
  constructor(message, details) {
    super(message);
    this.name = 'RateLimitError';
    this.code = 'RATE_LIMITED';
    this.details = details;
  }
}

module.exports = { GHLService, RateLimitError };
```

### 2. `scripts/sync-engine/src/services/sync.js`

Add retry logic to sync orchestrator:

```javascript
const { RateLimiter } = require('../utils/rate-limiter');

class SyncService {
  constructor(ghlService, dbService) {
    this.ghl = ghlService;
    this.db = dbService;
    
    // Rate limiter for batch operations
    this.batchLimiter = new RateLimiter({
      maxRetries: 5,
      baseDelay: 1000,
      maxDelay: 30000,
      jitter: true,
      onRetry: (attempt, delay, error) => {
        logger.warn(`Sync retry attempt ${attempt} after ${delay}ms`, {
          error: error.message,
          endpoint: error.details?.endpoint
        });
      }
    });
  }

  async syncContacts(clientId, options = {}) {
    const { batchSize = 50, dryRun = false } = options;
    
    logger.info(`Starting contact sync for client ${clientId}`);
    
    const pendingContacts = await this.db.getPendingContacts(clientId, batchSize);
    const results = {
      processed: 0,
      succeeded: 0,
      failed: 0,
      rateLimited: 0
    };
    
    for (const contact of pendingContacts) {
      try {
        await this.batchLimiter.execute(async () => {
          if (!dryRun) {
            await this.ghl.syncContact(this.mapContact(contact));
          }
          await this.db.markContactSynced(contact.id);
          results.succeeded++;
        });
        
      } catch (error) {
        if (error.code === 'RATE_LIMITED') {
          results.rateLimited++;
          logger.warn('Rate limited during contact sync', {
            contactId: contact.id,
            retryAfter: error.details?.retryAfter
          });
        } else {
          results.failed++;
          logger.error('Contact sync failed', {
            contactId: contact.id,
            error: error.message
          });
        }
      }
      
      results.processed++;
    }
    
    logger.info(`Contact sync completed for client ${clientId}`, results);
    return results;
  }

  async syncOpportunities(clientId, options = {}) {
    const { batchSize = 50 } = options;
    
    logger.info(`Starting opportunity sync for client ${clientId}`);
    
    const opportunities = await this.db.getPendingOpportunities(clientId, batchSize);
    
    // Use p-limit for concurrency control
    const limit = pLimit(5); // Max 5 concurrent requests
    
    const syncPromises = opportunities.map(opp => 
      limit(() => this.batchLimiter.execute(async () => {
        try {
          await this.ghl.updateOpportunity(opp.ghlId, this.mapOpportunity(opp));
          await this.db.markOpportunitySynced(opp.id);
          return { success: true, id: opp.id };
        } catch (error) {
          if (error.code === 'RATE_LIMITED') {
            return { success: false, id: opp.id, rateLimited: true };
          }
          return { success: false, id: opp.id, error: error.message };
        }
      }))
    );
    
    const results = await Promise.allSettled(syncPromises);
    
    return this.summarizeResults(results);
  }

  summarizeResults(results) {
    return results.reduce((acc, result) => {
      if (result.status === 'fulfilled') {
        const { success, rateLimited } = result.value;
        if (success) acc.succeeded++;
        else if (rateLimited) acc.rateLimited++;
        else acc.failed++;
      } else {
        acc.failed++;
      }
      return acc;
    }, { succeeded: 0, failed: 0, rateLimited: 0, total: results.length });
  }
}

module.exports = { SyncService };
```

### 3. `scripts/sync-engine/src/utils/rate-limiter.js` (New File)

Create new rate limiter utility:

```javascript
/**
 * Rate Limiter Utility with Exponential Backoff and Jitter
 * 
 * Handles API rate limiting by implementing:
 * - Exponential backoff between retries
 * - Random jitter to prevent thundering herd
 * - Circuit breaker pattern for persistent failures
 * - Configurable retry limits and delays
 */

class RateLimiter {
  constructor(options = {}) {
    this.maxRetries = options.maxRetries || 5;
    this.baseDelay = options.baseDelay || 1000;
    this.maxDelay = options.maxDelay || 30000;
    this.jitter = options.jitter !== false;
    this.jitterMax = options.jitterMax || 1000;
    this.onRetry = options.onRetry || (() => {});
    this.onCircuitOpen = options.onCircuitOpen || (() => {});
    
    // Circuit breaker state
    this.failureCount = 0;
    this.circuitState = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.circuitResetTimeout = options.circuitResetTimeout || 60000;
    this.circuitThreshold = options.circuitThreshold || 5;
    
    // Rate limit tracking
    this.rateLimitState = new Map();
  }

  /**
   * Execute a function with rate limiting and retry logic
   * @param {Function} fn - Function to execute
   * @param {Object} context - Optional context for tracking (e.g., endpoint)
   */
  async execute(fn, context = {}) {
    // Check circuit breaker
    if (this.circuitState === 'OPEN') {
      if (Date.now() > this.circuitResetTime) {
        this.circuitState = 'HALF_OPEN';
        this.failureCount = 0;
      } else {
        throw new CircuitBreakerError('Circuit breaker is OPEN');
      }
    }

    let lastError;
    
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const result = await fn();
        
        // Success - reset circuit breaker
        if (this.circuitState === 'HALF_OPEN') {
          this.circuitState = 'CLOSED';
          this.failureCount = 0;
        }
        
        return result;
        
      } catch (error) {
        lastError = error;
        
        // Check if it's a rate limit error
        const isRateLimit = error.code === 'RATE_LIMITED' || error.status === 429;
        
        if (!isRateLimit && !this.isRetryableError(error)) {
          throw error; // Non-retryable error
        }
        
        if (attempt === this.maxRetries) {
          break; // Max retries reached
        }
        
        // Calculate delay
        const delay = this.calculateDelay(attempt, error);
        
        // Notify retry
        this.onRetry(attempt + 1, delay, error, context);
        
        // Wait before retry
        await this.sleep(delay);
      }
    }
    
    // Max retries exceeded - update circuit breaker
    this.failureCount++;
    if (this.failureCount >= this.circuitThreshold) {
      this.circuitState = 'OPEN';
      this.circuitResetTime = Date.now() + this.circuitResetTimeout;
      this.onCircuitOpen(lastError, context);
    }
    
    throw new MaxRetriesExceededError(
      `Max retries (${this.maxRetries}) exceeded`,
      lastError
    );
  }

  /**
   * Calculate delay with exponential backoff and jitter
   */
  calculateDelay(attempt, error) {
    // Use Retry-After header if available
    if (error.details?.retryAfter) {
      return error.details.retryAfter;
    }
    
    // Exponential backoff: baseDelay * 2^attempt
    const exponentialDelay = this.baseDelay * Math.pow(2, attempt);
    
    // Apply max delay cap
    const cappedDelay = Math.min(exponentialDelay, this.maxDelay);
    
    // Add jitter to prevent thundering herd
    if (this.jitter) {
      const jitterAmount = Math.random() * this.jitterMax;
      return cappedDelay + jitterAmount;
    }
    
    return cappedDelay;
  }

  /**
   * Determine if an error is retryable
   */
  isRetryableError(error) {
    const retryableCodes = ['ETIMEDOUT', 'ECONNRESET', 'ENOTFOUND', 'ECONNREFUSED'];
    const retryableStatuses = [408, 429, 500, 502, 503, 504];
    
    if (retryableCodes.includes(error.code)) return true;
    if (retryableStatuses.includes(error.status || error.statusCode)) return true;
    
    return false;
  }

  /**
   * Sleep for specified milliseconds
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get current rate limiter state (for monitoring)
   */
  getState() {
    return {
      circuitState: this.circuitState,
      failureCount: this.failureCount,
      config: {
        maxRetries: this.maxRetries,
        baseDelay: this.baseDelay,
        maxDelay: this.maxDelay
      }
    };
  }
}

class CircuitBreakerError extends Error {
  constructor(message) {
    super(message);
    this.name = 'CircuitBreakerError';
    this.code = 'CIRCUIT_OPEN';
  }
}

class MaxRetriesExceededError extends Error {
  constructor(message, originalError) {
    super(message);
    this.name = 'MaxRetriesExceededError';
    this.code = 'MAX_RETRIES_EXCEEDED';
    this.originalError = originalError;
  }
}

module.exports = {
  RateLimiter,
  CircuitBreakerError,
  MaxRetriesExceededError
};
```

---

## Implementation Approach

### Phase 1: Create Rate Limiter Utility (Day 1)

1. Create `rate-limiter.js` with:
   - Exponential backoff algorithm
   - Jitter implementation
   - Circuit breaker pattern
   - Comprehensive error classes

2. Write unit tests for rate limiter:
   ```javascript
   describe('RateLimiter', () => {
     it('should retry on rate limit error', async () => {
       let attempts = 0;
       const limiter = new RateLimiter({ maxRetries: 3, baseDelay: 100 });
       
       const result = await limiter.execute(async () => {
         attempts++;
         if (attempts < 3) {
           const error = new Error('Rate limited');
           error.code = 'RATE_LIMITED';
           throw error;
         }
         return 'success';
       });
       
       expect(result).toBe('success');
       expect(attempts).toBe(3);
     });
     
     it('should apply exponential backoff', async () => {
       const delays = [];
       const limiter = new RateLimiter({
         baseDelay: 100,
         maxDelay: 1000,
         onRetry: (attempt, delay) => delays.push(delay)
       });
       
       // Mock function that fails 3 times
       let attempts = 0;
       try {
         await limiter.execute(async () => {
           attempts++;
           if (attempts <= 3) {
             const error = new Error('Rate limited');
             error.code = 'RATE_LIMITED';
             throw error;
           }
         });
       } catch (e) {
         // Expected to fail
       }
       
       expect(delays[0]).toBeGreaterThanOrEqual(100);
       expect(delays[1]).toBeGreaterThanOrEqual(200);
       expect(delays[2]).toBeGreaterThanOrEqual(400);
     });
   });
   ```

### Phase 2: Integrate with GHL Service (Day 2)

1. Update `ghl.js` to:
   - Import and use RateLimiter
   - Detect and throw RateLimitError
   - Extract retry headers from responses
   - Track rate limit state

2. Add integration tests:
   ```javascript
   it('should handle 429 responses with retry-after', async () => {
     nock('https://rest.gohighlevel.com')
       .get('/v1/contacts')
       .reply(429, 'Too Many Requests', { 'Retry-After': '2' })
       .get('/v1/contacts')
       .reply(200, { contacts: [] });
     
     const ghl = new GHLService({ apiKey: 'test' });
     const start = Date.now();
     
     const result = await ghl.getContacts();
     const elapsed = Date.now() - start;
     
     expect(elapsed).toBeGreaterThanOrEqual(2000);
     expect(result.contacts).toEqual([]);
   });
   ```

### Phase 3: Update Sync Service (Day 3)

1. Modify `sync.js` to:
   - Use batchLimiter for concurrent operations
   - Implement graceful degradation on rate limits
   - Add circuit breaker monitoring
   - Track and report rate limit metrics

2. Add monitoring dashboard metrics:
   ```javascript
   // Metrics to track
   {
     "ghl_rate_limit_hits": 45,
     "ghl_retry_attempts": 127,
     "ghl_circuit_breaker_opens": 3,
     "sync_success_rate": 0.98,
     "average_backoff_delay_ms": 2500
   }
   ```

---

## Configuration Options

### Environment Variables

```bash
# Rate Limiter Configuration
GHL_RATE_LIMIT_MAX_RETRIES=5
GHL_RATE_LIMIT_BASE_DELAY=1000
GHL_RATE_LIMIT_MAX_DELAY=30000
GHL_RATE_LIMIT_JITTER=true
GHL_RATE_LIMIT_JITTER_MAX=1000

# Circuit Breaker Configuration
GHL_CIRCUIT_THRESHOLD=5
GHL_CIRCUIT_RESET_TIMEOUT=60000

# Sync Batch Configuration
GHL_SYNC_BATCH_SIZE=50
GHL_SYNC_CONCURRENCY=5
```

### Configuration Schema

```javascript
// config/rate-limit.js
module.exports = {
  ghl: {
    rateLimiter: {
      maxRetries: parseInt(process.env.GHL_RATE_LIMIT_MAX_RETRIES) || 5,
      baseDelay: parseInt(process.env.GHL_RATE_LIMIT_BASE_DELAY) || 1000,
      maxDelay: parseInt(process.env.GHL_RATE_LIMIT_MAX_DELAY) || 30000,
      jitter: process.env.GHL_RATE_LIMIT_JITTER !== 'false',
      jitterMax: parseInt(process.env.GHL_RATE_LIMIT_JITTER_MAX) || 1000
    },
    circuitBreaker: {
      threshold: parseInt(process.env.GHL_CIRCUIT_THRESHOLD) || 5,
      resetTimeout: parseInt(process.env.GHL_CIRCUIT_RESET_TIMEOUT) || 60000
    },
    sync: {
      batchSize: parseInt(process.env.GHL_SYNC_BATCH_SIZE) || 50,
      concurrency: parseInt(process.env.GHL_SYNC_CONCURRENCY) || 5,
      rateLimitPerMinute: 90 // Stay under GHL's 100/min limit
    }
  }
};
```

---

## Testing Requirements

### Unit Tests

- [ ] Rate limiter calculates correct exponential delays
- [ ] Jitter adds randomness within expected range
- [ ] Circuit breaker opens after threshold failures
- [ ] Circuit breaker closes after reset timeout
- [ ] Retry-After header respected when present
- [ ] Max retries error thrown after exhaustion

### Integration Tests

- [ ] Mock GHL 429 responses trigger backoff
- [ ] Concurrent requests don't exceed rate limits
- [ ] Batch processing handles partial failures
- [ ] Circuit breaker prevents cascade failures

### Load Tests

```javascript
// test/load/rate-limit.test.js
describe('Rate Limit Load Tests', () => {
  it('should handle 1000 requests within rate limit', async () => {
    const ghl = new GHLService({ apiKey: 'test' });
    
    // Mock GHL with strict rate limiting
    let requestCount = 0;
    nock('https://rest.gohighlevel.com')
      .persist()
      .get('/v1/contacts')
      .reply(() => {
        requestCount++;
        if (requestCount > 100) {
          return [429, 'Rate Limited', { 'Retry-After': '60' }];
        }
        return [200, { contacts: [] }];
      });
    
    // Execute 1000 concurrent requests
    const promises = Array(1000).fill().map(() => 
      ghl.getContacts().catch(e => e)
    );
    
    const results = await Promise.allSettled(promises);
    const successes = results.filter(r => r.status === 'fulfilled').length;
    
    // Should eventually succeed all with proper backoff
    expect(successes).toBe(1000);
  });
});
```

### Monitoring Tests

- [ ] Rate limit events logged with context
- [ ] Metrics exposed for Prometheus/Grafana
- [ ] Alerts fire on circuit breaker open
- [ ] Dashboard shows retry statistics

---

## Acceptance Criteria

### Functional Requirements

- [ ] **AC-1:** System detects GHL rate limit errors (HTTP 429)
- [ ] **AC-2:** Exponential backoff applied between retries
- [ ] **AC-3:** Jitter prevents synchronized retry storms
- [ ] **AC-4:** Retry-After header respected when provided
- [ ] **AC-5:** Circuit breaker opens after 5 consecutive failures
- [ ] **AC-6:** Sync operations complete without manual intervention
- [ ] **AC-7:** Failed operations retry automatically

### Performance Requirements

- [ ] **AC-8:** Average sync latency remains under 30 seconds
- [ ] **AC-9:** Rate limit backoff doesn't exceed 30 seconds max
- [ ] **AC-10:** Concurrent requests limited to 5 to prevent rate limits
- [ ] **AC-11:** Batch size configurable based on rate limit budget

### Observability Requirements

- [ ] **AC-12:** Rate limit events logged with endpoint and retry count
- [ ] **AC-13:** Circuit breaker state exposed in health endpoint
- [ ] **AC-14:** Metrics available for rate limit hits and retry attempts
- [ ] **AC-15:** Alert triggered when circuit breaker opens

### Reliability Requirements

- [ ] **AC-16:** No data loss during rate limit recovery
- [ ] **AC-17:** Partial batch failures don't affect other items
- [ ] **AC-18:** System recovers automatically when GHL API available
- [ ] **AC-19:** Backward compatible with existing sync operations

---

## Related Tasks

- BLOOM-209: Implement sync queue with priority levels
- BLOOM-210: Add GHL webhook integration for real-time updates
- BLOOM-211: Create sync monitoring dashboard
- BLOOM-212: Implement sync retry queue for failed items

---

## Notes

- Consider implementing **token bucket algorithm** for more precise rate limiting
- Evaluate **adaptive rate limiting** based on GHL API response patterns
- Document GHL API rate limit changes in team wiki
- Monitor GHL changelog for rate limit policy updates
