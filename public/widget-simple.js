(function() {
  'use strict';
  
  const scriptTag = document.querySelector('script[data-widget-id]');
  if (!scriptTag) return;
  
  const widgetId = scriptTag.getAttribute('data-widget-id');
  const apiBase = scriptTag.getAttribute('data-api-base') || 'https://ewymvxhpkswhsirdrjub.supabase.co/functions/v1/widget-api';
  
  console.log('SimpleWidget: Starting with ID:', widgetId);
  
  // Simple widget creation
  function createSimpleWidget() {
    // Remove any existing widgets
    const existing = document.querySelectorAll('.simple-widget');
    existing.forEach(w => w.remove());
    
    const widget = document.createElement('div');
    widget.className = 'simple-widget';
    widget.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 20px;
      background: white;
      padding: 16px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      border-left: 4px solid #3B82F6;
      max-width: 300px;
      cursor: pointer;
      z-index: 9999;
      font-family: Arial, sans-serif;
      font-size: 14px;
    `;
    
    widget.innerHTML = '⭐ "Amazing product!" - Sarah M. (Click me!)';
    
    // CRITICAL: Add click handler IMMEDIATELY
    widget.addEventListener('click', function() {
      console.log('SimpleWidget: CLICKED!');
      
      // Track click immediately
      const payload = {
        event_type: 'click',
        event_data: {
          message: 'Widget clicked',
          timestamp: new Date().toISOString(),
          url: window.location.href
        }
      };
      
      console.log('SimpleWidget: Sending click data:', payload);
      
      fetch(`${apiBase}/api/widgets/${widgetId}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).then(response => {
        console.log('SimpleWidget: Click response:', response.status);
        return response.text();
      }).then(text => {
        console.log('SimpleWidget: Click response body:', text);
      }).catch(error => {
        console.error('SimpleWidget: Click error:', error);
      });
      
      // Remove widget after click
      widget.style.opacity = '0.5';
      setTimeout(() => widget.remove(), 1000);
    });
    
    document.body.appendChild(widget);
    console.log('SimpleWidget: Widget added to page');
    
    // Track view
    fetch(`${apiBase}/api/widgets/${widgetId}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: 'view',
        event_data: {
          message: 'Widget viewed',
          timestamp: new Date().toISOString(),
          url: window.location.href
        }
      })
    }).catch(console.error);
  }
  
  // Start immediately
  setTimeout(createSimpleWidget, 2000);
  
})();