import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

export function OAuthCallback() {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const integration = searchParams.get('integration');

      if (!code || !state || !integration) {
        window.opener?.postMessage({ 
          type: 'oauth_error', 
          error: 'Missing OAuth parameters' 
        }, window.location.origin);
        window.close();
        return;
      }

      try {
        // Handle GA4 property retrieval
        if ((integration === 'google_analytics' || integration === 'ga4') && code === 'success') {
          // Get session for authentication
          const { data: { session } } = await supabase.auth.getSession();
          
          if (!session) {
            throw new Error('Not authenticated. Please log in again.');
          }

          // Retrieve properties from backend with proper auth
          const { data: propsData, error: propsError } = await supabase.functions.invoke('ga4-auth', {
            body: { 
              action: 'get_properties',
              state
            },
            headers: {
              Authorization: `Bearer ${session.access_token}`
            }
          });

          console.log('GA4 get_properties response:', { propsData, propsError });

          if (propsError) {
            console.error('GA4 get_properties error:', propsError);
            throw new Error(propsError.message || 'Failed to retrieve GA4 properties');
          }

          if (!propsData?.success) {
            console.error('GA4 get_properties failed:', propsData);
            throw new Error(propsData?.error || 'Failed to retrieve GA4 properties');
          }

          // Send property selection message to parent
          window.opener?.postMessage({ 
            type: 'oauth_property_selection',
            properties: propsData.properties,
            state: propsData.state,
            integration: 'ga4'
          }, window.location.origin);
          setTimeout(() => window.close(), 500);
          return;
        }

        // Standard OAuth flow for other integrations
        let oauthFunction = '';
        if (integration === 'google_analytics' || integration === 'ga4') {
          oauthFunction = 'ga4-auth';
        } else {
          oauthFunction = `oauth-${integration}`;
        }

        // Call callback endpoint
        const { data, error } = await supabase.functions.invoke(oauthFunction, {
          body: { 
            action: 'callback',
            code,
            state,
            shop: searchParams.get('shop'), // For Shopify
          }
        });

        if (error || !data?.success) {
          throw new Error(data?.error || 'OAuth callback failed');
        }

        // Check if property selection is required
        if (data.requires_selection && data.properties) {
          window.opener?.postMessage({ 
            type: 'oauth_property_selection',
            properties: data.properties,
            state: data.state,
            integration
          }, window.location.origin);
          setTimeout(() => window.close(), 500);
          return;
        }

        // Notify parent window of success
        window.opener?.postMessage({ 
          type: 'oauth_success',
          connectorId: data.connectorId,
          integration
        }, window.location.origin);

        // Close popup after short delay
        setTimeout(() => window.close(), 1000);

      } catch (error: any) {
        console.error('OAuth callback error:', error);
        
        // Extract structured error info
        const errorMessage = error?.message || 'Unknown error';
        const errorCode = error?.error_code || 'UNKNOWN';
        const helpUrl = error?.help_url;

        window.opener?.postMessage({ 
          type: 'oauth_error', 
          error: errorMessage,
          error_code: errorCode,
          help_url: helpUrl
        }, window.location.origin);
        setTimeout(() => window.close(), 2000);
      }
    };

    handleCallback();
  }, [searchParams]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-muted-foreground">Completing authentication...</p>
    </div>
  );
}
