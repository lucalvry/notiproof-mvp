/**
 * OAuth Callback HTML Generators
 * 
 * These functions generate HTML pages that communicate with the parent window
 * via postMessage, enabling proper OAuth popup flows.
 */

export function generateSuccessCallbackHTML(): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Connection Successful</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          margin: 0;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }
        .container {
          text-align: center;
          padding: 2rem;
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border-radius: 20px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        }
        .checkmark {
          width: 80px;
          height: 80px;
          margin: 0 auto 1rem;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 40px;
        }
        h2 { margin: 0 0 0.5rem; font-size: 24px; }
        p { margin: 0; opacity: 0.9; font-size: 16px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="checkmark">✓</div>
        <h2>Connection Successful</h2>
        <p>Completing setup...</p>
      </div>
      <script>
        (function() {
          try {
            if (window.opener && !window.opener.closed) {
              window.opener.postMessage({
                type: 'oauth_success'
              }, '*');
              
              // Close after a brief delay to show success message
              setTimeout(function() {
                window.close();
              }, 1000);
            } else {
              document.querySelector('.container').innerHTML = 
                '<div class="checkmark">✓</div>' +
                '<h2>Success!</h2>' +
                '<p>Please close this window and return to the application.</p>';
            }
          } catch (e) {
            console.error('postMessage error:', e);
            document.querySelector('.container').innerHTML = 
              '<div class="checkmark">✓</div>' +
              '<h2>Success!</h2>' +
              '<p>Please close this window.</p>';
          }
        })();
      </script>
    </body>
    </html>
  `;
}

export function generatePropertySelectionCallbackHTML(properties: any[], state: string, origin?: string): string {
  const propertiesJson = JSON.stringify(properties);
  const stateJson = JSON.stringify(state);
  const fallbackOrigin = origin || 'window.location.origin';
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Select Property</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          margin: 0;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }
        .container {
          text-align: center;
          padding: 2rem;
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border-radius: 20px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        }
        .checkmark {
          width: 80px;
          height: 80px;
          margin: 0 auto 1rem;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 40px;
        }
        .spinner {
          border: 4px solid rgba(255, 255, 255, 0.3);
          border-top: 4px solid white;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        h2 { margin: 0 0 0.5rem; font-size: 24px; }
        p { margin: 0; opacity: 0.9; font-size: 16px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="checkmark">
          <div class="spinner"></div>
        </div>
        <h2>Authentication Successful</h2>
        <p>Loading your properties...</p>
      </div>
      <script>
        (function() {
          var properties = ${propertiesJson};
          var state = ${stateJson};
          
          try {
            if (window.opener && !window.opener.closed) {
              window.opener.postMessage({
                type: 'oauth_property_selection',
                properties: properties,
                state: state
              }, '*');
              
              // Close after sending message
              setTimeout(function() {
                window.close();
              }, 500);
            } else {
              // If window.opener is not available, provide fallback link
              var fallbackUrl = ${fallbackOrigin === 'window.location.origin' ? 'window.location.origin' : `'${fallbackOrigin}'`} + '/ga4-property-selection?state=' + encodeURIComponent(state);
              document.querySelector('.container').innerHTML = 
                '<div class="checkmark">✓</div>' +
                '<h2>Success!</h2>' +
                '<p>If this window doesn\'t close automatically, <a href="' + fallbackUrl + '" style="color: white; text-decoration: underline;">click here to continue</a>.</p>';
            }
          } catch (e) {
            console.error('postMessage error:', e);
            // Provide fallback link on error
            var fallbackUrl = ${fallbackOrigin === 'window.location.origin' ? 'window.location.origin' : `'${fallbackOrigin}'`} + '/ga4-property-selection?state=' + encodeURIComponent(state);
            document.querySelector('.container').innerHTML = 
              '<div class="checkmark">⚠</div>' +
              '<h2>Continue Your Setup</h2>' +
              '<p><a href="' + fallbackUrl + '" style="color: white; text-decoration: underline; font-weight: bold;">Click here to select your property</a></p>';
          }
        })();
      </script>
    </body>
    </html>
  `;
}

export function generateErrorCallbackHTML(
  error: string, 
  errorCode?: string, 
  helpUrl?: string
): string {
  const helpLinkHtml = helpUrl 
    ? `<a href="${helpUrl}" target="_blank" style="color: white; text-decoration: underline; margin-top: 1rem; display: inline-block;">Learn More</a>`
    : '';
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Connection Error</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          margin: 0;
          background: linear-gradient(135deg, #f56565 0%, #c53030 100%);
          color: white;
        }
        .container {
          text-align: center;
          padding: 2rem;
          max-width: 500px;
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border-radius: 20px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        }
        .error-icon {
          width: 80px;
          height: 80px;
          margin: 0 auto 1rem;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 40px;
        }
        h2 { margin: 0 0 1rem; font-size: 24px; }
        p { margin: 0 0 1rem; opacity: 0.9; font-size: 16px; line-height: 1.5; }
        a { color: white; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="error-icon">✗</div>
        <h2>Connection Failed</h2>
        <p>${error}</p>
        ${helpLinkHtml}
        <p style="font-size: 14px; margin-top: 1.5rem; opacity: 0.7;">This window will close automatically in a few seconds.</p>
      </div>
      <script>
        (function() {
          var errorData = {
            type: 'oauth_error',
            error: ${JSON.stringify(error)},
            error_code: ${JSON.stringify(errorCode)},
            help_url: ${JSON.stringify(helpUrl)}
          };
          
          try {
            if (window.opener && !window.opener.closed) {
              window.opener.postMessage(errorData, '*');
            }
          } catch (e) {
            console.error('postMessage error:', e);
          }
          
          // Auto-close after 5 seconds
          setTimeout(function() {
            window.close();
          }, 5000);
        })();
      </script>
    </body>
    </html>
  `;
}
