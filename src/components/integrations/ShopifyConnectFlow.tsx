import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle, Shield, ExternalLink, Loader2, ShoppingBag, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ShopifyConnectFlowProps {
  integration: any;
  websiteId: string;
  onSuccess: () => void;
}

export function ShopifyConnectFlow({ integration, websiteId, onSuccess }: ShopifyConnectFlowProps) {
  const [shopDomain, setShopDomain] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      console.log('Received Shopify OAuth message:', event.data);
      
      if (event.data.type === 'oauth_success' && event.data.integration === 'shopify') {
        setConnecting(false);
        toast.success("Shopify connected! Syncing products...");
        
        // Trigger product sync after successful OAuth
        setSyncing(true);
        try {
          const { data, error } = await supabase.functions.invoke('sync-shopify-products', {
            body: {
              connector_id: event.data.connectorId,
              website_id: websiteId,
            },
          });

          if (error) throw error;
          
          toast.success(`Synced ${data?.products_synced || 0} products from Shopify!`);
        } catch (error: any) {
          console.error('Product sync error:', error);
          toast.warning("Connected but product sync failed. You can retry from settings.");
        } finally {
          setSyncing(false);
        }
        
        onSuccess();
      } else if (event.data.type === 'oauth_error' && event.data.integration === 'shopify') {
        console.error('Shopify OAuth error:', event.data);
        setConnecting(false);
        toast.error(event.data.error || 'Connection failed. Please try again.');
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [websiteId, onSuccess]);

  const normalizeShopDomain = (input: string): string => {
    let domain = input.trim().toLowerCase();
    
    // Remove protocol
    domain = domain.replace(/^https?:\/\//, '');
    
    // Remove trailing slashes
    domain = domain.replace(/\/+$/, '');
    
    // If it doesn't end with .myshopify.com, add it
    if (!domain.includes('.myshopify.com')) {
      // Remove any other domain extensions
      domain = domain.replace(/\.[a-z]+$/, '');
      domain = `${domain}.myshopify.com`;
    }
    
    return domain;
  };

  const handleOAuthConnect = async () => {
    if (!shopDomain.trim()) {
      toast.error("Please enter your Shopify store domain");
      return;
    }

    setConnecting(true);
    
    try {
      // Refresh session
      await supabase.auth.refreshSession();
      
      const normalizedDomain = normalizeShopDomain(shopDomain);
      
      const { data, error } = await supabase.functions.invoke('oauth-shopify', {
        body: {
          action: 'start',
          shop: normalizedDomain,
          website_id: websiteId,
          redirect_origin: window.location.origin,
        },
      });

      if (error) {
        if (error.message?.includes('not configured') || error.message?.includes('503')) {
          toast.error(
            "Shopify integration has not been configured yet. Please contact support.",
            { duration: 6000 }
          );
        } else {
          toast.error(`Connection error: ${error.message || 'Unknown error'}`);
        }
        setConnecting(false);
        return;
      }

      if (!data?.auth_url) {
        toast.error("OAuth configuration incomplete. Please contact support.");
        setConnecting(false);
        return;
      }

      // Open OAuth in popup
      const popup = window.open(
        data.auth_url,
        'shopify-oauth',
        'width=600,height=700,left=200,top=100'
      );

      if (!popup) {
        toast.error('Please allow popups for this site to complete authentication');
        setConnecting(false);
        return;
      }

      // Poll for popup close
      const pollTimer = setInterval(() => {
        if (popup.closed) {
          clearInterval(pollTimer);
          setConnecting(false);
        }
      }, 1000);
    } catch (error) {
      console.error('Shopify OAuth error:', error);
      toast.error('Failed to initiate Shopify connection. Please try again.');
      setConnecting(false);
    }
  };

  const Icon = integration.icon || ShoppingBag;

  return (
    <Card className="border-0 shadow-none">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
            <Icon className="h-6 w-6 text-primary" />
          </div>
          <div>
            <CardTitle>Connect Shopify</CardTitle>
            <CardDescription>Sync products and track purchases automatically</CardDescription>
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
            <span>Real-time purchase notifications</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle className="h-4 w-4 text-success" />
            <span>Inventory & stock tracking</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle className="h-4 w-4 text-success" />
            <span>Product images in notifications</span>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="shop-domain">Shopify Store Domain</Label>
            <Input
              id="shop-domain"
              type="text"
              placeholder="yourstore.myshopify.com"
              value={shopDomain}
              onChange={(e) => setShopDomain(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Enter your store name (e.g., "yourstore" or "yourstore.myshopify.com")
            </p>
          </div>

          <Button 
            size="lg" 
            className="w-full"
            onClick={handleOAuthConnect}
            disabled={connecting || syncing || !shopDomain.trim()}
          >
            {connecting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Connecting to Shopify...
              </>
            ) : syncing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Syncing Products...
              </>
            ) : (
              <>
                <ExternalLink className="h-4 w-4 mr-2" />
                Connect Shopify Store
              </>
            )}
          </Button>
        </div>

        <div className="bg-muted p-4 rounded-lg">
          <div className="flex items-start gap-2">
            <Shield className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div className="text-xs text-muted-foreground">
              <p className="font-medium mb-1">Secure OAuth Connection</p>
              <p>
                You'll be redirected to Shopify to authorize access. 
                We only request read permissions for products, orders, and inventory.
              </p>
            </div>
          </div>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          By connecting, you authorize read-only access to your Shopify store data
        </p>
      </CardContent>
    </Card>
  );
}
