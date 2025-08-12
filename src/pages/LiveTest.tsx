import { useEffect } from 'react';

const LiveTest = () => {
  useEffect(() => {
    // Add the widget script to the page
    const script = document.createElement('script');
    script.src = '/widget.js';
    script.setAttribute('data-widget-id', 'c26c2241-7b80-4ee7-ba31-55ae342db25c');
    script.setAttribute('data-api-base', 'https://ewymvxhpkswhsirdrjub.supabase.co/functions/v1/widget-api');
    script.setAttribute('data-disable-beacon', 'true');
    document.head.appendChild(script);

    // Override console methods to capture logs
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;

    const addLog = (type: string, message: string) => {
      const logDiv = document.getElementById('console-output');
      if (logDiv) {
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry ${type}`;
        logEntry.innerHTML = `<strong>[${type.toUpperCase()}]</strong> ${message}`;
        logDiv.appendChild(logEntry);
        logDiv.scrollTop = logDiv.scrollHeight;
      }
    };

    console.log = (...args) => {
      originalLog(...args);
      addLog('log', args.join(' '));
    };

    console.warn = (...args) => {
      originalWarn(...args);
      addLog('warn', args.join(' '));
    };

    console.error = (...args) => {
      originalError(...args);
      addLog('error', args.join(' '));
    };

    // Override fetch to capture network requests
    const originalFetch = window.fetch;
    const originalSendBeacon = navigator.sendBeacon;

    const addNetworkLog = (type: string, url: string, method: string, data: any) => {
      const networkDiv = document.getElementById('network-output');
      if (networkDiv) {
        const networkEntry = document.createElement('div');
        networkEntry.className = 'network-entry';
        networkEntry.innerHTML = `
          <strong>[${type}]</strong> ${method} ${url}<br>
          <small>Data: ${typeof data === 'string' ? data : JSON.stringify(data, null, 2)}</small>
        `;
        networkDiv.appendChild(networkEntry);
        networkDiv.scrollTop = networkDiv.scrollHeight;
      }
    };

    window.fetch = async (...args) => {
      const [url, options = {}] = args;
      if (typeof url === 'string' && url.includes('widget-api')) {
        addNetworkLog('FETCH', url, options.method || 'GET', options.body || 'no body');
      }
      return originalFetch(...args);
    };

    navigator.sendBeacon = (url: string | URL, data?: BodyInit) => {
      if (typeof url === 'string' && url.includes('widget-api')) {
        addNetworkLog('BEACON', url, 'POST', data || 'no data');
      }
      return originalSendBeacon.call(navigator, url, data);
    };

    // Cleanup
    return () => {
      console.log = originalLog;
      console.warn = originalWarn;
      console.error = originalError;
      window.fetch = originalFetch;
      navigator.sendBeacon = originalSendBeacon;
      script.remove();
    };
  }, []);

  const testManualClick = () => {
    // @ts-ignore
    if (window.NotiProof) {
      // @ts-ignore
      window.NotiProof.show({
        message: 'Test click notification',
        template: 'testimonial-popup'
      });
    } else {
      console.log('NotiProof not loaded yet, try again in a moment');
    }
  };

  const clearLogs = () => {
    const consoleDiv = document.getElementById('console-output');
    const networkDiv = document.getElementById('network-output');
    if (consoleDiv) consoleDiv.innerHTML = '';
    if (networkDiv) networkDiv.innerHTML = '';
  };

  const checkSession = () => {
    const sessionId = localStorage.getItem('notiproof-session-id');
    console.log('Session ID:', sessionId);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-card rounded-xl shadow-lg border border-border p-8">
          <h1 className="text-3xl font-bold text-foreground mb-8">
            NotiProof Live Widget Test
          </h1>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Test Controls */}
            <div className="space-y-6">
              <div className="bg-muted/50 rounded-lg p-6">
                <h2 className="text-xl font-semibold text-foreground mb-4">Test Controls</h2>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">
                      The widget should load automatically and show notifications.
                      Click on any notification to test click tracking.
                    </p>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={testManualClick}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                    >
                      Force Show Widget
                    </button>
                    <button
                      onClick={clearLogs}
                      className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90 transition-colors"
                    >
                      Clear Logs
                    </button>
                    <button
                      onClick={checkSession}
                      className="px-4 py-2 bg-accent text-accent-foreground rounded-md hover:bg-accent/90 transition-colors"
                    >
                      Check Session
                    </button>
                  </div>
                </div>
              </div>

              {/* Console Logs */}
              <div className="bg-muted/50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">Console Logs</h3>
                <div
                  id="console-output"
                  className="bg-black text-green-400 p-4 rounded font-mono text-sm h-64 overflow-y-auto"
                >
                  <div className="text-gray-400">Console logs will appear here...</div>
                </div>
              </div>
            </div>

            {/* Network Logs */}
            <div className="space-y-6">
              <div className="bg-muted/50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">Network Requests</h3>
                <div
                  id="network-output"
                  className="bg-black text-blue-400 p-4 rounded font-mono text-sm h-80 overflow-y-auto"
                >
                  <div className="text-gray-400">Network requests will appear here...</div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 p-4 bg-info/10 border border-info/20 rounded-lg">
            <p className="text-sm text-info-foreground">
              <strong>Testing Instructions:</strong>
              <br />
              1. Wait for the widget to appear automatically
              <br />
              2. Click on the notification to test click tracking
              <br />
              3. Monitor the logs for any errors
              <br />
              4. Check your dashboard to verify events are recorded
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveTest;