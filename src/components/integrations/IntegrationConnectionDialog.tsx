import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, ExternalLink } from "lucide-react";
import { WebhookConnector } from "./WebhookConnector";
import { IntegrationSetupGuide } from "./IntegrationSetupGuide";
import { getIntegrationMetadata } from "@/lib/integrationMetadata";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface IntegrationConnectionDialogProps {
  integration: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  websiteId: string | null;
  onSuccess: () => void;
}

export function IntegrationConnectionDialog({
  integration,
  open,
  onOpenChange,
  websiteId,
  onSuccess,
}: IntegrationConnectionDialogProps) {
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState({
    shop_domain: "",
    access_token: "",
    site_url: "",
    consumer_key: "",
    consumer_secret: "",
    secret_key: "",
  });

  const handleTest = async () => {
    if (!websiteId) {
      toast.error("No website selected");
      return;
    }

    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke("test-integration", {
        body: {
          integration_type: integration.id,
          config: getConfigForType(),
        },
      });

      if (error) throw error;

      if (data.success) {
        toast.success(data.message || "Connection successful!");
      } else {
        toast.error(data.message || "Connection failed");
      }
    } catch (error) {
      console.error("Test error:", error);
      toast.error("Failed to test connection");
    } finally {
      setTesting(false);
    }
  };

  const getConfigForType = () => {
    switch (integration.id) {
      case "shopify":
        return {
          shop_domain: config.shop_domain,
          access_token: config.access_token,
        };
      case "woocommerce":
        return {
          site_url: config.site_url,
          consumer_key: config.consumer_key,
          consumer_secret: config.consumer_secret,
        };
      case "stripe":
        return {
          secret_key: config.secret_key,
        };
      default:
        return {};
    }
  };

  const handleSave = async () => {
    if (!websiteId) {
      toast.error("No website selected");
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Check if integration is enabled globally
      const { data: integrationConfig } = await supabase
        .from('integrations_config')
        .select('*')
        .eq('integration_type', integration.id)
        .eq('is_active', true)
        .maybeSingle();

      if (!integrationConfig) {
        toast.error('This integration is currently unavailable');
        return;
      }

      // Get user's subscription plan to check quota
      const { data: subscription } = await supabase
        .from('user_subscriptions')
        .select('plan:subscription_plans(*)')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();

      const userPlan = subscription?.plan?.name?.toLowerCase() || 'free';
      const configData = integrationConfig.config as any;
      const quota = configData?.quota_per_plan?.[userPlan] || 1;

      // Check existing connectors for this integration type
      const { data: existingConnectors } = await supabase
        .from('integration_connectors')
        .select('id')
        .eq('user_id', user.id)
        .eq('integration_type', integration.id);

      // Only check quota when creating new connector (not updating)
      if (!integration.connector && existingConnectors && existingConnectors.length >= quota) {
        toast.error(
          `Your ${userPlan} plan allows ${quota} ${integration.name} connector(s). Upgrade to add more.`
        );
        return;
      }

      const connectorData = {
        user_id: user.id,
        website_id: websiteId,
        integration_type: integration.id,
        name: `${integration.name} Connection`,
        config: getConfigForType(),
        status: "active",
      };

      if (integration.connector) {
        // Update existing
        const { error } = await supabase
          .from("integration_connectors")
          .update(connectorData)
          .eq("id", integration.connector.id);

        if (error) throw error;
      } else {
        // Create new
        const { error } = await supabase
          .from("integration_connectors")
          .insert(connectorData);

        if (error) throw error;
      }

      toast.success(`${integration.name} connected successfully!`);
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Failed to save connection");
    } finally {
      setSaving(false);
    }
  };

  const metadata = getIntegrationMetadata(integration.id);
  const isWebhookBased = metadata.connectorType === 'webhook' || metadata.connectorType === 'zapier_proxy';
  const isOAuthBased = metadata.connectorType === 'oauth' || metadata.requiresOauth;
  
  // Generate webhook URL for setup guide
  const webhookUrl = isWebhookBased && websiteId 
    ? `https://ewymvxhpkswhsirdrjub.supabase.co/functions/v1/webhook-${integration.id}?website_id=${websiteId}`
    : undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Connect {integration.name}</DialogTitle>
          <DialogDescription>
            {isWebhookBased 
              ? `Set up webhook integration for ${integration.name}`
              : isOAuthBased
              ? `Authorize ${integration.name} to connect`
              : `Enter your ${integration.name} credentials to connect`
            }
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="setup" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="setup">Setup Guide</TabsTrigger>
            <TabsTrigger value="connect">Connect</TabsTrigger>
          </TabsList>

          <TabsContent value="setup" className="space-y-4 mt-4">
            <IntegrationSetupGuide 
              integrationType={integration.id}
              webhookUrl={webhookUrl}
            />
          </TabsContent>

          <TabsContent value="connect" className="space-y-4 mt-4">
            {isWebhookBased ? (
              <WebhookConnector 
                websiteId={websiteId || ''} 
                onSuccess={() => {
                  onSuccess();
                  onOpenChange(false);
                }}
                integrationType={integration.id}
              />
            ) : isOAuthBased ? (
              <div className="space-y-4">
                <Alert>
                  <AlertDescription>
                    This integration requires OAuth authorization. Click the button below to connect your {integration.name} account.
                  </AlertDescription>
                </Alert>
                <Button 
                  className="w-full" 
                  onClick={() => {
                    toast.info(`OAuth flow for ${integration.name} will be available soon`);
                  }}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Authorize {integration.name}
                </Button>
              </div>
            ) : (
            <div className="space-y-4">
              {integration.id === "shopify" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="shop_domain">Shop Domain</Label>
                    <Input
                      id="shop_domain"
                      placeholder="yourstore.myshopify.com"
                      value={config.shop_domain}
                      onChange={(e) => setConfig({ ...config, shop_domain: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="access_token">Admin API Access Token</Label>
                    <Input
                      id="access_token"
                      type="password"
                      placeholder="shpat_..."
                      value={config.access_token}
                      onChange={(e) => setConfig({ ...config, access_token: e.target.value })}
                    />
                  </div>
                </>
              )}

              {integration.id === "woocommerce" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="site_url">Site URL</Label>
                    <Input
                      id="site_url"
                      placeholder="https://yourstore.com"
                      value={config.site_url}
                      onChange={(e) => setConfig({ ...config, site_url: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="consumer_key">Consumer Key</Label>
                    <Input
                      id="consumer_key"
                      placeholder="ck_..."
                      value={config.consumer_key}
                      onChange={(e) => setConfig({ ...config, consumer_key: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="consumer_secret">Consumer Secret</Label>
                    <Input
                      id="consumer_secret"
                      type="password"
                      placeholder="cs_..."
                      value={config.consumer_secret}
                      onChange={(e) => setConfig({ ...config, consumer_secret: e.target.value })}
                    />
                  </div>
                </>
              )}

              {integration.id === "stripe" && (
                <div className="space-y-2">
                  <Label htmlFor="secret_key">Secret Key</Label>
                  <Input
                    id="secret_key"
                    type="password"
                    placeholder="sk_..."
                    value={config.secret_key}
                    onChange={(e) => setConfig({ ...config, secret_key: e.target.value })}
                  />
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleTest}
                  disabled={testing}
                >
                  {testing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Test Connection
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Save & Connect
                </Button>
              </div>
            </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
