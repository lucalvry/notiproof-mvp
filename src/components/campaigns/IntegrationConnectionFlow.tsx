import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, ExternalLink, Copy, Send, Clock, Loader2 } from "lucide-react";
import { getIntegrationMetadata } from "@/lib/integrationMetadata";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface IntegrationConnectionFlowProps {
  integrationType: string;
  onConnectionComplete: (config?: any) => void;
}

export function IntegrationConnectionFlow({ 
  integrationType,
  onConnectionComplete 
}: IntegrationConnectionFlowProps) {
  const [webhookUrl, setWebhookUrl] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectorId, setConnectorId] = useState<string | null>(null);
  const [connectorStatus, setConnectorStatus] = useState<'pending' | 'active'>('pending');
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  
  const metadata = getIntegrationMetadata(integrationType);

  // Poll connector status for verification
  useEffect(() => {
    if (!connectorId || connectorStatus === 'active') return;

    const pollInterval = setInterval(async () => {
      const { data, error } = await supabase
        .from('integration_connectors')
        .select('status, last_sync')
        .eq('id', connectorId)
        .single();

      if (!error && data) {
        setConnectorStatus(data.status as 'pending' | 'active');
        setLastSync(data.last_sync);
        
        if (data.status === 'active') {
          toast.success('Webhook verified! First event received.');
          clearInterval(pollInterval);
        }
      }
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(pollInterval);
  }, [connectorId, connectorStatus]);

  // Generate webhook URL for this integration
  const generateWebhookUrl = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return "";
    
    const baseUrl = window.location.origin.includes('localhost') 
      ? 'http://localhost:54321/functions/v1'
      : `https://${import.meta.env.VITE_SUPABASE_PROJECT_REF}.supabase.co/functions/v1`;
    
    return `${baseUrl}/webhook-${integrationType}?user_id=${user.id}`;
  };

  const handleCopyWebhookUrl = async () => {
    const url = await generateWebhookUrl();
    navigator.clipboard.writeText(url);
    toast.success("Webhook URL copied to clipboard!");
  };

  const handleOAuthConnect = async () => {
    setIsConnecting(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const currentWebsiteId = localStorage.getItem('selectedWebsiteId');
      
      if (!user || !currentWebsiteId) {
        toast.error("Authentication error. Please reload and try again.");
        setIsConnecting(false);
        return;
      }

      // Determine OAuth endpoint based on integration type
      let oauthFunction = '';
      const oauthIntegrations = ['ga4', 'google_analytics', 'shopify', 'instagram', 'hubspot'];
      
      if (oauthIntegrations.includes(integrationType)) {
        if (integrationType === 'google_analytics') {
          oauthFunction = 'ga4-auth';
        } else {
          oauthFunction = `oauth-${integrationType}`;
        }
      } else {
        // Fallback for integrations without real OAuth yet
        const { data: connector, error } = await supabase
          .from('integration_connectors')
          .insert({
            user_id: user.id,
            website_id: currentWebsiteId,
            integration_type: integrationType as any,
            name: `${metadata.displayName} Connection`,
            config: { oauth_placeholder: true },
            status: 'active',
          })
          .select()
          .single();
        
        if (error) {
          console.error('Error saving OAuth connector:', error);
          toast.error("Failed to save OAuth connection");
          setIsConnecting(false);
          return;
        }
        
        toast.success(`${metadata.displayName} connected successfully!`);
        setIsConnecting(false);
        onConnectionComplete({ connected: true, connectorId: connector.id });
        window.dispatchEvent(new CustomEvent('notiproof:wizard-advance'));
        return;
      }

      // Start real OAuth flow
      const { data, error } = await supabase.functions.invoke(oauthFunction, {
        body: { 
          action: 'start',
          user_id: user.id,
          website_id: currentWebsiteId,
          ...(integrationType === 'shopify' && { shop: '' }) // Will be prompted in popup
        }
      });

      if (error || !data?.auth_url) {
        console.error('OAuth start error:', error);
        toast.error(data?.error || "Failed to start OAuth flow");
        setIsConnecting(false);
        return;
      }

      // Open OAuth popup
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      
      const popup = window.open(
        data.auth_url,
        'oauth_popup',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      // Listen for OAuth callback
      const handleMessage = async (event: MessageEvent) => {
        if (event.data?.type === 'oauth_success') {
          window.removeEventListener('message', handleMessage);
          popup?.close();
          
          toast.success(`${metadata.displayName} connected successfully!`);
          setIsConnecting(false);
          onConnectionComplete({ connected: true, connectorId: event.data.connectorId });
          window.dispatchEvent(new CustomEvent('notiproof:wizard-advance'));
        } else if (event.data?.type === 'oauth_error') {
          window.removeEventListener('message', handleMessage);
          popup?.close();
          
          toast.error(`OAuth failed: ${event.data.error}`);
          setIsConnecting(false);
        }
      };

      window.addEventListener('message', handleMessage);

      // Timeout after 5 minutes
      setTimeout(() => {
        if (popup && !popup.closed) {
          window.removeEventListener('message', handleMessage);
          popup.close();
          toast.error("OAuth timeout. Please try again.");
          setIsConnecting(false);
        }
      }, 5 * 60 * 1000);

    } catch (error) {
      console.error('OAuth connection error:', error);
      toast.error("Failed to initiate OAuth connection");
      setIsConnecting(false);
    }
  };

  const handleWebhookSetup = async () => {
    const url = await generateWebhookUrl();
    setWebhookUrl(url);
    
    // CRITICAL FIX: Save webhook connector to database
    const { data: { user } } = await supabase.auth.getUser();
    const currentWebsiteId = localStorage.getItem('selectedWebsiteId');
    
    if (!user || !currentWebsiteId) {
      toast.error("Authentication error. Please reload and try again.");
      return;
    }
    
    // Generate secure webhook token
    const webhookToken = `whk_${crypto.randomUUID().replace(/-/g, '')}`;
    
    // Insert connector record
    const { data: connector, error } = await supabase
      .from('integration_connectors')
      .insert({
        user_id: user.id,
        website_id: currentWebsiteId,
        integration_type: integrationType as any,
        name: `${metadata.displayName} Webhook`,
        config: { 
          webhook_url: url,
          webhook_token: webhookToken
        },
        status: 'pending', // Will be 'active' once webhook receives first event
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error saving webhook connector:', error);
      toast.error("Failed to save webhook configuration");
      return;
    }
    
    setConnectorId(connector.id);
    setConnectorStatus(connector.status as 'pending' | 'active');
    toast.success("Webhook URL generated and saved!");
    onConnectionComplete({ webhookUrl: url, connectorId: connector.id });
  };

  const handleTestWebhook = async () => {
    if (!connectorId) {
      toast.error("Please generate webhook URL first");
      return;
    }

    setIsTesting(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('test-webhook', {
        body: {
          connector_id: connectorId,
          integration_type: integrationType
        }
      });

      if (error) {
        console.error('Test webhook error:', error);
        toast.error("Failed to send test webhook");
        setIsTesting(false);
        return;
      }

      if (data.success) {
        toast.success("Test webhook sent successfully! Check your events.");
        // Refresh connector status
        const { data: connectorData } = await supabase
          .from('integration_connectors')
          .select('status, last_sync')
          .eq('id', connectorId)
          .single();
        
        if (connectorData) {
          setConnectorStatus(connectorData.status as 'pending' | 'active');
          setLastSync(connectorData.last_sync);
        }
      } else {
        toast.error(data.error || "Test webhook failed");
      }
    } catch (error) {
      console.error('Test webhook error:', error);
      toast.error("Failed to send test webhook");
    } finally {
      setIsTesting(false);
    }
  };

  // OAuth-based integrations
  if (metadata.requiresOauth) {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-primary/10 p-3">
              <metadata.icon className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h2 className="text-2xl font-bold">Connect {metadata.displayName}</h2>
          <p className="text-muted-foreground">
            Authenticate with {metadata.displayName} to automatically sync data
          </p>
        </div>

        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="text-base">OAuth Connection Required</CardTitle>
            <CardDescription>
              {metadata.displayName} requires secure OAuth authentication
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
                <span>Secure authentication via OAuth 2.0</span>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
                <span>Automatic data synchronization</span>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
                <span>We never store your credentials</span>
              </div>
            </div>

            <Button 
              onClick={handleOAuthConnect}
              className="w-full"
              disabled={isConnecting}
            >
              {isConnecting ? "Connecting..." : `Connect ${metadata.displayName}`}
              <ExternalLink className="h-4 w-4 ml-2" />
            </Button>

            <Button 
              variant="ghost" 
              onClick={() => {
                onConnectionComplete();
                window.dispatchEvent(new CustomEvent('notiproof:wizard-advance'));
              }}
              className="w-full"
            >
              Skip OAuth & Continue
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Webhook-based integrations
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="flex justify-center mb-4">
          <div className="rounded-full bg-primary/10 p-3">
            <metadata.icon className="h-8 w-8 text-primary" />
          </div>
        </div>
        <h2 className="text-2xl font-bold">Connect {metadata.displayName}</h2>
        <p className="text-muted-foreground">
          Set up a webhook to automatically receive data from {metadata.displayName}
        </p>
      </div>

      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            Webhook Setup
            <Badge variant="outline">Simple</Badge>
          </CardTitle>
          <CardDescription>
            Copy this webhook URL and add it to your {metadata.displayName} settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!webhookUrl ? (
            <Button onClick={handleWebhookSetup} className="w-full">
              Generate Webhook URL
            </Button>
          ) : (
            <>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Your Webhook URL</Label>
                  <Badge 
                    variant={connectorStatus === 'active' ? 'default' : 'secondary'}
                    className="flex items-center gap-1"
                  >
                    {connectorStatus === 'active' ? (
                      <>
                        <CheckCircle2 className="h-3 w-3" />
                        Verified
                      </>
                    ) : (
                      <>
                        <Clock className="h-3 w-3" />
                        Awaiting First Event
                      </>
                    )}
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <Input 
                    value={webhookUrl} 
                    readOnly 
                    className="font-mono text-xs"
                  />
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={handleCopyWebhookUrl}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                {lastSync && (
                  <p className="text-xs text-muted-foreground">
                    Last synced: {new Date(lastSync).toLocaleString()}
                  </p>
                )}
              </div>

              <div className="space-y-2 text-sm">
                <p className="font-medium">Next steps:</p>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                  <li>Copy the webhook URL above</li>
                  <li>Go to your {metadata.displayName} settings</li>
                  <li>Add the webhook URL in the integrations section</li>
                  <li>Save and test the connection</li>
                </ol>
              </div>

              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={handleTestWebhook}
                  disabled={isTesting}
                  className="flex-1"
                >
                  {isTesting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send Test Event
                    </>
                  )}
                </Button>
                <Button onClick={() => {
                  onConnectionComplete({ webhookUrl, connectorId });
                  window.dispatchEvent(new CustomEvent('notiproof:wizard-advance'));
                }} className="flex-1">
                  Continue
                </Button>
              </div>
            </>
          )}

          <Button 
            variant="ghost" 
            onClick={() => {
              onConnectionComplete();
              window.dispatchEvent(new CustomEvent('notiproof:wizard-advance'));
            }}
            className="w-full"
          >
            Skip Connection & Continue
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
