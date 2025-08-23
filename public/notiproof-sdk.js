/**
 * NotiProof JavaScript SDK - Advanced Event Tracking
 * Comprehensive client-side tracking for natural proof events
 */
(function(window) {
  'use strict';

  // Configuration
  const CONFIG = {
    apiEndpoint: 'https://ewymvxhpkswhsirdrjub.supabase.co/functions/v1/javascript-api',
    batchSize: 10,
    batchTimeout: 5000,
    retryAttempts: 3,
    retryDelay: 1000
  };

  // Event queue for batching
  let eventQueue = [];
  let batchTimer = null;
  let sessionId = generateSessionId();
  let pageLoadTime = Date.now();
  let isTracking = true;

  /**
   * Main NotiProof SDK Class
   */
  class NotiProof {
    constructor(widgetId, options = {}) {
      this.widgetId = widgetId;
      this.options = {
        autoTrack: true,
        trackPageViews: true,
        trackFormSubmissions: true,
        trackClicks: true,
        trackScrollDepth: true,
        geoLocation: false,
        ...options
      };

      // Initialize tracking
      if (this.options.autoTrack) {
        this.initializeAutoTracking();
      }
      
      // Track initial page view
      if (this.options.trackPageViews) {
        this.trackPageView();
      }
    }

    /**
     * Track custom events
     */
    track(eventType, data = {}) {
      if (!isTracking) return;

      const event = {
        action: 'track_event',
        widgetId: this.widgetId,
        data: {
          eventType: eventType,
          pageUrl: window.location.href,
          referrer: document.referrer,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString(),
          sessionId: sessionId,
          eventData: data,
          ...this.getContextData()
        }
      };

      this.queueEvent(event);
    }

    /**
     * Track form submissions
     */
    trackFormSubmit(formData, formId = 'unknown') {
      if (!isTracking) return;

      const event = {
        action: 'track_form_submit',
        widgetId: this.widgetId,
        data: {
          formId: formId,
          fields: formData,
          pageUrl: window.location.href,
          timestamp: new Date().toISOString(),
          sessionId: sessionId,
          ...this.getContextData()
        }
      };

      this.queueEvent(event);
    }

    /**
     * Track page views
     */
    trackPageView() {
      if (!isTracking) return;

      const event = {
        action: 'track_pageview',
        widgetId: this.widgetId,
        data: {
          pageUrl: window.location.href,
          pageTitle: document.title,
          referrer: document.referrer,
          sessionId: sessionId,
          timestamp: new Date().toISOString(),
          timeOnPage: Date.now() - pageLoadTime,
          ...this.getContextData()
        }
      };

      this.queueEvent(event);
    }

    /**
     * Track conversions (purchases, signups, etc.)
     */
    trackConversion(conversionData) {
      if (!isTracking) return;

      const event = {
        action: 'track_conversion',
        widgetId: this.widgetId,
        data: {
          timestamp: new Date().toISOString(),
          sessionId: sessionId,
          pageUrl: window.location.href,
          ...conversionData,
          ...this.getContextData()
        }
      };

      this.queueEvent(event);
    }

    /**
     * Track newsletter signups
     */
    trackNewsletterSignup(email, source = 'website') {
      this.track('newsletter_signup', {
        user_email: email,
        source: source,
        form_name: 'Newsletter Signup'
      });
    }

    /**
     * Track downloads
     */
    trackDownload(assetName, assetUrl) {
      this.track('download', {
        asset_name: assetName,
        asset_url: assetUrl,
        download_time: new Date().toISOString()
      });
    }

    /**
     * Track content engagement
     */
    trackContentEngagement(contentData) {
      this.track('content_engagement', {
        ...contentData,
        engagement_time: Date.now() - pageLoadTime
      });
    }

    /**
     * Initialize automatic tracking
     */
    initializeAutoTracking() {
      // Track form submissions
      if (this.options.trackFormSubmissions) {
        this.initFormTracking();
      }

      // Track clicks
      if (this.options.trackClicks) {
        this.initClickTracking();
      }

      // Track scroll depth
      if (this.options.trackScrollDepth) {
        this.initScrollTracking();
      }

      // Track page unload
      this.initUnloadTracking();
    }

    /**
     * Initialize form submission tracking
     */
    initFormTracking() {
      document.addEventListener('submit', (event) => {
        const form = event.target;
        if (form.tagName === 'FORM') {
          const formData = new FormData(form);
          const formObject = {};
          
          for (let [key, value] of formData.entries()) {
            formObject[key] = value;
          }

          this.trackFormSubmit(formObject, form.id || form.className || 'unknown');
        }
      });
    }

    /**
     * Initialize click tracking
     */
    initClickTracking() {
      document.addEventListener('click', (event) => {
        const element = event.target;
        
        // Track button clicks
        if (element.tagName === 'BUTTON' || element.type === 'submit') {
          this.track('button_click', {
            button_text: element.textContent || element.value,
            button_id: element.id,
            button_class: element.className
          });
        }

        // Track link clicks
        if (element.tagName === 'A') {
          this.track('link_click', {
            link_text: element.textContent,
            link_url: element.href,
            link_id: element.id
          });
        }
      });
    }

    /**
     * Initialize scroll depth tracking
     */
    initScrollTracking() {
      let maxScrollDepth = 0;
      let scrollTimer = null;

      window.addEventListener('scroll', () => {
        clearTimeout(scrollTimer);
        scrollTimer = setTimeout(() => {
          const scrollDepth = Math.round(
            (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100
          );
          
          if (scrollDepth > maxScrollDepth) {
            maxScrollDepth = scrollDepth;
            
            // Track milestone scroll depths
            if (scrollDepth >= 25 && scrollDepth < 50 && maxScrollDepth >= 25) {
              this.track('scroll_depth', { depth: 25 });
            } else if (scrollDepth >= 50 && scrollDepth < 75 && maxScrollDepth >= 50) {
              this.track('scroll_depth', { depth: 50 });
            } else if (scrollDepth >= 75 && scrollDepth < 100 && maxScrollDepth >= 75) {
              this.track('scroll_depth', { depth: 75 });
            } else if (scrollDepth >= 100 && maxScrollDepth >= 100) {
              this.track('scroll_depth', { depth: 100 });
            }
          }
        }, 100);
      });
    }

    /**
     * Initialize page unload tracking
     */
    initUnloadTracking() {
      window.addEventListener('beforeunload', () => {
        // Send any remaining events
        this.flush();
        
        // Track session end
        this.track('session_end', {
          session_duration: Date.now() - pageLoadTime,
          page_url: window.location.href
        });
      });
    }

    /**
     * Get contextual data for events
     */
    getContextData() {
      const context = {
        viewport_width: window.innerWidth,
        viewport_height: window.innerHeight,
        screen_width: screen.width,
        screen_height: screen.height,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        language: navigator.language
      };

      // Add geolocation if enabled and available
      if (this.options.geoLocation && 'geolocation' in navigator) {
        // Note: This would require a Promise-based approach in practice
        // For now, we'll just indicate that geo is requested
        context.geo_requested = true;
      }

      return context;
    }

    /**
     * Queue event for batched sending
     */
    queueEvent(event) {
      eventQueue.push(event);

      // Send batch if it reaches max size
      if (eventQueue.length >= CONFIG.batchSize) {
        this.sendBatch();
      } else {
        // Set/reset batch timer
        if (batchTimer) {
          clearTimeout(batchTimer);
        }
        batchTimer = setTimeout(() => this.sendBatch(), CONFIG.batchTimeout);
      }
    }

    /**
     * Send queued events
     */
    async sendBatch() {
      if (eventQueue.length === 0) return;

      const eventsToSend = [...eventQueue];
      eventQueue = [];

      if (batchTimer) {
        clearTimeout(batchTimer);
        batchTimer = null;
      }

      for (const event of eventsToSend) {
        await this.sendEvent(event);
      }
    }

    /**
     * Send individual event with retry logic
     */
    async sendEvent(event, attempt = 1) {
      try {
        const response = await fetch(CONFIG.apiEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(event)
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        console.log('NotiProof: Event sent successfully', event.action);
      } catch (error) {
        console.error(`NotiProof: Failed to send event (attempt ${attempt}):`, error);
        
        // Retry logic
        if (attempt < CONFIG.retryAttempts) {
          setTimeout(() => {
            this.sendEvent(event, attempt + 1);
          }, CONFIG.retryDelay * attempt);
        } else {
          console.error('NotiProof: Max retry attempts exceeded for event:', event);
        }
      }
    }

    /**
     * Flush all queued events immediately
     */
    flush() {
      if (eventQueue.length > 0) {
        this.sendBatch();
      }
    }

    /**
     * Enable/disable tracking
     */
    setTracking(enabled) {
      isTracking = enabled;
    }

    /**
     * Get widget configuration
     */
    async getWidgetConfig() {
      try {
        const response = await fetch(CONFIG.apiEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'get_widget_config',
            widgetId: this.widgetId
          })
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
      } catch (error) {
        console.error('NotiProof: Failed to get widget config:', error);
        return null;
      }
    }
  }

  /**
   * Utility functions
   */
  function generateSessionId() {
    return 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  function getUserLocation() {
    // This would typically use IP-based geolocation service
    // For now, return undefined - can be enhanced with external service
    return undefined;
  }

  /**
   * Global initialization function
   */
  window.NotiProof = {
    // Initialize with widget ID
    init: function(widgetId, options = {}) {
      return new NotiProof(widgetId, options);
    },

    // Quick tracking methods (without initialization)
    track: function(widgetId, eventType, data = {}) {
      const tracker = new NotiProof(widgetId, { autoTrack: false });
      tracker.track(eventType, data);
    },

    trackFormSubmit: function(widgetId, formData, formId) {
      const tracker = new NotiProof(widgetId, { autoTrack: false });
      tracker.trackFormSubmit(formData, formId);
    },

    trackConversion: function(widgetId, conversionData) {
      const tracker = new NotiProof(widgetId, { autoTrack: false });
      tracker.trackConversion(conversionData);
    },

    // Utility methods
    generateSessionId: generateSessionId
  };

  // Auto-initialize if widget ID is provided via data attribute
  document.addEventListener('DOMContentLoaded', function() {
    const scriptTag = document.querySelector('script[data-notiproof-widget-id]');
    if (scriptTag) {
      const widgetId = scriptTag.getAttribute('data-notiproof-widget-id');
      const autoTrack = scriptTag.getAttribute('data-notiproof-auto-track') !== 'false';
      
      if (widgetId) {
        window.notiProofTracker = window.NotiProof.init(widgetId, {
          autoTrack: autoTrack
        });
      }
    }
  });

})(window);