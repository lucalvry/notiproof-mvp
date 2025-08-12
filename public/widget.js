(function() {
  'use strict';

  // Get widget configuration from script tag
  const scriptTag = document.querySelector('script[data-widget-id]');
  if (!scriptTag) {
    console.error('NotiProof: No widget ID found in script tag');
    return;
  }

  const widgetId = scriptTag.getAttribute('data-widget-id');
  const apiBase = scriptTag.getAttribute('data-api-base') || 'https://ewymvxhpkswhsirdrjub.supabase.co/functions/v1/widget-api';
  
  console.log('NotiProof: Initializing widget', { widgetId, apiBase });

  // Widget styles
  const widgetStyles = `
    .notiproof-widget {
      position: fixed;
      z-index: 9999;
      padding: 16px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
      border-left: 4px solid #3B82F6;
      max-width: 300px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      font-size: 14px;
      line-height: 1.4;
      color: #1f2937;
      opacity: 0;
      transform: translateY(20px);
      transition: all 0.3s ease-in-out;
    }
    
    .notiproof-widget.show {
      opacity: 1;
      transform: translateY(0);
    }
    
    .notiproof-widget.bottom-left {
      bottom: 20px;
      left: 20px;
    }
    
    .notiproof-widget.bottom-right {
      bottom: 20px;
      right: 20px;
    }
    
    .notiproof-widget.top-left {
      top: 20px;
      left: 20px;
    }
    
    .notiproof-widget.top-right {
      top: 20px;
      right: 20px;
    }
    
    .notiproof-close {
      position: absolute;
      top: 8px;
      right: 8px;
      background: none;
      border: none;
      font-size: 18px;
      cursor: pointer;
      color: #6b7280;
      padding: 0;
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .notiproof-close:hover {
      color: #374151;
    }
    
    @media (max-width: 480px) {
      .notiproof-widget {
        left: 10px !important;
        right: 10px !important;
        max-width: calc(100vw - 20px);
      }
    }
  `;

  // Inject styles
  const styleSheet = document.createElement('style');
  styleSheet.textContent = widgetStyles;
  document.head.appendChild(styleSheet);

  // Widget configuration
  let config = {
    position: 'bottom-left',
    delay: 3000,
    color: '#3B82F6',
    showCloseButton: true
  };

  // Generate session ID for deduplication
  let sessionId = localStorage.getItem('notiproof-session-id');
  if (!sessionId) {
    sessionId = 'np_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    localStorage.setItem('notiproof-session-id', sessionId);
  }

  // Click tracking deduplication
  let lastClickTime = 0;
  const CLICK_DEDUPE_WINDOW = 1000; // 1 second

  // Fetch widget configuration
  async function fetchWidgetConfig() {
    try {
      const response = await fetch(`${apiBase}/api/widgets/${widgetId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.style_config) {
          config = { ...config, ...data.style_config };
        }
      }
    } catch (error) {
      console.warn('NotiProof: Could not fetch widget config, using defaults');
    }
  }

  // Create widget element
  function createWidget(event) {
    const widget = document.createElement('div');
    widget.className = `notiproof-widget ${config.position}`;
    widget.style.borderLeftColor = config.color;
    widget.style.cursor = 'pointer';
    
    widget.innerHTML = `
      ${config.showCloseButton ? '<button class="notiproof-close">×</button>' : ''}
      <div class="notiproof-content">${event.message || '🔔 Someone just signed up!'}</div>
    `;
    
    // Add click tracking to the widget body
    widget.addEventListener('click', (e) => {
      if (!e.target.closest('.notiproof-close')) {
        const now = Date.now();
        if (now - lastClickTime > CLICK_DEDUPE_WINDOW) {
          lastClickTime = now;
          trackClickEvent(e.target, {
            message: event.message,
            widget_clicked: true
          });
        }
      }
    });
    
    // Add close functionality
    if (config.showCloseButton) {
      const closeButton = widget.querySelector('.notiproof-close');
      closeButton.addEventListener('click', (e) => {
        e.stopPropagation();
        widget.classList.remove('show');
        setTimeout(() => widget.remove(), 300);
        trackEvent('close', { 
          message: event.message,
          widget_closed: true 
        });
      });
    }
    
    document.body.appendChild(widget);
    
    // Show widget with animation
    setTimeout(() => widget.classList.add('show'), 100);
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      if (document.body.contains(widget)) {
        widget.classList.remove('show');
        setTimeout(() => widget.remove(), 300);
      }
    }, 5000);
    
    // Track impression/view
    trackEvent('view', { 
      message: event.message,
      widget_displayed: true 
    });
  }

  // Track events (general)
  async function trackEvent(type, data = {}) {
    try {
      await fetch(`${apiBase}/api/widgets/${widgetId}/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event_type: type,
          event_data: {
            ...data,
            timestamp: new Date().toISOString(),
            user_agent: navigator.userAgent,
            url: window.location.href,
            referrer: document.referrer,
            session_id: sessionId
          }
        })
      });
    } catch (error) {
      console.warn('NotiProof: Could not track event', error);
    }
  }

  // Track click events with sendBeacon for reliable delivery
  function trackClickEvent(target, data = {}) {
    const metadata = {
      element: target.className || 'notiproof-content',
      href: target.href || null,
      page_url: window.location.href,
      referrer: document.referrer,
      user_agent: navigator.userAgent,
      session_id: sessionId,
      timestamp: new Date().toISOString(),
      ...data
    };

    const payload = {
      event_type: 'click',
      metadata: metadata
    };

    const url = `${apiBase}/api/widgets/${widgetId}/events`;

    // Use sendBeacon for navigation-safe delivery, fallback to fetch with keepalive
    if (navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
      const sent = navigator.sendBeacon(url, blob);
      if (!sent) {
        // Fallback to fetch if sendBeacon fails
        fallbackTrackClick(url, payload);
      }
    } else {
      fallbackTrackClick(url, payload);
    }
  }

  // Fallback tracking method
  function fallbackTrackClick(url, payload) {
    try {
      fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        keepalive: true
      }).catch(() => {
        // Silently ignore errors to avoid affecting user experience
      });
    } catch (error) {
      // Silently ignore errors
    }
  }

  // Fetch and display events
  async function fetchAndDisplayEvents() {
    try {
      const response = await fetch(`${apiBase}/api/widgets/${widgetId}/events`);
      if (response.ok) {
        const events = await response.json();
        if (events && events.length > 0) {
          // Show random event
          const randomEvent = events[Math.floor(Math.random() * events.length)];
          createWidget(randomEvent);
        } else {
          // Show default event if no events exist
          createWidget({ message: '🔔 Someone just signed up!' });
        }
      }
    } catch (error) {
      console.warn('NotiProof: Could not fetch events, showing default');
      createWidget({ message: '🔔 Someone just signed up!' });
    }
  }

  // Initialize widget
  async function init() {
    await fetchWidgetConfig();
    
    // Initial delay
    setTimeout(() => {
      fetchAndDisplayEvents();
      
      // Show periodic notifications
      setInterval(fetchAndDisplayEvents, 30000); // Every 30 seconds
    }, config.delay);
  }

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose API for manual triggering
  window.NotiProof = {
    show: createWidget,
    track: trackEvent,
    widgetId: widgetId,
    // Helper methods for common tracking
    trackConversion: (data) => trackEvent('conversion', data),
    trackPurchase: (data) => trackEvent('purchase', data),
    trackSignup: (data) => trackEvent('signup', data)
  };
})();