(function() {
  'use strict';
  
  // Get script tag and read configuration
  const currentScript = document.currentScript || document.querySelector('script[data-widget-id]');
  const widgetId = currentScript?.getAttribute('data-widget-id');
  const apiBase = currentScript?.getAttribute('data-api-base') || 'https://ewymvxhpkswhsirdrjub.supabase.co/functions/v1/widget-api';
  const disableBeacon = currentScript?.getAttribute('data-disable-beacon') === 'true';
  // Removed fallback support - only real events allowed
  
  console.log('NotiProof: Initializing widget (real events only)', { widgetId, apiBase, disableBeacon });
  
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

  // Enhanced message extraction with priority hierarchy
  function extractMessage(event) {
    // Priority 1: Custom message from event_data.message
    if (event?.event_data?.message) {
      return event.event_data.message;
    }
    
    // Priority 2: Direct message field
    if (event?.message) {
      return event.message;
    }
    
    // Priority 3: Generated template message from message_template field
    if (event?.message_template) {
      return event.message_template;
    }
    
    // Priority 4: Generated message from context_template
    if (event?.context_template) {
      return event.context_template;
    }
    
    // Priority 5: Smart message generation from event data (only if real data exists)
    if (event?.event_data) {
      const smartMessage = generateSmartMessage(event);
      if (smartMessage) {
        return smartMessage;
      }
    }
    
    // CRITICAL: NO FALLBACK MESSAGES - only real events are shown
    console.log('NotiProof: No valid message found for event, skipping display');
    return null;
  }

  // Generate smart message from event data - ONLY for legitimate events with real data
  function generateSmartMessage(event) {
    const eventData = event.event_data || {};
    const eventType = event.event_type || '';
    
    // Extract relevant data - MUST have real data, no fabrication
    const name = eventData.user_name || event.user_name || eventData.name;
    const location = eventData.user_location || event.user_location || eventData.location;
    const product = eventData.product || eventData.service;
    const amount = eventData.amount || eventData.value;
    const rating = eventData.rating;
    
    // ONLY generate messages for events with real user data
    switch (eventType) {
      case 'purchase':
        if (name && location && product && amount) {
          return `${name} from ${location} just bought ${product} for $${amount}`;
        }
        if (name && product) {
          return `${name} just purchased ${product}`;
        }
        // NO FALLBACK - only show if we have real data
        return null;
        
      case 'signup':
        if (name && location) {
          return `${name} from ${location} just signed up`;
        }
        if (name) {
          return `${name} just joined`;
        }
        // NO FALLBACK - only show if we have real data
        return null;
        
      case 'review':
        if (name && rating && product) {
          return `${name} left a ${rating}-star review for ${product}`;
        }
        // NO FALLBACK - only show if we have real data
        return null;
        
      case 'conversion':
        if (name && location) {
          return `${name} from ${location} just converted`;
        }
        if (name) {
          return `${name} just took action`;
        }
        // NO FALLBACK - only show if we have real data
        return null;
        
      default:
        // NO GENERIC MESSAGES - only show legitimate event data
        return null;
    }
  }

  // Get template-appropriate content with enhanced message priority
  function getTemplateContent(event) {
    const icon = templateIcons[config.template_name] || templateIcons['notification-popup'];
    const message = extractMessage(event);
    // ONLY return content if we have a real message
    return message ? `${icon} ${message}` : null;
  }

  // Create widget element
  function createWidget(event = {}) {
    // Ensure we have proper event data for tracking
    if (!event.message) {
      event.message = extractMessage(event) || '';
      console.log('NotiProof: Generated message for tracking:', event.message);
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
    
    // CRITICAL: Don't create widget if no valid content
    if (!content) {
      console.log('NotiProof: No valid content for event, widget not created');
      return;
    }
    
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

  // Enhanced visitor tracking with country detection
  async function trackVisitorSession() {
    try {
      const url = `${apiBase}/api/widgets/${widgetId}/visitor-session`;
      const payload = {
        session_id: sessionId,
        page_url: window.location.href,
        user_agent: navigator.userAgent,
        referrer: document.referrer,
        timestamp: new Date().toISOString()
      };
      
      await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });
    } catch (error) {
      console.warn('NotiProof: Could not track visitor session', error);
    }
  }

  // Track events (general) with enhanced visitor data
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
          session_id: sessionId,
          viewport_width: window.innerWidth,
          viewport_height: window.innerHeight,
          screen_width: screen.width,
          screen_height: screen.height,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          language: navigator.language
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

  // Enhanced event fetching with real-time updates and message priority
  let eventQueue = [];
  let lastEventTime = 0;
  
  async function fetchAndDisplayEvents() {
    try {
      await fetchWidgetConfig();
      console.log('NotiProof: Fetching events from:', `${apiBase}/api/widgets/${widgetId}/events`);
      
      const response = await fetch(`${apiBase}/api/widgets/${widgetId}/events?since=${lastEventTime}`);
      console.log('NotiProof: Events response status:', response.status);
      
      if (response.ok) {
        const events = await response.json();
        console.log('NotiProof: Events received:', events);
        
        if (events && events.length > 0) {
          // Update last event time for real-time updates
          const latestEvent = events.reduce((latest, event) => {
            const eventTime = new Date(event.created_at || event.updated_at).getTime();
            return eventTime > latest ? eventTime : latest;
          }, lastEventTime);
          lastEventTime = latestEvent;
          
          // Add new events to queue, prioritizing recent ones
          // STRICT FILTERING: Only show natural, integration, and quick-win events
          const newEvents = events
            .filter(event => {
              const isApproved = event.status === 'approved';
              const isLegitimateSource = ['natural', 'integration', 'quick-win'].includes(event.source);
              const notTemplate = event.source !== 'template' && event.source !== 'demo' && event.source !== 'manual';
              console.log('NotiProof: Event filter -', event.source, 'approved:', isApproved, 'legitimate:', isLegitimateSource, 'not template:', notTemplate);
              return isApproved && isLegitimateSource && notTemplate;
            })
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
          
          eventQueue = [...newEvents, ...eventQueue].slice(0, 50); // Keep max 50 events
          
          // Display the highest priority event
          const eventToShow = selectBestEvent(eventQueue);
          if (eventToShow) {
            console.log('NotiProof: Displaying legitimate event:', eventToShow);
            createWidget(eventToShow);
          } else {
            console.log('NotiProof: No legitimate events found - widget will remain hidden');
            // No fallback - only show real events
          }
        } else {
          console.log('NotiProof: No events available - widget will remain hidden');
          // No fallback - only legitimate events
        }
      } else {
        console.warn('NotiProof: Events fetch failed with status', response.status);
        // No fallback on API errors - only show real events
      }
    } catch (error) {
      console.warn('NotiProof: Could not fetch events - widget will remain hidden:', error);
      // No fallback on network errors - only show real events
    }
  }
  
  // Select the best event based on priority rules
  function selectBestEvent(events) {
    if (!events || events.length === 0) return null;
    
    // Priority scoring system
    const scoreEvent = (event) => {
      let score = 0;
      
      // Recency score (newer = higher score)
      const eventAge = Date.now() - new Date(event.created_at).getTime();
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours
      score += Math.max(0, 100 - (eventAge / maxAge) * 100);
      
      // Message completeness score
      if (event.event_data?.message || event.message) score += 50;
      if (event.message_template) score += 30;
      if (event.context_template) score += 20;
      
      // Event type priority
      const eventTypePriority = {
        'purchase': 100,
        'signup': 80,
        'conversion': 70,
        'review': 60,
        'booking': 50,
        'view': 30,
        'visitor': 20
      };
      score += eventTypePriority[event.event_type] || 10;
      
      // Source priority (exclude manual events entirely)
      const sourcePriority = {
        'api': 40,
        'integration': 30,
        'quick_win': 35,
        'connector': 45,
        'natural': 50
      };
      if (event.source === 'manual') {
        return -1; // Exclude manual events
      }
      score += sourcePriority[event.source] || 5;
      
      return score;
    };
    
    // Sort by score and return highest scoring event
    const scoredEvents = events.map(event => ({ event, score: scoreEvent(event) }));
    scoredEvents.sort((a, b) => b.score - a.score);
    
    console.log('NotiProof: Event scores:', scoredEvents.slice(0, 3));
    return scoredEvents[0]?.event;
  }
  
  // Show fallback template widget - DISABLED TO PREVENT FAKE NOTIFICATIONS
  function showFallbackWidget() {
    console.log('NotiProof: Fallback disabled - no legitimate events available');
    console.log('NotiProof: Widget configured to show only natural/real events');
    // Fallback template content generation is now disabled
    // This prevents fake "X people viewing" messages from appearing
    return;
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

    // Track initial visitor session
    await trackVisitorSession();
    
    // Track real-time pageview event
    await trackEvent('pageview', {
      page_title: document.title,
      page_load_time: Date.now() - pageStart,
      is_returning_visitor: localStorage.getItem('notiproof-returning') === 'true'
    });
    
    // Mark as returning visitor for future visits
    localStorage.setItem('notiproof-returning', 'true');

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

    // Recurring display with real-time check
    if (rules.interval_ms && rules.interval_ms > 0) {
      setInterval(() => {
        console.log('NotiProof: Interval display trigger');
        maybeShow();
      }, rules.interval_ms);
    }
    
    // Real-time updates check (every 30 seconds for new events)
    setInterval(() => {
      console.log('NotiProof: Real-time update check');
      fetchNewEvents();
    }, 30000);

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

  // Real-time event fetching for updates
  async function fetchNewEvents() {
    try {
      const response = await fetch(`${apiBase}/api/widgets/${widgetId}/events?since=${lastEventTime}&limit=10`);
      if (response.ok) {
        const newEvents = await response.json();
        if (newEvents && newEvents.length > 0) {
          console.log('NotiProof: New events detected:', newEvents.length);
          
          // Update event queue with new events
          const approvedEvents = newEvents.filter(event => 
            event.status === 'approved' && event.source !== 'demo' && event.source !== 'manual'
          );
          
          if (approvedEvents.length > 0) {
            eventQueue = [...approvedEvents, ...eventQueue].slice(0, 50);
            
            // Update last event time
            const latestTime = Math.max(...approvedEvents.map(e => 
              new Date(e.created_at || e.updated_at).getTime()
            ));
            lastEventTime = Math.max(lastEventTime, latestTime);
            
            console.log('NotiProof: Event queue updated with new events');
          }
        }
      }
    } catch (error) {
      console.warn('NotiProof: Error fetching new events:', error);
    }
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
    },
    refreshEvents: () => {
      console.log('NotiProof: Manual event refresh');
      lastEventTime = 0; // Reset to fetch all events
      fetchAndDisplayEvents();
    },
    getEventQueue: () => {
      return eventQueue;
    }
  };

})();
