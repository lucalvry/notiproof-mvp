import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Shield, ExternalLink, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { GA4PropertyPicker } from "./GA4PropertyPicker";
import { useAutoCampaignCreation } from "@/hooks/useAutoCampaignCreation";
import { SuccessModal } from "@/components/campaigns/SuccessModal";
import { useNavigate } from "react-router-dom";

interface OAuthFlowProps {
  integration: any;
  websiteId: string;
  onSuccess: () => void;
  autoCreateCampaign?: boolean; // New prop to enable auto-campaign creation
}

export function OAuthFlow({ integration, websiteId, onSuccess, autoCreateCampaign = false }: OAuthFlowProps) {
  const [connecting, setConnecting] = useState(false);
  const [showPropertyPicker, setShowPropertyPicker] = useState(false);
  const [properties, setProperties] = useState<any[]>([]);
  const [oauthState, setOauthState] = useState<string>("");
  const [isFinalizingConnection, setIsFinalizingConnection] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdCampaign, setCreatedCampaign] = useState<any>(null);
  const { createCampaignFromIntegration, isCreating } = useAutoCampaignCreation();
  const navigate = useNavigate();

  useEffect(() => {
    // Listen for OAuth callback message from popup
    const handleMessage = async (event: MessageEvent) => {
      console.log('Received OAuth message:', event.data);
      
      if (event.data.type === 'oauth_success') {
        setConnecting(false);
        
        // Auto-create campaign if enabled
        if (autoCreateCampaign) {
          toast.success(`${integration.name} connected! Creating your first notification...`);
          
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const result = await createCampaignFromIntegration({
              integrationName: integration.id,
              connectorId: event.data.connectorId,
              websiteId,
              userId: user.id
            });
            
            if (result.success && result.campaign) {
              setCreatedCampaign(result.campaign);
              setShowSuccessModal(true);
            }
          }
        } else {
          toast.success(`${integration.name} connected successfully!`);
          onSuccess();
        }
      } else if (event.data.type === 'oauth_property_selection') {
        setConnecting(false);
        // Show property picker dialog for GA4
        setProperties(event.data.properties);
        setOauthState(event.data.state);
        setShowPropertyPicker(true);
      } else if (event.data.type === 'oauth_error') {
        console.error('OAuth error details:', event.data);
        setConnecting(false);
        const errorMessage = event.data.error || 'Connection failed. Please try again.';
        const errorCode = event.data.error_code;
        const helpUrl = event.data.help_url;

        // Show detailed error with action if available
        toast.error(errorMessage, { 
          duration: errorCode === 'NO_PROPERTIES' ? 8000 : 6000,
          description: helpUrl ? 'Click to learn more' : undefined,
          action: helpUrl ? {
            label: 'Learn More',
            onClick: () => window.open(helpUrl, '_blank')
          } : undefined
        });
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [integration.name, onSuccess]);

  const handleOAuthConnect = async () => {
    setConnecting(true);
    
    // Refresh session to prevent expiration during OAuth flow
    try {
      const { error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) {
        console.warn('Session refresh warning:', refreshError);
      }
    } catch (err) {
      console.warn('Session refresh failed:', err);
    }
    
    try {
      const functionName = integration.id === 'ga4' ? 'ga4-auth' : `oauth-${integration.id}`;
      
    const { data, error } = await supabase.functions.invoke(functionName, {
      body: {
        action: 'start',
        website_id: websiteId,
        redirect_origin: window.location.origin,
      },
    });

      if (error) {
        // More specific error messages
        if (error.message?.includes('not configured') || error.message?.includes('503')) {
          toast.error(
            `${integration.name} has not been set up by administrators yet. Please contact support to enable this integration.`,
            { duration: 6000 }
          );
        } else if (error.message?.includes('credentials')) {
          toast.error(
            'Integration configuration is incomplete. Please notify administrators.',
            { duration: 6000 }
          );
        } else {
          toast.error(`Connection error: ${error.message || 'Unknown error'}`);
        }
        setConnecting(false);
        return;
      }

      if (!data?.auth_url) {
        toast.error(
          'OAuth configuration incomplete. Please notify administrators that the integration setup needs attention.',
          { duration: 6000 }
        );
        setConnecting(false);
        return;
      }

      // Open OAuth in popup window
      const popup = window.open(
        data.auth_url,
        'oauth',
        'width=600,height=700,left=200,top=100'
      );

      if (!popup) {
        toast.error('Please allow popups for this site to complete authentication');
        setConnecting(false);
        return;
      }

      // Poll for popup close or message
      const pollTimer = setInterval(() => {
        if (popup.closed) {
          clearInterval(pollTimer);
          setConnecting(false);
        }
      }, 1000);
    } catch (error) {
      console.error('OAuth error:', error);
      toast.error('Failed to initiate OAuth connection. Please try again.');
      setConnecting(false);
    }
  };

  const handlePropertySelect = async (propertyId: string) => {
    setIsFinalizingConnection(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `https://ewymvxhpkswhsirdrjub.supabase.co/functions/v1/ga4-auth?action=finalize`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            state: oauthState,
            property_id: propertyId
          })
        }
      );

      const result = await response.json();

      if (result.success) {
        setShowPropertyPicker(false);
        toast.success("GA4 property connected successfully!");
        onSuccess();
      } else {
        throw new Error(result.error || 'Failed to finalize connection');
      }
    } catch (error: any) {
      console.error('Error finalizing GA4 connection:', error);
      toast.error(error.message || 'Failed to connect property');
    } finally {
      setIsFinalizingConnection(false);
    }
  };

  const handlePropertyCancel = () => {
    setShowPropertyPicker(false);
    setProperties([]);
    setOauthState("");
    toast.info("Connection cancelled");
  };

  const Icon = integration.icon;

  return (
    <>
      <Card className="border-0 shadow-none">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Icon className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle>Connect {integration.name}</CardTitle>
              <CardDescription>Secure authentication in one click</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="h-4 w-4 text-success" />
              <span>Automatic data synchronization</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="h-4 w-4 text-success" />
              <span>No manual setup required</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="h-4 w-4 text-success" />
              <span>Revoke access anytime from your {integration.name} account</span>
            </div>
          </div>

          <div className="bg-muted p-4 rounded-lg">
            <div className="flex items-start gap-2">
              <Shield className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div className="text-xs text-muted-foreground">
                <p className="font-medium mb-1">Secure Authentication</p>
                <p>
                  You'll be redirected to {integration.name} to authorize access. 
                  We only request the minimum permissions needed to sync your data.
                </p>
              </div>
            </div>
          </div>

          <Button 
            size="lg" 
            className="w-full"
            onClick={handleOAuthConnect}
            disabled={connecting || isCreating}
          >
            {connecting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Connecting...
              </>
            ) : isCreating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating Campaign...
              </>
            ) : (
              <>
                <ExternalLink className="h-4 w-4 mr-2" />
                Connect {integration.name}
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            By connecting, you agree to allow access to your {integration.name} data
          </p>
        </CardContent>
      </Card>

      <GA4PropertyPicker
        open={showPropertyPicker}
        properties={properties}
        onSelect={handlePropertySelect}
        onCancel={handlePropertyCancel}
        isLoading={isFinalizingConnection}
      />

      {/* Success Modal */}
      {showSuccessModal && createdCampaign && (
        <SuccessModal
          open={showSuccessModal}
          onClose={() => {
            setShowSuccessModal(false);
            onSuccess();
          }}
          campaignName={createdCampaign.name}
          integrationName={integration.name}
          campaignId={createdCampaign.id}
          onViewCampaign={() => {
            navigate(`/campaigns/${createdCampaign.id}`);
          }}
          onCustomize={() => {
            navigate(`/campaigns/${createdCampaign.id}`);
          }}
        />
      )}
    </>
  );
}
