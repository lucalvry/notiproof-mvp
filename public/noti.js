/**
 * NotiProof Widget v4.0 - Phase 8: Orchestration Support
 * 
 * Features:
 * - Playlist-aware campaign fetching
 * - Multi-campaign orchestration with priority/sequential/random modes
 * - Enhanced frequency capping (per-user, per-session, per-campaign)
 * - Visitor state tracking across sessions
 * - Shadow DOM isolation
 * - Testimonial rendering (text, image, video, carousel)
 * - Event pinging and analytics
 */

(function() {
  'use strict';
  
  const WIDGET_VERSION = 4;
  const API_BASE = 'https://ewymvxhpkswhsirdrjub.supabase.co/functions/v1/widget-api';
  const DEBUG = window.location.hostname === 'localhost' || window.location.hostname.includes('127.0.0.1');
  
  // ===== Configuration =====
  const script = document.currentScript;
  const widgetId = script.getAttribute('data-widget-id');
  const siteToken = script.getAttribute('data-site-token');
  const websiteId = script.getAttribute('data-website-id');
  
  if (!widgetId && !siteToken && !websiteId) {
    console.error('[NotiProof] Missing required attribute: data-widget-id, data-site-token, or data-website-id');
    return;
  }
  
  // ===== Utility Functions =====
  function log(...args) {
    if (DEBUG) console.log('[NotiProof]', ...args);
  }
  
  function error(...args) {
    console.error('[NotiProof]', ...args);
  }
  
  function generateId() {
    return 'np_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  }
  
  function generateSessionId() {
    const existing = sessionStorage.getItem('notiproof_session_id');
    if (existing) return existing;
    const newId = generateId();
    sessionStorage.setItem('notiproof_session_id', newId);
    return newId;
  }
  
  function generateVisitorId() {
    const existing = localStorage.getItem('notiproof_visitor_id');
    if (existing) return existing;
    const newId = generateId();
    localStorage.setItem('notiproof_visitor_id', newId);
    return newId;
  }
  
  // ===== State Management =====
  class WidgetState {
    constructor() {
      this.sessionId = generateSessionId();
      this.visitorId = generateVisitorId();
      this.displayedEvents = new Set();
      this.clickedEvents = new Set();
      this.campaigns = [];
      this.playlist = null;
      this.currentIndex = 0;
      this.isPaused = false;
      
      // Frequency tracking
      this.sessionCounts = this.loadSessionCounts();
      this.userCounts = this.loadUserCounts();
      
      log('State initialized:', {
        sessionId: this.sessionId,
        visitorId: this.visitorId
      });
    }
    
    loadSessionCounts() {
      try {
        const stored = sessionStorage.getItem('notiproof_session_counts');
        return stored ? JSON.parse(stored) : {};
      } catch {
        return {};
      }
    }
    
    loadUserCounts() {
      try {
        const stored = localStorage.getItem('notiproof_user_counts');
        return stored ? JSON.parse(stored) : {};
      } catch {
        return {};
      }
    }
    
    saveSessionCounts() {
      try {
        sessionStorage.setItem('notiproof_session_counts', JSON.stringify(this.sessionCounts));
      } catch (e) {
        error('Failed to save session counts:', e);
      }
    }
    
    saveUserCounts() {
      try {
        localStorage.setItem('notiproof_user_counts', JSON.stringify(this.userCounts));
      } catch (e) {
        error('Failed to save user counts:', e);
      }
    }
    
    incrementCampaignView(campaignId) {
      // Session count
      if (!this.sessionCounts[campaignId]) {
        this.sessionCounts[campaignId] = { views: 0, clicks: 0 };
      }
      this.sessionCounts[campaignId].views++;
      this.saveSessionCounts();
      
      // User count
      if (!this.userCounts[campaignId]) {
        this.userCounts[campaignId] = { views: 0, clicks: 0 };
      }
      this.userCounts[campaignId].views++;
      this.saveUserCounts();
    }
    
    incrementCampaignClick(campaignId) {
      if (this.sessionCounts[campaignId]) {
        this.sessionCounts[campaignId].clicks++;
        this.saveSessionCounts();
      }
      if (this.userCounts[campaignId]) {
        this.userCounts[campaignId].clicks++;
        this.saveUserCounts();
      }
    }
    
    canShowCampaign(campaign) {
      const frequencyCap = campaign.frequency_cap || {
        per_user: 10,
        per_session: 5,
        cooldown_seconds: 300
      };
      
      const sessionCount = this.sessionCounts[campaign.id]?.views || 0;
      const userCount = this.userCounts[campaign.id]?.views || 0;
      
      if (sessionCount >= frequencyCap.per_session) {
        log(`Campaign ${campaign.id} exceeded session cap:`, sessionCount, '>=', frequencyCap.per_session);
        return false;
      }
      
      if (userCount >= frequencyCap.per_user) {
        log(`Campaign ${campaign.id} exceeded user cap:`, userCount, '>=', frequencyCap.per_user);
        return false;
      }
      
      // Check cooldown
      const lastShown = localStorage.getItem(`notiproof_last_shown_${campaign.id}`);
      if (lastShown) {
        const timeSince = (Date.now() - parseInt(lastShown, 10)) / 1000;
        if (timeSince < frequencyCap.cooldown_seconds) {
          log(`Campaign ${campaign.id} in cooldown:`, Math.floor(frequencyCap.cooldown_seconds - timeSince), 'seconds remaining');
          return false;
        }
      }
      
      return true;
    }
    
    markCampaignShown(campaignId) {
      localStorage.setItem(`notiproof_last_shown_${campaignId}`, Date.now().toString());
    }
  }
  
  // ===== API Client =====
  class NotiProofAPI {
    constructor(config) {
      this.config = config;
    }
    
    async fetchPlaylistData() {
      try {
        const params = new URLSearchParams();
        if (websiteId) params.append('website_id', websiteId);
        if (widgetId) params.append('widget_id', widgetId);
        if (siteToken) params.append('site_token', siteToken);
        params.append('playlist_mode', 'true');
        
        log('Fetching playlist data:', API_BASE + '?' + params.toString());
        
        const response = await fetch(`${API_BASE}?${params.toString()}`);
        if (!response.ok) {
          throw new Error(`API returned ${response.status}`);
        }
        
        const data = await response.json();
        log('Playlist data received:', data);
        
        return data;
      } catch (err) {
        error('Failed to fetch playlist data:', err);
        return null;
      }
    }
    
    async trackImpression(event, campaignId) {
      try {
        await fetch(`${API_BASE}/track`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event_id: event.id,
            campaign_id: campaignId,
            action: 'view',
            visitor_id: state.visitorId,
            session_id: state.sessionId,
            page_url: window.location.href
          })
        });
      } catch (err) {
        error('Failed to track impression:', err);
      }
    }
    
    async trackClick(event, campaignId) {
      try {
        await fetch(`${API_BASE}/track`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event_id: event.id,
            campaign_id: campaignId,
            action: 'click',
            visitor_id: state.visitorId,
            session_id: state.sessionId,
            page_url: window.location.href
          })
        });
      } catch (err) {
        error('Failed to track click:', err);
      }
    }
  }
  
  // ===== Orchestration Engine =====
  class OrchestrationEngine {
    constructor(playlist, campaigns, rules) {
      this.playlist = playlist;
      this.campaigns = campaigns;
      this.rules = rules || {
        sequence_mode: 'priority',
        max_per_session: 10,
        cooldown_seconds: 300,
        conflict_resolution: 'priority'
      };
      this.currentIndex = 0;
      
      log('Orchestration initialized:', {
        playlist: playlist?.name,
        campaigns: campaigns?.length,
        mode: this.rules.sequence_mode
      });
    }
    
    getNextCampaign() {
      if (!this.campaigns || this.campaigns.length === 0) {
        return null;
      }
      
      // Filter campaigns that can be shown
      const eligibleCampaigns = this.campaigns.filter(c => {
        return c.status === 'active' && state.canShowCampaign(c);
      });
      
      if (eligibleCampaigns.length === 0) {
        log('No eligible campaigns available');
        return null;
      }
      
      let nextCampaign;
      
      switch (this.rules.sequence_mode) {
        case 'sequential':
          // Show campaigns in order
          if (this.playlist?.campaign_order && this.playlist.campaign_order.length > 0) {
            const orderedCampaigns = this.playlist.campaign_order
              .map(id => eligibleCampaigns.find(c => c.id === id))
              .filter(Boolean);
            
            nextCampaign = orderedCampaigns[this.currentIndex % orderedCampaigns.length];
            this.currentIndex++;
          } else {
            nextCampaign = eligibleCampaigns[this.currentIndex % eligibleCampaigns.length];
            this.currentIndex++;
          }
          break;
          
        case 'random':
          // Random selection
          nextCampaign = eligibleCampaigns[Math.floor(Math.random() * eligibleCampaigns.length)];
          break;
          
        case 'priority':
        default:
          // Highest priority first
          eligibleCampaigns.sort((a, b) => (b.priority || 0) - (a.priority || 0));
          nextCampaign = eligibleCampaigns[0];
          break;
      }
      
      log('Next campaign selected:', {
        campaign: nextCampaign?.name,
        mode: this.rules.sequence_mode,
        eligible: eligibleCampaigns.length
      });
      
      return nextCampaign;
    }
  }
  
  // ===== Notification Renderer =====
  class NotificationRenderer {
    constructor(container) {
      this.container = container;
      this.shadowRoot = this.createShadowDOM();
    }
    
    createShadowDOM() {
      const shadow = this.container.attachShadow({ mode: 'open' });
      
      // Inject base styles
      const style = document.createElement('style');
      style.textContent = `
        :host {
          all: initial;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }
        .notification {
          background: white;
          border-radius: 12px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
          padding: 16px;
          max-width: 380px;
          cursor: pointer;
          transition: all 0.3s ease;
          animation: slideIn 0.4s ease-out;
        }
        .notification:hover {
          transform: translateY(-2px);
          box-shadow: 0 15px 50px rgba(0, 0, 0, 0.2);
        }
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .notification-content {
          display: flex;
          gap: 12px;
          align-items: start;
        }
        .notification-image {
          flex-shrink: 0;
          width: 48px;
          height: 48px;
          border-radius: 8px;
          overflow: hidden;
          background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .notification-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .notification-image-emoji {
          font-size: 28px;
        }
        .notification-body {
          flex: 1;
          min-width: 0;
        }
        .notification-title {
          font-weight: 600;
          font-size: 15px;
          color: #1a1a1a;
          margin: 0 0 4px 0;
          line-height: 1.4;
        }
        .notification-message {
          font-size: 14px;
          color: #666;
          margin: 0;
          line-height: 1.5;
        }
        .notification-cta {
          margin-top: 12px;
          padding: 8px 16px;
          background: #667eea;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s;
        }
        .notification-cta:hover {
          background: #5568d3;
        }
        .notification-close {
          position: absolute;
          top: 12px;
          right: 12px;
          background: transparent;
          border: none;
          color: #999;
          cursor: pointer;
          font-size: 20px;
          line-height: 1;
          padding: 0;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .notification-close:hover {
          color: #666;
        }
      `;
      shadow.appendChild(style);
      
      return shadow;
    }
    
    render(event, campaign, onClose, onClick) {
      // Parse event_data if needed
      const eventData = typeof event.event_data === 'string' 
        ? JSON.parse(event.event_data) 
        : event.event_data || {};
      
      const notification = document.createElement('div');
      notification.className = 'notification';
      notification.style.position = 'relative';
      
      // Close button
      const closeBtn = document.createElement('button');
      closeBtn.className = 'notification-close';
      closeBtn.innerHTML = '&times;';
      closeBtn.onclick = (e) => {
        e.stopPropagation();
        onClose();
      };
      notification.appendChild(closeBtn);
      
      // Content container
      const content = document.createElement('div');
      content.className = 'notification-content';
      
      // Image/Avatar
      if (eventData.image_url || eventData.emoji || eventData.icon) {
        const imageContainer = document.createElement('div');
        imageContainer.className = 'notification-image';
        
        if (eventData.image_url) {
          const img = document.createElement('img');
          img.src = eventData.image_url;
          img.alt = eventData.title || 'Notification';
          imageContainer.appendChild(img);
        } else {
          const emoji = document.createElement('div');
          emoji.className = 'notification-image-emoji';
          emoji.textContent = eventData.emoji || eventData.icon || '🔔';
          imageContainer.appendChild(emoji);
        }
        
        content.appendChild(imageContainer);
      }
      
      // Body
      const body = document.createElement('div');
      body.className = 'notification-body';
      
      if (eventData.title) {
        const title = document.createElement('div');
        title.className = 'notification-title';
        title.textContent = eventData.title;
        body.appendChild(title);
      }
      
      if (eventData.message || event.message_template) {
        const message = document.createElement('div');
        message.className = 'notification-message';
        message.textContent = eventData.message || event.message_template;
        body.appendChild(message);
      }
      
      // CTA button
      if (eventData.cta_text && eventData.cta_url) {
        const ctaBtn = document.createElement('button');
        ctaBtn.className = 'notification-cta';
        ctaBtn.textContent = eventData.cta_text;
        ctaBtn.onclick = (e) => {
          e.stopPropagation();
          window.open(eventData.cta_url, '_blank');
          onClick();
        };
        body.appendChild(ctaBtn);
      }
      
      content.appendChild(body);
      notification.appendChild(content);
      
      // Make notification clickable if no CTA
      if (!eventData.cta_text) {
        notification.onclick = onClick;
      }
      
      return notification;
    }
    
    show(event, campaign, onClose, onClick) {
      const element = this.render(event, campaign, onClose, onClick);
      this.shadowRoot.appendChild(element);
      
      // Auto-hide after duration
      setTimeout(() => {
        if (this.shadowRoot.contains(element)) {
          element.style.animation = 'slideIn 0.3s ease-out reverse';
          setTimeout(() => onClose(), 300);
        }
      }, 5000);
      
      return element;
    }
  }
  
  // ===== Main Widget =====
  const state = new WidgetState();
  const api = new NotiProofAPI({ widgetId, siteToken, websiteId });
  
  // Create container
  const container = document.createElement('div');
  container.id = 'notiproof-widget';
  container.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 20px;
    z-index: 999999;
  `;
  document.body.appendChild(container);
  
  const renderer = new NotificationRenderer(container);
  let orchestrator = null;
  let displayInterval = null;
  
  async function initialize() {
    log('Initializing widget v' + WIDGET_VERSION);
    
    // Fetch playlist and campaigns
    const playlistData = await api.fetchPlaylistData();
    if (!playlistData) {
      error('Failed to load playlist data');
      return;
    }
    
    state.campaigns = playlistData.campaigns || [];
    state.playlist = playlistData.playlist || null;
    
    orchestrator = new OrchestrationEngine(
      state.playlist,
      state.campaigns,
      state.playlist?.rules
    );
    
    // Start display loop
    startDisplayLoop();
    
    log('Widget initialized successfully');
  }
  
  function startDisplayLoop() {
    if (displayInterval) {
      clearInterval(displayInterval);
    }
    
    // Show first notification after delay
    setTimeout(() => {
      showNextNotification();
    }, 2000);
    
    // Set up interval
    displayInterval = setInterval(() => {
      if (!state.isPaused) {
        showNextNotification();
      }
    }, 10000); // Every 10 seconds
  }
  
  async function showNextNotification() {
    if (!orchestrator) return;
    
    const campaign = orchestrator.getNextCampaign();
    if (!campaign) {
      log('No campaign available to show');
      return;
    }
    
    // Get event from campaign
    const event = await fetchEventForCampaign(campaign);
    if (!event) {
      log('No event available for campaign:', campaign.name);
      return;
    }
    
    // Check if already displayed
    if (state.displayedEvents.has(event.id)) {
      log('Event already displayed:', event.id);
      return;
    }
    
    // Mark as shown
    state.displayedEvents.add(event.id);
    state.incrementCampaignView(campaign.id);
    state.markCampaignShown(campaign.id);
    
    // Track impression
    api.trackImpression(event, campaign.id);
    
    // Show notification
    renderer.show(
      event,
      campaign,
      () => {
        // On close
        log('Notification closed');
      },
      () => {
        // On click
        state.clickedEvents.add(event.id);
        state.incrementCampaignClick(campaign.id);
        api.trackClick(event, campaign.id);
        log('Notification clicked');
      }
    );
    
    log('Notification shown:', {
      event: event.id,
      campaign: campaign.name
    });
  }
  
  async function fetchEventForCampaign(campaign) {
    // For now, use the first event from campaign
    // In production, this would fetch from the event queue
    try {
      const params = new URLSearchParams({
        campaign_id: campaign.id,
        limit: '1'
      });
      
      const response = await fetch(`${API_BASE}/events?${params.toString()}`);
      if (!response.ok) return null;
      
      const data = await response.json();
      return data.events?.[0] || null;
    } catch (err) {
      error('Failed to fetch event:', err);
      return null;
    }
  }
  
  // Initialize on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }
  
  log('NotiProof Widget v' + WIDGET_VERSION + ' loaded');
  
})();
