/**
 * Rate Limiting Middleware
 * Implements tier-based rate limiting with multiple strategies
 * Adds rate limit headers to responses
 */

import { rateLimitService } from '../services/rate-limit-service.js';

/**
 * Extract client identifier from request
 */
function extractIdentifier(req) {
  // Priority: API Key > User ID > Session ID > IP Address
  
  // Check for API key in header
  const apiKey = req.headers['x-api-key'];
  if (apiKey) {
    return { type: 'api_key', value: apiKey };
  }

  // Check for authenticated user
  if (req.user?.id) {
    return { type: 'user_id', value: req.user.id };
  }

  // Check for client portal user
  if (req.clientUser?.id) {
    return { type: 'client_user_id', value: req.clientUser.id };
  }

  // Fall back to IP address
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
             req.socket?.remoteAddress || 
             req.ip || 
             'unknown';
  
  return { type: 'ip', value: ip };
}

/**
 * Determine endpoint type for specific rate limits
 */
function getEndpointType(req) {
  const path = req.path;
  const method = req.method;

  // Public endpoints (lower limits)
  if (path.startsWith('/health') || path.startsWith('/public')) {
    return 'public';
  }

  // Auth endpoints (stricter limits to prevent brute force)
  if (path.startsWith('/api/auth')) {
    return 'auth';
  }

  // Webhook endpoints (higher limits)
  if (path.startsWith('/api/webhooks')) {
    return 'webhook';
  }

  // Search endpoints (moderate limits)
  if (path.startsWith('/api/search')) {
    return 'search';
  }

  // Analytics endpoints (moderate limits)
  if (path.startsWith('/api/analytics')) {
    return 'analytics';
  }

  // Admin endpoints (stricter limits)
  if (path.startsWith('/admin')) {
    return 'admin';
  }

  // Default authenticated endpoints
  return 'default';
}

/**
 * Create rate limiting middleware
 * @param {Object} options
 * @param {boolean} options.skipSuccessfulRequests - Don't count successful requests
 * @param {boolean} options.skipFailedRequests - Don't count failed requests
 * @param {Function} options.keyGenerator - Custom key generator function
 * @param {Function} options.skip - Function to skip rate limiting
 * @param {Object} options.tier - Override tier configuration
 */
export function createRateLimitMiddleware(options = {}) {
  return async (req, res, next) => {
    try {
      // Check if should skip
      if (options.skip?.(req)) {
        return next();
      }

      // Skip for whitelisted IPs
      const whitelist = process.env.RATE_LIMIT_IP_WHITELIST?.split(',') || [];
      const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
                       req.socket?.remoteAddress || 
                       req.ip;
      
      if (whitelist.includes(clientIp)) {
        return next();
      }

      // Get identifier
      const identifier = options.keyGenerator?.(req) || extractIdentifier(req);
      const compositeKey = `${identifier.type}:${identifier.value}`;

      // Get endpoint type
      const endpointType = getEndpointType(req);

      // Get user's tier or use default
      let tier = options.tier;
      if (!tier) {
        const userId = req.user?.id || req.clientUser?.id;
        const clientId = req.user?.clientId || req.clientUser?.clientId;
        
        tier = await rateLimitService.getUserTier(userId, clientId);
      }

      // Check if tier has headers enabled
      const headersEnabled = tier?.headersEnabled ?? true;

      // Perform rate limit check
      const result = await rateLimitService.checkRateLimit(compositeKey, tier, endpointType);

      // Add rate limit headers if enabled
      if (headersEnabled) {
        res.setHeader('X-RateLimit-Limit', result.limit === Infinity ? 'Unlimited' : result.limit);
        res.setHeader('X-RateLimit-Remaining', result.remaining === Infinity ? 'Unlimited' : Math.max(0, result.remaining));
        res.setHeader('X-RateLimit-Reset', result.reset);
        
        if (result.exempt) {
          res.setHeader('X-RateLimit-Exempt', 'true');
        }
      }

      // If rate limited
      if (!result.allowed) {
        // Add retry-after header
        if (tier?.retryAfterEnabled && result.retryAfter > 0) {
          res.setHeader('Retry-After', result.retryAfter);
        }

        // Log violation
        await rateLimitService.logViolation(
          identifier.value,
          identifier.type,
          tier?.id,
          req.path,
          req.method,
          clientIp,
          req.headers['user-agent'],
          'per_minute',
          result.limit,
          result.limit - result.remaining + 1,
          result.retryAfter
        );

        // Return 429 Too Many Requests
        return res.status(429).json({
          error: 'Too Many Requests',
          message: `Rate limit exceeded. Try again in ${result.retryAfter} seconds.`,
          retryAfter: result.retryAfter,
          limit: result.limit,
          window: 'per_minute'
        });
      }

      // Store rate limit info in request for later use
      req.rateLimit = {
        limit: result.limit,
        remaining: result.remaining,
        reset: result.reset,
        tier: tier?.name || 'basic'
      };

      // Track response for skip options
      if (options.skipSuccessfulRequests || options.skipFailedRequests) {
        const originalJson = res.json;
        res.json = function(body) {
          const statusCode = res.statusCode;
          
          if (options.skipSuccessfulRequests && statusCode < 400) {
            // Don't decrement remaining for successful requests
          }
          
          if (options.skipFailedRequests && statusCode >= 400) {
            // Don't decrement remaining for failed requests
          }
          
          return originalJson.call(this, body);
        };
      }

      next();
    } catch (error) {
      console.error('Rate limiting middleware error:', error);
      // Fail open - allow request if rate limiting fails
      next();
    }
  };
}

/**
 * Middleware for public endpoints (more permissive)
 */
export function publicRateLimit() {
  return createRateLimitMiddleware({
    keyGenerator: (req) => {
      const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
                 req.socket?.remoteAddress || 
                 req.ip || 
                 'unknown';
      return { type: 'ip', value: `public:${ip}` };
    }
  });
}

/**
 * Middleware for authenticated endpoints (standard)
 */
export function authRateLimit() {
  return createRateLimitMiddleware({
    skipFailedRequests: true // Don't count failed auth attempts against limit
  });
}

/**
 * Middleware for strict rate limiting (auth endpoints, admin)
 */
export function strictRateLimit() {
  return createRateLimitMiddleware({
    tier: { requestsPerMinute: 10, headersEnabled: true, retryAfterEnabled: true }
  });
}

/**
 * Middleware for API key endpoints
 */
export function apiKeyRateLimit() {
  return async (req, res, next) => {
    try {
      const apiKey = req.headers['x-api-key'];
      
      if (!apiKey) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'API key required'
        });
      }

      // Validate API key
      const keyData = await rateLimitService.validateApiKey(apiKey);
      
      if (!keyData) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid or expired API key'
        });
      }

      // Check IP whitelist
      if (keyData.allowedIps && keyData.allowedIps.length > 0) {
        const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
                         req.socket?.remoteAddress || 
                         req.ip;
        
        if (!keyData.allowedIps.includes(clientIp)) {
          return res.status(403).json({
            error: 'Forbidden',
            message: 'IP address not allowed'
          });
        }
      }

      // Check route restrictions
      if (keyData.allowedRoutes && keyData.allowedRoutes.length > 0) {
        const path = req.path;
        const allowed = keyData.allowedRoutes.some(route => {
          if (route.includes('*')) {
            const regex = new RegExp('^' + route.replace(/\*/g, '.*') + '$');
            return regex.test(path);
          }
          return path.startsWith(route);
        });

        if (!allowed) {
          return res.status(403).json({
            error: 'Forbidden',
            message: 'API key not authorized for this endpoint'
          });
        }
      }

      // Check scopes
      const requiredScope = req.method === 'GET' ? 'read' : 'write';
      if (!keyData.scopes.includes(requiredScope) && !keyData.scopes.includes('admin')) {
        return res.status(403).json({
          error: 'Forbidden',
          message: `API key missing required scope: ${requiredScope}`
        });
      }

      // Attach key data to request
      req.apiKey = keyData;

      // Proceed to standard rate limiting with API key tier
      const middleware = createRateLimitMiddleware({
        keyGenerator: () => ({ type: 'api_key', value: keyData.keyHash }),
        tier: keyData.tier || await rateLimitService.getTierByName('basic')
      });

      return middleware(req, res, next);
    } catch (error) {
      console.error('API key rate limiting error:', error);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Rate limiting check failed'
      });
    }
  };
}

/**
 * Middleware to require specific API key scope
 */
export function requireScope(scope) {
  return (req, res, next) => {
    if (!req.apiKey) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'API key authentication required'
      });
    }

    if (!req.apiKey.scopes.includes(scope) && !req.apiKey.scopes.includes('admin')) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `API key missing required scope: ${scope}`
      });
    }

    next();
  };
}

/**
 * Get current rate limit status for a request
 */
export function getRateLimitStatus(req) {
  return req.rateLimit || null;
}

export default {
  createRateLimitMiddleware,
  publicRateLimit,
  authRateLimit,
  strictRateLimit,
  apiKeyRateLimit,
  requireScope,
  getRateLimitStatus
};