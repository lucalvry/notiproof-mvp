(function() {
  'use strict';
  
  // Get script tag and read configuration
  const currentScript = document.currentScript || document.querySelector('script[data-widget-id]');
  const widgetId = currentScript?.getAttribute('data-widget-id');
  const apiBase = currentScript?.getAttribute('data-api-base') || 'https://ewymvxhpkswhsirdrjub.supabase.co/functions/v1/widget-api';
  const disableBeacon = currentScript?.getAttribute('data-disable-beacon') === 'true';
  
  console.log('NotiProof: Initializing widget', { widgetId, apiBase, disableBeacon });
  
  if (!widgetId) {
    console.error('NotiProof: Missing data-widget-id attribute');
    return;
  }

  // Default configuration
  let config = {
    position: 'bottom-left',
    color: '#3B82F6',
    showCloseButton: false,
    template_name: 'live-activity'
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

  // Click tracking deduplication
  let lastClickTime = 0;
  const CLICK_DEDUPE_WINDOW = 1000;

  // Fetch widget configuration
  async function fetchWidgetConfig() {
    try {
      console.log('NotiProof: Fetching widget config from:', `${apiBase}/api/widgets/${widgetId}`);
      const response = await fetch(`${apiBase}/api/widgets/${widgetId}`);
      if (response.ok) {
        const data = await response.json();
        console.log('NotiProof: Widget config response:', data);
        
        if (data.style_config) {
          config = { ...config, ...data.style_config };
        }
        if (data.template_name) {
          config.template_name = data.template_name;
        }
        if (data.display_rules) {
          rules = { ...rules, ...data.display_rules };
        }
        console.log('NotiProof: Widget config loaded:', { template: config.template_name, styleConfig: data.style_config, displayRules: rules });
      } else {
        console.warn('NotiProof: Widget config fetch failed with status:', response.status);
      }
    } catch (error) {
      console.warn('NotiProof: Could not fetch widget config, using defaults:', error);
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
    
    const content = getTemplateContent(event);
    
    widget.innerHTML = `
      ${config.showCloseButton ? '<button class="notiproof-close" style="position: absolute; top: 8px; right: 8px; background: none; border: none; font-size: 18px; cursor: pointer; color: #999;">×</button>' : ''}
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
        widget.style.transform = 'translateY(100px)';
        widget.style.opacity = '0';
        setTimeout(() => widget.remove(), 300);
        trackEvent('close', { 
          message: event.message || 'Widget closed',
          widget_closed: true 
        });
      });
    }
    
    document.body.appendChild(widget);
    
    // Show widget with animation
    setTimeout(() => {
      widget.style.transform = 'translateY(0)';
      widget.style.opacity = '1';
      widget.classList.add('show');
    }, 100);
    
    // Auto-hide
    setTimeout(() => {
      if (document.body.contains(widget)) {
        widget.style.transform = 'translateY(100px)';
        widget.style.opacity = '0';
        setTimeout(() => widget.remove(), 300);
      }
    }, rules.show_duration_ms || 5000);
    
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
      const url = `${apiBase}/api/widgets/${widgetId}/events`;
      const payload = {
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
      };
      
      console.log('NotiProof: Tracking event:', type, 'to URL:', url);
      
      await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
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
      console.log('NotiProof: Fetching events from:', `${apiBase}/api/widgets/${widgetId}/events`);
      
      const response = await fetch(`${apiBase}/api/widgets/${widgetId}/events`);
      console.log('NotiProof: Events response status:', response.status);
      
      if (response.ok) {
        const events = await response.json();
        console.log('NotiProof: Events received:', events);
        
        // Always show template-based content since that's what templates are for
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
      console.warn('NotiProof: Could not fetch events, showing template default:', error);
      const template = templateContent[config.template_name] || templateContent['notification-popup'];
      const messages = template.messages;
      const defaultEvent = {
        message: messages[Math.floor(Math.random() * messages.length)],
        template_name: config.template_name
      };
      createWidget(defaultEvent);
    }
  }

  // Initialize widget with rules & triggers
  async function init() {
    const pageStart = Date.now();
    let scrolledPct = 0;

    const updateScroll = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const docHeight = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
      const winHeight = window.innerHeight;
      const totalScrollable = docHeight - winHeight;
      scrolledPct = totalScrollable > 0 ? Math.min(100, Math.round((scrollTop / totalScrollable) * 100)) : 100;
    };
    
    window.addEventListener('scroll', updateScroll, { passive: true });

    await fetchWidgetConfig();
    updateScroll();

    const pageCountKey = `notiproof-page-count-${widgetId}-${location.pathname}`;
    const sessionCountKey = `notiproof-session-count-${widgetId}`;

    const getCounts = () => ({
      page: Number(localStorage.getItem(pageCountKey) || '0'),
      session: Number(localStorage.getItem(sessionCountKey) || '0'),
    });
    
    const incCounts = () => {
      const c = getCounts();
      localStorage.setItem(pageCountKey, String(c.page + 1));
      localStorage.setItem(sessionCountKey, String(c.session + 1));
    };

    const isAllowedByLists = () => {
      const url = window.location.href;
      const ref = document.referrer || '';
      const matchAny = (list) => Array.isArray(list) && list.some((p) => p && url.includes(p));
      const matchAnyRef = (list) => Array.isArray(list) && list.some((p) => p && ref.includes(p));

      if (Array.isArray(rules.url_denylist) && rules.url_denylist.length > 0 && matchAny(rules.url_denylist)) return false;
      if (Array.isArray(rules.url_allowlist) && rules.url_allowlist.length > 0 && !matchAny(rules.url_allowlist)) return false;
      if (Array.isArray(rules.referrer_denylist) && rules.referrer_denylist.length > 0 && matchAnyRef(rules.referrer_denylist)) return false;
      if (Array.isArray(rules.referrer_allowlist) && rules.referrer_allowlist.length > 0 && !matchAnyRef(rules.referrer_allowlist)) return false;

      return true;
    };

    const maybeShow = () => {
      const counts = getCounts();
      if (counts.page >= (rules.max_per_page || 5)) return;
      if (counts.session >= (rules.max_per_session || 20)) return;
      if (!isAllowedByLists()) return;

      const timeOnPage = Date.now() - pageStart;
      if (timeOnPage < (rules.triggers?.min_time_on_page_ms || 0)) return;
      if (scrolledPct < (rules.triggers?.scroll_depth_pct || 0)) return;

      fetchAndDisplayEvents();
      incCounts();
    };

    // Initial display with delay
    setTimeout(() => {
      console.log('NotiProof: Initial display trigger');
      maybeShow();
    }, rules.triggers?.min_time_on_page_ms || 3000);

    // Recurring display
    if (rules.interval_ms && rules.interval_ms > 0) {
      setInterval(() => {
        console.log('NotiProof: Interval display trigger');
        maybeShow();
      }, rules.interval_ms);
    }

    // Exit intent
    if (rules.triggers?.exit_intent) {
      let exitIntentShown = false;
      document.addEventListener('mouseleave', (e) => {
        if (!exitIntentShown && e.clientY <= 0) {
          exitIntentShown = true;
          console.log('NotiProof: Exit intent trigger');
          maybeShow();
        }
      });
    }
  }

  // Wait for DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose global NotiProof object for manual control
  window.NotiProof = {
    show: () => {
      console.log('NotiProof: Manual show trigger');
      fetchAndDisplayEvents();
    },
    track: (eventType, data) => {
      console.log('NotiProof: Manual track trigger:', eventType, data);
      trackEvent(eventType, data);
    },
    trackConversion: (data = {}) => {
      console.log('NotiProof: Manual conversion track');
      trackEvent('conversion', { ...data, manual_conversion: true });
    },
    trackPurchase: (value, currency = 'USD', data = {}) => {
      console.log('NotiProof: Manual purchase track');
      trackEvent('purchase', { ...data, value, currency, manual_purchase: true });
    },
    trackSignup: (data = {}) => {
      console.log('NotiProof: Manual signup track');
      trackEvent('signup', { ...data, manual_signup: true });
    }
  };

})();
