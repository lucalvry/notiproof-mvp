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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { WebhookConnector } from "./WebhookConnector";

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Connect {integration.name}</DialogTitle>
          <DialogDescription>
            Enter your {integration.name} credentials to connect
          </DialogDescription>
        </DialogHeader>

        {(integration.id === 'webhook' || integration.id === 'zapier' || integration.id === 'typeform' || integration.id === 'calendly') ? (
          <WebhookConnector 
            websiteId={websiteId || ''} 
            onSuccess={() => {
              onSuccess();
              onOpenChange(false);
            }}
            integrationType={integration.id as 'webhook' | 'zapier' | 'typeform' | 'calendly'}
          />
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
      </DialogContent>
    </Dialog>
  );
}
