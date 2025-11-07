import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ExternalLink, Loader2, CheckCircle, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface APIKeyFlowProps {
  integration: any;
  websiteId: string;
  onSuccess: () => void;
}

export function APIKeyFlow({ integration, websiteId, onSuccess }: APIKeyFlowProps) {
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const handleConnect = async () => {
    if (!apiKey.trim()) {
      toast.error("Please enter your API key");
      return;
    }

    setConnecting(true);
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Store the API key securely
      const { data, error } = await supabase
        .from('integration_connectors')
        .insert({
          user_id: user.id,
          website_id: websiteId,
          integration_type: integration.id,
          name: `${integration.name} Connection`,
          config: {
            api_key: apiKey,
          },
          status: 'active',
        })
        .select()
        .single();

      if (error) throw error;

      toast.success(`${integration.name} connected successfully!`);
      onSuccess();
    } catch (error: any) {
      console.error('Connection error:', error);
      toast.error(error.message || "Failed to connect");
    } finally {
      setConnecting(false);
    }
  };

  const openApiKeyGuide = () => {
    window.open(`https://docs.notiproof.com/integrations/${integration.id}/api-key`, '_blank');
  };

  const Icon = integration.icon;

  return (
    <Card className="border-0 shadow-none">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
            <Icon className="h-6 w-6 text-primary" />
          </div>
          <div>
            <CardTitle>Connect {integration.name}</CardTitle>
            <CardDescription>Enter your API credentials to get started</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle className="h-4 w-4 text-success" />
            <span>Secure storage of your credentials</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle className="h-4 w-4 text-success" />
            <span>Automatic data synchronization</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle className="h-4 w-4 text-success" />
            <span>Easy to revoke and update</span>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="api-key">API Key</Label>
            <div className="relative">
              <Input
                id="api-key"
                type={showKey ? "text" : "password"}
                placeholder="sk_live_..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowKey(!showKey)}
              >
                {showKey ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            <Button
              variant="link"
              size="sm"
              className="p-0 h-auto text-xs"
              onClick={openApiKeyGuide}
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              Where do I find my API key?
            </Button>
          </div>

          <Button 
            size="lg" 
            className="w-full"
            onClick={handleConnect}
            disabled={connecting || !apiKey.trim()}
          >
            {connecting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                Connect {integration.name}
              </>
            )}
          </Button>
        </div>

        <div className="bg-muted p-4 rounded-lg">
          <p className="text-xs text-muted-foreground">
            <strong>Security Note:</strong> Your API key is encrypted and stored securely. 
            We only use it to sync data from {integration.name}. You can revoke access anytime.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
