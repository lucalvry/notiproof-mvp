/**
 * Testing utilities for Phase 4: Testing & Validation
 */

// Cross-browser compatibility checks
export const browserCompatibility = {
  checkLocalStorage: () => {
    try {
      localStorage.setItem('test', 'test');
      localStorage.removeItem('test');
      return true;
    } catch {
      return false;
    }
  },
  
  checkIndexedDB: () => {
    return 'indexedDB' in window;
  },
  
  checkWebSockets: () => {
    return 'WebSocket' in window;
  },
  
  checkFetch: () => {
    return 'fetch' in window;
  }
};

// Performance monitoring
export class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();
  
  startTimer(label: string): () => void {
    const start = performance.now();
    return () => {
      const duration = performance.now() - start;
      const existing = this.metrics.get(label) || [];
      existing.push(duration);
      this.metrics.set(label, existing);
      
      if (duration > 1000) {
        console.warn(`Slow operation detected: ${label} took ${duration.toFixed(2)}ms`);
      }
    };
  }
  
  getMetrics(label: string) {
    const times = this.metrics.get(label) || [];
    if (times.length === 0) return null;
    
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const max = Math.max(...times);
    const min = Math.min(...times);
    
    return { avg, max, min, count: times.length };
  }
  
  getAllMetrics() {
    const results: Record<string, any> = {};
    this.metrics.forEach((_, label) => {
      results[label] = this.getMetrics(label);
    });
    return results;
  }
}

// Load testing helpers
export const generateTestEvents = (count: number) => {
  const events = [];
  const types = ['purchase', 'signup', 'review', 'download'];
  
  for (let i = 0; i < count; i++) {
    events.push({
      type: types[Math.floor(Math.random() * types.length)],
      user_name: `User ${i}`,
      timestamp: new Date(Date.now() - Math.random() * 86400000).toISOString(),
      metadata: {
        test: true,
        batch: Math.floor(i / 100)
      }
    });
  }
  
  return events;
};

// Security validation
export const securityChecks = {
  hasCSP: () => {
    const meta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    return !!meta;
  },
  
  hasHTTPS: () => {
    return window.location.protocol === 'https:';
  },
  
  checkXSSProtection: () => {
    // Check if dangerous methods are properly sanitized
    const testDiv = document.createElement('div');
    testDiv.innerHTML = '<img src=x onerror=alert(1)>';
    return !testDiv.innerHTML.includes('onerror');
  }
};

// Global performance monitor instance
export const perfMonitor = new PerformanceMonitor();
