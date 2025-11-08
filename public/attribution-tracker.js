/**
 * NotiProof Attribution Tracker
 * Client-side script for tracking visitor journeys and conversions
 * 
 * Usage:
 * 1. Include this script on your website
 * 2. Call NotiProof.trackConversion() when a conversion happens
 * 
 * Example:
 * <script>
 *   // After successful checkout
 *   NotiProof.trackConversion({
 *     type: 'purchase',
 *     value: 99.99,
 *     currency: 'USD'
 *   });
 * </script>
 */

(function() {
  'use strict';

  // Generate or retrieve visitor ID
  function getVisitorId() {
    let visitorId = localStorage.getItem('notiproof_visitor_id');
    if (!visitorId) {
      visitorId = 'visitor_' + Math.random().toString(36).substring(2) + Date.now();
      localStorage.setItem('notiproof_visitor_id', visitorId);
    }
    return visitorId;
  }

  // Generate or retrieve session ID
  function getSessionId() {
    let sessionId = sessionStorage.getItem('notiproof_session_id');
    if (!sessionId) {
      sessionId = 'session_' + Math.random().toString(36).substring(2) + Date.now();
      sessionStorage.setItem('notiproof_session_id', sessionId);
    }
    return sessionId;
  }

  // Get UTM parameters from URL
  function getUtmParams() {
    const params = new URLSearchParams(window.location.search);
    return {
      utm_source: params.get('utm_source'),
      utm_medium: params.get('utm_medium'),
      utm_campaign: params.get('utm_campaign'),
    };
  }

  // Get device type
  function getDeviceType() {
    const ua = navigator.userAgent;
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
      return 'tablet';
    }
    if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
      return 'mobile';
    }
    return 'desktop';
  }

  // Track notification view (called automatically by widget)
  async function trackNotificationView(campaignId, eventId, websiteId) {
    const visitorId = getVisitorId();
    const sessionId = getSessionId();
    const utmParams = getUtmParams();

    try {
      const response = await fetch(
        'https://ewymvxhpkswhsirdrjub.supabase.co/functions/v1/track-visitor-journey',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            visitor_id: visitorId,
            session_id: sessionId,
            website_id: websiteId,
            campaign_id: campaignId,
            event_id: eventId,
            device_type: getDeviceType(),
            ...utmParams,
          }),
        }
      );

      if (!response.ok) {
        console.error('[NotiProof] Failed to track visitor journey');
      }
    } catch (error) {
      console.error('[NotiProof] Error tracking visitor journey:', error);
    }
  }

  // Track conversion (called by merchant)
  async function trackConversion(options = {}) {
    const {
      type = 'custom',
      value = 0,
      currency = 'USD',
      data = {},
    } = options;

    const visitorId = getVisitorId();
    const sessionId = getSessionId();
    const websiteId = window.NotiProofConfig?.websiteId;

    if (!websiteId) {
      console.error('[NotiProof] websiteId not found in NotiProofConfig');
      return;
    }

    try {
      const response = await fetch(
        'https://ewymvxhpkswhsirdrjub.supabase.co/functions/v1/track-conversion',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            visitor_id: visitorId,
            session_id: sessionId,
            website_id: websiteId,
            conversion_type: type,
            conversion_value: value,
            currency: currency,
            conversion_data: data,
          }),
        }
      );

      const result = await response.json();

      if (result.success) {
        console.log('[NotiProof] Conversion tracked:', result);
        
        // Fire custom event
        window.dispatchEvent(new CustomEvent('notiproof:conversion', {
          detail: { type, value, attributed: result.attributed }
        }));
      } else {
        console.error('[NotiProof] Failed to track conversion:', result.error);
      }

      return result;
    } catch (error) {
      console.error('[NotiProof] Error tracking conversion:', error);
      return { success: false, error: error.message };
    }
  }

  // Expose public API
  window.NotiProof = window.NotiProof || {};
  window.NotiProof.trackConversion = trackConversion;
  window.NotiProof._trackNotificationView = trackNotificationView;
  window.NotiProof._getVisitorId = getVisitorId;
  window.NotiProof._getSessionId = getSessionId;

  console.log('[NotiProof] Attribution tracker initialized');
})();
