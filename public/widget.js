(function() {
  'use strict';

  // Get widget configuration from script tag
  const scriptTag = document.querySelector('script[data-widget-id]');
  if (!scriptTag) {
    console.error('NotiProof: No widget ID found in script tag');
    return;
  }

  const widgetId = scriptTag.getAttribute('data-widget-id');
  const apiBase = scriptTag.getAttribute('data-api-base') || window.location.origin;

  // Widget styles
  const widgetStyles = `
    .notiproof-widget {
      position: fixed;
      z-index: 9999;
      padding: 16px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
      border-left: 4px solid #3B82F6;
      max-width: 300px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      font-size: 14px;
      line-height: 1.4;
      color: #1f2937;
      opacity: 0;
      transform: translateY(20px);
      transition: all 0.3s ease-in-out;
    }
    
    .notiproof-widget.show {
      opacity: 1;
      transform: translateY(0);
    }
    
    .notiproof-widget.bottom-left {
      bottom: 20px;
      left: 20px;
    }
    
    .notiproof-widget.bottom-right {
      bottom: 20px;
      right: 20px;
    }
    
    .notiproof-widget.top-left {
      top: 20px;
      left: 20px;
    }
    
    .notiproof-widget.top-right {
      top: 20px;
      right: 20px;
    }
    
    .notiproof-close {
      position: absolute;
      top: 8px;
      right: 8px;
      background: none;
      border: none;
      font-size: 18px;
      cursor: pointer;
      color: #6b7280;
      padding: 0;
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .notiproof-close:hover {
      color: #374151;
    }
    
    @media (max-width: 480px) {
      .notiproof-widget {
        left: 10px !important;
        right: 10px !important;
        max-width: calc(100vw - 20px);
      }
    }
  `;

  // Inject styles
  const styleSheet = document.createElement('style');
  styleSheet.textContent = widgetStyles;
  document.head.appendChild(styleSheet);

  // Widget configuration
  let config = {
    position: 'bottom-left',
    delay: 3000,
    color: '#3B82F6',
    showCloseButton: true
  };

  // Fetch widget configuration
  async function fetchWidgetConfig() {
    try {
      const response = await fetch(`${apiBase}/api/widgets/${widgetId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.style_config) {
          config = { ...config, ...data.style_config };
        }
      }
    } catch (error) {
      console.warn('NotiProof: Could not fetch widget config, using defaults');
    }
  }

  // Create widget element
  function createWidget(event) {
    const widget = document.createElement('div');
    widget.className = `notiproof-widget ${config.position}`;
    widget.style.borderLeftColor = config.color;
    
    widget.innerHTML = `
      ${config.showCloseButton ? '<button class="notiproof-close">×</button>' : ''}
      <div>${event.message || '🔔 Someone just signed up!'}</div>
    `;
    
    // Add close functionality
    if (config.showCloseButton) {
      const closeButton = widget.querySelector('.notiproof-close');
      closeButton.addEventListener('click', () => {
        widget.classList.remove('show');
        setTimeout(() => widget.remove(), 300);
      });
    }
    
    document.body.appendChild(widget);
    
    // Show widget with animation
    setTimeout(() => widget.classList.add('show'), 100);
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      if (document.body.contains(widget)) {
        widget.classList.remove('show');
        setTimeout(() => widget.remove(), 300);
      }
    }, 5000);
    
    // Track view
    trackEvent('view');
  }

  // Track events
  async function trackEvent(type, data = {}) {
    try {
      await fetch(`${apiBase}/api/widgets/${widgetId}/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event_type: type,
          event_data: data
        })
      });
    } catch (error) {
      console.warn('NotiProof: Could not track event');
    }
  }

  // Fetch and display events
  async function fetchAndDisplayEvents() {
    try {
      const response = await fetch(`${apiBase}/api/widgets/${widgetId}/events`);
      if (response.ok) {
        const events = await response.json();
        if (events && events.length > 0) {
          // Show random event
          const randomEvent = events[Math.floor(Math.random() * events.length)];
          createWidget(randomEvent);
        } else {
          // Show default event if no events exist
          createWidget({ message: '🔔 Someone just signed up!' });
        }
      }
    } catch (error) {
      console.warn('NotiProof: Could not fetch events, showing default');
      createWidget({ message: '🔔 Someone just signed up!' });
    }
  }

  // Initialize widget
  async function init() {
    await fetchWidgetConfig();
    
    // Initial delay
    setTimeout(() => {
      fetchAndDisplayEvents();
      
      // Show periodic notifications
      setInterval(fetchAndDisplayEvents, 30000); // Every 30 seconds
    }, config.delay);
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
    widgetId: widgetId
  };
})();