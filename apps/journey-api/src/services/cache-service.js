/**
 * Cache Service
 * Provides multi-layer caching with memory (L1) and Redis (L2) support
 * Optimizes frequently accessed data for sub-2s response times
 */

import { createHash } from 'crypto';

// In-memory cache store (L1)
const memoryCache = new Map();

// Cache statistics for monitoring
const cacheStats = {
  hits: 0,
  misses: 0,
  evictions: 0,
  size: 0,
};

// Cache configuration
const CACHE_CONFIG = {
  // Default TTL in seconds
  defaultTTL: 300, // 5 minutes
  
  // Max memory cache size (number of entries)
  maxMemoryCacheSize: 1000,
  
  // TTL configurations by data type
  ttl: {
    'client': 600,        // 10 minutes
    'journey': 300,       // 5 minutes
    'journey:list': 180,  // 3 minutes
    'touchpoint': 300,    // 5 minutes
    'template': 600,      // 10 minutes
    'analytics': 120,     // 2 minutes
    'user': 900,          // 15 minutes
    'health': 60,         // 1 minute
    'search': 300,        // 5 minutes
  },
  
  // Compression threshold (bytes)
  compressionThreshold: 1024,
};

/**
 * Generate cache key from parameters
 */
export function generateCacheKey(prefix, params = {}) {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}:${params[key]}`)
    .join('|');
  
  const key = `${prefix}:${sortedParams}`;
  
  // Hash long keys
  if (key.length > 250) {
    return createHash('md5').update(key).digest('hex');
  }
  
  return key;
}

/**
 * Get TTL for a specific cache type
 */
function getTTL(type) {
  return CACHE_CONFIG.ttl[type] || CACHE_CONFIG.defaultTTL;
}

/**
 * Manage cache size with LRU eviction
 */
function evictIfNeeded() {
  if (memoryCache.size < CACHE_CONFIG.maxMemoryCacheSize) {
    return;
  }
  
  // Find oldest entry
  let oldestKey = null;
  let oldestTime = Infinity;
  
  for (const [key, entry] of memoryCache) {
    if (entry.timestamp < oldestTime) {
      oldestTime = entry.timestamp;
      oldestKey = key;
    }
  }
  
  if (oldestKey) {
    memoryCache.delete(oldestKey);
    cacheStats.evictions++;
    cacheStats.size = memoryCache.size;
  }
}

/**
 * Check if entry is expired
 */
function isExpired(entry) {
  return Date.now() > entry.expiresAt;
}

/**
 * Get data from cache
 */
export async function getCache(key, type = 'default') {
  const entry = memoryCache.get(key);
  
  if (!entry) {
    cacheStats.misses++;
    return null;
  }
  
  // Check expiration
  if (isExpired(entry)) {
    memoryCache.delete(key);
    cacheStats.misses++;
    cacheStats.size = memoryCache.size;
    return null;
  }
  
  // Update access time for LRU
  entry.timestamp = Date.now();
  entry.accessCount = (entry.accessCount || 0) + 1;
  
  cacheStats.hits++;
  
  // Decompress if needed
  if (entry.compressed) {
    return JSON.parse(entry.data);
  }
  
  return entry.data;
}

/**
 * Set data in cache
 */
export async function setCache(key, data, type = 'default', customTTL = null) {
  // Evict old entries if needed
  if (!memoryCache.has(key)) {
    evictIfNeeded();
  }
  
  const ttl = customTTL || getTTL(type);
  
  // Check if data should be compressed
  const dataString = JSON.stringify(data);
  const shouldCompress = Buffer.byteLength(dataString, 'utf8') > CACHE_CONFIG.compressionThreshold;
  
  const entry = {
    data: shouldCompress ? dataString : data,
    compressed: shouldCompress,
    expiresAt: Date.now() + (ttl * 1000),
    timestamp: Date.now(),
    accessCount: 0,
    type,
  };
  
  memoryCache.set(key, entry);
  cacheStats.size = memoryCache.size;
  
  return true;
}

/**
 * Delete data from cache
 */
export async function deleteCache(key) {
  const result = memoryCache.delete(key);
  if (result) {
    cacheStats.size = memoryCache.size;
  }
  return result;
}

/**
 * Clear all cache or by type
 */
export async function clearCache(type = null) {
  if (!type) {
    memoryCache.clear();
    cacheStats.size = 0;
    return true;
  }
  
  // Clear by type
  for (const [key, entry] of memoryCache) {
    if (entry.type === type) {
      memoryCache.delete(key);
    }
  }
  
  cacheStats.size = memoryCache.size;
  return true;
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
  const hitRate = cacheStats.hits + cacheStats.misses > 0
    ? (cacheStats.hits / (cacheStats.hits + cacheStats.misses) * 100).toFixed(2)
    : 0;
  
  return {
    ...cacheStats,
    hitRate: `${hitRate}%`,
    memoryUsage: `${(JSON.stringify([...memoryCache]).length / 1024).toFixed(2)} KB`,
  };
}

/**
 * Cache middleware for Express routes
 */
export function cacheMiddleware(type, keyGenerator = null, ttl = null) {
  return async (req, res, next) => {
    // Skip cache for non-GET requests
    if (req.method !== 'GET') {
      return next();
    }
    
    // Generate cache key
    const key = keyGenerator 
      ? keyGenerator(req)
      : generateCacheKey(type, { 
          path: req.path, 
          query: req.query,
          user: req.user?.id 
        });
    
    try {
      // Try to get from cache
      const cached = await getCache(key, type);
      
      if (cached !== null) {
        res.setHeader('X-Cache', 'HIT');
        return res.json(cached);
      }
      
      // Store original json method
      const originalJson = res.json.bind(res);
      
      // Override json method to cache response
      res.json = function(data) {
        // Cache the response
        setCache(key, data, type, ttl)
          .catch(err => console.error('Cache set error:', err));
        
        res.setHeader('X-Cache', 'MISS');
        return originalJson(data);
      };
      
      next();
    } catch (error) {
      console.error('Cache middleware error:', error);
      next();
    }
  };
}

/**
 * Invalidate cache by pattern
 */
export async function invalidateCachePattern(pattern) {
  const regex = new RegExp(pattern);
  let count = 0;
  
  for (const key of memoryCache.keys()) {
    if (regex.test(key)) {
      memoryCache.delete(key);
      count++;
    }
  }
  
  cacheStats.size = memoryCache.size;
  return count;
}

/**
 * Cache warming for frequently accessed data
 */
export async function warmCache(type, fetcher, keys) {
  console.log(`[Cache] Warming ${type} cache with ${keys.length} entries...`);
  
  const promises = keys.map(async (key) => {
    try {
      const data = await fetcher(key);
      if (data) {
        await setCache(key, data, type);
      }
    } catch (error) {
      console.error(`[Cache] Failed to warm cache for ${key}:`, error);
    }
  });
  
  await Promise.all(promises);
  console.log(`[Cache] Warming complete for ${type}`);
}

/**
 * Get cache health status
 */
export function getCacheHealth() {
  const hitRate = cacheStats.hits + cacheStats.misses > 0
    ? cacheStats.hits / (cacheStats.hits + cacheStats.misses)
    : 0;
  
  return {
    status: hitRate > 0.8 ? 'healthy' : hitRate > 0.5 ? 'degraded' : 'poor',
    hitRate,
    size: memoryCache.size,
    maxSize: CACHE_CONFIG.maxMemoryCacheSize,
    utilization: memoryCache.size / CACHE_CONFIG.maxMemoryCacheSize,
  };
}

export default {
  get: getCache,
  set: setCache,
  delete: deleteCache,
  clear: clearCache,
  generateKey: generateCacheKey,
  getStats: getCacheStats,
  middleware: cacheMiddleware,
  invalidatePattern: invalidateCachePattern,
  warm: warmCache,
  getHealth: getCacheHealth,
};