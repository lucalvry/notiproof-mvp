(function() {
  'use strict';
  
  const API_BASE = 'https://ewymvxhpkswhsirdrjub.supabase.co/functions/v1/widget-api';
  const DEBUG = window.location.hostname === 'localhost' || window.location.hostname.includes('127.0.0.1');
  
  const script = document.currentScript;
  const widgetId = script.getAttribute('data-widget-id');
  
  function log(...args) {
    if (DEBUG) {
      console.log('[NotiProof]', ...args);
    }
  }
  
  function error(...args) {
    console.error('[NotiProof]', ...args);
  }
  
  if (!widgetId) {
    error('data-widget-id attribute is required');
    return;
  }
  
  log('Initializing widget', widgetId);
  
  let eventQueue = [];
  let displayedCount = 0;
  let sessionCount = 0;
  const sessionId = generateSessionId();
  const maxPerPage = 5;
  const maxPerSession = 20;
  const showDuration = 5000;
  const interval = 8000;
  
  function generateSessionId() {
    return 'np_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
  }
  
  function createNotificationElement() {
    const container = document.createElement('div');
    container.id = 'notiproof-container';
    container.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 20px;
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    `;
    document.body.appendChild(container);
    log('Notification container created');
    return container;
  }
  
  function showNotification(event) {
    if (displayedCount >= maxPerPage || sessionCount >= maxPerSession) {
      log('Display limit reached', { displayedCount, sessionCount, maxPerPage, maxPerSession });
      return;
    }
    
    const container = document.getElementById('notiproof-container') || createNotificationElement();
    
    const notification = document.createElement('div');
    notification.style.cssText = `
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      padding: 16px;
      margin-bottom: 10px;
      max-width: 350px;
      cursor: pointer;
      transition: transform 0.2s, opacity 0.3s;
      opacity: 0;
      transform: translateX(-20px);
    `;
    
    const time = new Date(event.created_at);
    const timeAgo = getTimeAgo(time);
    
    notification.innerHTML = `
      <div style="display: flex; align-items: start; gap: 12px;">
        <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; flex-shrink: 0;">
          ${event.user_name ? event.user_name[0].toUpperCase() : '👤'}
        </div>
        <div style="flex: 1; min-width: 0;">
          <div style="font-weight: 600; color: #1a1a1a; margin-bottom: 4px;">
            ${event.message_template || 'New activity'}
          </div>
          <div style="font-size: 12px; color: #666;">
            ${timeAgo}${event.user_location ? ' • ' + event.user_location : ''}
          </div>
        </div>
      </div>
    `;
    
    container.appendChild(notification);
    
    setTimeout(() => {
      notification.style.opacity = '1';
      notification.style.transform = 'translateX(0)';
    }, 10);
    
    log('Displaying notification', { eventId: event.id, message: event.message_template });
    
    trackView(event.id);
    displayedCount++;
    sessionCount++;
    
    notification.addEventListener('click', () => {
      log('Notification clicked', { eventId: event.id });
      trackClick(event.id);
      notification.style.opacity = '0';
      setTimeout(() => notification.remove(), 300);
    });
    
    setTimeout(() => {
      notification.style.opacity = '0';
      setTimeout(() => notification.remove(), 300);
    }, showDuration);
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
      log('Fetching events for widget', widgetId);
      const response = await fetch(`${API_BASE}/events/${widgetId}`);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch events: ${response.status} - ${errorText}`);
      }
      const data = await response.json();
      eventQueue = data.events || [];
      log('Events fetched', { count: eventQueue.length, events: eventQueue });
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
      log('Tracking session', { sessionId, widgetId });
      const response = await fetch(`${API_BASE}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          widget_id: widgetId,
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
  
  function startDisplayLoop() {
    log('Starting display loop', { interval });
    setInterval(() => {
      if (eventQueue.length > 0 && displayedCount < maxPerPage && sessionCount < maxPerSession) {
        const event = eventQueue.shift();
        showNotification(event);
      }
    }, interval);
  }
  
  async function init() {
    log('Initializing NotiProof widget');
    await fetchEvents();
    trackSession();
    
    if (eventQueue.length > 0) {
      log('Showing first notification immediately');
      showNotification(eventQueue.shift());
    } else {
      log('No events to display');
    }
    
    startDisplayLoop();
    
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
