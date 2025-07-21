// Rate Limiting Utility for ThirdStorage
// Provides comprehensive rate limiting with multiple strategies

interface RateLimitConfig {
  windowMs: number;     // Time window in milliseconds
  maxRequests: number;  // Maximum requests per window
  keyGenerator?: (req: any) => string; // Custom key generator
  skipSuccessfulRequests?: boolean; // Don't count successful requests
  skipFailedRequests?: boolean;     // Don't count failed requests
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
  firstRequest: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  totalRequests: number;
}

class RateLimiter {
  private store = new Map<string, RateLimitEntry>();
  public config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
    
    // Clean up expired entries every 5 minutes
    setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetTime) {
        this.store.delete(key);
      }
    }
  }

  private getKey(identifier: string): string {
    return `rate_limit:${identifier}`;
  }

  check(identifier: string): RateLimitResult {
    const key = this.getKey(identifier);
    const now = Date.now();
    const resetTime = now + this.config.windowMs;

    const entry = this.store.get(key);

    if (!entry || now > entry.resetTime) {
      // Create new window
      const newEntry: RateLimitEntry = {
        count: 1,
        resetTime,
        firstRequest: now
      };
      this.store.set(key, newEntry);

      return {
        allowed: true,
        remaining: this.config.maxRequests - 1,
        resetTime,
        totalRequests: 1
      };
    }

    // Check if limit exceeded
    if (entry.count >= this.config.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.resetTime,
        totalRequests: entry.count
      };
    }

    // Increment count
    entry.count++;
    this.store.set(key, entry);

    return {
      allowed: true,
      remaining: this.config.maxRequests - entry.count,
      resetTime: entry.resetTime,
      totalRequests: entry.count
    };
  }

  // Reset rate limit for a specific identifier
  reset(identifier: string): void {
    const key = this.getKey(identifier);
    this.store.delete(key);
  }

  // Get current status without incrementing
  getStatus(identifier: string): RateLimitResult | null {
    const key = this.getKey(identifier);
    const now = Date.now();
    const entry = this.store.get(key);

    if (!entry || now > entry.resetTime) {
      return null;
    }

    return {
      allowed: entry.count < this.config.maxRequests,
      remaining: Math.max(0, this.config.maxRequests - entry.count),
      resetTime: entry.resetTime,
      totalRequests: entry.count
    };
  }
}

// Pre-configured rate limiters for different use cases

// Gateway rate limiter - prevent abuse of content access
export const gatewayRateLimiter = new RateLimiter({
  windowMs: 60 * 1000,    // 1 minute window
  maxRequests: 60,        // 60 requests per minute per IP
});

// Aggressive rate limiter for suspicious activity
export const aggressiveRateLimiter = new RateLimiter({
  windowMs: 60 * 1000,    // 1 minute window
  maxRequests: 10,        // 10 requests per minute per IP
});

// API rate limiter for general API endpoints
export const apiRateLimiter = new RateLimiter({
  windowMs: 60 * 1000,    // 1 minute window
  maxRequests: 100,       // 100 requests per minute per IP
});

// Burst rate limiter for very short windows
export const burstRateLimiter = new RateLimiter({
  windowMs: 10 * 1000,    // 10 second window
  maxRequests: 20,        // 20 requests per 10 seconds per IP
});

// Helper function to get client IP from request
export function getClientIP(req: any): string {
  // Check various headers for real IP
  const forwarded = req.headers['x-forwarded-for'];
  const realIP = req.headers['x-real-ip'];
  const cfConnectingIP = req.headers['cf-connecting-ip']; // Cloudflare
  const xClusterClientIP = req.headers['x-cluster-client-ip']; // Various load balancers

  if (forwarded) {
    // x-forwarded-for can contain multiple IPs, get the first one
    const ips = forwarded.split(',');
    return ips[0].trim();
  }

  if (realIP) {
    return realIP;
  }

  if (cfConnectingIP) {
    return cfConnectingIP;
  }

  if (xClusterClientIP) {
    return xClusterClientIP;
  }

  // Fallback to connection remote address
  return req.connection?.remoteAddress || 
         req.socket?.remoteAddress || 
         req.connection?.socket?.remoteAddress || 
         'unknown';
}

// Helper function to detect suspicious activity patterns
export function detectSuspiciousActivity(req: any): boolean {
  const userAgent = req.headers['user-agent'] || '';
  const referer = req.headers['referer'] || '';
  
  // Common bot patterns
  const botPatterns = [
    /bot/i, /crawler/i, /spider/i, /scraper/i,
    /curl/i, /wget/i, /python/i, /php/i, /java/i,
    /postman/i, /insomnia/i
  ];

  // Check user agent
  if (!userAgent || botPatterns.some(pattern => pattern.test(userAgent))) {
    return true;
  }

  // Suspicious patterns
  if (userAgent.length < 10 || userAgent.length > 500) {
    return true;
  }

  return false;
}

// Middleware factory for easy integration
export function createRateLimitMiddleware(rateLimiter: RateLimiter, options?: {
  skipSuccessful?: boolean;
  skipFailed?: boolean;
  onLimitReached?: (req: any, res: any) => void;
}) {
  return (req: any, res: any, next?: any) => {
    const clientIP = getClientIP(req);
    const result = rateLimiter.check(clientIP);

    // Add rate limit headers
    res.setHeader('X-RateLimit-Limit', rateLimiter.config.maxRequests);
    res.setHeader('X-RateLimit-Remaining', result.remaining);
    res.setHeader('X-RateLimit-Reset', Math.ceil(result.resetTime / 1000));

    if (!result.allowed) {
      const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000);
      res.setHeader('Retry-After', retryAfter);

      if (options?.onLimitReached) {
        options.onLimitReached(req, res);
        return;
      }

      // Default rate limit response
      return res.status(429).json({
        error: 'Too many requests',
        message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
        retryAfter
      });
    }

    if (next) {
      next();
    }
  };
}

export { RateLimiter };
export type { RateLimitConfig, RateLimitResult }; 