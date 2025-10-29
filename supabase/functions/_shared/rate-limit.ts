interface RateLimitConfig {
  max_requests: number;
  window_seconds: number;
}

interface RateLimitData {
  count: number;
  reset: number;
}

const rateLimitCache = new Map<string, RateLimitData>();

export async function checkRateLimit(
  key: string,
  config: RateLimitConfig
): Promise<{ allowed: boolean; remaining: number; reset: number }> {
  const now = Date.now();
  const cached = rateLimitCache.get(key);

  if (cached && cached.reset > now) {
    // Within window
    if (cached.count >= config.max_requests) {
      return {
        allowed: false,
        remaining: 0,
        reset: cached.reset
      };
    }
    cached.count++;
    return {
      allowed: true,
      remaining: config.max_requests - cached.count,
      reset: cached.reset
    };
  } else {
    // New window
    const reset = now + config.window_seconds * 1000;
    rateLimitCache.set(key, { count: 1, reset });
    return {
      allowed: true,
      remaining: config.max_requests - 1,
      reset
    };
  }
}

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of rateLimitCache.entries()) {
    if (data.reset <= now) {
      rateLimitCache.delete(key);
    }
  }
}, 60000); // Clean up every minute
