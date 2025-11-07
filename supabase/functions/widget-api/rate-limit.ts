// Rate limiting implementation for widget API
interface RateLimitConfig {
  max_requests: number;
  window_seconds: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  reset: number;
  limit_type?: 'rate' | 'quota';
  reason?: string;
}

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

export async function checkRateLimit(
  key: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const now = Date.now();
  const windowMs = config.window_seconds * 1000;
  
  const existing = rateLimitStore.get(key);
  
  if (!existing || existing.resetAt < now) {
    // New window or expired
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });
    
    return {
      allowed: true,
      remaining: config.max_requests - 1,
      reset: now + windowMs,
      limit_type: 'rate',
    };
  }
  
  // Increment count
  existing.count++;
  
  if (existing.count > config.max_requests) {
    return {
      allowed: false,
      remaining: 0,
      reset: existing.resetAt,
      limit_type: 'rate',
      reason: 'Rate limit exceeded',
    };
  }
  
  return {
    allowed: true,
    remaining: config.max_requests - existing.count,
    reset: existing.resetAt,
    limit_type: 'rate',
  };
}

// Display frequency limit - prevents showing too many notifications per session
export async function checkDisplayFrequency(
  widgetId: string,
  sessionId: string,
  maxDisplays: number = 20,
  windowMinutes: number = 60
): Promise<RateLimitResult> {
  const key = `display_${widgetId}_${sessionId}`;
  return checkRateLimit(key, {
    max_requests: maxDisplays,
    window_seconds: windowMinutes * 60,
  });
}
