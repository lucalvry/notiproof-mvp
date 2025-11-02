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
        // Determine OAuth endpoint
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

        // Notify parent window
        window.opener?.postMessage({ 
          type: 'oauth_success',
          connectorId: data.connectorId,
          integration
        }, window.location.origin);

        // Close popup after short delay
        setTimeout(() => window.close(), 1000);

      } catch (error) {
        console.error('OAuth callback error:', error);
        window.opener?.postMessage({ 
          type: 'oauth_error', 
          error: error instanceof Error ? error.message : 'Unknown error' 
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
