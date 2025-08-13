(function() {
  'use strict';
  
  // Enhanced NotiProof Widget with Form Tracking and E-commerce Integration
  class NotiProofWidget {
    constructor(widgetId) {
      this.widgetId = widgetId;
      this.apiUrl = 'https://ewymvxhpkswhsirdrjub.functions.supabase.co';
      this.sessionId = this.generateSessionId();
      this.isVisible = false;
      this.eventQueue = [];
      this.formTracking = true;
      this.conversionTracking = true;
      
      this.init();
    }

    generateSessionId() {
      return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    async init() {
      try {
        // Load widget configuration
        await this.loadConfig();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Start tracking
        this.trackPageview();
        
        // Load and display notifications
        await this.loadNotifications();
        
        console.log('NotiProof Widget initialized successfully');
      } catch (error) {
        console.error('NotiProof Widget initialization failed:', error);
      }
    }

    async loadConfig() {
      try {
        const response = await fetch(`${this.apiUrl}/javascript-api`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'get_widget_config',
            widgetId: this.widgetId
          })
        });
        
        const data = await response.json();
        this.config = data.widget;
        this.trackingEnabled = data.tracking_enabled;
      } catch (error) {
        console.error('Failed to load widget config:', error);
        this.config = this.getDefaultConfig();
      }
    }

    getDefaultConfig() {
      return {
        style_config: {
          position: 'bottom-left',
          color: '#3B82F6',
          delay: 3000
        },
        display_rules: {
          show_duration_ms: 5000,
          interval_ms: 8000,
          max_per_page: 5
        }
      };
    }

    setupEventListeners() {
      // Form submission tracking
      if (this.formTracking) {
        document.addEventListener('submit', (e) => {
          this.trackFormSubmission(e);
        });
      }

      // Conversion tracking (for e-commerce)
      if (this.conversionTracking) {
        this.setupConversionTracking();
      }

      // Click tracking on notification
      document.addEventListener('click', (e) => {
        if (e.target.closest('.notiproof-notification')) {
          this.trackNotificationClick();
        }
      });
    }

    async trackFormSubmission(event) {
      try {
        const form = event.target;
        if (form.tagName !== 'FORM') return;

        const formData = new FormData(form);
        const fields = {};
        
        // Extract common form fields
        for (let [key, value] of formData.entries()) {
          fields[key] = value;
        }

        const email = fields.email || fields.EMAIL || fields.email_address;
        if (!email) return; // Only track forms with email

        await fetch(`${this.apiUrl}/javascript-api`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'track_form_submit',
            widgetId: this.widgetId,
            data: {
              formId: form.id || form.className || 'unknown',
              fields: fields,
              pageUrl: window.location.href,
              location: await this.getLocationData()
            }
          })
        });

        console.log('Form submission tracked');
      } catch (error) {
        console.error('Error tracking form submission:', error);
      }
    }

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
        if (data.display_rules) {
          rules = { ...rules, ...data.display_rules };
        }
        console.log('NotiProof: Widget config loaded:', { template: config.template_name, styleConfig: data.style_config, displayRules: rules });
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
    
    // Auto-hide
    setTimeout(() => {
      if (document.body.contains(widget)) {
        widget.classList.remove('show');
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
    window.addEventListener('scroll', () => {
      updateScroll();
    }, { passive: true });

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
      if (Array.isArray(rules.url_allowlist) && rules.url_allowlist.length > 0 && !matchAny(rules.url_allowlist)) return false;
      if (matchAny(rules.url_denylist)) return false;
      if (Array.isArray(rules.referrer_allowlist) && rules.referrer_allowlist.length > 0 && !matchAnyRef(rules.referrer_allowlist)) return false;
      if (matchAnyRef(rules.referrer_denylist)) return false;
      return true;
    };

    const triggersMet = () => {
      const timeOk = (Date.now() - pageStart) >= (rules.triggers?.min_time_on_page_ms || 0);
      const scrollOk = scrolledPct >= (rules.triggers?.scroll_depth_pct || 0);
      return timeOk && scrollOk;
    };

    const canShowMore = () => {
      const c = getCounts();
      if (rules.max_per_page && c.page >= rules.max_per_page) return false;
      if (rules.max_per_session && c.session >= rules.max_per_session) return false;
      return true;
    };

    // Geo guard - check cached geo data
    let cachedCountry = localStorage.getItem('notiproof-geo-country');
    let lastGeoCheck = localStorage.getItem('notiproof-geo-check');
    const geoNeedsRefresh = !lastGeoCheck || (Date.now() - parseInt(lastGeoCheck)) > 24 * 60 * 60 * 1000; // 24 hours

    const resolveGeo = async () => {
      if (!geoNeedsRefresh && cachedCountry) {
        console.log('NotiProof: Using cached geo:', cachedCountry);
        return cachedCountry;
      }
      try {
        console.log('NotiProof: Resolving geo location...');
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
        
        const resp = await fetch('https://ipapi.co/json/', { 
          headers: { 'Accept': 'application/json' },
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        if (resp.ok) {
          const geo = await resp.json();
          cachedCountry = geo.country_name || geo.country || '';
          localStorage.setItem('notiproof-geo-country', cachedCountry);
          localStorage.setItem('notiproof-geo-check', String(Date.now()));
          console.log('NotiProof: Geo resolved:', cachedCountry);
        } else {
          console.warn('NotiProof: Geo API returned non-OK status:', resp.status);
        }
      } catch (e) {
        console.warn('NotiProof: Geo resolution failed, continuing without geo data', e);
        // Set a fallback to prevent repeated failures
        localStorage.setItem('notiproof-geo-check', String(Date.now()));
      }
      return cachedCountry || '';
    };

    const geoGuard = async () => {
      const allow = Array.isArray(rules.geo_allowlist) && rules.geo_allowlist.length > 0;
      const deny = Array.isArray(rules.geo_denylist) && rules.geo_denylist.length > 0;
      if (!allow && !deny) return true; // No geo restrictions
      
      const country = await resolveGeo();
      if (!country) return true; // Can't determine geo, allow
      
      if (allow && !rules.geo_allowlist.includes(country)) {
        console.log('NotiProof: Geo blocked by allowlist:', country);
        return false;
      }
      if (deny && rules.geo_denylist.includes(country)) {
        console.log('NotiProof: Geo blocked by denylist:', country);
        return false;
      }
      return true;
    };

    const maybeShow = async () => {
      console.log('NotiProof: maybeShow() called');
      
      // Check URL/referrer filters
      const allowedByLists = isAllowedByLists();
      console.log('NotiProof: URL/referrer allowed:', allowedByLists);
      if (!allowedByLists) return;
      
      // Check count limits
      const canShow = canShowMore();
      console.log('NotiProof: Can show more widgets:', canShow);
      if (!canShow) return;
      
      // Check geo restrictions
      const geoAllowed = await geoGuard();
      console.log('NotiProof: Geo allowed:', geoAllowed);
      if (!geoAllowed) return;
      
      // Check triggers (time/scroll) - skip for exit intent
      if (!rules.triggers?.exit_intent) {
        const triggersOk = triggersMet();
        console.log('NotiProof: Triggers met:', triggersOk);
        if (!triggersOk) return;
      }
      
      console.log('NotiProof: All conditions met, showing widget');
      incCounts();
      fetchAndDisplayEvents();
    };

    // Exit intent handler
    const onExitIntent = async (e) => {
      if (!rules.triggers?.exit_intent) return;
      if (e.clientY <= 0) {
        await maybeShow();
        window.removeEventListener('mouseout', onExitIntent);
      }
    };

    // Start showing notifications
    console.log('NotiProof: Widget initialization complete, setting up display logic');
    console.log('NotiProof: Display rules:', rules);
    console.log('NotiProof: Widget config:', config);
    
    if (rules.triggers?.exit_intent) {
      console.log('NotiProof: Setting up exit intent trigger');
      window.addEventListener('mouseout', onExitIntent);
    } else {
      const delay = Number(config.delay) || 3000;
      console.log('NotiProof: Setting up timed display with delay:', delay);
      setTimeout(async () => {
        console.log('NotiProof: Initial display timer triggered');
        await maybeShow();
        const interval = Math.max(1000, Number(rules.interval_ms) || 8000);
        console.log('NotiProof: Setting up recurring display with interval:', interval);
        setInterval(async () => {
          console.log('NotiProof: Recurring display timer triggered');
          await maybeShow();
        }, interval);
      }, delay);
    }
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