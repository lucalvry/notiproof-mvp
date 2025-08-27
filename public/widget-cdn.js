// CDN-optimized version of widget.js with aggressive caching
// This version is designed to be served from https://cdn.notiproof.com/widget.js
// with Cache-Control: public, max-age=604800 (7 days)

(function() {
  'use strict';
  
  // Get script tag and read configuration
  const currentScript = document.currentScript || document.querySelector('script[data-widget-id]');
  const widgetId = currentScript?.getAttribute('data-widget-id');
  const apiBase = currentScript?.getAttribute('data-api-base') || 'https://ewymvxhpkswhsirdrjub.supabase.co/functions/v1/widget-api';
  const disableBeacon = currentScript?.getAttribute('data-disable-beacon') === 'true';
  
  console.log('NotiProof CDN: Initializing widget (real events only)', { widgetId, apiBase, disableBeacon });
  
  if (!widgetId) {
    console.error('NotiProof CDN: Missing data-widget-id attribute');
    return;
  }

  // Default configuration
  let config = {
    position: 'bottom-left',
    color: '#3B82F6',
    showCloseButton: false,
    template_name: 'live-activity'
  };

  // Template icons only (no fallback messages)
  const templateIcons = {
    'notification-popup': '🔔',
    'testimonial-popup': '⭐',
    'live-activity': '⚡',
    'social-proof': '✅',
    'urgency-timer': '⏰'
  };
  
  // Display rules with sane defaults
  let rules = {
    show_duration_ms: 5000,
    interval_ms: 8000,
    max_per_page: 5,
    max_per_session: 20,
    url_allowlist: [],
    url_denylist: [],
    referrer_allowlist: [],
    referrer_denylist: [],
    triggers: { min_time_on_page_ms: 0, scroll_depth_pct: 0, exit_intent: false },
    enforce_verified_only: false,
    geo_allowlist: [],
    geo_denylist: [],
  };

  // Session and variant handling
  let sessionId = localStorage.getItem('notiproof-session-id');
  if (!sessionId) {
    sessionId = 'np_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    localStorage.setItem('notiproof-session-id', sessionId);
  }
  
  // Assign stable A/B variant per widget and session
  const variantKey = `notiproof-variant-${widgetId}`;
  let variant = localStorage.getItem(variantKey);
  if (!variant) {
    variant = Math.random() < 0.5 ? 'A' : 'B';
    localStorage.setItem(variantKey, variant);
  }

  // Aggressive caching configuration
  const cache = {
    config: {
      data: null,
      etag: null,
      timestamp: 0,
      ttl: 30 * 60 * 1000 // 30 minutes for CDN version
    },
    events: {
      data: [],
      etag: null,
      timestamp: 0,
      ttl: 60 * 1000 // 60 seconds for CDN version
    }
  };

  // Load cache from localStorage
  function loadCache() {
    try {
      const configCache = localStorage.getItem(`notiproof-cdn-config-${widgetId}`);
      const eventsCache = localStorage.getItem(`notiproof-cdn-events-${widgetId}`);
      
      if (configCache) {
        const cached = JSON.parse(configCache);
        if (Date.now() - cached.timestamp < cache.config.ttl) {
          cache.config = cached;
          console.log('NotiProof CDN: Config loaded from cache');
        }
      }
      
      if (eventsCache) {
        const cached = JSON.parse(eventsCache);
        if (Date.now() - cached.timestamp < cache.events.ttl) {
          cache.events = cached;
          console.log('NotiProof CDN: Events loaded from cache');
        }
      }
    } catch (error) {
      console.warn('NotiProof CDN: Cache load error:', error);
    }
  }

  // Save cache to localStorage
  function saveCache(type, data, etag) {
    try {
      const cacheData = {
        data,
        etag,
        timestamp: Date.now()
      };
      cache[type] = cacheData;
      localStorage.setItem(`notiproof-cdn-${type}-${widgetId}`, JSON.stringify(cacheData));
    } catch (error) {
      console.warn('NotiProof CDN: Cache save error:', error);
    }
  }

  // Use runtime bundle endpoint for optimal performance
  async function fetchRuntimeBundle() {
    try {
      // Check if we have valid cached data
      if (cache.events.data.length > 0 && Date.now() - cache.events.timestamp < cache.events.ttl) {
        console.log('NotiProof CDN: Using cached runtime data');
        processRuntimeData({ config: cache.config.data, events: cache.events.data });
        return;
      }

      const headers = {};
      if (cache.events.etag) {
        headers['If-None-Match'] = cache.events.etag;
      }

      const url = `${apiBase}/api/widgets/${widgetId}/runtime?limit=12&fields=message,created_at,metadata,event_type,source,status`;
      console.log('NotiProof CDN: Fetching runtime bundle from:', url);
      
      const response = await fetch(url, { headers });
      
      if (response.status === 304) {
        console.log('NotiProof CDN: Runtime bundle not modified (304), using cache');
        cache.events.timestamp = Date.now(); // Refresh timestamp
        saveCache('events', cache.events.data, cache.events.etag);
        processRuntimeData({ config: cache.config.data, events: cache.events.data });
        return;
      }
      
      if (response.status === 204) {
        console.log('NotiProof CDN: No events available');
        return;
      }
      
      if (response.ok) {
        const runtimeData = await response.json();
        const etag = response.headers.get('ETag');
        
        console.log('NotiProof CDN: Runtime bundle received:', runtimeData);
        
        // Save config and events separately
        if (runtimeData.config) {
          saveCache('config', runtimeData.config, etag);
        }
        if (runtimeData.events) {
          saveCache('events', runtimeData.events, etag);
        }
        
        processRuntimeData(runtimeData);
      } else {
        console.warn('NotiProof CDN: Runtime fetch failed with status', response.status);
        // Use cached data as fallback
        if (cache.events.data.length > 0) {
          processRuntimeData({ config: cache.config.data, events: cache.events.data });
        }
      }
    } catch (error) {
      console.warn('NotiProof CDN: Could not fetch runtime bundle:', error);
      // Use cached data as fallback
      if (cache.events.data.length > 0) {
        processRuntimeData({ config: cache.config.data, events: cache.events.data });
      }
    }
  }

  function processRuntimeData(runtimeData) {
    // Apply configuration
    if (runtimeData.config) {
      if (runtimeData.config.style_config) {
        config = { ...config, ...runtimeData.config.style_config };
      }
      if (runtimeData.config.template_name) {
        config.template_name = runtimeData.config.template_name;
      }
      if (runtimeData.config.display_rules) {
        rules = { ...rules, ...runtimeData.config.display_rules };
      }
      console.log('NotiProof CDN: Config applied');
    }

    // Process events
    if (runtimeData.events && runtimeData.events.length > 0) {
      const events = runtimeData.events
        .filter(event => {
          const isApproved = event.status === 'approved';
          const isLegitimateSource = ['natural', 'integration', 'quick-win'].includes(event.source);
          return isApproved && isLegitimateSource;
        })
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      
      if (events.length > 0) {
        const eventToShow = events[0]; // Show most recent event
        console.log('NotiProof CDN: Displaying event:', eventToShow);
        createWidget(eventToShow);
      }
    }
  }

  // Simplified widget creation for CDN version
  function createWidget(event = {}) {
    const widget = document.createElement('div');
    widget.className = `notiproof-widget ${config.position}`;
    widget.style.cssText = `
      position: fixed;
      z-index: 9999;
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      padding: 16px;
      min-width: 300px;
      max-width: 400px;
      transform: translateY(100px);
      opacity: 0;
      transition: all 0.3s ease;
      cursor: pointer;
      border-left: 4px solid ${config.color};
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      line-height: 1.4;
      color: #333;
    `;
    
    // Position the widget
    if (config.position.includes('bottom')) {
      widget.style.bottom = '20px';
    } else {
      widget.style.top = '20px';
    }
    if (config.position.includes('left')) {
      widget.style.left = '20px';
    } else {
      widget.style.right = '20px';
    }
    
    const icon = templateIcons[config.template_name] || templateIcons['notification-popup'];
    const message = event.message || event.event_data?.message || 'New activity';
    const content = `${icon} ${message}`;
    
    widget.innerHTML = `
      ${config.showCloseButton ? '<button class="notiproof-close" style="position: absolute; top: 8px; right: 8px; background: none; border: none; font-size: 18px; cursor: pointer; color: #999;">×</button>' : ''}
      <div class="notiproof-content">${content}</div>
    `;
    
    console.log('NotiProof CDN: Widget created');
    
    // Add close functionality
    if (config.showCloseButton) {
      const closeButton = widget.querySelector('.notiproof-close');
      closeButton.addEventListener('click', (e) => {
        e.stopPropagation();
        widget.style.transform = 'translateY(100px)';
        widget.style.opacity = '0';
        setTimeout(() => widget.remove(), 300);
      });
    }
    
    document.body.appendChild(widget);
    
    // Show widget with animation
    setTimeout(() => {
      widget.style.transform = 'translateY(0)';
      widget.style.opacity = '1';
    }, 100);
    
    // Auto-hide
    setTimeout(() => {
      if (document.body.contains(widget)) {
        widget.style.transform = 'translateY(100px)';
        widget.style.opacity = '0';
        setTimeout(() => widget.remove(), 300);
      }
    }, rules.show_duration_ms || 5000);
  }

  // Document visibility tracking
  let isVisible = true;
  let lastFetchTime = 0;
  
  document.addEventListener('visibilitychange', () => {
    isVisible = !document.hidden;
    console.log('NotiProof CDN: Visibility changed:', isVisible ? 'visible' : 'hidden');
    if (isVisible) {
      // Resume fetching when tab becomes visible
      setTimeout(() => {
        const now = Date.now();
        if (now - lastFetchTime > 60000) { // Only if last fetch was > 1 minute ago
          fetchRuntimeBundle();
        }
      }, 1000);
    }
  });

  // Initialize widget
  console.log('NotiProof CDN: Starting initialization...');
  
  // Load cache first
  loadCache();
  
  // Initial fetch
  fetchRuntimeBundle();
  lastFetchTime = Date.now();
  
  // Set up polling for new events (every 2 minutes for CDN version)
  setInterval(() => {
    if (isVisible) {
      const now = Date.now();
      if (now - lastFetchTime > 60000) { // Throttle to max once per minute
        fetchRuntimeBundle();
        lastFetchTime = now;
      }
    }
  }, 120000); // 2 minutes

  // Expose minimal API
  window.NotiProof = {
    refresh: () => {
      console.log('NotiProof CDN: Manual refresh');
      fetchRuntimeBundle();
      lastFetchTime = Date.now();
    },
    version: 'cdn-1.0'
  };

})();