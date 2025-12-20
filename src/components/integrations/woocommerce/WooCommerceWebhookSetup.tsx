import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Copy, 
  CheckCircle, 
  ExternalLink, 
  Webhook, 
  Loader2,
  AlertCircle,
  Info
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface WooCommerceWebhookSetupProps {
  connectorId: string;
  websiteId: string;
  siteUrl: string;
  consumerSecret: string;
  onWebhookVerified?: () => void;
}

export function WooCommerceWebhookSetup({ 
  connectorId, 
  websiteId,
  siteUrl, 
  consumerSecret,
  onWebhookVerified 
}: WooCommerceWebhookSetupProps) {
  const [testing, setTesting] = useState(false);
  const [webhookStatus, setWebhookStatus] = useState<'unknown' | 'pending' | 'verified' | 'failed'>('unknown');
  const [lastTestedAt, setLastTestedAt] = useState<string | null>(null);

  const webhookUrl = `https://ewymvxhpkswhsirdrjub.supabase.co/functions/v1/webhook-woocommerce?site_url=${encodeURIComponent(siteUrl)}`;

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied to clipboard`);
    } catch {
      toast.error("Failed to copy");
    }
  };

  const testWebhook = async (showToasts = true) => {
    setTesting(true);
    setWebhookStatus('pending');
    
    try {
      console.log('[Webhook Verify] Checking for website:', websiteId, 'Site URL:', siteUrl);
      
      // Get widgets for this website to check for events
      const { data: widgets, error: widgetsError } = await supabase
        .from('widgets')
        .select('id')
        .eq('website_id', websiteId);
      
      if (widgetsError) {
        console.error('[Webhook Verify] Widget query error:', widgetsError);
        throw widgetsError;
      }
      
      console.log('[Webhook Verify] Found widgets:', widgets?.length || 0, widgets);
      
      if (!widgets?.length) {
        setWebhookStatus('pending');
        if (showToasts) toast.info("No widgets configured yet. Create a widget first, then place a test order.");
        setTesting(false);
        return;
      }
      
      const widgetIds = widgets.map(w => w.id);
      console.log('[Webhook Verify] Widget IDs:', widgetIds);
      
      // Check events table for recent WooCommerce purchase events (users have RLS access to their events)
      const { data: events, error } = await supabase
        .from('events')
        .select('id, created_at, user_name, event_data')
        .in('widget_id', widgetIds)
        .eq('event_type', 'purchase')
        .eq('integration_type', 'woocommerce')
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('[Webhook Verify] Events query error:', error);
        throw error;
      }
      
      console.log('[Webhook Verify] Found events:', events?.length || 0, events);

      // Check if there's a recent successful webhook event
      if (events && events.length > 0) {
        const lastEvent = events[0];
        setWebhookStatus('verified');
        setLastTestedAt(lastEvent.created_at);
        if (showToasts) {
          toast.success(`Webhook verified! Last order from ${lastEvent.user_name || 'customer'} - ${formatTimeAgo(lastEvent.created_at)}`);
        }
        onWebhookVerified?.();
        return;
      }

      // No recent webhook activity - show instructions
      setWebhookStatus('pending');
      if (showToasts) {
        toast.info("No WooCommerce orders found. Import orders or wait for a new order to come through.");
      }
      
    } catch (error: any) {
      console.error('[Webhook Verify] Error:', error);
      setWebhookStatus('failed');
      if (showToasts) toast.error("Failed to verify webhook status");
    } finally {
      setTesting(false);
    }
  };

  // Auto-verify on component mount
  useEffect(() => {
    testWebhook(false);
  }, [websiteId]);

  const formatTimeAgo = (timestamp: string): string => {
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  return (
    <Card className="border border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10">
              <Webhook className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <CardTitle className="text-base">Real-time Order Webhooks</CardTitle>
              <CardDescription className="text-xs">
                Receive instant notifications when orders are placed
              </CardDescription>
            </div>
          </div>
          <Badge variant={
            webhookStatus === 'verified' ? 'default' :
            webhookStatus === 'pending' ? 'secondary' : 'outline'
          }>
            {webhookStatus === 'verified' ? 'Active' :
             webhookStatus === 'pending' ? 'Pending Setup' : 'Not Configured'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="bg-muted/50 border-muted">
          <Info className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Webhooks send real-time order data to NotiProof, enabling instant social proof notifications when customers make purchases.
            <br />
            <span className="text-muted-foreground mt-1 block">Checking orders for: <strong className="text-foreground">{siteUrl}</strong></span>
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          <div className="space-y-2">
            <Label className="text-xs font-medium">Webhook URL</Label>
            <div className="flex gap-2">
              <Input
                readOnly
                value={webhookUrl}
                className="text-xs font-mono bg-muted/30"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(webhookUrl, "Webhook URL")}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium">Webhook Secret</Label>
            <div className="flex gap-2">
              <Input
                readOnly
                value={consumerSecret}
                type="password"
                className="text-xs font-mono bg-muted/30"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(consumerSecret, "Secret")}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Use your Consumer Secret as the webhook secret for HMAC verification
            </p>
          </div>
        </div>

        <div className="bg-muted/30 rounded-lg p-4 space-y-3">
          <h4 className="text-sm font-medium">Setup Instructions</h4>
          <ol className="text-xs text-muted-foreground space-y-2 list-decimal list-inside">
            <li>Go to your WooCommerce admin panel</li>
            <li>Navigate to <strong>WooCommerce → Settings → Advanced → Webhooks</strong></li>
            <li>Click <strong>"Add webhook"</strong></li>
            <li>Set Name: <strong>NotiProof Orders</strong></li>
            <li>Set Status: <strong>Active</strong></li>
            <li>Set Topic: <strong>Order created</strong></li>
            <li>Paste the <strong>Delivery URL</strong> from above</li>
            <li>Set Secret: Use your <strong>Consumer Secret</strong></li>
            <li>Set API Version: <strong>WP REST API Integration v3</strong></li>
            <li>Click <strong>Save webhook</strong></li>
          </ol>
          
          <Button
            variant="link"
            size="sm"
            className="p-0 h-auto text-xs"
            onClick={() => window.open(`${siteUrl}/wp-admin/admin.php?page=wc-settings&tab=advanced&section=webhooks`, '_blank')}
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            Open WooCommerce Webhooks Settings
          </Button>
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="text-xs text-muted-foreground">
            {lastTestedAt && (
              <span className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3 text-success" />
                Last webhook: {formatTimeAgo(lastTestedAt)}
              </span>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => testWebhook(true)}
            disabled={testing}
          >
            {testing ? (
              <>
                <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                Checking...
              </>
            ) : webhookStatus === 'verified' ? (
              <>
                <CheckCircle className="h-3 w-3 mr-2 text-success" />
                Verified
              </>
            ) : (
              "Verify Webhook"
            )}
          </Button>
        </div>

        {webhookStatus === 'failed' && (
          <Alert variant="destructive" className="mt-2">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Could not verify webhook. Make sure you've completed the setup in WooCommerce and placed a test order.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
