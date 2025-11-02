import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Loader2, CheckCircle, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface OAuthFlowProps {
  integration: any;
  websiteId: string;
  onSuccess: () => void;
}

export function OAuthFlow({ integration, websiteId, onSuccess }: OAuthFlowProps) {
  const [connecting, setConnecting] = useState(false);

  const handleOAuthConnect = async () => {
    setConnecting(true);
    try {
      // Call OAuth initiation endpoint
      const { data, error } = await supabase.functions.invoke(`oauth-${integration.id}`, {
        body: {
          action: 'start',
          website_id: websiteId,
        },
      });

      if (error) throw error;

      if (data?.auth_url) {
        // Redirect to OAuth provider
        window.location.href = data.auth_url;
      } else {
        toast.info(`OAuth flow for ${integration.name} will be available soon`);
      }
    } catch (error) {
      console.error('OAuth error:', error);
      toast.error('Failed to initiate OAuth connection');
    } finally {
      setConnecting(false);
    }
  };

  const Icon = integration.icon;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
            <Icon className="h-6 w-6 text-primary" />
          </div>
          <div>
            <CardTitle>Connect to {integration.name}</CardTitle>
            <CardDescription>Securely authenticate in seconds</CardDescription>
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
            <span>No API keys or technical setup needed</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle className="h-4 w-4 text-success" />
            <span>Revoke access anytime from your {integration.name} account</span>
          </div>
        </div>

        <div className="bg-muted p-4 rounded-lg">
          <div className="flex items-start gap-2">
            <Shield className="h-4 w-4 text-muted-foreground mt-0.5" />
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
          disabled={connecting}
        >
          {connecting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              <ExternalLink className="h-4 w-4 mr-2" />
              Connect {integration.name}
            </>
          )}
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          By connecting, you agree to allow NotiProof to access your {integration.name} data
        </p>
      </CardContent>
    </Card>
  );
}
