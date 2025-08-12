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
  const disableBeacon = scriptTag.getAttribute('data-disable-beacon') === 'true';
  
  console.log('NotiProof: Initializing widget', { widgetId, apiBase, disableBeacon });

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
    showCloseButton: true,
    template_name: 'notification-popup'
  };

  // Template content mapping
  const templateContent = {
    'notification-popup': {
      icon: '🔔',
      messages: [
        'Someone just signed up!',
        'New user joined from New York!',
        'Someone just made a purchase!',
        'New customer from California!'
      ]
    },
    'testimonial-popup': {
      icon: '⭐',
      messages: [
        '"Amazing product!" - Sarah M.',
        '"Best service ever!" - John D.',
        '"Highly recommended!" - Lisa K.',
        '"Love this company!" - Mike R.'
      ]
    },
    'live-activity': {
      icon: '⚡',
      messages: [
        '12 people are viewing this page right now',
        '5 people bought this in the last hour',
        '25 people are browsing right now',
        '8 people added this to cart today'
      ]
    },
    'social-proof': {
      icon: '✅',
      messages: [
        'Trusted by 1,000+ customers',
        'Join 5,000+ happy customers',
        'Over 2,500 satisfied clients',
        'Rated 5 stars by customers'
      ]
    },
    'urgency-timer': {
      icon: '⏰',
      messages: [
        'Limited offer - 2 hours left!',
        'Sale ends soon - Act fast!',
        'Only 3 items left in stock!',
        'Flash sale - 1 hour remaining!'
      ]
    }
  };

  // Generate session ID for deduplication
  let sessionId = localStorage.getItem('notiproof-session-id');
  if (!sessionId) {
    sessionId = 'np_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    localStorage.setItem('notiproof-session-id', sessionId);
  }
  // Assign stable A/B variant per widget and session
  const variantKey = `notiproof-variant-${widgetId}`;
  let variant = localStorage.getItem(variantKey);
  if (!variant) {
    // Simple 50/50 split
    variant = Math.random() < 0.5 ? 'A' : 'B';
    localStorage.setItem(variantKey, variant);
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
        if (data.template_name) {
          config.template_name = data.template_name;
        }
        console.log('NotiProof: Widget config loaded:', { template: config.template_name, styleConfig: data.style_config });
      }
    } catch (error) {
      console.warn('NotiProof: Could not fetch widget config, using defaults');
    }
  }

  // Get template-appropriate content
  function getTemplateContent(event) {
    const template = templateContent[config.template_name] || templateContent['notification-popup'];
    
    // If event has a custom message, use it
    if (event && event.message) {
      return `${template.icon} ${event.message}`;
    }
    
    // Otherwise use a random template message
    const messages = template.messages;
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];
    return `${template.icon} ${randomMessage}`;
  }

  // Create widget element
  function createWidget(event = {}) {
    // Ensure we have proper event data for tracking
    if (!event.message) {
      const template = templateContent[config.template_name] || templateContent['notification-popup'];
      const messages = template.messages;
      event.message = messages[Math.floor(Math.random() * messages.length)];
      console.log('NotiProof: Generated default message for tracking:', event.message);
    }
    
    const widget = document.createElement('div');
    widget.className = `notiproof-widget ${config.position}`;
    widget.style.borderLeftColor = config.color;
    widget.style.cursor = 'pointer';
    
    const content = getTemplateContent(event);
    
    widget.innerHTML = `
      ${config.showCloseButton ? '<button class="notiproof-close">×</button>' : ''}
      <div class="notiproof-content">${content}</div>
    `;
    
    console.log('NotiProof: Widget created with template:', config.template_name, 'content:', content, 'event:', event);
    
    // Add click tracking to the widget body
    widget.addEventListener('click', (e) => {
      if (!e.target.closest('.notiproof-close')) {
        const now = Date.now();
        if (now - lastClickTime > CLICK_DEDUPE_WINDOW) {
          lastClickTime = now;
          console.log('NotiProof: Click detected, tracking with message:', event.message);
          trackClickEvent(e.target, {
            message: event.message || 'Widget clicked',
            widget_clicked: true,
            template_name: config.template_name
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
          message: event.message || 'Widget closed',
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
      message: event.message || 'Widget displayed',
      widget_displayed: true,
      template_name: config.template_name
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
            variant,
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
    const eventData = {
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
      event_data: { ...eventData, variant }
    };

    // Debug logging - show actual payload structure
    console.log('NotiProof: Click Payload:', JSON.stringify(payload, null, 2));
    console.log('NotiProof: Sending click to URL:', `${apiBase}/api/widgets/${widgetId}/events`);

    const url = `${apiBase}/api/widgets/${widgetId}/events`;

    // Use sendBeacon for navigation-safe delivery, fallback to fetch with keepalive
    if (disableBeacon) {
      console.log('NotiProof: Beacon disabled via data attribute, using fetch');
      fallbackTrackClick(url, payload);
      return;
    }

    if (navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
      const sent = navigator.sendBeacon(url, blob);
      console.log('NotiProof: sendBeacon result:', sent);
      if (!sent) {
        console.log('NotiProof: sendBeacon failed, using fetch fallback');
        fallbackTrackClick(url, payload);
      } else {
        console.log('NotiProof: Click sent successfully via sendBeacon');
      }
    } else {
      console.log('NotiProof: sendBeacon not available, using fetch');
      fallbackTrackClick(url, payload);
    }
  }

  // Fallback tracking method
  function fallbackTrackClick(url, payload) {
    console.log('NotiProof: Using fetch fallback for click tracking');
    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      keepalive: true
    }).then(response => {
      console.log('NotiProof: Fetch click response status:', response.status);
      return response.text();
    }).then(text => {
      console.log('NotiProof: Fetch click response body:', text);
    }).catch(error => {
      console.error('NotiProof: Fetch click error:', error);
    });
  }

  // Fetch and display events
  async function fetchAndDisplayEvents() {
    try {
      await fetchWidgetConfig();
      const response = await fetch(`${apiBase}/api/widgets/${widgetId}/events`);
      if (response.ok) {
        const events = await response.json();
        // Always show template-based content since that's what templates are for
        // Don't use stored events for display, they're for tracking only
        // Generate a proper event object with default message
        const template = templateContent[config.template_name] || templateContent['notification-popup'];
        const messages = template.messages;
        const defaultEvent = {
          message: messages[Math.floor(Math.random() * messages.length)],
          template_name: config.template_name
        };
        createWidget(defaultEvent);
      } else {
        // Show template-based content if API fails
        console.warn('NotiProof: Events fetch responded with non-OK status', response.status);
        const template = templateContent[config.template_name] || templateContent['notification-popup'];
        const messages = template.messages;
        const defaultEvent = {
          message: messages[Math.floor(Math.random() * messages.length)],
          template_name: config.template_name
        };
        createWidget(defaultEvent);
      }
    } catch (error) {
      console.warn('NotiProof: Could not fetch events, showing template default');
      const template = templateContent[config.template_name] || templateContent['notification-popup'];
      const messages = template.messages;
      const defaultEvent = {
        message: messages[Math.floor(Math.random() * messages.length)],
        template_name: config.template_name
      };
      createWidget(defaultEvent);
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