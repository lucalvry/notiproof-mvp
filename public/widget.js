(function() {
  'use strict';
  
  const WIDGET_VERSION = 3; // Current widget version - FORCE CACHE BUST
  const API_BASE = 'https://ewymvxhpkswhsirdrjub.supabase.co/functions/v1/widget-api';
  const SUPABASE_URL = 'https://ewymvxhpkswhsirdrjub.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV3eW12eGhwa3N3aHNpcmRyanViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5OTY0NDksImV4cCI6MjA3MDU3MjQ0OX0.ToRbUm37-ZnYkmmCfLW7am38rUGgFAppNxcZ2tar9mc';
  const DEBUG = window.location.hostname === 'localhost' || window.location.hostname.includes('127.0.0.1');
  const debugMode = false; // Set to true to enable debug logs
  
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
    const debugMode = script.getAttribute('data-debug-mode') === 'true';
    if (DEBUG || debugMode) {
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
        log('Auto-verifying website with token', siteToken);
        const response = await fetch(`${API_BASE}/verify?token=${siteToken}`);
        if (response.ok) {
          log('Website auto-verified successfully');
          return true;
        }
      } catch (err) {
        log('Auto-verification failed', err);
      }
    }
    return false;
  }
  
  let eventQueue = [];
  let displayedCount = 0;
  let sessionCount = 0;
  let isPaused = false;
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
        maxWidth: '350px',
        zIndex: '999999'
      };
    }
    
    // Position mappings
    const positions = {
      'bottom-left': { bottom: '20px', left: '20px', maxWidth: '350px' },
      'bottom-right': { bottom: '20px', right: '20px', maxWidth: '350px' },
      'bottom-center': { bottom: '20px', left: '50%', transform: 'translateX(-50%)', maxWidth: '350px' },
      'top-left': { top: '20px', left: '20px', maxWidth: '350px' },
      'top-right': { top: '20px', right: '20px', maxWidth: '350px' },
      'top-center': { top: '20px', left: '50%', transform: 'translateX(-50%)', maxWidth: '350px' }
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
  
  
  function showNotification(event) {
    // CRITICAL STEP 4: Log event received by showNotification
    if (debugMode) {
      console.log('[Widget] STEP 4 - showNotification called with event:', {
        event_id: event.id,
        event_type: event.event_type,
        is_announcement: event.event_type === 'announcement',
        has_event_data: !!event.event_data,
        event_data_type: typeof event.event_data,
        event_data_is_string: typeof event.event_data === 'string',
        event_data_keys: event.event_data && typeof event.event_data === 'object' ? Object.keys(event.event_data) : 'N/A',
        raw_event_data: event.event_data
      });
    }
    
    // FIX: Ensure event_data is parsed if it's a string (double-encoded JSON)
    if (event.event_data && typeof event.event_data === 'string') {
      try {
        event.event_data = JSON.parse(event.event_data);
        if (debugMode) console.log('[Widget] ✅ Parsed event_data from string to object');
      } catch (e) {
        console.error('[Widget] ❌ Failed to parse event_data:', e);
      }
    }
    
    // DEBUG: Log full event structure for announcements
    if (event.event_type === 'announcement') {
      console.group('🎯 ANNOUNCEMENT DEBUG');
      if (debugMode) {
        console.log('event.event_type:', event.event_type);
        console.log('event.event_data type:', typeof event.event_data);
        console.log('event.event_data value:', event.event_data);
        if (event.event_data && typeof event.event_data === 'object') {
          console.log('  ✅ event.event_data.title:', event.event_data.title);
          console.log('  ✅ event.event_data.message:', event.event_data.message);
          console.log('  ✅ event.event_data.icon:', event.event_data.icon);
          console.log('  ✅ event.event_data.emoji:', event.event_data.emoji);
          console.log('  ✅ event.event_data.image_type:', event.event_data.image_type);
          console.log('  ✅ event.event_data.cta_text:', event.event_data.cta_text);
          console.log('  ✅ event.event_data.cta_url:', event.event_data.cta_url);
        }
      }
      console.groupEnd();
    }
    
    if (isPaused) {
      log('Notifications paused');
      return;
    }
    
    if (!checkFrequencyLimits()) {
      log('Frequency limits reached');
      return;
    }
    
    // Apply URL targeting rules
    if (!shouldShowOnCurrentUrl()) {
      log('Event filtered by URL rules');
      return;
    }
    
    // Apply geo-targeting rules
    if (!shouldShowForCountry()) {
      log('Event filtered by geo-targeting rules');
      return;
    }
    
    const container = document.getElementById('notiproof-container') || createNotificationElement();
    const isMobile = window.innerWidth <= 768;
    const notification = document.createElement('div');
    
    // Apply configured styles
    notification.style.cssText = `
      background: ${config.backgroundColor};
      color: ${config.textColor};
      border-radius: ${config.borderRadius}px;
      box-shadow: ${getShadowStyle(config.shadow)};
      padding: ${isMobile ? '12px' : '16px'};
      margin-bottom: 10px;
      max-width: ${isMobile ? '100%' : '350px'};
      cursor: ${config.makeClickable && (config.showCTA || event.event_data?.url) ? 'pointer' : 'default'};
      transition: ${getAnimationStyles(config.animation)};
      opacity: 0;
      transform: ${config.animation === 'slide' ? 'translateY(20px)' : 'scale(0.95)'};
      font-size: ${isMobile ? Math.max(12, config.fontSize - 2) : config.fontSize}px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      position: relative;
    `;
    
    const time = new Date(event.created_at);
    const timeAgo = getTimeAgo(time);
    
    // Build notification content
    let contentHTML = '<div style="display: flex; align-items: start; gap: 12px;">';
    
    // Close button (top right)
    contentHTML += `
      <div style="position: absolute; top: 8px; right: 8px; cursor: pointer; opacity: 0.5; hover: opacity: 1; transition: opacity 0.2s;" data-close>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M1 1L13 13M1 13L13 1" stroke="${config.textColor}" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </div>
    `;
    
    // ANNOUNCEMENT-SPECIFIC IMAGE HANDLING
    if (event.event_type === 'announcement') {
      if (debugMode) {
        console.log('🖼️ [Widget] Announcement image data:', {
          image_type: event.event_data?.image_type,
          emoji: event.event_data?.emoji,
          icon: event.event_data?.icon,
          image_url: event.event_data?.image_url,
          full_event_data: event.event_data
        });
      }

      const imageType = event.event_data?.image_type;
      
      if (imageType === 'emoji' && event.event_data.emoji) {
        if (debugMode) console.log('🖼️ [Widget] Rendering emoji:', event.event_data.emoji);
        contentHTML += `<div style="
          width: 48px; height: 48px; border-radius: 8px;
          background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
          display: flex; align-items: center; justify-content: center;
          font-size: 28px; flex-shrink: 0;
        ">${event.event_data.emoji}</div>`;
      } else if (imageType === 'icon' && event.event_data.icon) {
        if (debugMode) console.log('🖼️ [Widget] Rendering icon:', event.event_data.icon);
        contentHTML += `<div style="
          width: 48px; height: 48px; border-radius: 8px;
          background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
          display: flex; align-items: center; justify-content: center;
          font-size: 28px; flex-shrink: 0;
        ">${event.event_data.icon}</div>`;
      } else if (imageType === 'url' && event.event_data.image_url && isValidUrl(event.event_data.image_url)) {
        if (debugMode) console.log('🖼️ [Widget] Rendering image URL:', event.event_data.image_url);
        contentHTML += `<img src="${escapeHtml(event.event_data.image_url)}" 
          style="width: 48px; height: 48px; border-radius: 8px; object-fit: cover; flex-shrink: 0;"
          alt="Announcement" onerror="this.style.display='none'" />`;
      } else {
        // Fallback logic: try icon, then emoji, then default
        if (debugMode) {
          console.log('🖼️ [Widget] Using fallback image (imageType:', imageType, ')');
          if (event.event_data?.icon) {
            console.log('🖼️ [Widget] Fallback to icon:', event.event_data.icon);
          }
        }
        if (event.event_data?.icon) {
          contentHTML += `<div style="
            width: 48px; height: 48px; border-radius: 8px;
            background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
            display: flex; align-items: center; justify-content: center;
            font-size: 28px; flex-shrink: 0;
          ">${event.event_data.icon}</div>`;
        } else if (event.event_data?.emoji) {
          if (debugMode) console.log('🖼️ [Widget] Fallback to emoji:', event.event_data.emoji);
          contentHTML += `<div style="
            width: 48px; height: 48px; border-radius: 8px;
            background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
            display: flex; align-items: center; justify-content: center;
            font-size: 28px; flex-shrink: 0;
          ">${event.event_data.emoji}</div>`;
        } else {
          if (debugMode) console.log('🖼️ [Widget] Using default 📢 emoji');
          contentHTML += `<div style="width: 48px; height: 48px; border-radius: 8px;
            background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
            display: flex; align-items: center; justify-content: center;
            font-size: 28px; flex-shrink: 0;">📢</div>`;
        }
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
    
    // Content
    contentHTML += '<div style="flex: 1; min-width: 0;">';
    
    // JSON parsing already done at function start (line 505)
    // This duplicate parsing has been moved up
    if (false && event.event_data && typeof event.event_data === 'string') {
      try {
        event.event_data = JSON.parse(event.event_data);
        if (debugMode) console.log('[Widget] Parsed event_data from string to object');
      } catch (e) {
        console.error('[Widget] Failed to parse event_data:', e);
      }
    }
    
    // DIAGNOSTIC: Check announcement rendering condition
    if (debugMode) {
      console.log('[Widget] Event rendering check:', {
        event_id: event.id,
        event_type: event.event_type,
        event_type_is_announcement: event.event_type === 'announcement',
        has_event_data: !!event.event_data,
      event_data_type: typeof event.event_data,
      has_title: !!event.event_data?.title,
      title_value: event.event_data?.title,
      condition_passes: event.event_type === 'announcement' && event.event_data?.title,
      full_event_data: event.event_data
      });
    }
    
    // CRITICAL DIAGNOSTIC: Log BEFORE condition check to see why it might fail
    if (debugMode) {
      console.log('[Widget] CRITICAL STEP 1 - About to check announcement condition:', {
        event_type: event.event_type,
        is_announcement: event.event_type === 'announcement',
        has_event_data: !!event.event_data,
        has_title: !!event.event_data?.title,
        title_value: event.event_data?.title,
        title_type: typeof event.event_data?.title,
        title_trimmed: event.event_data?.title?.trim(),
        condition_will_pass: (event.event_type === 'announcement' && !!event.event_data?.title?.trim())
      });
    }
    
    // ANNOUNCEMENT-SPECIFIC MESSAGE RENDERING: Separate title and message with different font weights
    if (event.event_type === 'announcement' && event.event_data?.title?.trim()) {
      // STEP 4 FIX: Add comprehensive logging for announcement data
      if (debugMode) {
        console.log('[Widget] STEP 4 - Announcement rendering data:', {
          has_title: !!event.event_data.title,
          title_value: event.event_data.title,
          title_length: event.event_data.title?.length || 0,
          has_message: !!event.event_data.message,
          message_value: event.event_data.message,
          message_length: event.event_data.message?.length || 0,
          full_event_data: event.event_data
        });
      }
      
      // Render announcement header (bold)
      contentHTML += `<div style="font-weight: 600; margin-bottom: 4px; line-height: 1.4;">
        ${escapeHtml(event.event_data.title)}
      </div>`;
      
      // STEP 4 FIX: Enhanced message rendering with defensive checks
      // Check for message as non-empty string
      const hasMessage = event.event_data.message && 
                        typeof event.event_data.message === 'string' && 
                        event.event_data.message.trim().length > 0;
      
      if (hasMessage) {
        if (debugMode) console.log('[Widget] STEP 4 - Rendering announcement message:', event.event_data.message);
        contentHTML += `<div style="font-weight: 400; margin-bottom: 4px; line-height: 1.4; opacity: 0.9;">
          ${escapeHtml(event.event_data.message)}
        </div>`;
      } else {
        console.warn('[Widget] STEP 4 - Announcement message missing or empty:', {
          message_exists: !!event.event_data.message,
          message_type: typeof event.event_data.message,
          message_value: event.event_data.message
        });
      }
    } else {
      // Regular event - existing logic with product linkification
      const linkedMessage = linkifyMessage(event.message_template || 'New activity', event.event_data);
      contentHTML += `<div style="font-weight: 600; margin-bottom: 4px; line-height: 1.4;">
        ${linkedMessage}
      </div>`;
    }
    
    // Metadata (time + location) - Skip for announcements with CTA
    const skipMetadata = event.event_type === 'announcement' && event.event_data?.cta_text && event.event_data?.cta_url;
    if (!skipMetadata && (config.showTimestamp || (config.showLocation && event.user_location))) {
      contentHTML += '<div style="font-size: 12px; opacity: 0.7; display: flex; align-items: center; gap: 6px;">';
      if (config.showTimestamp) {
        contentHTML += `<span>${timeAgo}</span>`;
      }
      if (config.showLocation && event.user_location) {
        contentHTML += `<span>•</span><span>${event.user_location}</span>`;
      }
      contentHTML += '</div>';
    }
    
    // CTA Button - check both config.showCTA AND announcement-specific CTA
    // STEP 3 FIX: Add defensive checks and logging for announcement CTA
    if (event.event_type === 'announcement') {
      if (debugMode) {
        console.log('[Widget] Announcement event_data:', event.event_data);
        console.log('[Widget] CTA check - cta_text:', event.event_data?.cta_text, 'cta_url:', event.event_data?.cta_url);
      }
    }
    
    // STEP 3 FIX: Ensure CTA values are non-empty strings
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
    
    const announcementCTA = hasAnnouncementCTA;
    const showButton = hasConfigCTA || announcementCTA;
    
    if (event.event_type === 'announcement' && !hasAnnouncementCTA) {
      console.warn('[Widget] Announcement missing valid CTA data:', {
        has_cta_text: !!event.event_data?.cta_text,
        cta_text_value: event.event_data?.cta_text,
        has_cta_url: !!event.event_data?.cta_url,
        cta_url_value: event.event_data?.cta_url
      });
    }
    
    if (debugMode) console.log('[Widget] CTA Button Check - announcementCTA:', announcementCTA, 'showButton:', showButton);
    
    if (showButton) {
      const ctaText = announcementCTA ? event.event_data.cta_text : config.ctaText;
      const ctaUrl = announcementCTA ? event.event_data.cta_url : config.ctaUrl;
      
      if (debugMode) console.log('[Widget] Rendering CTA button - Text:', ctaText, 'URL:', ctaUrl);
      
      contentHTML += `
        <button style="
          margin-top: 8px;
          padding: 6px 12px;
          background: ${config.primaryColor};
          color: white;
          border: none;
          border-radius: 4px;
          font-size: ${Math.max(12, config.fontSize - 2)}px;
          font-weight: 500;
          cursor: pointer;
          transition: opacity 0.2s;
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
    
    log('Displaying notification', { eventId: event.id, message: event.message_template });
    
    trackView(event.id);
    incrementPageImpressions();
    incrementSessionImpressions();
    
    // Click handling
    notification.addEventListener('click', (e) => {
      if (e.target.closest('[data-close]')) return;
      if (!config.makeClickable) return;
      
      log('Notification clicked', { eventId: event.id });
      trackClick(event.id);
      
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
      
      notification.style.opacity = '0';
      notification.style.transform = config.animation === 'slide' ? 'translateY(20px)' : 'scale(0.95)';
      setTimeout(() => notification.remove(), 300);
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
        notification.style.opacity = '0';
        notification.style.transform = config.animation === 'slide' ? 'translateY(20px)' : 'scale(0.95)';
        setTimeout(() => notification.remove(), 300);
      });
    }
    
    // Auto-hide
    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transform = config.animation === 'slide' ? 'translateY(20px)' : 'scale(0.95)';
      setTimeout(() => notification.remove(), 300);
    }, config.displayDuration);
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
        log('Fetching all widgets and events for site', siteToken);
        const response = await fetch(`${API_BASE}/site/${siteToken}`);
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to fetch site data: ${response.status} - ${errorText}`);
        }
        const data = await response.json();
        eventQueue = data.events || [];
        
        // CRITICAL STEP 3: Log eventQueue population
        const announcementCount = eventQueue.filter(e => e.event_type === 'announcement').length;
        if (debugMode) console.log('[Widget] STEP 3 - Event queue loaded:', {
          total_events: eventQueue.length,
          announcement_events: announcementCount,
          announcement_details: eventQueue
            .filter(e => e.event_type === 'announcement')
            .map(e => ({
              id: e.id,
              has_title: !!e.event_data?.title,
              title: e.event_data?.title,
              has_message: !!e.event_data?.message,
              message: e.event_data?.message
            }))
        });
        
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
  
  // PHASE 7: Fix 401 error - Only fetch for live_visitors campaigns via widget-api
  async function fetchActiveVisitorCount() {
    try {
      // Don't fetch active count for non-live-visitor campaigns
      if (!config.showActiveVisitors) {
        log('Active visitor tracking disabled for this campaign type');
        return;
      }

      // Use widget-api endpoint which handles GA4 auth server-side
      const endpoint = `${API_BASE}/widget-api/active-visitors?site_token=${siteToken}`;
      
      log('Fetching active visitor count via widget-api');
      const response = await fetch(endpoint);
      
      if (!response.ok) {
        // Gracefully fallback on error (don't show active count)
        log('Active visitor fetch failed (status ' + response.status + '), skipping');
        return;
      }
      
      const data = await response.json();
      currentActiveCount = data.count || 0;
      log('Active visitor count updated:', currentActiveCount, data.cached ? '(cached)' : '(fresh)');
      
      // Show active visitor notification if count changed and is > 1
      if (currentActiveCount > 1 && config.showActiveVisitors) {
        showActiveVisitorNotification(currentActiveCount);
      }
    } catch (err) {
      error('Failed to fetch active visitor count', err);
      // Don't break widget - just skip active visitor notifications
    }
  }
  
  function showActiveVisitorNotification(count) {
    if (displayedCount >= config.maxPerPage || sessionCount >= config.maxPerSession) {
      return;
    }
    
    const container = document.getElementById('notiproof-container') || createNotificationElement();
    
    // Remove existing active visitor notification if present
    const existing = container.querySelector('[data-type="active-visitors"]');
    if (existing) {
      existing.remove();
    }
    
    const notification = document.createElement('div');
    notification.setAttribute('data-type', 'active-visitors');
    notification.style.cssText = `
      background: linear-gradient(135deg, ${config.primaryColor} 0%, ${adjustColor(config.primaryColor, -20)} 100%);
      color: white;
      border-radius: ${config.borderRadius}px;
      padding: 12px 16px;
      margin-bottom: 10px;
      max-width: 350px;
      cursor: default;
      transition: ${getAnimationStyles(config.animation)};
      opacity: 0;
      transform: ${config.animation === 'slide' ? 'translateY(20px)' : 'scale(0.95)'};
      display: flex;
      align-items: center;
      gap: 10px;
      box-shadow: ${getShadowStyle(config.shadow)};
      font-size: ${config.fontSize}px;
    `;
    
    const peopleText = count === 2 ? '1 other person' : `${count - 1} other people`;
    
    notification.innerHTML = `
      <div style="width: 8px; height: 8px; background: #4ade80; border-radius: 50%; animation: pulse 2s infinite;"></div>
      <div style="flex: 1; font-weight: 500;">
        ${peopleText} ${count === 2 ? 'is' : 'are'} viewing this page
      </div>
    `;
    
    // Add pulse animation and product link styles
    const style = document.createElement('style');
    style.textContent = `
      @keyframes pulse {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.5; transform: scale(1.2); }
      }
      
      .notiproof-product-link {
        color: ${config.primaryColor};
        text-decoration: underline;
        font-weight: 500;
        cursor: pointer;
        transition: opacity 0.2s ease;
      }
      
      .notiproof-product-link:hover {
        opacity: 0.8;
      }
    `;
    if (!document.head.querySelector('[data-notiproof-styles]')) {
      style.setAttribute('data-notiproof-styles', 'true');
      document.head.appendChild(style);
    }
    
    container.appendChild(notification);
    
    setTimeout(() => {
      notification.style.opacity = '1';
      notification.style.transform = 'translateY(0) scale(1)';
    }, 10);
    
    log('Active visitor notification displayed', count);
  }
  
  function startDisplayLoop() {
    log('Starting display loop', { interval: config.interval });
    
    // Initial delay before first notification
    setTimeout(() => {
      if (eventQueue.length > 0 && checkFrequencyLimits() && !isPaused) {
        const event = eventQueue.shift();
        if (debugMode) console.log('[Widget] STEP 4 - About to show notification:', {
          event_id: event.id,
          event_type: event.event_type,
          is_announcement: event.event_type === 'announcement',
          has_event_data: !!event.event_data,
          event_data_keys: event.event_data ? Object.keys(event.event_data) : []
        });
        showNotification(event);
      }
      
      // Then show notifications at intervals
      setInterval(() => {
        if (eventQueue.length > 0 && checkFrequencyLimits() && !isPaused) {
          const event = eventQueue.shift();
          if (debugMode) console.log('[Widget] STEP 4 - About to show notification (interval):', {
            event_id: event.id,
            event_type: event.event_type,
            is_announcement: event.event_type === 'announcement',
            has_event_data: !!event.event_data,
            event_data_keys: event.event_data ? Object.keys(event.event_data) : []
          });
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
  function initInstantCapture(campaignId, websiteId, config) {
    const targetUrl = config.target_url || window.location.pathname;
    
    // Only listen on target page
    if (!window.location.pathname.includes(targetUrl)) {
      log('[Instant Capture] Not on target URL:', targetUrl);
      return;
    }
    
    log('[Instant Capture] Listening for form submissions on', targetUrl);
    
    document.addEventListener('submit', async (e) => {
      if (e.target.tagName !== 'FORM') return;
      
      // Extract form data
      const formData = new FormData(e.target);
      const data = Object.fromEntries(formData.entries());
      
      log('[Instant Capture] Form submitted, capturing...', data);
      
      try {
        await fetch(`${SUPABASE_URL}/functions/v1/track-form`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY
          },
          body: JSON.stringify({
            campaign_id: campaignId,
            website_id: websiteId,
            form_data: data,
            page_url: window.location.href
          })
        });
        
        log('[Instant Capture] Form data captured successfully');
      } catch (error) {
        error('[Instant Capture] Form capture failed:', error);
      }
    }, true); // Use capture phase
  }
  
  // NATIVE INTEGRATIONS - Active Visitors (Simulated Visitor Count)
  function initActiveVisitors(campaignId, config) {
    const { 
      mode = 'simulated',
      min_count = 5, 
      max_count = 50,
      update_interval_seconds = 10,
      scope = 'site'
    } = config;
    
    let currentCount = getRandomCount(min_count, max_count);
    
    // Create visitor count notification
    function createVisitorNotification() {
      return {
        id: `visitor-${Date.now()}`,
        event_type: 'active_visitors',
        message_template: `${currentCount} people are viewing ${scope === 'site' ? 'this site' : 'this page'} right now`,
        timestamp: new Date().toISOString(),
        is_simulated: true,
        event_data: { visitor_count: currentCount, mode, scope }
      };
    }
    
    // Show initial count
    const initialNotif = createVisitorNotification();
    eventQueue.push(initialNotif);
    log('[Active Visitors] Initial count:', currentCount);
    
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
          initActiveVisitors(campaign.id, nativeConfig);
          log('[Native] Active Visitors initialized for campaign', campaign.id);
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
  
  async function init() {
    log('Initializing NotiProof widget with config:', config);
    await autoVerifyWebsite();
    await fetchEvents();
    trackSession();
    
    if (eventQueue.length === 0) {
      log('No events to display');
    }
    
    startDisplayLoop();
    
    // Initialize native integrations if in site mode
    if (mode === 'site' && siteToken) {
      try {
        const response = await fetch(`${API_BASE}/site/${siteToken}`);
        if (response.ok) {
          const data = await response.json();
          if (data.campaigns) {
            await initNativeCampaigns(data.campaigns, data.website_id);
          }
        }
      } catch (err) {
        log('Failed to initialize native campaigns:', err);
      }
    }
    
    // Start active visitor tracking (legacy GA4) - Only if explicitly enabled AND live_visitors campaign exists
    if (config.showActiveVisitors && data.campaigns?.some(c => c.data_source === 'live_visitors')) {
      fetchActiveVisitorCount(); // Initial fetch
      activeVisitorInterval = setInterval(fetchActiveVisitorCount, 15000); // Update every 15 seconds
    }
    
    // Add branding footer after first notification
    setTimeout(createBrandingFooter, config.initialDelay + 1000);
    
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
