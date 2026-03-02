/**
 * Rate Limiting Service
 * Supports multiple strategies: fixed window, sliding window, token bucket
 * Redis-backed for distributed deployments, in-memory fallback for development
 */

import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

let prisma;

// Initialize prisma client - handle both ESM and existing instance
if (globalThis.__prisma) {
  prisma = globalThis.__prisma;
} else {
  prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error'] : ['error'],
  });
  globalThis.__prisma = prisma;
}

// In-memory storage for development (fallback when Redis unavailable)
const memoryStore = new Map();
const MEMORY_CLEANUP_INTERVAL = 60000; // 1 minute

/**
 * Rate Limit Result
 * @typedef {Object} RateLimitResult
 * @property {boolean} allowed - Whether request is allowed
 * @property {number} limit - Maximum requests allowed
 * @property {number} remaining - Remaining requests in window
 * @property {number} reset - Unix timestamp when limit resets
 * @property {number} retryAfter - Seconds to wait before retry (if limited)
 */

/**
 * Rate Limit Configuration
 * @typedef {Object} RateLimitConfig
 * @property {number} requestsPerMinute
 * @property {number} requestsPerHour
 * @property {number} requestsPerDay
 * @property {number} burstCapacity
 * @property {string} windowStrategy - 'fixed_window', 'sliding_window', 'token_bucket'
 */

class RateLimitService {
  constructor() {
    this.redis = null;
    this.isRedisConnected = false;
    this.tierCache = new Map();
    this.tierCacheExpiry = new Map();
    this.TIER_CACHE_TTL = 60000; // 1 minute
    
    // Initialize memory cleanup
    setInterval(() => this.cleanupMemoryStore(), MEMORY_CLEANUP_INTERVAL);
    
    // Try to initialize Redis
    this.initRedis();
  }

  /**
   * Initialize Redis connection
   */
  async initRedis() {
    try {
      const Redis = (await import('ioredis')).default;
      
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      this.redis = new Redis(redisUrl, {
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
      });

      this.redis.on('connect', () => {
        console.log('✅ Rate limiting: Redis connected');
        this.isRedisConnected = true;
      });

      this.redis.on('error', (err) => {
        if (this.isRedisConnected) {
          console.warn('⚠️ Rate limiting: Redis error, falling back to memory store:', err.message);
          this.isRedisConnected = false;
        }
      });

      this.redis.on('close', () => {
        console.warn('⚠️ Rate limiting: Redis connection closed, using memory store');
        this.isRedisConnected = false;
      });
    } catch (error) {
      console.warn('⚠️ Rate limiting: Redis not available, using memory store');
      this.isRedisConnected = false;
    }
  }

  /**
   * Clean up expired entries from memory store
   */
  cleanupMemoryStore() {
    const now = Date.now();
    for (const [key, data] of memoryStore.entries()) {
      if (data.expiresAt < now) {
        memoryStore.delete(key);
      }
    }
  }

  /**
   * Get tier configuration from cache or database
   */
  async getTierConfig(tierId) {
    // Check memory cache first
    if (this.tierCache.has(tierId)) {
      const expiry = this.tierCacheExpiry.get(tierId);
      if (expiry > Date.now()) {
        return this.tierCache.get(tierId);
      }
    }

    // Fetch from database
    const tier = await prisma.rateLimitTier.findUnique({
      where: { id: tierId }
    });

    if (tier) {
      this.tierCache.set(tierId, tier);
      this.tierCacheExpiry.set(tierId, Date.now() + this.TIER_CACHE_TTL);
    }

    return tier;
  }

  /**
   * Get tier by name
   */
  async getTierByName(name) {
    const tier = await prisma.rateLimitTier.findUnique({
      where: { name }
    });
    return tier;
  }

  /**
   * Get or create user's rate limit tier
   */
  async getUserTier(userId, clientId) {
    // Check for API key first
    if (userId) {
      const apiKey = await prisma.apiKey.findFirst({
        where: {
          userId,
          status: 'active',
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } }
          ]
        }
      });

      if (apiKey?.tierId) {
        return this.getTierConfig(apiKey.tierId);
      }
    }

    // Check client tier
    if (clientId) {
      const client = await prisma.client.findUnique({
        where: { id: clientId },
        include: { rateLimitTier: true }
      });

      if (client?.rateLimitTier) {
        return client.rateLimitTier;
      }
    }

    // Default to basic tier
    return this.getTierByName('basic');
  }

  /**
   * Check if identifier has exemption
   */
  async checkExemption(identifier, identifierType) {
    const exemption = await prisma.rateLimitExemption.findUnique({
      where: {
        identifier_identifierType: {
          identifier,
          identifierType
        }
      }
    });

    if (!exemption) return null;

    // Check if expired
    if (exemption.expiresAt && exemption.expiresAt < new Date()) {
      return null;
    }

    return exemption;
  }

  /**
   * Check rate limit using fixed window strategy
   */
  async checkFixedWindow(identifier, limit, windowSeconds) {
    const windowKey = Math.floor(Date.now() / (windowSeconds * 1000));
    const key = `ratelimit:fixed:${identifier}:${windowKey}`;
    const now = Date.now();
    const resetAt = (windowKey + 1) * windowSeconds * 1000;

    let current;

    if (this.isRedisConnected) {
      try {
        const pipeline = this.redis.pipeline();
        pipeline.incr(key);
        pipeline.expire(key, windowSeconds);
        const results = await pipeline.exec();
        current = results[0][1];
      } catch (error) {
        // Fallback to memory
        current = this.memoryIncrement(key, resetAt);
      }
    } else {
      current = this.memoryIncrement(key, resetAt);
    }

    const remaining = Math.max(0, limit - current);
    const allowed = current <= limit;

    return {
      allowed,
      limit,
      remaining,
      reset: Math.ceil(resetAt / 1000),
      retryAfter: allowed ? 0 : Math.ceil((resetAt - now) / 1000)
    };
  }

  /**
   * Check rate limit using sliding window strategy
   */
  async checkSlidingWindow(identifier, limit, windowSeconds) {
    const now = Date.now();
    const windowStart = now - (windowSeconds * 1000);
    const key = `ratelimit:sliding:${identifier}:${windowSeconds}`;
    const resetAt = now + (windowSeconds * 1000);

    let count = 0;

    if (this.isRedisConnected) {
      try {
        // Use Redis sorted set for sliding window
        const pipeline = this.redis.pipeline();
        
        // Remove old entries
        pipeline.zremrangebyscore(key, 0, windowStart);
        
        // Count current entries
        pipeline.zcard(key);
        
        // Add current request
        pipeline.zadd(key, now, `${now}-${Math.random()}`);
        
        // Set expiry
        pipeline.expire(key, windowSeconds);
        
        const results = await pipeline.exec();
        count = results[1][1] + 1; // +1 for current request
      } catch (error) {
        // Fallback to memory
        count = this.memorySlidingWindow(key, windowStart, now, windowSeconds);
      }
    } else {
      count = this.memorySlidingWindow(key, windowStart, now, windowSeconds);
    }

    const remaining = Math.max(0, limit - count);
    const allowed = count <= limit;

    return {
      allowed,
      limit,
      remaining,
      reset: Math.ceil(resetAt / 1000),
      retryAfter: allowed ? 0 : windowSeconds
    };
  }

  /**
   * Check rate limit using token bucket strategy
   */
  async checkTokenBucket(identifier, capacity, refillRate, refillPeriod) {
    const key = `ratelimit:bucket:${identifier}`;
    const now = Date.now();
    
    let tokens;
    let lastRefill;

    if (this.isRedisConnected) {
      try {
        // Lua script for atomic token bucket operation
        const luaScript = `
          local key = KEYS[1]
          local capacity = tonumber(ARGV[1])
          local refillRate = tonumber(ARGV[2])
          local refillPeriod = tonumber(ARGV[3])
          local now = tonumber(ARGV[4])
          
          local data = redis.call('hmget', key, 'tokens', 'last_refill')
          local tokens = tonumber(data[1]) or capacity
          local lastRefill = tonumber(data[2]) or now
          
          local elapsed = now - lastRefill
          local tokensToAdd = math.floor(elapsed / refillPeriod * refillRate)
          tokens = math.min(capacity, tokens + tokensToAdd)
          
          if tokens >= 1 then
            tokens = tokens - 1
            redis.call('hmset', key, 'tokens', tokens, 'last_refill', now)
            redis.call('expire', key, 3600)
            return {1, tokens, capacity}
          else
            redis.call('hmset', key, 'tokens', tokens, 'last_refill', now)
            redis.call('expire', key, 3600)
            return {0, tokens, capacity}
          end
        `;

        const result = await this.redis.eval(
          luaScript,
          1,
          key,
          capacity,
          refillRate,
          refillPeriod,
          now
        );

        const allowed = result[0] === 1;
        tokens = result[1];
        const limit = result[2];

        return {
          allowed,
          limit,
          remaining: Math.floor(tokens),
          reset: Math.ceil(now / 1000) + Math.ceil((1 - tokens) / refillRate * refillPeriod / 1000),
          retryAfter: allowed ? 0 : Math.ceil((1 - tokens) / refillRate * refillPeriod / 1000)
        };
      } catch (error) {
        // Fallback to memory
        return this.memoryTokenBucket(key, capacity, refillRate, refillPeriod, now);
      }
    } else {
      return this.memoryTokenBucket(key, capacity, refillRate, refillPeriod, now);
    }
  }

  /**
   * Memory-based increment for fixed window
   */
  memoryIncrement(key, expiresAt) {
    const data = memoryStore.get(key);
    if (!data || data.expiresAt < Date.now()) {
      memoryStore.set(key, { count: 1, expiresAt });
      return 1;
    }
    data.count++;
    return data.count;
  }

  /**
   * Memory-based sliding window
   */
  memorySlidingWindow(key, windowStart, now, windowSeconds) {
    let data = memoryStore.get(key);
    const expiresAt = now + (windowSeconds * 1000);

    if (!data || data.expiresAt < now) {
      data = { requests: [], expiresAt };
    }

    // Remove old requests
    data.requests = data.requests.filter(time => time > windowStart);
    
    // Add current request
    data.requests.push(now);
    data.expiresAt = expiresAt;
    
    memoryStore.set(key, data);
    return data.requests.length;
  }

  /**
   * Memory-based token bucket
   */
  memoryTokenBucket(key, capacity, refillRate, refillPeriod, now) {
    let data = memoryStore.get(key);
    const expiresAt = now + 3600000; // 1 hour

    if (!data) {
      data = {
        tokens: capacity - 1,
        lastRefill: now,
        expiresAt
      };
      memoryStore.set(key, data);
      return {
        allowed: true,
        limit: capacity,
        remaining: Math.floor(data.tokens),
        reset: Math.ceil(now / 1000) + Math.ceil(refillPeriod / 1000),
        retryAfter: 0
      };
    }

    // Calculate tokens to add
    const elapsed = now - data.lastRefill;
    const tokensToAdd = Math.floor(elapsed / refillPeriod * refillRate);
    data.tokens = Math.min(capacity, data.tokens + tokensToAdd);
    data.lastRefill = now;
    data.expiresAt = expiresAt;

    if (data.tokens >= 1) {
      data.tokens -= 1;
      return {
        allowed: true,
        limit: capacity,
        remaining: Math.floor(data.tokens),
        reset: Math.ceil(now / 1000) + Math.ceil((1 - data.tokens) / refillRate * refillPeriod / 1000),
        retryAfter: 0
      };
    } else {
      return {
        allowed: false,
        limit: capacity,
        remaining: 0,
        reset: Math.ceil(now / 1000) + Math.ceil((1 - data.tokens) / refillRate * refillPeriod / 1000),
        retryAfter: Math.ceil((1 - data.tokens) / refillRate * refillPeriod / 1000)
      };
    }
  }

  /**
   * Main rate limit check method
   */
  async checkRateLimit(identifier, tier, endpointType = 'default') {
    // Check for exemption
    const exemption = await this.checkExemption(identifier, 'ip');
    if (exemption) {
      if (exemption.overrideTierId) {
        tier = await this.getTierConfig(exemption.overrideTierId);
      } else {
        // Unlimited
        return {
          allowed: true,
          limit: Infinity,
          remaining: Infinity,
          reset: 0,
          retryAfter: 0,
          exempt: true
        };
      }
    }

    if (!tier) {
      tier = await this.getTierByName('basic');
    }

    const endpointLimits = tier.endpointLimits || {};
    const specificLimit = endpointLimits[endpointType] || {};

    // Check multiple time windows
    const checks = [];

    // Per minute check
    const perMinute = specificLimit.requestsPerMinute || tier.requestsPerMinute;
    if (perMinute) {
      checks.push(this.executeCheck(tier.windowStrategy, identifier, perMinute, 60, tier.burstCapacity));
    }

    // Per hour check
    const perHour = specificLimit.requestsPerHour || tier.requestsPerHour;
    if (perHour) {
      checks.push(this.executeCheck(tier.windowStrategy, `${identifier}:hour`, perHour, 3600, null));
    }

    // Per day check
    const perDay = specificLimit.requestsPerDay || tier.requestsPerDay;
    if (perDay) {
      checks.push(this.executeCheck('fixed_window', `${identifier}:day`, perDay, 86400, null));
    }

    const results = await Promise.all(checks);

    // Find the most restrictive result
    const blocked = results.find(r => !r.allowed);
    if (blocked) {
      return blocked;
    }

    // Return the most restrictive of the allowed results
    return results.reduce((mostRestrictive, current) => {
      if (current.remaining < mostRestrictive.remaining) {
        return current;
      }
      return mostRestrictive;
    });
  }

  /**
   * Execute rate limit check based on strategy
   */
  async executeCheck(strategy, identifier, limit, windowSeconds, burstCapacity) {
    switch (strategy) {
      case 'token_bucket':
        if (burstCapacity) {
          return this.checkTokenBucket(identifier, burstCapacity, limit, 60000);
        }
        // Fall through to sliding window if no burst capacity
        return this.checkSlidingWindow(identifier, limit, windowSeconds);
      
      case 'fixed_window':
        return this.checkFixedWindow(identifier, limit, windowSeconds);
      
      case 'sliding_window':
      default:
        return this.checkSlidingWindow(identifier, limit, windowSeconds);
    }
  }

  /**
   * Log rate limit violation
   */
  async logViolation(identifier, identifierType, tierId, route, method, ipAddress, userAgent, limitType, limitValue, requestsMade, retryAfter) {
    try {
      await prisma.rateLimitViolation.create({
        data: {
          identifier,
          identifierType,
          tierId,
          route,
          method,
          ipAddress: ipAddress || null,
          userAgent: userAgent || null,
          limitType,
          limitValue,
          requestsMade,
          retryAfter
        }
      });
    } catch (error) {
      console.error('Failed to log rate limit violation:', error);
    }
  }

  /**
   * Get rate limit statistics for an identifier
   */
  async getStats(identifier, identifierType) {
    const violations = await prisma.rateLimitViolation.findMany({
      where: {
        identifier,
        identifierType,
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return {
      totalViolations: violations.length,
      recentViolations: violations.slice(0, 10),
      byLimitType: violations.reduce((acc, v) => {
        acc[v.limitType] = (acc[v.limitType] || 0) + 1;
        return acc;
      }, {})
    };
  }

  /**
   * Generate API key
   */
  async generateApiKey(name, clientId, userId, tierId, scopes = ['read'], expiresAt = null, createdBy = null) {
    const key = `bloom_${crypto.randomBytes(32).toString('hex')}`;
    const keyHash = crypto.createHash('sha256').update(key).digest('hex');
    const keyPrefix = key.substring(0, 12);

    const apiKey = await prisma.apiKey.create({
      data: {
        name,
        clientId,
        userId,
        keyHash,
        keyPrefix,
        tierId,
        scopes,
        expiresAt,
        createdBy
      }
    });

    return { apiKey, key };
  }

  /**
   * Validate API key
   */
  async validateApiKey(key) {
    const keyHash = crypto.createHash('sha256').update(key).digest('hex');
    
    const apiKey = await prisma.apiKey.findUnique({
      where: { keyHash },
      include: { tier: true }
    });

    if (!apiKey) return null;
    if (apiKey.status !== 'active') return null;
    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) return null;

    // Update last used
    await prisma.apiKey.update({
      where: { id: apiKey.id },
      data: {
        lastUsedAt: new Date(),
        totalRequests: { increment: 1 }
      }
    });

    return apiKey;
  }

  /**
   * Revoke API key
   */
  async revokeApiKey(keyId, revokedBy) {
    return prisma.apiKey.update({
      where: { id: keyId },
      data: {
        status: 'revoked',
        updatedAt: new Date()
      }
    });
  }

  /**
   * Get health status
   */
  getHealth() {
    return {
      redisConnected: this.isRedisConnected,
      storage: this.isRedisConnected ? 'redis' : 'memory',
      memoryStoreSize: memoryStore.size,
      tierCacheSize: this.tierCache.size
    };
  }
}

// Export singleton instance
export const rateLimitService = new RateLimitService();
export default rateLimitService;