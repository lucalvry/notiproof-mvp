// NotiProof Widget Script
(function() {
  const script = document.currentScript;
  const widgetId = script.getAttribute('data-widget-id');
  
  if (!widgetId) {
    console.error('NotiProof: Widget ID not provided');
    return;
  }

  const API_BASE = script.src.replace('/widget.js', '');
  
  // Fetch widget events
  async function fetchEvents() {
    try {
      const response = await fetch(`${API_BASE}/functions/v1/widget-api/${widgetId}`);
      const data = await response.json();
      return data.events || [];
    } catch (error) {
      console.error('NotiProof: Failed to fetch events', error);
      return [];
    }
  }

  // Track event interaction
  async function trackEvent(eventId, type) {
    try {
      await fetch(`${API_BASE}/functions/v1/widget-api/${widgetId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'track',
          eventId,
          type
        })
      });
    } catch (error) {
      console.error('NotiProof: Failed to track event', error);
    }
  }

  // Create notification element
  function createNotification(event) {
    const notification = document.createElement('div');
    notification.className = 'notiproof-notification';
    notification.innerHTML = `
      <div class="notiproof-content">
        <div class="notiproof-message">${event.event_data.message || 'New activity'}</div>
        <div class="notiproof-close">×</div>
      </div>
    `;

    // Add styles
    const style = document.createElement('style');
    style.textContent = `
      .notiproof-notification {
        position: fixed;
        bottom: 20px;
        left: 20px;
        background: white;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 16px;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
        z-index: 10000;
        max-width: 300px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        cursor: pointer;
        animation: notiproof-slide-in 0.3s ease-out;
      }
      .notiproof-content {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .notiproof-message {
        flex: 1;
        font-size: 14px;
        color: #1a202c;
      }
      .notiproof-close {
        margin-left: 12px;
        font-size: 18px;
        color: #a0aec0;
        cursor: pointer;
      }
      @keyframes notiproof-slide-in {
        from {
          transform: translateX(-100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
    `;
    
    if (!document.querySelector('#notiproof-styles')) {
      style.id = 'notiproof-styles';
      document.head.appendChild(style);
    }

    // Track view
    trackEvent(event.id, 'view');

    // Add click handler
    notification.addEventListener('click', (e) => {
      if (e.target.className !== 'notiproof-close') {
        trackEvent(event.id, 'click');
      }
    });

    // Add close handler
    notification.querySelector('.notiproof-close').addEventListener('click', (e) => {
      e.stopPropagation();
      notification.remove();
    });

    return notification;
  }

  // Show notifications
  async function showNotifications() {
    const events = await fetchEvents();
    if (events.length === 0) return;

    let currentIndex = 0;

    function showNext() {
      if (currentIndex >= events.length) {
        currentIndex = 0;
      }

      const event = events[currentIndex];
      const notification = createNotification(event);
      document.body.appendChild(notification);

      // Auto-remove after 5 seconds
      setTimeout(() => {
        if (notification.parentNode) {
          notification.remove();
        }
      }, 5000);

      currentIndex++;
    }

    // Show first notification after 3 seconds
    setTimeout(showNext, 3000);

    // Show subsequent notifications every 15 seconds
    setInterval(showNext, 15000);
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', showNotifications);
  } else {
    showNotifications();
  }
})();