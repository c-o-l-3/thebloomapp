/**
 * Rate Limiter Tests
 * Tests for exponential backoff, max retries, and jitter randomization
 */

import { jest } from '@jest/globals';
import { RateLimiter } from './rate-limiter.js';

describe('RateLimiter', () => {
  let rateLimiter;

  beforeEach(() => {
    rateLimiter = new RateLimiter({
      baseDelay: 1000,
      maxDelay: 60000,
      maxRetries: 5
    });
  });

  describe('calculateDelay', () => {
    it('should calculate exponential backoff correctly', () => {
      // Attempt 0: baseDelay * 2^0 = 1000 + jitter (0-1000)
      const delay0 = rateLimiter.calculateDelay(0);
      expect(delay0).toBeGreaterThanOrEqual(1000);
      expect(delay0).toBeLessThan(3000); // 1000 + max jitter

      // Attempt 1: baseDelay * 2^1 = 2000 + jitter (0-1000)
      const delay1 = rateLimiter.calculateDelay(1);
      expect(delay1).toBeGreaterThanOrEqual(2000);
      expect(delay1).toBeLessThan(4000);

      // Attempt 2: baseDelay * 2^2 = 4000 + jitter (0-1000)
      const delay2 = rateLimiter.calculateDelay(2);
      expect(delay2).toBeGreaterThanOrEqual(4000);
      expect(delay2).toBeLessThan(7000);

      // Attempt 3: baseDelay * 2^3 = 8000 + jitter (0-1000)
      const delay3 = rateLimiter.calculateDelay(3);
      expect(delay3).toBeGreaterThanOrEqual(8000);
      expect(delay3).toBeLessThan(13000);
    });

    it('should respect max delay cap', () => {
      // With baseDelay=1000 and maxDelay=60000
      // Attempt 6 would be 1000 * 2^6 = 64000, but capped at 60000
      const delay = rateLimiter.calculateDelay(6);
      expect(delay).toBeLessThanOrEqual(60000);
    });

    it('should use Retry-After header when provided', () => {
      // Retry-After header takes precedence
      const delay = rateLimiter.calculateDelay(0, 30); // 30 seconds
      expect(delay).toBe(30000); // 30 seconds in milliseconds
    });

    it('should cap Retry-After to maxDelay', () => {
      // Retry-After of 120 seconds should be capped to 60 seconds (60000ms)
      const delay = rateLimiter.calculateDelay(0, 120);
      expect(delay).toBe(60000);
    });

    it('should add jitter to prevent synchronized retries', () => {
      // Run multiple times to check jitter varies
      const delays = [];
      for (let i = 0; i < 10; i++) {
        delays.push(rateLimiter.calculateDelay(1));
      }
      
      // All delays should be >= 2000 (base for attempt 1)
      delays.forEach(delay => {
        expect(delay).toBeGreaterThanOrEqual(2000);
      });

      // Check that not all delays are identical (jitter adds variation)
      const uniqueDelays = new Set(delays);
      expect(uniqueDelays.size).toBeGreaterThan(1);
    });

    it('should handle attempt 0 correctly', () => {
      const delay = rateLimiter.calculateDelay(0);
      // baseDelay * 2^0 = 1000 + jitter (0-1000)
      expect(delay).toBeGreaterThanOrEqual(1000);
      expect(delay).toBeLessThan(3000);
    });
  });

  describe('isRateLimitError', () => {
    it('should detect 429 status on error object', () => {
      const error = new Error('Rate limit exceeded');
      error.status = 429;
      expect(rateLimiter.isRateLimitError(error)).toBe(true);
    });

    it('should detect 429 status on error.response', () => {
      const error = new Error('Rate limit exceeded');
      error.response = { status: 429 };
      expect(rateLimiter.isRateLimitError(error)).toBe(true);
    });

    it('should detect 429 statusCode on error object', () => {
      const error = new Error('Rate limit exceeded');
      error.statusCode = 429;
      expect(rateLimiter.isRateLimitError(error)).toBe(true);
    });

    it('should detect 429 in error message', () => {
      const error = new Error('Request failed with status 429');
      expect(rateLimiter.isRateLimitError(error)).toBe(true);
    });

    it('should return false for non-429 errors', () => {
      const error = new Error('Not found');
      error.status = 404;
      expect(rateLimiter.isRateLimitError(error)).toBe(false);
    });

    it('should return false for errors without status', () => {
      const error = new Error('Network error');
      expect(rateLimiter.isRateLimitError(error)).toBe(false);
    });
  });

  describe('extractRetryAfter', () => {
    it('should extract Retry-After header from error.response.headers', () => {
      const error = new Error('Rate limited');
      error.response = {
        headers: {
          'retry-after': '30'
        }
      };
      expect(rateLimiter.extractRetryAfter(error)).toBe(30);
    });

    it('should extract Retry-After with capital letters', () => {
      const error = new Error('Rate limited');
      error.response = {
        headers: {
          'Retry-After': '60'
        }
      };
      expect(rateLimiter.extractRetryAfter(error)).toBe(60);
    });

    it('should return null for missing header', () => {
      const error = new Error('Rate limited');
      error.response = { headers: {} };
      expect(rateLimiter.extractRetryAfter(error)).toBeNull();
    });

    it('should return null for invalid header value', () => {
      const error = new Error('Rate limited');
      error.response = {
        headers: {
          'retry-after': 'invalid'
        }
      };
      expect(rateLimiter.extractRetryAfter(error)).toBeNull();
    });

    it('should return null for missing response', () => {
      const error = new Error('Rate limited');
      expect(rateLimiter.extractRetryAfter(error)).toBeNull();
    });
  });

  describe('execute', () => {
    it('should return result on successful execution', async () => {
      const fn = jest.fn().mockResolvedValue('success');
      const result = await rateLimiter.execute(fn, 'test');
      
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on rate limit error and succeed', async () => {
      let attempts = 0;
      const fn = jest.fn().mockImplementation(() => {
        attempts++;
        if (attempts < 3) {
          const error = new Error('Rate limit');
          error.status = 429;
          throw error;
        }
        return 'success';
      });

      // Mock sleep to speed up test
      rateLimiter.sleep = jest.fn().mockResolvedValue();

      const result = await rateLimiter.execute(fn, 'test');
      
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(3);
      expect(rateLimiter.sleep).toHaveBeenCalledTimes(2);
    });

    it('should throw error after max retries exhausted', async () => {
      const fn = jest.fn().mockImplementation(() => {
        const error = new Error('Rate limit');
        error.status = 429;
        throw error;
      });

      // Mock sleep to speed up test
      rateLimiter.sleep = jest.fn().mockResolvedValue();

      await expect(rateLimiter.execute(fn, 'test')).rejects.toThrow('Rate limit');
      expect(fn).toHaveBeenCalledTimes(5); // maxRetries
    });

    it('should not retry on non-rate-limit errors', async () => {
      const fn = jest.fn().mockImplementation(() => {
        const error = new Error('Not found');
        error.status = 404;
        throw error;
      });

      await expect(rateLimiter.execute(fn, 'test')).rejects.toThrow('Not found');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should use custom retry count from options', async () => {
      const customLimiter = new RateLimiter({
        baseDelay: 100,
        maxDelay: 10000,
        maxRetries: 3
      });

      const fn = jest.fn().mockImplementation(() => {
        const error = new Error('Rate limit');
        error.status = 429;
        throw error;
      });

      customLimiter.sleep = jest.fn().mockResolvedValue();

      await expect(customLimiter.execute(fn, 'test')).rejects.toThrow('Rate limit');
      expect(fn).toHaveBeenCalledTimes(3); // custom maxRetries
    });
  });

  describe('sleep', () => {
    it('should return a promise that resolves after specified ms', async () => {
      const start = Date.now();
      await rateLimiter.sleep(50);
      const elapsed = Date.now() - start;
      
      expect(elapsed).toBeGreaterThanOrEqual(45); // Allow small variance
      expect(elapsed).toBeLessThan(100);
    });
  });

  describe('getConfig', () => {
    it('should return current configuration', () => {
      const config = rateLimiter.getConfig();
      
      expect(config).toEqual({
        baseDelay: 1000,
        maxDelay: 60000,
        maxRetries: 5
      });
    });
  });

  describe('environment variable configuration', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterAll(() => {
      process.env = originalEnv;
    });

    it('should read configuration from environment variables', () => {
      process.env.GHL_RATE_LIMIT_BASE_DELAY = '2000';
      process.env.GHL_RATE_LIMIT_MAX_DELAY = '30000';
      process.env.GHL_RATE_LIMIT_MAX_RETRIES = '3';

      const envLimiter = new RateLimiter();
      const config = envLimiter.getConfig();

      expect(config.baseDelay).toBe(2000);
      expect(config.maxDelay).toBe(30000);
      expect(config.maxRetries).toBe(3);
    });

    it('should use defaults when environment variables not set', () => {
      delete process.env.GHL_RATE_LIMIT_BASE_DELAY;
      delete process.env.GHL_RATE_LIMIT_MAX_DELAY;
      delete process.env.GHL_RATE_LIMIT_MAX_RETRIES;

      const defaultLimiter = new RateLimiter();
      const config = defaultLimiter.getConfig();

      expect(config.baseDelay).toBe(1000);
      expect(config.maxDelay).toBe(60000);
      expect(config.maxRetries).toBe(5);
    });
  });
});
