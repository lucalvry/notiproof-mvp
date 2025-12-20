import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ExternalLink, Loader2, CheckCircle, Eye, EyeOff, ShoppingBag, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface WooCommerceConnectFlowProps {
  integration: any;
  websiteId: string;
  onSuccess: () => void;
}

interface ConnectorData {
  id: string;
  config: {
    site_url: string;
    consumer_key: string;
    consumer_secret: string;
  };
  status: string;
}

export function WooCommerceConnectFlow({ integration, websiteId, onSuccess }: WooCommerceConnectFlowProps) {
  const [siteUrl, setSiteUrl] = useState("");
  const [consumerKey, setConsumerKey] = useState("");
  const [consumerSecret, setConsumerSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testSuccess, setTestSuccess] = useState(false);
  const [existingConnector, setExistingConnector] = useState<ConnectorData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkExistingConnection();
  }, [websiteId]);

  const checkExistingConnection = async () => {
    try {
      const { data: connector } = await supabase
        .from('integration_connectors')
        .select('*')
        .eq('website_id', websiteId)
        .eq('integration_type', 'woocommerce')
        .eq('status', 'active')
        .single();

      if (connector) {
        const config = connector.config as { site_url?: string; consumer_key?: string; consumer_secret?: string } | null;
        const connectorData: ConnectorData = {
          id: connector.id,
          config: {
            site_url: config?.site_url || '',
            consumer_key: config?.consumer_key || '',
            consumer_secret: config?.consumer_secret || '',
          },
          status: connector.status || 'active',
        };
        setExistingConnector(connectorData);
        setSiteUrl(config?.site_url || '');
        setConsumerKey(config?.consumer_key || '');
        setConsumerSecret(config?.consumer_secret || '');
      }
    } catch (error) {
      // No existing connection
    } finally {
      setLoading(false);
    }
  };

  const normalizeUrl = (url: string): string => {
    let normalized = url.trim();
    if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
      normalized = 'https://' + normalized;
    }
    return normalized.replace(/\/+$/, '');
  };

  const testConnection = async () => {
    if (!siteUrl.trim() || !consumerKey.trim() || !consumerSecret.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    setTesting(true);
    setTestSuccess(false);

    try {
      const normalizedUrl = normalizeUrl(siteUrl);
      
      const { data, error } = await supabase.functions.invoke('sync-woocommerce-products', {
        body: {
          action: 'test',
          site_url: normalizedUrl,
          consumer_key: consumerKey,
          consumer_secret: consumerSecret,
        },
      });

      if (error) throw error;

      if (data?.success) {
        setTestSuccess(true);
        toast.success(`Connection successful! Found ${data.product_count || 0} products.`);
      } else {
        throw new Error(data?.error || 'Connection test failed');
      }
    } catch (error: any) {
      console.error('Connection test error:', error);
      toast.error(error.message || "Failed to connect. Check your credentials.");
    } finally {
      setTesting(false);
    }
  };

  const handleConnect = async () => {
    if (!testSuccess) {
      toast.error("Please test your connection first");
      return;
    }

    setConnecting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const normalizedUrl = normalizeUrl(siteUrl);

      const { data: connector, error } = await supabase
        .from('integration_connectors')
        .insert({
          user_id: user.id,
          website_id: websiteId,
          integration_type: 'woocommerce',
          name: `WooCommerce - ${new URL(normalizedUrl).hostname}`,
          config: {
            site_url: normalizedUrl,
            consumer_key: consumerKey,
            consumer_secret: consumerSecret,
          },
          status: 'active',
          auto_sync_enabled: true,
          sync_frequency_minutes: 60,
        })
        .select()
        .single();

      if (error) throw error;

      await supabase
        .from('integrations')
        .insert({
          user_id: user.id,
          website_id: websiteId,
          provider: 'woocommerce',
          name: `WooCommerce - ${new URL(normalizedUrl).hostname}`,
          is_active: true,
          credentials: {
            site_url: normalizedUrl,
            has_api_credentials: true,
          },
        });

      toast.info("Syncing products from WooCommerce...");
      
      const { data: syncData, error: syncError } = await supabase.functions.invoke('sync-woocommerce-products', {
        body: {
          action: 'sync',
          connector_id: connector.id,
          website_id: websiteId,
          site_url: normalizedUrl,
          consumer_key: consumerKey,
          consumer_secret: consumerSecret,
        },
      });

      if (syncError) {
        console.error('Product sync error:', syncError);
        toast.warning("Connected but product sync failed. You can retry from the management page.");
      } else {
        toast.success(`WooCommerce connected! Synced ${syncData?.products_synced || 0} products. Manage your integration from the WooCommerce Orders page.`);
      }

      setExistingConnector(connector as unknown as ConnectorData);
      onSuccess();
    } catch (error: any) {
      console.error('Connection error:', error);
      toast.error(error.message || "Failed to connect");
    } finally {
      setConnecting(false);
    }
  };

  const Icon = integration.icon || ShoppingBag;

  if (loading) {
    return (
      <Card className="border-0 shadow-none">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // If already connected, show success message - management is done on dedicated page
  if (existingConnector) {
    return (
      <Card className="border-0 shadow-none">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Icon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="flex items-center gap-2">
                  WooCommerce Integration
                  <Badge variant="default" className="text-xs">Connected</Badge>
                </CardTitle>
                <CardDescription className="text-xs">{siteUrl}</CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">Integration Active</span>
            </div>
            <p className="text-sm text-green-600 dark:text-green-500 mt-2">
              Your WooCommerce store is connected. Manage orders, webhooks, imports, and settings from the WooCommerce Orders page.
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            Close this dialog and click "Manage" on the WooCommerce card to access all management features.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Initial connection flow
  return (
    <Card className="border-0 shadow-none">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
            <Icon className="h-6 w-6 text-primary" />
          </div>
          <div>
            <CardTitle>Connect WooCommerce</CardTitle>
            <CardDescription>Sync your product catalog via REST API</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <Package className="h-4 w-4 text-success" />
            <span>Automatic product catalog sync</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle className="h-4 w-4 text-success" />
            <span>Real-time order notifications</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle className="h-4 w-4 text-success" />
            <span>Historical order import</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle className="h-4 w-4 text-success" />
            <span>Events require manual approval</span>
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="site-url">Store URL</Label>
            <Input
              id="site-url"
              type="url"
              placeholder="https://yourstore.com"
              value={siteUrl}
              onChange={(e) => {
                setSiteUrl(e.target.value);
                setTestSuccess(false);
              }}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="consumer-key">Consumer Key</Label>
            <Input
              id="consumer-key"
              type="text"
              placeholder="ck_..."
              value={consumerKey}
              onChange={(e) => {
                setConsumerKey(e.target.value);
                setTestSuccess(false);
              }}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="consumer-secret">Consumer Secret</Label>
            <div className="relative">
              <Input
                id="consumer-secret"
                type={showSecret ? "text" : "password"}
                placeholder="cs_..."
                value={consumerSecret}
                onChange={(e) => {
                  setConsumerSecret(e.target.value);
                  setTestSuccess(false);
                }}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowSecret(!showSecret)}
              >
                {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <Button
            variant="link"
            size="sm"
            className="p-0 h-auto text-xs"
            onClick={() => window.open('https://woocommerce.com/document/woocommerce-rest-api/', '_blank')}
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            How to create WooCommerce API keys
          </Button>

          <div className="flex gap-3">
            <Button 
              variant="outline"
              className="flex-1"
              onClick={testConnection}
              disabled={testing || !siteUrl.trim() || !consumerKey.trim() || !consumerSecret.trim()}
            >
              {testing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : testSuccess ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-2 text-success" />
                  Connection Verified
                </>
              ) : (
                "Test Connection"
              )}
            </Button>

            <Button 
              className="flex-1"
              onClick={handleConnect}
              disabled={connecting || !testSuccess}
            >
              {connecting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                "Connect & Sync Products"
              )}
            </Button>
          </div>
        </div>

        <div className="bg-muted p-4 rounded-lg">
          <p className="text-xs text-muted-foreground">
            <strong>Setup Instructions:</strong> In your WooCommerce admin, go to Settings → Advanced → REST API. 
            Create new keys with Read permissions for Products and Orders.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
