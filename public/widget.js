(function() {
  'use strict';
  
  const API_BASE = 'https://ewymvxhpkswhsirdrjub.supabase.co/functions/v1/widget-api';
  const DEBUG = window.location.hostname === 'localhost' || window.location.hostname.includes('127.0.0.1');
  
  const script = document.currentScript;
  const widgetId = script.getAttribute('data-widget-id');
  const siteToken = script.getAttribute('data-site-token');
  
  let hideBranding = script.getAttribute('data-hide-branding') === 'true';
  let customBrandName = script.getAttribute('data-brand-name') || 'NotiProof';
  let customLogoUrl = script.getAttribute('data-logo-url') || '';
  
  function log(...args) {
    if (DEBUG) {
      console.log('[NotiProof]', ...args);
    }
  }
  
  function error(...args) {
    console.error('[NotiProof]', ...args);
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
  const sessionId = generateSessionId();
  const maxPerPage = 5;
  const maxPerSession = 20;
  // Widget Configuration from data attributes
  const config = {
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
    showActiveVisitors: script.getAttribute('data-show-active-visitors') !== 'false'
  };
  
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
  
  function showNotification(event) {
    if (displayedCount >= config.maxPerPage || sessionCount >= config.maxPerSession) {
      log('Display limit reached', { displayedCount, sessionCount, maxPerPage: config.maxPerPage, maxPerSession: config.maxPerSession });
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
      cursor: ${config.showCTA || event.event_data?.url ? 'pointer' : 'default'};
      transition: ${getAnimationStyles(config.animation)};
      opacity: 0;
      transform: ${config.animation === 'slide' ? 'translateY(20px)' : 'scale(0.95)'};
      font-size: ${isMobile ? Math.max(12, config.fontSize - 2) : config.fontSize}px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    `;
    
    const time = new Date(event.created_at);
    const timeAgo = getTimeAgo(time);
    
    // Build notification content
    let contentHTML = '<div style="display: flex; align-items: start; gap: 12px;">';
    
    // Avatar
    if (config.showAvatar && event.user_name) {
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
    
    // Message
    contentHTML += `<div style="font-weight: 600; margin-bottom: 4px; line-height: 1.4;">
      ${event.message_template || 'New activity'}
    </div>`;
    
    // Metadata (time + location)
    if (config.showTimestamp || (config.showLocation && event.user_location)) {
      contentHTML += '<div style="font-size: 12px; opacity: 0.7; display: flex; align-items: center; gap: 6px;">';
      if (config.showTimestamp) {
        contentHTML += `<span>${timeAgo}</span>`;
      }
      if (config.showLocation && event.user_location) {
        contentHTML += `<span>•</span><span>${event.user_location}</span>`;
      }
      contentHTML += '</div>';
    }
    
    // CTA Button
    if (config.showCTA && config.ctaText && config.ctaUrl) {
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
        " onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'">
          ${config.ctaText}
        </button>
      `;
    }
    
    contentHTML += '</div></div>';
    notification.innerHTML = contentHTML;
    
    container.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
      notification.style.opacity = '1';
      notification.style.transform = 'translateY(0) scale(1)';
    }, 10);
    
    log('Displaying notification', { eventId: event.id, message: event.message_template });
    
    trackView(event.id);
    displayedCount++;
    sessionCount++;
    
    // Click handling
    notification.addEventListener('click', (e) => {
      log('Notification clicked', { eventId: event.id });
      trackClick(event.id);
      
      // Handle CTA click
      if (config.showCTA && config.ctaUrl && e.target.tagName === 'BUTTON') {
        window.open(config.ctaUrl, '_blank');
      } else if (event.event_data?.url) {
        window.open(event.event_data.url, '_blank');
      }
      
      notification.style.opacity = '0';
      notification.style.transform = config.animation === 'slide' ? 'translateY(20px)' : 'scale(0.95)';
      setTimeout(() => notification.remove(), 300);
    });
    
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
        
        // Apply white-label settings from API response
        if (data.white_label) {
          const wl = data.white_label;
          if (wl.enabled) {
            hideBranding = wl.hide_branding;
            customBrandName = wl.custom_brand_name || 'NotiProof';
            customLogoUrl = wl.custom_logo_url || '';
            
            // Update config colors if custom colors are set
            if (wl.custom_colors) {
              config.primaryColor = wl.custom_colors.primary || config.primaryColor;
            }
            
            log('White-label settings applied', { hideBranding, customBrandName });
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
  
  async function fetchActiveVisitorCount() {
    try {
      // Use GA4 realtime endpoint instead of legacy Supabase polling
      const GA4_BASE = 'https://ewymvxhpkswhsirdrjub.supabase.co/functions/v1/ga4-realtime';
      const endpoint = mode === 'site' 
        ? `${GA4_BASE}?site_token=${siteToken}`
        : `${API_BASE}/active-count?widget_id=${widgetId}`;
      
      log('Fetching active visitor count from GA4');
      const response = await fetch(endpoint);
      
      if (!response.ok) {
        // Gracefully fallback on error
        log('GA4 fetch failed, skipping active count display');
        return;
      }
      
      const data = await response.json();
      currentActiveCount = data.count || 0;
      log('Active visitor count updated (GA4)', currentActiveCount, 'cached:', data.cached);
      
      // Show active visitor notification if count changed and is > 1
      if (currentActiveCount > 1 && showActiveVisitors) {
        showActiveVisitorNotification(currentActiveCount);
      }
    } catch (err) {
      error('Failed to fetch active visitor count', err);
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
    
    // Add pulse animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes pulse {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.5; transform: scale(1.2); }
      }
    `;
    if (!document.head.querySelector('[data-notiproof-pulse]')) {
      style.setAttribute('data-notiproof-pulse', 'true');
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
      if (eventQueue.length > 0) {
        showNotification(eventQueue.shift());
      }
      
      // Then show notifications at intervals
      setInterval(() => {
        if (eventQueue.length > 0 && displayedCount < config.maxPerPage && sessionCount < config.maxPerSession) {
          const event = eventQueue.shift();
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
  
  async function init() {
    log('Initializing NotiProof widget with config:', config);
    await autoVerifyWebsite();
    await fetchEvents();
    trackSession();
    
    if (eventQueue.length === 0) {
      log('No events to display');
    }
    
    startDisplayLoop();
    
    // Start active visitor tracking
    if (config.showActiveVisitors) {
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
