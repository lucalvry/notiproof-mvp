(function() {
  'use strict';
  
  const WIDGET_VERSION = 16; // v16: Early verification ping for debugging
  const BUILD_TIMESTAMP = '2025-12-26T12:00:00Z'; // Build timestamp for version tracking
  // Version logging moved to debug mode only
  
  const API_BASE = 'https://ewymvxhpkswhsirdrjub.supabase.co/functions/v1/widget-api';
  const SUPABASE_URL = 'https://ewymvxhpkswhsirdrjub.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV3eW12eGhwa3N3aHNpcmRyanViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5OTY0NDksImV4cCI6MjA3MDU3MjQ0OX0.ToRbUm37-ZnYkmmCfLW7am38rUGgFAppNxcZ2tar9mc';
  const DEBUG = window.location.hostname === 'localhost' || window.location.hostname.includes('127.0.0.1');
  const debugMode = window.location.search.includes('notiproof_debug=1'); // Enable with ?notiproof_debug=1
  
  // IMMEDIATE verification ping - fire before any other logic
  // This helps debug whether the script is loading at all
  const script = document.currentScript;
  const siteToken = script?.getAttribute('data-site-token');
  if (siteToken) {
    fetch(`${API_BASE}/verify?token=${siteToken}&ping=1&origin=${encodeURIComponent(window.location.origin)}`, {
      method: 'GET',
      mode: 'cors',
      credentials: 'omit'
    }).catch(function() {}); // Fire-and-forget, ignore errors
  }
  
  // Impact Board: Store notification interactions for attribution
  const INTERACTION_KEY = 'notiproof_last_interaction';
  const CONVERSIONS_KEY = 'notiproof_conversions';
  let utmConfig = null;
  let impactGoals = [];
  let currentWebsiteId = null;
  
  function storeInteraction(notificationId, campaignId, interactionType) {
    try {
      const interaction = {
        notification_id: notificationId,
        campaign_id: campaignId,
        interaction_type: interactionType,
        timestamp: Date.now(),
        visitor_id: sessionId
      };
      localStorage.setItem(INTERACTION_KEY, JSON.stringify(interaction));
      log('Stored interaction:', interaction);
    } catch (e) {
      log('Failed to store interaction:', e);
    }
  }
  
  function buildUrlWithUtm(url, campaignName, notificationType) {
    if (!utmConfig?.utm_enabled) return url;
    
    try {
      const urlObj = new URL(url, window.location.origin);
      
      // Don't override existing UTMs unless configured
      if (!utmConfig.utm_override_existing && urlObj.searchParams.has('utm_source')) {
        return url;
      }
      
      urlObj.searchParams.set('utm_source', utmConfig.utm_source || 'notiproof');
      urlObj.searchParams.set('utm_medium', utmConfig.utm_medium || 'notification');
      
      // Template replacement for campaign
      const campaign = (utmConfig.utm_campaign_template || '{{campaign_name}}')
        .replace('{{campaign_name}}', campaignName || 'notification');
      urlObj.searchParams.set('utm_campaign', campaign);
      
      if (utmConfig.utm_content_template) {
        const content = utmConfig.utm_content_template
          .replace('{{notification_type}}', notificationType || 'default');
        urlObj.searchParams.set('utm_content', content);
      }
      
      return urlObj.toString();
    } catch (e) {
      log('Failed to build URL with UTM:', e);
      return url;
    }
  }
  
  async function checkGoalsOnPageLoad() {
    try {
      const stored = localStorage.getItem(INTERACTION_KEY);
      if (!stored || !currentWebsiteId) return;
      
      const interaction = JSON.parse(stored);
      const { notification_id, campaign_id, interaction_type, timestamp, visitor_id } = interaction;
      
      // Fetch active goals
      const goalsRes = await fetch(`${SUPABASE_URL}/functions/v1/impact-goals?website_id=${currentWebsiteId}`);
      if (!goalsRes.ok) return;
      
      const { goals } = await goalsRes.json();
      if (!goals || goals.length === 0) return;
      
      const currentPath = window.location.pathname;
      const conversions = JSON.parse(localStorage.getItem(CONVERSIONS_KEY) || '[]');
      
      for (const goal of goals) {
        // Check URL match
        const matches = goal.match_type === 'exact' 
          ? currentPath === goal.match_value
          : currentPath.includes(goal.match_value);
        
        if (!matches) continue;
        
        // Check interaction type
        const validInteraction = 
          goal.interaction_type === 'click_or_hover' ||
          goal.interaction_type === interaction_type;
        
        if (!validInteraction) continue;
        
        // Check conversion window
        const windowMs = goal.conversion_window_days * 24 * 60 * 60 * 1000;
        if (Date.now() - timestamp > windowMs) continue;
        
        // Generate dedup key
        const dedupKey = `${notification_id}_${goal.id}`;
        
        // Check if already converted
        if (conversions.includes(dedupKey)) continue;
        
        // Record conversion
        log('Recording impact conversion for goal:', goal.name);
        await fetch(`${SUPABASE_URL}/functions/v1/record-impact-conversion`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            website_id: currentWebsiteId,
            goal_id: goal.id,
            notification_id,
            campaign_id,
            visitor_id,
            interaction_type,
            interaction_timestamp: new Date(timestamp).toISOString(),
            page_url: window.location.href,
            monetary_value: goal.monetary_value,
            dedup_key: dedupKey
          })
        });
        
        // Cache to prevent duplicate
        conversions.push(dedupKey);
        localStorage.setItem(CONVERSIONS_KEY, JSON.stringify(conversions));
      }
    } catch (e) {
      log('Goal check error:', e);
    }
  }
  
  const script = document.currentScript;
  const widgetId = script.getAttribute('data-widget-id');
  const siteToken = script.getAttribute('data-site-token');
  
  let hideBranding = script.getAttribute('data-hide-branding') === 'true';
  let customBrandName = script.getAttribute('data-brand-name') || 'NotiProof';
  let customLogoUrl = script.getAttribute('data-logo-url') || '';
  
  
  // URL matching helper with wildcard support
  function matchesUrlPattern(url, pattern) {
    if (!pattern) return false;
    // Convert wildcard pattern to regex
    const regexPattern = pattern
      .replace(/[.+?^${}()|[\]\\]/g, '\\$&') // Escape special chars except *
      .replace(/\*/g, '.*'); // Convert * to .*
    const regex = new RegExp('^' + regexPattern + '$', 'i');
    return regex.test(url);
  }
  
  // Check if current URL matches targeting rules
  function shouldShowOnCurrentUrl() {
    if (!displayRules.url_rules) return true;
    
    const currentUrl = window.location.pathname;
    const { include_urls = [], exclude_urls = [] } = displayRules.url_rules;
    
    // Check exclude rules first (higher priority)
    if (exclude_urls.length > 0) {
      for (const pattern of exclude_urls) {
        if (matchesUrlPattern(currentUrl, pattern)) {
          log('URL excluded by pattern:', pattern);
          return false;
        }
      }
    }
    
    // Check include rules
    if (include_urls.length > 0) {
      for (const pattern of include_urls) {
        if (matchesUrlPattern(currentUrl, pattern)) {
          log('URL included by pattern:', pattern);
          return true;
        }
      }
      log('URL not in include list');
      return false; // Not in include list
    }
    
    return true; // No rules means show everywhere
  }
  
  // Check if visitor's country matches targeting rules
  function shouldShowForCountry() {
    if (!displayRules.countries || !visitorCountry) return true;
    
    const { include = [], exclude = [] } = displayRules.countries;
    
    // Check exclude first
    if (exclude.length > 0 && exclude.includes(visitorCountry)) {
      log('Country excluded:', visitorCountry);
      return false;
    }
    
    // Check include
    if (include.length > 0) {
      const allowed = include.includes(visitorCountry);
      if (!allowed) {
        log('Country not in include list:', visitorCountry);
      }
      return allowed;
    }
    
    return true;
  }
  
  // Track impressions in localStorage
  function getSessionImpressions() {
    try {
      const stored = localStorage.getItem(SESSION_KEY);
      return stored ? parseInt(stored, 10) : 0;
    } catch {
      return sessionCount;
    }
  }
  
  function incrementSessionImpressions() {
    try {
      const current = getSessionImpressions();
      localStorage.setItem(SESSION_KEY, (current + 1).toString());
    } catch (e) {
      log('Failed to store session impressions:', e);
    }
    sessionCount++;
  }
  
  function getPageImpressions() {
    try {
      const stored = localStorage.getItem(PAGE_KEY);
      return stored ? parseInt(stored, 10) : 0;
    } catch {
      return displayedCount;
    }
  }
  
  function incrementPageImpressions() {
    try {
      const current = getPageImpressions();
      localStorage.setItem(PAGE_KEY, (current + 1).toString());
    } catch (e) {
      log('Failed to store page impressions:', e);
    }
    displayedCount++;
  }
  
  function checkFrequencyLimits() {
    const pageImpressions = getPageImpressions();
    const sessionImpressions = getSessionImpressions();
    
    if (pageImpressions >= maxPerPage) {
      log('Page frequency limit reached:', pageImpressions, '/', maxPerPage);
      return false;
    }
    
    if (sessionImpressions >= maxPerSession) {
      log('Session frequency limit reached:', sessionImpressions, '/', maxPerSession);
      return false;
    }
    
    return true;
  }
  
  function error(...args) {
    console.error('[NotiProof]', ...args);
  }
  
  function log(...args) {
    const isDebugMode = DEBUG || debugMode || script.getAttribute('data-debug-mode') === 'true';
    if (isDebugMode) {
      console.log('[NotiProof]', ...args);
    }
  }
  
  // Check if we have either widgetId or siteToken
  if (!widgetId && !siteToken) {
    error('Either data-widget-id or data-site-token attribute is required');
    return;
  }
  
  const mode = siteToken ? 'site' : 'widget';
  log(`Initializing NotiProof in ${mode} mode`, siteToken || widgetId);
  
  // Auto-verify website when using site token
  async function autoVerifyWebsite() {
    if (siteToken) {
      try {
        log('Auto-verifying website with token:', siteToken);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        const response = await fetch(`${API_BASE}/verify?token=${siteToken}`, {
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        if (response.ok) {
          log('Website auto-verified successfully');
          return true;
        } else {
          log('Verify endpoint returned:', response.status);
        }
      } catch (err) {
        if (err.name === 'AbortError') {
          error('Verification timeout after 10s');
        } else {
          error('Auto-verification failed:', err);
        }
      }
    }
    return false;
  }
  
  let eventQueue = [];
  let displayedCount = 0;
  let sessionCount = 0;
  let isPaused = false;
  let notificationEngaged = false; // NEW: Track if user is hovering on a notification
  let activeNotificationTimers = new Map(); // NEW: Track notification timers for pause/resume
  const sessionId = generateSessionId();
  let maxPerPage = 5;
  let maxPerSession = 20;
  let visitorCountry = null;
  let displayRules = {};
  
  // Fetch visitor country using IP geolocation
  async function fetchVisitorCountry() {
    try {
      log('Fetching visitor country via IP geolocation...');
      const response = await fetch('https://ipapi.co/json/');
      if (response.ok) {
        const data = await response.json();
        visitorCountry = data.country_code; // Returns 2-letter country code (e.g., 'US', 'GB')
        log('Visitor country detected:', visitorCountry);
      } else {
        log('Failed to fetch visitor country, geo-targeting will be skipped');
      }
    } catch (err) {
      log('Error fetching visitor country:', err);
    }
  }
  
  // Initialize geolocation on widget load
  fetchVisitorCountry();
  
  // Session storage keys
  const SESSION_KEY = 'notiproof_session_' + sessionId;
  const PAGE_KEY = 'notiproof_page_' + window.location.pathname;
  
  // Widget Configuration from data attributes with versioning support
  const widgetVersion = parseInt(script.getAttribute('data-version') || '2', 10);
  
  const config = {
    version: widgetVersion,
    initialDelay: parseInt(script.getAttribute('data-initial-delay') || '0', 10) * 1000,
    displayDuration: parseInt(script.getAttribute('data-display-duration') || '5', 10) * 1000,
    interval: parseInt(script.getAttribute('data-interval') || '8', 10) * 1000,
    maxPerPage: parseInt(script.getAttribute('data-max-per-page') || '5', 10),
    maxPerSession: parseInt(script.getAttribute('data-max-per-session') || '20', 10),
    position: script.getAttribute('data-position') || 'bottom-left',
    animation: script.getAttribute('data-animation') || 'slide',
    primaryColor: script.getAttribute('data-primary-color') || '#667eea',
    backgroundColor: script.getAttribute('data-bg-color') || '#ffffff',
    textColor: script.getAttribute('data-text-color') || '#1a1a1a',
    borderRadius: parseInt(script.getAttribute('data-border-radius') || '8', 10),
    shadow: script.getAttribute('data-shadow') || 'md',
    fontSize: parseInt(script.getAttribute('data-font-size') || '14', 10),
    showAvatar: script.getAttribute('data-show-avatar') !== 'false',
    showTimestamp: script.getAttribute('data-show-timestamp') !== 'false',
    showLocation: script.getAttribute('data-show-location') !== 'false',
    showCTA: script.getAttribute('data-show-cta') === 'true',
    ctaText: script.getAttribute('data-cta-text') || 'Learn More',
    ctaUrl: script.getAttribute('data-cta-url') || '',
    showActiveVisitors: script.getAttribute('data-show-active-visitors') === 'true',
    pauseAfterClick: script.getAttribute('data-pause-after-click') === 'true',
    pauseAfterClose: script.getAttribute('data-pause-after-close') === 'true',
    makeClickable: script.getAttribute('data-make-clickable') !== 'false',
    debugMode: script.getAttribute('data-debug-mode') === 'true',
    
    // NEW: Enhanced styling options
    borderColor: script.getAttribute('data-border-color') || 'transparent',
    borderWidth: parseInt(script.getAttribute('data-border-width') || '0', 10),
    textAlignment: script.getAttribute('data-text-alignment') || 'left',
    lineHeight: parseFloat(script.getAttribute('data-line-height') || '1.4'),
    hoverEffect: script.getAttribute('data-hover-effect') || 'subtle',
    notificationPadding: parseInt(script.getAttribute('data-padding') || '16', 10),
    contentAlignment: script.getAttribute('data-content-alignment') || 'top',
    
    // PHASE 4: Product image display settings with version check
    showProductImages: (() => {
      if (widgetVersion >= 2) {
        return script.getAttribute('data-show-product-images') !== 'false';
      }
      return false; // Disabled for v1 widgets
    })(),
    
    linkifyProducts: (() => {
      if (widgetVersion >= 2) {
        return script.getAttribute('data-linkify-products') !== 'false';
      }
      return false; // Disabled for v1 widgets
    })(),
    
    fallbackIcon: script.getAttribute('data-fallback-icon') || 'default'
  };
  
  log('Widget version:', config.version);
  log('Product images enabled:', config.showProductImages);
  log('Product linkification enabled:', config.linkifyProducts);
  
  // Active Visitors Configuration
  let activeVisitorInterval = null;
  let currentActiveCount = 0;
  
  function generateSessionId() {
    return 'np_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
  }
  
  function getContainerPosition() {
    const isMobile = window.innerWidth <= 768;
    const layout = config.position;
    
    // Mobile optimization: use bottom-center for better UX
    if (isMobile && (layout === 'bottom-left' || layout === 'bottom-right')) {
      return {
        position: 'fixed',
        bottom: '10px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'calc(100% - 20px)',
        maxWidth: '383px',
        zIndex: '999999'
      };
    }
    
    // Position mappings - Desktop: 420px, Mobile: 383px
    const positions = {
      'bottom-left': { bottom: '20px', left: '20px', maxWidth: '420px' },
      'bottom-right': { bottom: '20px', right: '20px', maxWidth: '420px' },
      'bottom-center': { bottom: '20px', left: '50%', transform: 'translateX(-50%)', maxWidth: '420px' },
      'top-left': { top: '20px', left: '20px', maxWidth: '420px' },
      'top-right': { top: '20px', right: '20px', maxWidth: '420px' },
      'top-center': { top: '20px', left: '50%', transform: 'translateX(-50%)', maxWidth: '420px' }
    };
    
    return { position: 'fixed', zIndex: '999999', ...positions[layout] } || positions['bottom-left'];
  }
  
  function getAnimationStyles(animation) {
    const animations = {
      'slide': 'transform 0.3s ease-out, opacity 0.3s ease-out',
      'fade': 'opacity 0.3s ease-out',
      'bounce': 'transform 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55), opacity 0.3s ease-out',
      'none': 'none'
    };
    return animations[animation] || animations['slide'];
  }
  
  function getShadowStyle(shadow) {
    const shadows = {
      'none': 'none',
      'sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      'md': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      'lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      'xl': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
    };
    return shadows[shadow] || shadows['md'];
  }
  
  function createNotificationElement() {
    const container = document.createElement('div');
    container.id = 'notiproof-container';
    const position = getContainerPosition();
    
    container.style.cssText = `
      position: ${position.position || 'fixed'};
      ${position.bottom ? 'bottom: ' + position.bottom + ';' : ''}
      ${position.top ? 'top: ' + position.top + ';' : ''}
      ${position.left ? 'left: ' + position.left + ';' : ''}
      ${position.right ? 'right: ' + position.right + ';' : ''}
      ${position.transform ? 'transform: ' + position.transform + ';' : ''}
      ${position.width ? 'width: ' + position.width + ';' : ''}
      ${position.maxWidth ? 'max-width: ' + position.maxWidth + ';' : ''}
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    `;
    document.body.appendChild(container);
    log('Notification container created with position:', position);
    return container;
  }
  
  // URL validation helper
  function isValidUrl(urlString) {
    try {
      const url = new URL(urlString);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }
  
  // HTML escape helper to prevent XSS
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  // Linkify product names in message templates with XSS protection
  function linkifyMessage(message, eventData) {
    if (!eventData || !eventData.product_name || !eventData.product_url) {
      return message; // No linkification needed
    }

    // Validate URL to prevent XSS
    if (!isValidUrl(eventData.product_url)) {
      log('Invalid product URL, skipping linkification:', eventData.product_url);
      return message;
    }

    // Escape HTML in product name to prevent XSS
    const safeProductName = String(eventData.product_name)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

    // Escape URL
    const safeUrl = String(eventData.product_url)
      .replace(/"/g, '%22')
      .replace(/'/g, '%27');

    // Escape special regex characters in product name
    const escapedName = safeProductName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // Replace product name with clickable link
    const linkedMessage = message.replace(
      new RegExp(escapedName, 'gi'),
      `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer" class="notiproof-product-link">${safeProductName}</a>`
    );

    return linkedMessage;
  }
  
  // PHASE 4: Preset emoji library for product image fallbacks - EXPANDED for all event types
  const NOTIPROOF_PRESETS = {
    // Products
    fashion: '👗', clothing: '👕', electronics: '💻', jewelry: '💍', books: '📚',
    food: '🍕', sports: '⚽', beauty: '💄', cosmetics: '💄', home: '🏠',
    furniture: '🛋️', toys: '🧸', automotive: '🚗', health: '💊', pets: '🐕',
    music: '🎵', art: '🎨', shoes: '👟', watches: '⌚', bags: '👜',
    
    // SaaS/Events
    signup: '🎉', 'new-signup': '🎉', 'user-signup': '🎉',
    trial: '🚀', 'trial-start': '🚀', 'trial-starts': '🚀',
    upgrade: '⭐', 'plan-upgrade': '⭐', 'upgrade-events': '⭐',
    subscription: '💳', demo: '📅',
    
    // Reviews & Social
    review: '⭐', 'product-review': '⭐', 'product-reviews': '⭐',
    rating: '⭐', testimonial: '💬',
    
    // Activity
    purchase: '🛍️', 'recent-purchase': '🛍️',
    order: '📦', booking: '📅', 'new-bookings': '📅',
    consultation: '💼', download: '⬇️', 'content-downloads': '⬇️',
    
    // Engagement
    view: '👁️', 'recently-viewed': '👁️',
    visitor: '👥', 'visitor-counter': '👥', 'active-user': '👥',
    like: '❤️', follow: '➕', comment: '💬', 'blog-comments': '💬',
    
    // E-commerce specific
    cart: '🛒', 'cart-additions': '🛒',
    wishlist: '💝', 'wishlist-additions': '💝',
    sale: '🔥', 'flash-sale': '🔥',
    
    // Services
    appointment: '📅', 'appointments': '📅',
    contact: '✉️', 'contact-form': '✉️',
    'service-requests': '💼',
    
    // Content/Community
    newsletter: '📧', 'newsletter-signups': '📧',
    share: '🔗', 'social-shares': '🔗',
    join: '🎉', 'community-joins': '🎉',
    
    // Special
    gift: '🎁', trophy: '🏆', heart: '❤️', fire: '🔥', star: '⭐',
    default: '🎯'
  };
  
  function getPresetImage(category) {
    if (!category) return NOTIPROOF_PRESETS.default;
    const normalized = String(category).toLowerCase().trim();
    if (NOTIPROOF_PRESETS[normalized]) return NOTIPROOF_PRESETS[normalized];
    for (const key in NOTIPROOF_PRESETS) {
      if (normalized.includes(key) || key.includes(normalized)) {
        return NOTIPROOF_PRESETS[key];
      }
    }
    return NOTIPROOF_PRESETS.default;
  }
  
  // PHASE 4: Create product image element with fallback to preset icons - ENHANCED with event_type support
  function createNotificationImage(eventData, eventType, fallbackIcon = 'default') {
    const imgContainer = document.createElement('div');
    imgContainer.style.cssText = `
      flex-shrink: 0;
      width: 48px;
      height: 48px;
      border-radius: 8px;
      overflow: hidden;
      background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    
    if (eventData?.product_image && isValidUrl(eventData.product_image)) {
      // Try to load actual product image
      const img = document.createElement('img');
      img.style.cssText = `
        width: 100%;
        height: 100%;
        object-fit: cover;
      `;
      img.alt = eventData.product_name || 'Product';
      
      // Fallback to preset based on category OR event_type
      img.onerror = () => {
        const presetIcon = getPresetImage(eventData.category || eventType || fallbackIcon);
        imgContainer.innerHTML = `<div style="font-size: 28px; line-height: 1;">${presetIcon}</div>`;
      };
      
      img.src = eventData.product_image;
      imgContainer.appendChild(img);
    } else {
      // Show preset icon directly - prioritize category, then event_type
      const category = eventData?.category || eventType || fallbackIcon;
      const presetIcon = getPresetImage(category);
      imgContainer.innerHTML = `<div style="font-size: 28px; line-height: 1;">${presetIcon}</div>`;
    }
    
    return imgContainer;
  }
  
  // Helper function to merge event-specific design settings with global config
  function getEffectiveConfig(event) {
    const ds = event.design_settings?.style || event.design_settings || {};
    return {
      ...config,
      backgroundColor: ds.backgroundColor || ds.background_color || config.backgroundColor,
      textColor: ds.textColor || ds.text_color || config.textColor,
      borderRadius: ds.borderRadius !== undefined ? ds.borderRadius : (ds.border_radius !== undefined ? ds.border_radius : config.borderRadius),
      shadow: ds.shadow || config.shadow,
      borderWidth: ds.borderWidth !== undefined ? ds.borderWidth : (ds.border_width !== undefined ? ds.border_width : config.borderWidth),
      borderColor: ds.borderColor || ds.border_color || config.borderColor,
      fontSize: ds.fontSize || ds.font_size || config.fontSize,
      primaryColor: ds.primaryColor || ds.primary_color || config.primaryColor,
      animation: ds.animation || config.animation,
      contentAlignment: ds.contentAlignment || ds.content_alignment || config.contentAlignment || 'top',
    };
  }
  
  function showNotification(event) {
    log('showNotification called for:', event.event_type, event.id);
    
    // Debug logging for event data
    if (debugMode) {
      log('Event data:', {
        event_id: event.id,
        event_type: event.event_type,
        has_event_data: !!event.event_data,
        event_data_type: typeof event.event_data
      });
    }
    
    // FIX: Ensure event_data is parsed if it's a string (double-encoded JSON)
    if (event.event_data && typeof event.event_data === 'string') {
      try {
        event.event_data = JSON.parse(event.event_data);
        if (debugMode) log('Parsed event_data from string to object');
      } catch (e) {
        error('Failed to parse event_data:', e);
      }
    }
    
    // Define product image variables for later use
    const showProductImages = config.showProductImages;
    const hasProductImage = event.event_data?.product_image && isValidUrl(event.event_data.product_image);
    
    // Debug announcement data
    if (event.event_type === 'announcement' && debugMode) {
      log('Announcement data:', event.event_data);
    }
    
    if (isPaused) {
      log('Notification SKIPPED - Widget is paused');
      return;
    }
    
    if (!checkFrequencyLimits()) {
      log('Notification SKIPPED - Frequency limit reached');
      return;
    }
    
    // Apply URL targeting rules
    if (!shouldShowOnCurrentUrl()) {
      log('Notification SKIPPED - URL rules filtered');
      return;
    }
    
    // Apply geo-targeting rules
    if (!shouldShowForCountry()) {
      log('Notification SKIPPED - Geo-targeting filtered');
      return;
    }
    
    const container = document.getElementById('notiproof-container') || createNotificationElement();
    const isMobile = window.innerWidth <= 768;
    // FIXED DIMENSIONS: 420x144 desktop, 384x144 mobile
    const notificationWidth = isMobile ? 384 : 420;
    const notificationHeight = 144;
    const padding = config.notificationPadding || 16;
    
    // FIXED: Get effective config by merging event-specific design settings with global config
    const effectiveConfig = event.design_settings ? getEffectiveConfig(event) : config;
    if (event.design_settings && debugMode) {
      log('Applying event-specific design settings:', event.design_settings);
    }
    
    // ANNOUNCEMENT-SPECIFIC: Override content alignment from event_data if present
    if (event.event_type === 'announcement' && event.event_data?.content_alignment) {
      effectiveConfig.contentAlignment = event.event_data.content_alignment;
      if (debugMode) {
        log('Announcement content alignment:', event.event_data.content_alignment);
      }
    }
    
    // LIVE_VISITORS-SPECIFIC: Override content alignment from event_data if present
    if ((event.event_type === 'live_visitors' || event.event_type === 'active_visitors') && event.event_data?.content_alignment) {
      effectiveConfig.contentAlignment = event.event_data.content_alignment;
      if (debugMode) {
        log('Live visitors content alignment:', event.event_data.content_alignment);
      }
    }
    
    // Create the notification element
    const notification = document.createElement('div');
    notification.className = 'notiproof-notification';
    notification.setAttribute('data-notification-id', event.id);
    
    // Apply configured styles with fixed dimensions - USE effectiveConfig for design settings
    notification.style.cssText = `
      background: ${effectiveConfig.backgroundColor};
      color: ${effectiveConfig.textColor};
      border-radius: ${effectiveConfig.borderRadius}px;
      box-shadow: ${getShadowStyle(effectiveConfig.shadow)};
      padding: ${isMobile ? Math.max(12, padding - 4) : padding}px;
      margin-bottom: 10px;
      width: ${notificationWidth}px;
      height: ${notificationHeight}px;
      max-width: ${notificationWidth}px;
      box-sizing: border-box;
      overflow: hidden;
      border: ${effectiveConfig.borderWidth}px solid ${effectiveConfig.borderColor};
      text-align: ${config.textAlignment};
      line-height: ${config.lineHeight};
      cursor: ${config.makeClickable && (config.showCTA || event.event_data?.url) ? 'pointer' : 'default'};
      transition: ${getAnimationStyles(effectiveConfig.animation)}, transform 0.2s ease, box-shadow 0.2s ease;
      opacity: 0;
      transform: ${effectiveConfig.animation === 'slide' ? 'translateY(20px)' : 'scale(0.95)'};
      font-size: ${isMobile ? Math.max(12, effectiveConfig.fontSize - 2) : effectiveConfig.fontSize}px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      position: relative;
    `;
    
    const time = new Date(event.created_at);
    const timeAgo = getTimeAgo(time);
    
    // Build notification content with dynamic content alignment
    const contentAlignValue = effectiveConfig.contentAlignment === 'bottom' ? 'flex-end' : 
                              effectiveConfig.contentAlignment === 'center' ? 'center' : 'flex-start';
    let contentHTML = `<div style="display: flex; align-items: ${contentAlignValue}; gap: 12px; height: 100%;">`;
    
    // Close button (top right)
    contentHTML += `
      <div style="position: absolute; top: 8px; right: 8px; cursor: pointer; opacity: 0.5; hover: opacity: 1; transition: opacity 0.2s;" data-close>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M1 1L13 13M1 13L13 1" stroke="${config.textColor}" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </div>
    `;
    
    // ACTIVE VISITORS / LIVE VISITORS - Media + Text Format with Dynamic Clickable Links
    // Supports both 'active_visitors' (legacy) and 'live_visitors' (server-generated)
    if (event.event_type === 'active_visitors' || event.event_type === 'live_visitors') {
      const data = event.event_data || {};
      const icon = data.icon || '👥';
      const templateStyle = data.template_style || 'social_proof';
      const showLocation = data.show_location !== false;
      const location = data.location;
      const visitorCount = data.visitor_count || 0;
      const pageName = data.page_name || 'this page';
      const pageUrl = data.page_url || '';
      
      // Style-specific icon container
      let iconStyle = 'background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);';
      if (templateStyle === 'urgency') {
        iconStyle = 'background: linear-gradient(135deg, #f97316 0%, #dc2626 100%);';
      } else if (templateStyle === 'animated') {
        iconStyle = 'background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);';
      } else if (templateStyle === 'checkout') {
        iconStyle = 'background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%);';
      } else if (templateStyle === 'product') {
        iconStyle = 'background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%);';
      }
      
      contentHTML += `<div style="
        position: relative;
        width: 48px; height: 48px; border-radius: 50%;
        ${iconStyle}
        display: flex; align-items: center; justify-content: center;
        font-size: 24px; flex-shrink: 0;
      ">
        ${templateStyle === 'animated' ? '<span style="position: absolute; top: -2px; right: -2px; width: 12px; height: 12px; background: #22c55e; border-radius: 50%; border: 2px solid white; animation: pulse 1.5s infinite;"></span>' : ''}
        ${icon}
      </div>`;
      
      // Add pulse animation style if not already present
      if (templateStyle === 'animated' && !document.getElementById('notiproof-pulse-style')) {
        const styleEl = document.createElement('style');
        styleEl.id = 'notiproof-pulse-style';
        styleEl.textContent = '@keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.7; transform: scale(1.1); } }';
        document.head.appendChild(styleEl);
      }
      
      // Content section with vertical alignment
      const liveVisitorVerticalAlign = effectiveConfig.contentAlignment === 'center' ? 'center' : 
                                       effectiveConfig.contentAlignment === 'bottom' ? 'flex-end' : 'flex-start';
      contentHTML += `<div style="flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: ${liveVisitorVerticalAlign};">`;
      
      // Build dynamic message with clickable page link
      let displayMessage = data.rendered_message || event.message_template;
      
      if (!displayMessage) {
        // Build message dynamically with clickable link if page_url is available
        const personWord = visitorCount === 1 ? 'person is' : 'people are';
        
        if (pageUrl) {
          // Create clickable page link
          const pageLink = `<a href="${escapeHtml(pageUrl)}" style="color: #667eea; text-decoration: underline; font-weight: 600;" target="_self">${escapeHtml(pageName)}</a>`;
          
          if (templateStyle === 'checkout') {
            displayMessage = `<strong>${visitorCount}</strong> ${personWord} checking out on ${pageLink}`;
          } else if (templateStyle === 'product') {
            displayMessage = `<strong>${visitorCount}</strong> customers interested in ${pageLink}`;
          } else {
            displayMessage = `<strong>${visitorCount}</strong> ${personWord} viewing ${pageLink}`;
          }
        } else {
          displayMessage = `${visitorCount} ${personWord} viewing ${escapeHtml(pageName)}`;
        }
      } else {
        // If rendered_message contains {{page_name}} and {{page_url}}, replace them with clickable link
        if (pageUrl && displayMessage.includes('{{page_name}}')) {
          const pageLink = `<a href="${escapeHtml(pageUrl)}" style="color: #667eea; text-decoration: underline; font-weight: 600;" target="_self">${escapeHtml(pageName)}</a>`;
          displayMessage = displayMessage.replace(/\{\{page_name\}\}/g, pageLink);
        } else {
          displayMessage = displayMessage.replace(/\{\{page_name\}\}/g, escapeHtml(pageName));
        }
        displayMessage = displayMessage.replace(/\{\{page_url\}\}/g, escapeHtml(pageUrl));
        displayMessage = displayMessage.replace(/\{\{count\}\}/g, visitorCount);
        displayMessage = displayMessage.replace(/\{\{visitor_count\}\}/g, visitorCount);
        // Note: Individual values are already escaped above - don't escape the whole message
        // as it contains intentional HTML (links, strong tags, etc.)
      }
      
      contentHTML += `<div style="font-weight: 600; margin-bottom: 4px; line-height: 1.4;">
        ${displayMessage}
      </div>`;
      
      // Optional sub-text for urgency styles
      if (templateStyle === 'checkout') {
        contentHTML += `<div style="font-size: 11px; color: #dc2626; font-weight: 500; margin-top: 2px;">Complete your order now!</div>`;
      } else if (templateStyle === 'product') {
        contentHTML += `<div style="font-size: 11px; color: #8b5cf6; font-weight: 500; margin-top: 2px;">Don't miss out!</div>`;
      }
      
      // Footer line with location and verification badge on same line
      const hasLocation = showLocation && location;
      const showVisitorVerified = event.show_verified || data.show_verified || (data.mode === 'real');
      
      if (hasLocation || showVisitorVerified) {
        contentHTML += `<div style="font-size: 12px; opacity: 0.85; display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">`;
        if (hasLocation) {
          contentHTML += `<span>📍 ${escapeHtml(location)}</span>`;
        }
        if (showVisitorVerified) {
          if (hasLocation) contentHTML += `<span style="opacity: 0.5;">•</span>`;
          contentHTML += `<span style="color: #2563eb; font-weight: 500; opacity: 1;">✓ NotiProof Verified</span>`;
        }
        contentHTML += '</div>';
      }
      
      contentHTML += '</div></div>';
      
      notification.innerHTML = contentHTML;
      container.appendChild(notification);
      
      // Animate in
      setTimeout(() => {
        notification.style.opacity = '1';
        notification.style.transform = 'translateY(0) scale(1)';
      }, 10);
      
      log('Active Visitors notification displayed:', visitorCount);
      
      // Track campaign view for Visitors Pulse
      const avCampaignId = event.campaign_id || data.campaign_id;
      if (avCampaignId) {
        trackCampaignView(avCampaignId);
        log('[Visitors Pulse] Tracked campaign view:', avCampaignId);
      }
      incrementPageImpressions();
      incrementSessionImpressions();
      
      // === HOVER PAUSE FOR ACTIVE VISITORS ===
      let avAutoHideTimeout = null;
      let avStartTime = Date.now();
      let avRemainingTime = config.displayDuration;
      
      const avHideNotification = () => {
        notification.style.opacity = '0';
        notification.style.transform = config.animation === 'slide' ? 'translateY(20px)' : 'scale(0.95)';
        setTimeout(() => notification.remove(), 300);
      };
      
      // Click handler for tracking
      notification.addEventListener('click', (e) => {
        if (e.target.closest('[data-close]')) return;
        if (avCampaignId) {
          trackCampaignClick(avCampaignId);
          log('[Visitors Pulse] Tracked campaign click:', avCampaignId);
        }
        storeInteraction(event.id, avCampaignId, 'click');
      });
      
      // Hover pause
      notification.addEventListener('mouseenter', () => {
        notificationEngaged = true;
        if (avAutoHideTimeout) {
          clearTimeout(avAutoHideTimeout);
          const elapsed = Date.now() - avStartTime;
          avRemainingTime = Math.max(1000, config.displayDuration - elapsed);
          log('Active Visitors paused on hover');
        }
        storeInteraction(event.id, avCampaignId, 'hover');
        trackHover(event.id);
        
        // Apply hover effect
        const hoverEffect = config.hoverEffect || 'subtle';
        if (hoverEffect === 'subtle') notification.style.transform = 'scale(1.02)';
        else if (hoverEffect === 'lift') {
          notification.style.transform = 'translateY(-4px)';
          notification.style.boxShadow = getShadowStyle('xl');
        } else if (hoverEffect === 'glow') {
          notification.style.boxShadow = `0 0 20px ${config.primaryColor}40`;
        }
      });
      
      notification.addEventListener('mouseleave', () => {
        notificationEngaged = false;
        avAutoHideTimeout = setTimeout(avHideNotification, avRemainingTime);
        log('Active Visitors resumed');
        
        // Remove hover effect
        notification.style.transform = '';
        notification.style.boxShadow = getShadowStyle(config.shadow);
      });
      
      // Close button handling
      const closeBtn = notification.querySelector('[data-close]');
      if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (config.pauseAfterClose) {
            isPaused = true;
          }
          if (avAutoHideTimeout) clearTimeout(avAutoHideTimeout);
          avHideNotification();
        });
      }
      
      // Start auto-hide timer
      avAutoHideTimeout = setTimeout(avHideNotification, config.displayDuration);
      
      return; // Exit early for active_visitors
    }
    
    // ANNOUNCEMENT-SPECIFIC IMAGE HANDLING
    if (event.event_type === 'announcement') {
      if (debugMode) {
        log('Announcement image data:', event.event_data);
      }

      const imageType = event.event_data?.image_type;
      
      if (imageType === 'emoji' && event.event_data.emoji) {
        contentHTML += `<div style="
          width: 48px; height: 48px; border-radius: 8px;
          background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
          display: flex; align-items: center; justify-content: center;
          font-size: 28px; flex-shrink: 0;
        ">${event.event_data.emoji}</div>`;
      } else if (imageType === 'icon' && event.event_data.icon) {
        contentHTML += `<div style="
          width: 48px; height: 48px; border-radius: 8px;
          background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
          display: flex; align-items: center; justify-content: center;
          font-size: 28px; flex-shrink: 0;
        ">${event.event_data.icon}</div>`;
      } else if (imageType === 'url' && event.event_data.image_url && isValidUrl(event.event_data.image_url)) {
        contentHTML += `<img src="${escapeHtml(event.event_data.image_url)}" 
          style="width: 48px; height: 48px; border-radius: 8px; object-fit: cover; flex-shrink: 0;"
          alt="Announcement" onerror="this.style.display='none'" />`;
      } else {
        // Fallback logic: try icon, then emoji, then default
        if (event.event_data?.icon) {
          contentHTML += `<div style="
            width: 48px; height: 48px; border-radius: 8px;
            background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
            display: flex; align-items: center; justify-content: center;
            font-size: 28px; flex-shrink: 0;
          ">${event.event_data.icon}</div>`;
        } else if (event.event_data?.emoji) {
          contentHTML += `<div style="
            width: 48px; height: 48px; border-radius: 8px;
            background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
            display: flex; align-items: center; justify-content: center;
            font-size: 28px; flex-shrink: 0;
          ">${event.event_data.emoji}</div>`;
        } else {
          contentHTML += `<div style="width: 48px; height: 48px; border-radius: 8px;
            background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
            display: flex; align-items: center; justify-content: center;
            font-size: 28px; flex-shrink: 0;">📢</div>`;
        }
      }
    } else if (event.event_type === 'form_capture') {
      // FORM_CAPTURE-SPECIFIC IMAGE HANDLING
      const formData = event.event_data || {};
      const avatar = formData.avatar || '📧';
      
      if (debugMode) {
        log('Form capture avatar data:', { avatar, formData });
      }
      
      // Check if avatar is a URL or emoji
      if (avatar.startsWith('http') && isValidUrl(avatar)) {
        contentHTML += `<img src="${escapeHtml(avatar)}" style="
          width: 48px; height: 48px; border-radius: 50%;
          object-fit: cover; flex-shrink: 0;
        " onerror="this.outerHTML='<div style=&quot;width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,#f0f9ff,#e0f2fe);display:flex;align-items:center;justify-content:center;font-size:28px;&quot;>📧</div>'" />`;
      } else {
        // Emoji or icon avatar
        contentHTML += `<div style="
          width: 48px; height: 48px; border-radius: 50%;
          background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
          display: flex; align-items: center; justify-content: center;
          font-size: 28px; flex-shrink: 0;
        ">${avatar}</div>`;
      }
    } else if (event.event_type === 'testimonial') {
      // TESTIMONIAL-SPECIFIC IMAGE HANDLING
      const data = event.event_data || {};
      const videoUrl = data['template.video_url'];
      const imageUrl = data['template.image_url'];
      const avatar = data['template.author_avatar'];
      const name = data['template.author_name'] || 'Anonymous';
      const initial = name && name.length > 0 ? escapeHtml(name[0].toUpperCase()) : '?';
      
      if (videoUrl) {
        // Video testimonial: Show video thumbnail with large centered play overlay
        const mediaUrl = imageUrl || avatar;
        const isAvatarFallback = !imageUrl && avatar;
        const borderRadius = isAvatarFallback ? '50%' : '12px';
        
        contentHTML += `<div style="position: relative; width: 100px; height: 100px; flex-shrink: 0; border-radius: ${borderRadius}; overflow: hidden; background: linear-gradient(135deg, #667eea, #764ba2);">`;
        
        if (mediaUrl && isValidUrl(mediaUrl)) {
          contentHTML += `<img src="${escapeHtml(mediaUrl)}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.style.display='none'" />`;
        } else {
          // Initials fallback inside the media area
          contentHTML += `<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 32px;">${initial}</div>`;
        }
        
        // Large centered play button overlay
        contentHTML += `<div style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.3);">
          <div style="width: 40px; height: 40px; border-radius: 50%; background: rgba(255,255,255,0.95); display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(0,0,0,0.2);">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#667eea"><path d="M8 5v14l11-7z"/></svg>
          </div>
        </div>`;
        contentHTML += `</div>`;
      } else if (imageUrl && isValidUrl(imageUrl)) {
        // Non-video with image: show larger image
        contentHTML += `<img src="${escapeHtml(imageUrl)}" style="
          width: 100px; height: 100px; border-radius: 12px;
          object-fit: cover; flex-shrink: 0;
        " onerror="this.style.display='none'" />`;
      } else if (avatar && isValidUrl(avatar)) {
        // Non-video with avatar: show larger avatar
        contentHTML += `<img src="${escapeHtml(avatar)}" style="
          width: 100px; height: 100px; border-radius: 50%;
          object-fit: cover; flex-shrink: 0;
        " onerror="this.outerHTML='<div style=&quot;width:100px;height:100px;border-radius:50%;background:linear-gradient(135deg,#667eea,#764ba2);display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:32px;&quot;>${initial}</div>'" />`;
      } else {
        // Default: larger author initials
        contentHTML += `<div style="
          width: 100px; height: 100px; border-radius: 50%;
          background: linear-gradient(135deg, #667eea, #764ba2);
          display: flex; align-items: center; justify-content: center;
          color: white; font-weight: bold; font-size: 32px; flex-shrink: 0;
        ">${initial}</div>`;
      }
    } else if (showProductImages && hasProductImage) {
      // EXISTING PRODUCT IMAGE LOGIC
      contentHTML += '<div data-image-placeholder></div>';
    } else if (config.showAvatar && event.user_name) {
      // Traditional avatar fallback (only if no preset image)
      const avatarBg = event.event_data?.avatar_url ? 
        `url(${event.event_data.avatar_url})` : 
        `linear-gradient(135deg, ${config.primaryColor} 0%, ${adjustColor(config.primaryColor, -20)} 100%)`;
      
      contentHTML += `
        <div style="
          width: 40px; 
          height: 40px; 
          background: ${avatarBg}; 
          background-size: cover;
          border-radius: 50%; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          color: white; 
          font-weight: bold; 
          flex-shrink: 0;
        ">
          ${!event.event_data?.avatar_url ? event.user_name[0].toUpperCase() : ''}
        </div>
      `;
    }
    
    // Content with vertical alignment based on contentAlignment setting
    const contentVerticalAlign = effectiveConfig.contentAlignment === 'center' ? 'center' : 
                                 effectiveConfig.contentAlignment === 'bottom' ? 'flex-end' : 'flex-start';
    contentHTML += `<div style="flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: ${contentVerticalAlign};">`;
    
    // JSON parsing already done at function start
    // This duplicate parsing has been moved up
    
    // Debug logging for event rendering
    if (debugMode) {
      log('Event rendering check:', {
        event_type: event.event_type,
        has_title: !!event.event_data?.title
      });
    }
    
    // ANNOUNCEMENT-SPECIFIC MESSAGE RENDERING: Separate title and message with different font weights
    if (event.event_type === 'announcement' && event.event_data?.title?.trim()) {
      if (debugMode) {
        log('Announcement rendering:', event.event_data.title);
      }
      
      // Get announcement-specific font settings
      const announcementFontSize = event.event_data.font_size || 14;
      const announcementFontFamily = event.event_data.font_family === 'serif' 
        ? 'Georgia, serif' 
        : event.event_data.font_family === 'mono' 
          ? 'Menlo, Consolas, monospace' 
          : '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      
      // Render announcement header (bold)
      contentHTML += `<div style="font-weight: 600; margin-bottom: 4px; line-height: 1.4; font-size: ${announcementFontSize}px; font-family: ${announcementFontFamily};">
        ${escapeHtml(event.event_data.title)}
      </div>`;
      
      // Check for message as non-empty string
      const hasMessage = event.event_data.message && 
                        typeof event.event_data.message === 'string' && 
                        event.event_data.message.trim().length > 0;
      
      if (hasMessage) {
        contentHTML += `<div style="font-weight: 400; margin-bottom: 4px; line-height: 1.4; opacity: 0.9; font-size: ${Math.max(12, announcementFontSize - 1)}px; font-family: ${announcementFontFamily};">
          ${escapeHtml(event.event_data.message)}
        </div>`;
      }
    } else if (event.event_type === 'testimonial') {
      // TESTIMONIAL-SPECIFIC MESSAGE RENDERING
      const data = event.event_data || {};
      
      if (debugMode) {
        log('Processing testimonial:', data['template.author_name']);
      }
      
      const name = data['template.author_name'] || 'Anonymous Customer';
      const rating = data['template.rating_stars'] || '★★★★★';
      const message = data['template.message'] || 'Great experience!';
      const position = data['template.author_position'] || '';
      const company = data['template.author_company'] || '';
      const verified = data['template.verified'] || false;
      // Check for NotiProof verification badge from queue builder
      const showNotiProofVerified = event.show_verified || data.show_verified || false;
      
      // Rating stars
      contentHTML += `<div style="color: #f59e0b; font-size: 14px; margin-bottom: 4px;">${rating}</div>`;
      
      // Message (truncated for notification)
      const truncatedMessage = message.length > 80 ? message.substring(0, 77) + '...' : message;
      contentHTML += `<div style="font-style: italic; color: #374151; margin-bottom: 6px; line-height: 1.4;">
        "${escapeHtml(truncatedMessage)}"
      </div>`;
      
      // Author info
      contentHTML += `<div style="font-weight: 600; font-size: 13px;">${escapeHtml(name)}</div>`;
      if (position || company) {
        contentHTML += `<div style="font-size: 12px; color: #6b7280;">
          ${escapeHtml(position)}${position && company ? ' at ' : ''}${escapeHtml(company)}
        </div>`;
      }
      // Footer line with verification badges and timestamp on same line
      const testimonialFooterItems = [];
      if (verified) testimonialFooterItems.push({ text: '✓ Verified Customer', color: '#2563eb' });
      if (showNotiProofVerified) testimonialFooterItems.push({ text: '✓ NotiProof Verified', color: '#2563eb' });
      
      if (testimonialFooterItems.length > 0 || config.showTimestamp) {
        contentHTML += `<div style="font-size: 11px; color: #6b7280; display: flex; align-items: center; gap: 6px; margin-top: 4px; flex-wrap: wrap;">`;
        if (config.showTimestamp) {
          contentHTML += `<span style="opacity: 0.8;">${timeAgo}</span>`;
        }
        testimonialFooterItems.forEach((item, i) => {
          if (i > 0 || config.showTimestamp) contentHTML += `<span style="opacity: 0.5;">•</span>`;
          contentHTML += `<span style="color: ${item.color}; font-weight: 500;">${item.text}</span>`;
        });
        contentHTML += '</div>';
      }
    } else {
      // Regular event - existing logic with product linkification
      const messageContent = event.message_template || 'New activity';
      
      // Detect if message_template is a pre-rendered HTML card (from WooCommerce/Shopify templates)
      // These templates already include time, location, and styling - don't wrap them or add duplicate metadata
      const isPreRenderedHtml = /<div[^>]*class=["']?noti-card|<div[^>]*style=["'][^"']*display:\s*flex|<div[^>]*style=["'][^"']*background:\s*#fff/.test(messageContent);
      
      if (isPreRenderedHtml) {
        // Pre-rendered HTML template - render directly without wrapping
        // The template already has its own structure, time, location, etc.
        contentHTML += messageContent;
        
        // Inject verification badge if not already present and should show
        const showEventVerifiedInTemplate = event.show_verified || event.event_data?.show_verified;
        if (showEventVerifiedInTemplate && !messageContent.includes('NotiProof Verified')) {
          // Insert badge before the last closing div
          const lastDivMatch = contentHTML.lastIndexOf('</div>');
          if (lastDivMatch !== -1) {
            const badgeHtml = ' <span style="color: #2563eb; font-size: 11px; font-weight: 500;">• ✓ NotiProof Verified</span>';
            contentHTML = contentHTML.slice(0, lastDivMatch) + badgeHtml + contentHTML.slice(lastDivMatch);
          }
        }
      } else {
        // Plain text message - apply linkification and wrap
        const linkedMessage = linkifyMessage(messageContent, event.event_data);
        contentHTML += `<div style="font-weight: 600; margin-bottom: 4px; line-height: 1.4;">
          ${linkedMessage}
        </div>`;
      }
    }
    
    // Detect if we rendered a pre-rendered HTML template (to skip duplicate metadata)
    const messageContent = event.message_template || '';
    const isPreRenderedTemplate = /<div[^>]*class=["']?noti-card|<div[^>]*style=["'][^"']*display:\s*flex|<div[^>]*style=["'][^"']*background:\s*#fff/.test(messageContent);
    
    // Metadata (time + location + verification badge) - Skip for:
    // - Announcements with CTA (they have their own footer)
    // - Testimonials (they have their own footer)
    // - Pre-rendered HTML templates (already contain time/location)
    const skipMetadata = (event.event_type === 'announcement' && event.event_data?.cta_text && event.event_data?.cta_url) || 
                         event.event_type === 'testimonial' ||
                         isPreRenderedTemplate;
    const showEventVerified = event.show_verified || event.event_data?.show_verified;
    
    if (!skipMetadata && (config.showTimestamp || (config.showLocation && event.user_location) || showEventVerified)) {
      contentHTML += '<div style="font-size: 12px; opacity: 0.7; display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">';
      if (config.showTimestamp) {
        contentHTML += `<span>${timeAgo}</span>`;
      }
      if (config.showLocation && event.user_location) {
        contentHTML += `<span style="opacity: 0.5;">•</span><span>${event.user_location}</span>`;
      }
      // Add verification badge on same line as timestamp and location
      if (showEventVerified) {
        if (config.showTimestamp || (config.showLocation && event.user_location)) {
          contentHTML += `<span style="opacity: 0.5;">•</span>`;
        }
        contentHTML += `<span style="color: #2563eb; font-weight: 500; opacity: 1;">✓ NotiProof Verified</span>`;
      }
      contentHTML += '</div>';
    }
    
    // CTA Button - check both config.showCTA AND announcement-specific CTA
    const hasAnnouncementCTA = event.event_type === 'announcement' && 
                               event.event_data?.cta_text && 
                               event.event_data?.cta_text.trim().length > 0 &&
                               event.event_data?.cta_url && 
                               event.event_data?.cta_url.trim().length > 0;
    
    const hasConfigCTA = config.showCTA && 
                         config.ctaText && 
                         config.ctaText.trim().length > 0 &&
                         config.ctaUrl && 
                         config.ctaUrl.trim().length > 0;
    
    const showButton = hasConfigCTA || hasAnnouncementCTA;
    
    if (showButton) {
      const ctaText = hasAnnouncementCTA ? event.event_data.cta_text : config.ctaText;
      const ctaUrl = hasAnnouncementCTA ? event.event_data.cta_url : config.ctaUrl;
      
      // Check for button_stretch setting (announcement-specific)
      const buttonStretch = hasAnnouncementCTA && event.event_data?.button_stretch === true;
      const buttonWidth = buttonStretch ? 'width: 100%;' : '';
      const buttonPadding = buttonStretch ? 'padding: 8px 0;' : 'padding: 6px 12px;';
      
      contentHTML += `
        <button style="
          margin-top: 8px;
          ${buttonPadding}
          ${buttonWidth}
          background: ${config.primaryColor};
          color: white;
          border: none;
          border-radius: 4px;
          font-size: ${Math.max(12, config.fontSize - 2)}px;
          font-weight: 500;
          cursor: pointer;
          transition: opacity 0.2s;
          text-align: center;
        " onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'" 
           data-cta-url="${escapeHtml(ctaUrl)}">
          ${escapeHtml(ctaText)}
        </button>
      `;
    }
    
    contentHTML += '</div></div>';
    notification.innerHTML = contentHTML;
    
    // PHASE 4: Inject product image element if placeholder exists - ENHANCED with event_type
    const imagePlaceholder = notification.querySelector('[data-image-placeholder]');
    if (imagePlaceholder) {
      const imageElement = createNotificationImage(
        event.event_data, 
        event.event_type, // NEW: Pass event type for better preset selection
        config.fallbackIcon || 'default'
      );
      imagePlaceholder.replaceWith(imageElement);
    }
    
    container.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
      notification.style.opacity = '1';
      notification.style.transform = 'translateY(0) scale(1)';
    }, 10);
    
    log('Notification displayed:', event.event_type, event.id);
    
    // Track view - use campaign stats for live_visitors, event stats for others
    const isLiveVisitors = event.event_type === 'live_visitors' || 
                           event.event_type === 'active_visitors' ||
                           event.event_type === 'visitor';
    
    log('[View Tracking] Event type:', event.event_type, 'isLiveVisitors:', isLiveVisitors);
    
    if (isLiveVisitors) {
      // Check multiple sources for campaign_id (fallback for older data structures)
      const campaignId = event.campaign_id || event.event_data?.campaign_id || event.event_data?.campaignId;
      log('[Visitors Pulse] Event details:', { 
        event_type: event.event_type, 
        campaign_id: campaignId, 
        event_id: event.id,
        has_event_data: !!event.event_data 
      });
      
      if (campaignId) {
        trackCampaignView(campaignId);
        log('Tracked campaign view for Visitors Pulse:', campaignId);
      } else {
        console.warn('[NotiProof] No campaign_id found for live_visitors event', JSON.stringify(event));
      }
    } else {
      trackView(event.id);
    }
    incrementPageImpressions();
    incrementSessionImpressions();
    
    // Add branding footer after first notification (only once)
    if (!document.querySelector('[data-notiproof-branding]')) {
      createBrandingFooter();
    }
    
    // === HOVER PAUSE & ENGAGEMENT TRACKING ===
    let autoHideTimeout = null;
    let startTime = Date.now();
    let remainingTime = config.displayDuration;
    let pausedAt = null;
    const notificationId = event.id || Date.now().toString();
    
    // Apply hover effect styles
    const applyHoverStyles = () => {
      const hoverEffect = config.hoverEffect || 'subtle';
      if (hoverEffect === 'none') return;
      
      if (hoverEffect === 'subtle') {
        notification.style.transform = 'scale(1.02)';
      } else if (hoverEffect === 'lift') {
        notification.style.transform = 'translateY(-4px)';
        notification.style.boxShadow = getShadowStyle('xl');
      } else if (hoverEffect === 'glow') {
        notification.style.boxShadow = `0 0 20px ${config.primaryColor}40, ${getShadowStyle(config.shadow)}`;
      } else if (hoverEffect === 'brighten') {
        notification.style.filter = 'brightness(1.05)';
      }
    };
    
    const removeHoverStyles = () => {
      notification.style.transform = '';
      notification.style.boxShadow = getShadowStyle(config.shadow);
      notification.style.filter = '';
    };
    
    // Hover pause: pause timer when mouse enters
    notification.addEventListener('mouseenter', () => {
      notificationEngaged = true;
      
      // Pause auto-hide timer
      if (autoHideTimeout) {
        clearTimeout(autoHideTimeout);
        pausedAt = Date.now();
        const elapsed = pausedAt - startTime;
        remainingTime = Math.max(1000, config.displayDuration - elapsed);
        log('Notification paused on hover, remaining:', remainingTime + 'ms');
      }
      
      // Track hover engagement
      storeInteraction(event.id, event.campaign_id, 'hover');
      trackHover(event.id);
      
      // Apply hover effect
      applyHoverStyles();
    });
    
    // Hover resume: resume timer when mouse leaves
    notification.addEventListener('mouseleave', () => {
      notificationEngaged = false;
      pausedAt = null;
      
      // Resume auto-hide with remaining time
      autoHideTimeout = setTimeout(() => {
        hideNotification();
      }, remainingTime);
      
      log('Notification resumed, remaining:', remainingTime + 'ms');
      
      // Remove hover effect
      removeHoverStyles();
    });
    
    // Function to hide notification with animation
    const hideNotification = () => {
      notification.style.opacity = '0';
      notification.style.transform = config.animation === 'slide' ? 'translateY(20px)' : 'scale(0.95)';
      setTimeout(() => {
        notification.remove();
        activeNotificationTimers.delete(notificationId);
      }, 300);
    };
    
    // Click handling
    notification.addEventListener('click', (e) => {
      if (e.target.closest('[data-close]')) return;
      if (!config.makeClickable) return;
      
      log('Notification clicked', { eventId: event.id });
      
      // Track click - use campaign stats for live_visitors, event stats for others
      if (event.event_type === 'live_visitors' || event.event_type === 'active_visitors') {
        if (event.campaign_id) {
          trackCampaignClick(event.campaign_id);
        }
      } else {
        trackClick(event.id);
      }
      storeInteraction(event.id, event.campaign_id, 'click');
      
      // Pause if configured
      if (config.pauseAfterClick) {
        isPaused = true;
        log('Notifications paused after click');
      }
      
      // Check if this is a testimonial event - open modal instead of URL
      if (event.event_type === 'testimonial' || event.source === 'native') {
        e.preventDefault();
        showTestimonialModal(event);
        return;
      }
      
      // Handle announcement CTA click (highest priority)
      const ctaButton = e.target.closest('[data-cta-url]');
      if (ctaButton) {
        const url = ctaButton.getAttribute('data-cta-url');
        if (url) window.open(url, '_blank');
      } else if (config.showCTA && config.ctaUrl && e.target.tagName === 'BUTTON') {
        // Handle regular CTA
        window.open(config.ctaUrl, '_blank');
      } else if (event.event_data?.url) {
        // Handle event URL
        window.open(event.event_data.url, '_blank');
      }
      
      // Clear timer and hide
      if (autoHideTimeout) clearTimeout(autoHideTimeout);
      hideNotification();
    });
    
    // Close button handling
    const closeBtn = notification.querySelector('[data-close]');
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (config.pauseAfterClose) {
          isPaused = true;
          log('Notifications paused after close');
        }
        if (autoHideTimeout) clearTimeout(autoHideTimeout);
        hideNotification();
      });
    }
    
    // Start auto-hide timer
    autoHideTimeout = setTimeout(() => {
      hideNotification();
    }, config.displayDuration);
    
    // Store timer reference for queue pause
    activeNotificationTimers.set(notificationId, {
      timeout: autoHideTimeout,
      startTime,
      remainingTime: config.displayDuration
    });
  }
  
  // Track hover engagement
  async function trackHover(eventId) {
    if (!eventId) return;
    
    try {
      await fetch(`${API_BASE}/track`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: eventId,
          action: 'hover',
          session_id: sessionId,
          timestamp: new Date().toISOString()
        })
      });
      log('Hover tracked:', eventId);
    } catch (err) {
      log('Hover tracking failed:', err);
    }
  }
  
  // Helper to adjust color brightness
  function adjustColor(color, amount) {
    const num = parseInt(color.replace('#', ''), 16);
    const r = Math.max(0, Math.min(255, (num >> 16) + amount));
    const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amount));
    const b = Math.max(0, Math.min(255, (num & 0x0000FF) + amount));
    return '#' + (r << 16 | g << 8 | b).toString(16).padStart(6, '0');
  }
  
  function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }
  
  /**
   * Show full testimonial in modal
   */
  function showTestimonialModal(event) {
    const data = event.event_data || {};
    
    // Create modal container
    const modal = document.createElement('div');
    modal.className = 'notiproof-modal';
    modal.innerHTML = `
      <div class="notiproof-modal-overlay"></div>
      <div class="notiproof-modal-content">
        <button class="notiproof-modal-close" aria-label="Close">&times;</button>
        <div class="notiproof-modal-body">
          ${renderFullTestimonial(data)}
        </div>
      </div>
    `;
    
    // Add modal styles
    injectModalStyles();
    
    // Append to body
    document.body.appendChild(modal);
    
    // Prevent body scroll
    document.body.style.overflow = 'hidden';
    
    // Animate in
    requestAnimationFrame(() => {
      const overlay = modal.querySelector('.notiproof-modal-overlay');
      const content = modal.querySelector('.notiproof-modal-content');
      if (overlay) overlay.style.opacity = '1';
      if (content) {
        content.style.opacity = '1';
        content.style.transform = 'scale(1)';
      }
    });
    
    // Close handlers
    const closeModal = () => {
      const overlay = modal.querySelector('.notiproof-modal-overlay');
      const content = modal.querySelector('.notiproof-modal-content');
      if (overlay) overlay.style.opacity = '0';
      if (content) {
        content.style.opacity = '0';
        content.style.transform = 'scale(0.95)';
      }
      setTimeout(() => {
        modal.remove();
        document.body.style.overflow = '';
      }, 300);
    };
    
    const closeBtn = modal.querySelector('.notiproof-modal-close');
    const overlay = modal.querySelector('.notiproof-modal-overlay');
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (overlay) overlay.addEventListener('click', closeModal);
    
    // ESC key to close
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        closeModal();
        document.removeEventListener('keydown', handleEsc);
      }
    };
    document.addEventListener('keydown', handleEsc);
    
    log('Testimonial modal opened', { eventId: event.id });
  }
  
  /**
   * Render full testimonial content for modal
   */
  function renderFullTestimonial(data) {
    const name = data['template.author_name'] || data.author_name || 'Anonymous Customer';
    const avatar = data['template.author_avatar'] || data.author_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=2563EB&color=fff`;
    const position = data['template.author_position'] || data.author_position || 'Customer';
    const company = data['template.author_company'] || data.author_company || '';
    const rating = data['template.rating_stars'] || data.rating_stars || '★★★★★';
    const message = data['template.message'] || data.message || 'Great experience!';
    const timeAgo = data['template.time_ago'] || data.time_ago || 'recently';
    const verified = data['template.verified'] || data.verified || false;
    const imageUrl = data['template.image_url'] || data.image_url;
    const videoUrl = data['template.video_url'] || data.video_url;
    
    return `
      <div class="notiproof-testimonial-modal-card">
        ${videoUrl ? `
          <div class="notiproof-modal-media">
            <video src="${videoUrl}" controls class="notiproof-modal-video" autoplay muted></video>
          </div>
        ` : imageUrl ? `
          <div class="notiproof-modal-media">
            <img src="${imageUrl}" alt="Testimonial" class="notiproof-modal-image" />
          </div>
        ` : ''}
        
        <div class="notiproof-modal-rating">${rating}</div>
        <p class="notiproof-modal-message">"${message}"</p>
        
        <div class="notiproof-modal-author">
          <img src="${avatar}" alt="${name}" class="notiproof-modal-avatar" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=2563EB&color=fff'" />
          <div class="notiproof-modal-author-info">
            <p class="notiproof-modal-name">${name}</p>
            ${position ? `<p class="notiproof-modal-position">${position}${company ? ` at ${company}` : ''}</p>` : ''}
            ${verified ? '<p class="notiproof-modal-verified">✓ Verified Customer</p>' : ''}
          </div>
        </div>
        
        <p class="notiproof-modal-time">${timeAgo}</p>
      </div>
    `;
  }
  
  /**
   * Inject modal styles (once)
   */
  let modalStylesInjected = false;
  function injectModalStyles() {
    if (modalStylesInjected) return;
    modalStylesInjected = true;
    
    const style = document.createElement('style');
    style.textContent = `
      .notiproof-modal {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 9999999;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
      }
      .notiproof-modal-overlay {
        position: absolute;
        inset: 0;
        background: rgba(0, 0, 0, 0.7);
        backdrop-filter: blur(4px);
        opacity: 0;
        transition: opacity 0.3s ease;
      }
      .notiproof-modal-content {
        position: relative;
        background: white;
        border-radius: 16px;
        max-width: 600px;
        width: 100%;
        max-height: 90vh;
        overflow-y: auto;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        opacity: 0;
        transform: scale(0.95);
        transition: opacity 0.3s ease, transform 0.3s ease;
      }
      .notiproof-modal-close {
        position: absolute;
        top: 16px;
        right: 16px;
        background: rgba(0, 0, 0, 0.1);
        border: none;
        border-radius: 50%;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24px;
        cursor: pointer;
        color: #666;
        z-index: 1;
        transition: all 0.2s ease;
      }
      .notiproof-modal-close:hover {
        background: rgba(0, 0, 0, 0.2);
        color: #000;
        transform: rotate(90deg);
      }
      .notiproof-modal-body {
        padding: 24px;
      }
      .notiproof-testimonial-modal-card {
        display: flex;
        flex-direction: column;
        gap: 20px;
      }
      .notiproof-modal-media {
        width: 100%;
        border-radius: 12px;
        overflow: hidden;
        background: #f5f5f5;
      }
      .notiproof-modal-video,
      .notiproof-modal-image {
        width: 100%;
        max-height: 400px;
        object-fit: cover;
        display: block;
      }
      .notiproof-modal-rating {
        color: #f59e0b;
        font-size: 24px;
        letter-spacing: 2px;
      }
      .notiproof-modal-message {
        font-size: 18px;
        line-height: 1.6;
        color: #1a1a1a;
        font-style: italic;
      }
      .notiproof-modal-author {
        display: flex;
        align-items: center;
        gap: 12px;
        padding-top: 16px;
        border-top: 1px solid #e5e7eb;
      }
      .notiproof-modal-avatar {
        width: 56px;
        height: 56px;
        border-radius: 50%;
        object-fit: cover;
        flex-shrink: 0;
      }
      .notiproof-modal-author-info {
        flex: 1;
      }
      .notiproof-modal-name {
        font-weight: 600;
        font-size: 16px;
        color: #1a1a1a;
        margin: 0 0 4px 0;
      }
      .notiproof-modal-position {
        font-size: 14px;
        color: #6b7280;
        margin: 0;
      }
      .notiproof-modal-verified {
        display: inline-flex;
        align-items: center;
        font-size: 13px;
        color: #2563EB;
        font-weight: 500;
        margin-top: 4px;
      }
      .notiproof-modal-time {
        font-size: 13px;
        color: #9ca3af;
        text-align: center;
        margin: 0;
      }
      
      @media (max-width: 640px) {
        .notiproof-modal {
          padding: 10px;
        }
        .notiproof-modal-content {
          max-height: 95vh;
          border-radius: 12px;
        }
        .notiproof-modal-body {
          padding: 16px;
        }
        .notiproof-modal-message {
          font-size: 16px;
        }
        .notiproof-modal-video,
        .notiproof-modal-image {
          max-height: 300px;
        }
      }
    `;
    document.head.appendChild(style);
  }
  
  
  async function fetchEvents() {
    try {
      if (mode === 'site') {
        // Fetch all widgets and events for the site
        log('Fetching events for site:', siteToken);
        const response = await fetch(`${API_BASE}/site/${siteToken}`);
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to fetch site data: ${response.status} - ${errorText}`);
        }
        const data = await response.json();
        eventQueue = data.events || [];
        
        // Debug: Show event breakdown by type
        if (debugMode) {
          const eventsByType = {};
          eventQueue.forEach(e => {
            eventsByType[e.event_type] = (eventsByType[e.event_type] || 0) + 1;
          });
          log('Events fetched:', { total: eventQueue.length, by_type: eventsByType });
        }
        
        // Apply display settings from API
        if (data.display_settings) {
          const ds = data.display_settings;
          maxPerPage = ds.max_per_page ?? config.maxPerPage;
          maxPerSession = ds.max_per_session ?? config.maxPerSession;
          displayRules = ds.default_rules || {};
          
          // Override config with server settings
          if (ds.initial_delay !== undefined) config.initialDelay = ds.initial_delay * 1000;
          if (ds.display_duration !== undefined) config.displayDuration = ds.display_duration * 1000;
          if (ds.interval !== undefined) config.interval = ds.interval * 1000;
          if (ds.position) config.position = ds.position;
          if (ds.animation) config.animation = ds.animation;
          if (ds.pause_after_click !== undefined) config.pauseAfterClick = ds.pause_after_click;
          if (ds.pause_after_close !== undefined) config.pauseAfterClose = ds.pause_after_close;
          if (ds.make_clickable !== undefined) config.makeClickable = ds.make_clickable;
          if (ds.debug_mode !== undefined) config.debugMode = ds.debug_mode;
          
          log('Display settings applied from server', { maxPerPage, maxPerSession, displayRules });
        }
        
        // Store visitor country
        if (data.visitor_country) {
          visitorCountry = data.visitor_country;
          log('Visitor country:', visitorCountry);
        }
        
        // Apply white-label settings from API response
        if (data.white_label) {
          const wl = data.white_label;
          // FIX: Apply hide_branding regardless of enabled status
          hideBranding = wl.hide_branding || false;
          
          // Only apply custom branding if enabled
          if (wl.enabled) {
            customBrandName = wl.custom_brand_name || 'NotiProof';
            customLogoUrl = wl.custom_logo_url || '';
            
            // Update config colors if custom colors are set
            if (wl.custom_colors) {
              config.primaryColor = wl.custom_colors.primary || config.primaryColor;
            }
          }
          
          log('White-label settings applied', { hideBranding, customBrandName });
        }
        
        // Hide branding for paid plans automatically
        if (data.subscription) {
          const planName = data.subscription.plan_name || 'Free';
          const isPaid = !['Free', 'free', 'trial'].includes(planName);
          
          if (isPaid) {
            hideBranding = true;
            log('Branding hidden for paid plan:', planName);
          }
        }
        
        log('Site events fetched', { widgets: data.widgets?.length || 0, events: eventQueue.length });
      } else {
        // Legacy single widget mode
        log('Fetching events for widget', widgetId);
        const response = await fetch(`${API_BASE}/events/${widgetId}`);
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to fetch events: ${response.status} - ${errorText}`);
        }
        const data = await response.json();
        eventQueue = data.events || [];
        log('Events fetched', { count: eventQueue.length });
      }
    } catch (err) {
      error('Failed to fetch events', err);
    }
  }
  
  async function trackView(eventId) {
    try {
      log('Tracking view for event', eventId);
      const response = await fetch(`${API_BASE}/events/${eventId}/view`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) {
        throw new Error(`View tracking failed: ${response.status}`);
      }
      log('View tracked successfully', eventId);
    } catch (err) {
      error('Failed to track view', eventId, err);
    }
  }
  
  async function trackClick(eventId) {
    try {
      log('Tracking click for event', eventId);
      const response = await fetch(`${API_BASE}/events/${eventId}/click`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) {
        throw new Error(`Click tracking failed: ${response.status}`);
      }
      log('Click tracked successfully', eventId);
    } catch (err) {
      error('Failed to track click', eventId, err);
    }
  }
  
  async function trackSession() {
    try {
      // In site mode, we track session for the site token
      const trackingId = mode === 'site' ? siteToken : widgetId;
      log('Tracking session', { sessionId, mode, trackingId });
      const response = await fetch(`${API_BASE}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          widget_id: mode === 'widget' ? widgetId : null,
          site_token: mode === 'site' ? siteToken : null,
          session_id: sessionId,
          page_url: window.location.href,
          user_agent: navigator.userAgent,
        })
      });
      if (!response.ok) {
        throw new Error(`Session tracking failed: ${response.status}`);
      }
      log('Session tracked successfully');
    } catch (err) {
      error('Failed to track session', err);
    }
  }
  
  // Track campaign view (for Visitors Pulse and other non-event campaigns)
  async function trackCampaignView(campaignId) {
    if (!campaignId) {
      console.warn('[NotiProof] trackCampaignView called without campaignId');
      return;
    }
    try {
      const url = `${API_BASE}/campaigns/${campaignId}/view`;
      log('[Campaign Stats] Tracking view for campaign:', campaignId, 'URL:', url);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        mode: 'cors',
        credentials: 'omit'
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      log('[Campaign Stats] View tracked successfully for campaign:', campaignId);
    } catch (err) {
      // Use console.error for visibility even in production
      console.error('[NotiProof] Failed to track campaign view:', campaignId, err);
    }
  }

  // Track campaign click (for Visitors Pulse and other non-event campaigns)
  async function trackCampaignClick(campaignId) {
    if (!campaignId) return;
    try {
      log('[Campaign Stats] Tracking click for campaign:', campaignId);
      await fetch(`${API_BASE}/campaigns/${campaignId}/click`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (err) {
      error('Failed to track campaign click:', err);
    }
  }
  
  function startDisplayLoop() {
    log('Starting display loop with', eventQueue.length, 'events');
    
    // Initial delay before first notification
    setTimeout(() => {
      if (eventQueue.length > 0 && checkFrequencyLimits() && !isPaused && !notificationEngaged) {
        const event = eventQueue.shift();
        if (debugMode) log('Showing notification:', event.event_type, event.id);
        showNotification(event);
      }
      
      // Then show notifications at intervals
      setInterval(() => {
        // QUEUE PAUSE: Don't show next notification if user is engaged with current one
        if (notificationEngaged) {
          log('Queue paused - user engaged with notification');
          return;
        }
        
        if (eventQueue.length > 0 && checkFrequencyLimits() && !isPaused) {
          const event = eventQueue.shift();
          if (debugMode) log('Showing notification (interval):', event.event_type, event.id);
          showNotification(event);
        }
      }, config.interval);
    }, config.initialDelay);
  }
  
  function createBrandingFooter() {
    if (hideBranding) {
      log('Branding hidden via white-label settings');
      return;
    }
    
    const container = document.getElementById('notiproof-container');
    if (!container) return;
    
    // Check if branding already exists
    if (container.querySelector('[data-notiproof-branding]')) return;
    
    const branding = document.createElement('div');
    branding.setAttribute('data-notiproof-branding', 'true');
    branding.style.cssText = `
      margin-top: 8px;
      text-align: center;
      font-size: 11px;
      opacity: 0.6;
      color: ${config.textColor};
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    `;
    
    branding.innerHTML = `
      <a href="https://notiproof.com" target="_blank" rel="noopener" style="color: inherit; text-decoration: none;">
        Powered by ${customBrandName}
      </a>
    `;
    
    container.appendChild(branding);
    log('Branding footer added');
  }
  
  // NATIVE INTEGRATIONS - Instant Capture (Form Submission Tracking)
  // Stores all form capture rules for URL matching
  let formCaptureRules = [];
  let formCaptureInitialized = false;
  
  // Check if URL matches a form capture rule
  function matchFormCaptureRule(pageUrl) {
    const pathname = new URL(pageUrl).pathname;
    
    // Sort rules: most specific (longest path) first, empty path last
    const sortedRules = [...formCaptureRules].sort((a, b) => {
      const aPath = a.config?.target_url || '';
      const bPath = b.config?.target_url || '';
      // Empty paths go last (catch-all)
      if (!aPath && bPath) return 1;
      if (aPath && !bPath) return -1;
      // Longer paths are more specific, go first
      return bPath.length - aPath.length;
    });
    
    for (const rule of sortedRules) {
      const targetUrl = rule.config?.target_url || '';
      
      // Empty target URL means capture all pages
      if (!targetUrl) {
        log('[Instant Capture] Matched catch-all rule:', rule.id);
        return rule;
      }
      
      // Check for exact match or path containment
      if (pathname === targetUrl || 
          pathname.startsWith(targetUrl) || 
          pathname.includes(targetUrl)) {
        log('[Instant Capture] Matched rule:', rule.id, 'for path:', pathname);
        return rule;
      }
    }
    
    return null;
  }
  
  function initInstantCapture(integrationId, websiteId, config) {
    // Add rule to the list
    formCaptureRules.push({ id: integrationId, websiteId, config });
    log('[Instant Capture] Added rule:', integrationId, 'target:', config.target_url || '/*');
    
    // Only initialize the form listener once
    if (formCaptureInitialized) return;
    formCaptureInitialized = true;
    
    log('[Instant Capture] ✅ Initializing global form submission listener');
    
    document.addEventListener('submit', async (e) => {
      if (e.target.tagName !== 'FORM') return;
      
      // Find matching rule for current page
      const matchedRule = matchFormCaptureRule(window.location.href);
      if (!matchedRule) {
        log('[Instant Capture] No matching rule for page:', window.location.pathname);
        return;
      }
      
      // Extract form data
      const formData = new FormData(e.target);
      const data = Object.fromEntries(formData.entries());
      
      log('[Instant Capture] Form submitted on', window.location.pathname, 
          'matched rule:', matchedRule.id, 'data:', data);
      
      try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/track-form`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY
          },
          body: JSON.stringify({
            integration_id: matchedRule.id,
            website_id: matchedRule.websiteId,
            form_data: data,
            page_url: window.location.href
          })
        });
        
        if (response.ok) {
          log('[Instant Capture] ✅ Form data captured successfully');
        } else {
          const errorData = await response.json();
          log('[Instant Capture] ⚠️ Form capture response:', response.status, errorData);
        }
      } catch (err) {
        console.error('[NotiProof][Instant Capture] Form capture failed:', err);
      }
    }, true); // Use capture phase
  }
  
  // Mustache-style template renderer for custom templates
  function renderMustacheTemplate(template, data) {
    if (!template) return '';
    
    let result = template;
    
    // Handle conditional sections {{#key}}...{{/key}}
    result = result.replace(/\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (match, key, content) => {
      const value = data[key];
      if (value && value !== '' && value !== 'undefined') {
        return content;
      }
      return '';
    });
    
    // Handle inverted sections {{^key}}...{{/key}} (show if falsy)
    result = result.replace(/\{\{\^(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (match, key, content) => {
      const value = data[key];
      if (!value || value === '' || value === 'undefined') {
        return content;
      }
      return '';
    });
    
    // Replace simple placeholders {{key}}
    result = result.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      const value = data[key];
      if (value !== undefined && value !== null) {
        return escapeHtml(String(value));
      }
      return '';
    });
    
    return result;
  }
  
  // NATIVE INTEGRATIONS - Active Visitors (Simulated Visitor Count) with Media+Text Format
  function initActiveVisitors(campaignId, config, template) {
    const { 
      mode = 'simulated',
      min_count = 5, 
      max_count = 50,
      update_interval_seconds = 10,
      scope = 'site',
      // New customization fields
      template_style = 'social_proof',
      message_template = '{{count}} people are viewing this page',
      icon = '👥',
      show_location = true
    } = config;
    
    let currentCount = getRandomCount(min_count, max_count);
    
    // Check if we have a custom template from the campaigns table
    const hasCustomTemplate = template && template.html_template;
    
    log('[Active Visitors] Template config:', { 
      hasCustomTemplate, 
      templateName: template?.name,
      templateKey: template?.template_key
    });
    
    // Render message template with placeholders
    function renderVisitorMessage(count) {
      const pageName = document.title || window.location.pathname;
      const pageUrl = window.location.href;
      const location = visitorCountry || 'Multiple locations';
      
      // If we have a custom HTML template, use it
      if (hasCustomTemplate) {
        return renderMustacheTemplate(template.html_template, {
          count: count,
          visitor_count: count,
          page_name: pageName,
          page_url: pageUrl,
          location: location
        });
      }
      
      // Otherwise use the config message_template
      return message_template
        .replace(/\{\{count\}\}/g, count.toString())
        .replace(/\{\{visitor_count\}\}/g, count.toString())
        .replace(/\{\{page_name\}\}/g, pageName)
        .replace(/\{\{page_url\}\}/g, pageUrl)
        .replace(/\{\{location\}\}/g, location);
    }
    
    // Create visitor count notification with media+text format
    function createVisitorNotification() {
      const renderedMessage = renderVisitorMessage(currentCount);
      const pageName = document.title || window.location.pathname;
      const pageUrl = window.location.href;
      
      return {
        id: `visitor-${Date.now()}`,
        event_type: 'active_visitors',
        message_template: renderedMessage,
        created_at: new Date().toISOString(),
        is_simulated: mode === 'simulated',
        event_data: { 
          visitor_count: currentCount, 
          mode, 
          scope,
          // Style config for rendering
          template_style: hasCustomTemplate ? (template.style_variant || template_style) : template_style,
          icon,
          show_location,
          location: visitorCountry || null,
          page_name: pageName,
          page_url: pageUrl,
          rendered_message: renderedMessage,
          // Pass template info for custom rendering
          has_custom_template: hasCustomTemplate,
          custom_html: hasCustomTemplate ? renderedMessage : null
        }
      };
    }
    
    // Show initial count
    const initialNotif = createVisitorNotification();
    eventQueue.push(initialNotif);
    log('[Active Visitors] Initial count:', currentCount, 'Style:', hasCustomTemplate ? 'custom' : template_style);
    
    // Update count periodically
    setInterval(() => {
      // Fluctuate count within range (±10%)
      const variance = Math.floor(currentCount * 0.1);
      currentCount = Math.max(
        min_count,
        Math.min(max_count, currentCount + getRandomInt(-variance, variance))
      );
      
      const notif = createVisitorNotification();
      eventQueue.push(notif);
      log('[Active Visitors] Updated count:', currentCount);
    }, update_interval_seconds * 1000);
  }
  
  function getRandomCount(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
  
  function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
  
  // NATIVE INTEGRATIONS - Initialize all native campaigns
  async function initNativeCampaigns(campaigns, websiteId) {
    if (!campaigns || campaigns.length === 0) return;
    
    log('[Native] Initializing native campaigns...', campaigns.length);
    
    for (const campaign of campaigns) {
      const nativeConfig = campaign.native_config || {};
      
      switch (campaign.data_source) {
        case 'instant_capture':
          initInstantCapture(campaign.id, websiteId, nativeConfig);
          log('[Native] Instant Capture initialized for campaign', campaign.id);
          break;
          
        case 'live_visitors':
          initActiveVisitors(campaign.id, nativeConfig, campaign.templates);
          log('[Native] Active Visitors initialized for campaign', campaign.id, 'with template:', campaign.templates?.name);
          break;
          
        case 'announcements':
          // Announcements are handled server-side via cron
          log('[Native] Announcements will be fetched from server for campaign', campaign.id);
          break;
          
        default:
          // Not a native integration
          break;
      }
    }
  }
  
  // ========== DEBUG PANEL ==========
  function createDebugPanel() {
    const panel = document.createElement('div');
    panel.id = 'notiproof-debug-panel';
    panel.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 350px;
      background: rgba(0, 0, 0, 0.95);
      color: #00ff00;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      padding: 15px;
      border-radius: 8px;
      z-index: 999999;
      box-shadow: 0 4px 20px rgba(0, 255, 0, 0.3);
      border: 2px solid #00ff00;
      max-height: 600px;
      overflow-y: auto;
    `;
    
    panel.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; border-bottom: 1px solid #00ff00; padding-bottom: 8px;">
        <strong style="color: #00ff00; font-size: 14px;">🐛 NotiProof Debug</strong>
        <button id="notiproof-debug-toggle" style="background: none; border: 1px solid #00ff00; color: #00ff00; cursor: pointer; padding: 2px 8px; border-radius: 3px; font-size: 10px;">Hide</button>
      </div>
      <div id="notiproof-debug-content"></div>
    `;
    
    document.body.appendChild(panel);
    
    // Toggle functionality
    const toggleBtn = panel.querySelector('#notiproof-debug-toggle');
    const content = panel.querySelector('#notiproof-debug-content');
    let collapsed = false;
    
    toggleBtn.addEventListener('click', () => {
      collapsed = !collapsed;
      content.style.display = collapsed ? 'none' : 'block';
      toggleBtn.textContent = collapsed ? 'Show' : 'Hide';
      panel.style.height = collapsed ? 'auto' : '';
    });
    
    // Make draggable
    let isDragging = false;
    let currentX;
    let currentY;
    let initialX;
    let initialY;
    
    panel.addEventListener('mousedown', (e) => {
      if (e.target === panel || e.target.tagName === 'STRONG') {
        isDragging = true;
        initialX = e.clientX - panel.offsetLeft;
        initialY = e.clientY - panel.offsetTop;
      }
    });
    
    document.addEventListener('mousemove', (e) => {
      if (isDragging) {
        e.preventDefault();
        currentX = e.clientX - initialX;
        currentY = e.clientY - initialY;
        panel.style.left = currentX + 'px';
        panel.style.top = currentY + 'px';
        panel.style.bottom = 'auto';
        panel.style.right = 'auto';
      }
    });
    
    document.addEventListener('mouseup', () => {
      isDragging = false;
    });
    
    return content;
  }
  
  function updateDebugPanel(contentElement) {
    if (!contentElement) return;
    
    const sessionImpressions = getSessionImpressions();
    const pageImpressions = getPageImpressions();
    const frequencyCap = config.frequency_cap || { session: 20, page: 5 };
    
    // Count events by type
    const eventsByType = {};
    eventQueue.forEach(event => {
      const type = event.event_type || 'unknown';
      eventsByType[type] = (eventsByType[type] || 0) + 1;
    });
    
    // Calculate next notification time
    const nextNotificationIn = nextNotificationTime ? Math.max(0, Math.ceil((nextNotificationTime - Date.now()) / 1000)) : 0;
    
    // Status indicator
    const isActive = eventQueue.length > 0 && !isPaused;
    const statusColor = isActive ? '#00ff00' : '#ffaa00';
    const statusText = isPaused ? '⏸️ PAUSED' : (eventQueue.length === 0 ? '⚠️ EMPTY QUEUE' : '✅ ACTIVE');
    
    contentElement.innerHTML = `
      <div style="margin-bottom: 12px;">
        <div style="color: ${statusColor}; font-weight: bold; margin-bottom: 5px;">${statusText}</div>
        <div style="color: #00ff00; opacity: 0.7;">Visitor Country: ${visitorCountry || 'Detecting...'}</div>
      </div>
      
      <div style="margin-bottom: 12px;">
        <div style="color: #ffaa00; font-weight: bold; margin-bottom: 5px;">📊 Queue Status</div>
        <div style="padding-left: 10px;">
          <div>Total Events: <span style="color: #00ff00; font-weight: bold;">${eventQueue.length}</span></div>
          ${Object.keys(eventsByType).length > 0 ? Object.entries(eventsByType).map(([type, count]) => 
            `<div style="padding-left: 10px; color: #aaffaa;">• ${type}: ${count}</div>`
          ).join('') : '<div style="padding-left: 10px; color: #ff6666;">No events in queue</div>'}
        </div>
      </div>
      
      <div style="margin-bottom: 12px;">
        <div style="color: #ffaa00; font-weight: bold; margin-bottom: 5px;">🔢 Frequency Limits</div>
        <div style="padding-left: 10px;">
          <div>Page: <span style="color: ${pageImpressions >= frequencyCap.page ? '#ff6666' : '#00ff00'};">${pageImpressions} / ${frequencyCap.page}</span></div>
          <div>Session: <span style="color: ${sessionImpressions >= frequencyCap.session ? '#ff6666' : '#00ff00'};">${sessionImpressions} / ${frequencyCap.session}</span></div>
        </div>
      </div>
      
      <div style="margin-bottom: 12px;">
        <div style="color: #ffaa00; font-weight: bold; margin-bottom: 5px;">⏱️ Next Notification</div>
        <div style="padding-left: 10px;">
          ${nextNotificationIn > 0 
            ? `In <span style="color: #00ff00; font-weight: bold;">${nextNotificationIn}s</span>` 
            : `<span style="color: #aaffaa;">Ready to show</span>`
          }
        </div>
      </div>
      
      <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #00ff00; opacity: 0.5; font-size: 10px;">
        Mode: ${mode || 'unknown'} | ${config.auto_repeat ? 'Auto-repeat ON' : 'Single pass'}
      </div>
    `;
  }
  
  async function init() {
    // Debug mode: Reset frequency limits on page load when ?notiproof_debug=1 is present
    if (debugMode) {
      try {
        localStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(PAGE_KEY);
        console.log('[NotiProof DEBUG] ✅ Cleared all frequency limits');
      } catch (e) {
        console.error('[NotiProof DEBUG] ❌ Failed to clear frequency limits:', e);
      }
      
      // Create debug panel
      const debugContent = createDebugPanel();
      
      // Update debug panel every second
      updateDebugPanel(debugContent);
      setInterval(() => {
        updateDebugPanel(debugContent);
      }, 1000);
      
      log('Debug panel initialized');
    }
    
    log('Initializing NotiProof widget with config:', config);
    await autoVerifyWebsite();
    await fetchEvents();
    trackSession();
    
    if (eventQueue.length === 0) {
      log('No events to display');
    }
    
    startDisplayLoop();
    
    // Initialize native integrations if in site mode
    let nativeCampaignsData = null;
    if (mode === 'site' && siteToken) {
      try {
        const response = await fetch(`${API_BASE}/site/${siteToken}`);
        if (response.ok) {
          nativeCampaignsData = await response.json();
          
          // Initialize form capture from native_integrations (integration_connectors)
          if (nativeCampaignsData.native_integrations && nativeCampaignsData.native_integrations.length > 0) {
            log('[Native] Found', nativeCampaignsData.native_integrations.length, 'form capture integrations');
            for (const integration of nativeCampaignsData.native_integrations) {
              if (integration.config) {
                initInstantCapture(
                  integration.id,
                  nativeCampaignsData.website_id,
                  integration.config
                );
              }
            }
          }
          
          // Also initialize legacy campaigns if present
          if (nativeCampaignsData.campaigns) {
            await initNativeCampaigns(nativeCampaignsData.campaigns, nativeCampaignsData.website_id);
          }
        }
      } catch (err) {
        log('Failed to initialize native campaigns:', err);
      }
    }
    
    // Visitors Pulse now flows through the unified queue via initActiveVisitors()
    // which is called when processing campaigns with live_visitors data source
    // No independent loop needed - all notifications respect the queue system
    
    // Branding footer is now added after first notification displays (see showNotification function)
    
    // Refresh events every minute
    setInterval(fetchEvents, 60000);
    // Update session every 30 seconds
    setInterval(trackSession, 30000);
    
    log('NotiProof widget initialized successfully');
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
