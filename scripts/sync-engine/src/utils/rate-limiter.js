/**
 * Rate Limiter Utility
 * Handles API rate limits (429 responses) with exponential backoff and jitter
 */

import logger from './logger.js';

/**
 * Rate Limiter class for handling 429 responses with exponential backoff
 */
export class RateLimiter {
  constructor(options = {}) {
    this.baseDelay = options.baseDelay || parseInt(process.env.GHL_RATE_LIMIT_BASE_DELAY) || 1000;
    this.maxDelay = options.maxDelay || parseInt(process.env.GHL_RATE_LIMIT_MAX_DELAY) || 60000;
    this.maxRetries = options.maxRetries || parseInt(process.env.GHL_RATE_LIMIT_MAX_RETRIES) || 5;
  }

  /**
   * Calculate delay with exponential backoff and jitter
   * Formula: baseDelay * 2^attempt + random jitter
   * @param {number} attempt - Current retry attempt (0-indexed)
   * @param {number} retryAfter - Optional Retry-After header value in seconds
   * @returns {number} Delay in milliseconds
   */
  calculateDelay(attempt, retryAfter = null) {
    // If Retry-After header is present, use that as base
    if (retryAfter && retryAfter > 0) {
      return Math.min(retryAfter * 1000, this.maxDelay);
    }

    // Exponential: baseDelay * 2^attempt
    const exponential = this.baseDelay * Math.pow(2, attempt);
    // Random jitter to prevent synchronized retries (0 to baseDelay)
    const jitter = Math.random() * this.baseDelay;
    
    return Math.min(exponential + jitter, this.maxDelay);
  }

  /**
   * Execute a function with rate limit retry logic
   * @param {Function} fn - Async function to execute
   * @param {string} context - Context string for logging (e.g., 'createWorkflow', 'updateTemplate')
   * @returns {Promise<any>} Result of the function
   * @throws {Error} If all retries are exhausted or error is not rate limit related
   */
  async execute(fn, context = '') {
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        const isLastAttempt = attempt === this.maxRetries - 1;
        
        if (!this.isRateLimitError(error) || isLastAttempt) {
          throw error;
        }

        const retryAfter = this.extractRetryAfter(error);
        const delay = this.calculateDelay(attempt, retryAfter);
        
        logger.warn(`Rate limited [${context}], retry ${attempt + 1}/${this.maxRetries} after ${Math.round(delay)}ms`, {
          context,
          attempt: attempt + 1,
          maxRetries: this.maxRetries,
          delay: Math.round(delay),
          retryAfter: retryAfter || null
        });
        
        await this.sleep(delay);
      }
    }
  }

  /**
   * Check if error is a rate limit error (429)
   * @param {Error} error - Error object to check
   * @returns {boolean} True if rate limit error
   */
  isRateLimitError(error) {
    return (
      error.status === 429 ||
      error.response?.status === 429 ||
      error.statusCode === 429 ||
      (error.message && error.message.includes('429'))
    );
  }

  /**
   * Extract Retry-After header value from error response
   * @param {Error} error - Error object containing response
   * @returns {number|null} Retry-After value in seconds, or null
   */
  extractRetryAfter(error) {
    if (error.response?.headers) {
      const retryAfter = error.response.headers['retry-after'] || 
                         error.response.headers['Retry-After'];
      if (retryAfter) {
        const parsed = parseInt(retryAfter, 10);
        return isNaN(parsed) ? null : parsed;
      }
    }
    return null;
  }

  /**
   * Sleep for specified milliseconds
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise<void>}
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get current configuration
   * @returns {Object} Current rate limiter configuration
   */
  getConfig() {
    return {
      baseDelay: this.baseDelay,
      maxDelay: this.maxDelay,
      maxRetries: this.maxRetries
    };
  }
}

// Export singleton instance with default config
export const rateLimiter = new RateLimiter();
export default rateLimiter;
