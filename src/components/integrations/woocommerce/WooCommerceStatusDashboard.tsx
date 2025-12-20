import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  Package, 
  RefreshCw, 
  Clock, 
  CheckCircle,
  AlertCircle,
  ShoppingCart,
  Eye,
  MousePointer,
  Loader2,
  Database,
  Zap,
  ExternalLink
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";

interface WooCommerceStatusDashboardProps {
  connectorId: string;
  websiteId: string;
  siteUrl: string;
  consumerKey: string;
  consumerSecret: string;
}

interface SyncStats {
  products_synced: number;
  last_product_sync: string | null;
  total_orders: number;
  webhook_orders: number;
  imported_orders: number;
  last_order_event: string | null;
  total_views: number;
  total_clicks: number;
}

export function WooCommerceStatusDashboard({
  connectorId,
  websiteId,
  siteUrl,
  consumerKey,
  consumerSecret
}: WooCommerceStatusDashboardProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [stats, setStats] = useState<SyncStats>({
    products_synced: 0,
    last_product_sync: null,
    total_orders: 0,
    webhook_orders: 0,
    imported_orders: 0,
    last_order_event: null,
    total_views: 0,
    total_clicks: 0,
  });

  useEffect(() => {
    fetchStats();
  }, [connectorId, websiteId]);

  const fetchStats = async () => {
    try {
      setLoading(true);

      // Get connector info
      const { data: connector } = await supabase
        .from('integration_connectors')
        .select('last_sync, last_sync_status')
        .eq('id', connectorId)
        .single();

      // Count synced products
      const { count: productCount } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('website_id', websiteId);

      // Get all WooCommerce events
      const { data: events } = await supabase
        .from('events')
        .select('views, clicks, event_data, created_at')
        .eq('integration_type', 'woocommerce')
        .eq('website_id', websiteId)
        .order('created_at', { ascending: false });

      // Calculate stats from events
      let webhookCount = 0;
      let importCount = 0;
      let totalViews = 0;
      let totalClicks = 0;
      
      events?.forEach((e: any) => {
        totalViews += e.views || 0;
        totalClicks += e.clicks || 0;
        const eventData = e.event_data as Record<string, any> | null;
        if (eventData?.source_type === 'webhook') {
          webhookCount++;
        } else if (eventData?.source_type === 'import' || eventData?.imported) {
          importCount++;
        }
      });

      setStats({
        products_synced: productCount || 0,
        last_product_sync: connector?.last_sync || null,
        total_orders: events?.length || 0,
        webhook_orders: webhookCount,
        imported_orders: importCount,
        last_order_event: events?.[0]?.created_at || null,
        total_views: totalViews,
        total_clicks: totalClicks,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResync = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-woocommerce-products', {
        body: {
          action: 'sync',
          connector_id: connectorId,
          website_id: websiteId,
          site_url: siteUrl,
          consumer_key: consumerKey,
          consumer_secret: consumerSecret,
        },
      });

      if (error) throw error;

      toast.success(`Synced ${data?.products_synced || 0} products`);
      fetchStats();
    } catch (error: any) {
      console.error('Sync error:', error);
      toast.error("Failed to sync products");
    } finally {
      setSyncing(false);
    }
  };

  const formatTime = (timestamp: string | null) => {
    if (!timestamp) return 'Never';
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
  };

  if (loading) {
    return (
      <Card className="border border-border">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Integration Status</CardTitle>
            <CardDescription className="text-xs">
              WooCommerce sync and order status
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/woocommerce-orders')}
            >
              <ExternalLink className="h-3 w-3 mr-2" />
              Manage Orders
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleResync}
              disabled={syncing}
            >
              {syncing ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3" />
              )}
              <span className="ml-2">{syncing ? 'Syncing...' : 'Resync'}</span>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* REST API Stats */}
        <div className="rounded-lg border border-border p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-blue-500" />
            <span className="font-medium text-sm">REST API (Product Sync)</span>
            <Badge variant="outline" className="ml-auto text-xs">Pull-based</Badge>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                <span className="text-2xl font-bold">{stats.products_synced}</span>
              </div>
              <p className="text-xs text-muted-foreground">Products Synced</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{formatTime(stats.last_product_sync)}</span>
              </div>
              <p className="text-xs text-muted-foreground">Last Sync</p>
            </div>
          </div>
        </div>

        {/* Order Stats - Combined View */}
        <div className="rounded-lg border border-border p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-orange-500" />
            <span className="font-medium text-sm">Order Notifications</span>
            <Badge variant="outline" className="ml-auto text-xs">Real-time + Import</Badge>
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                <span className="text-2xl font-bold">{stats.total_orders}</span>
              </div>
              <p className="text-xs text-muted-foreground">Total Orders</p>
            </div>
            <div className="space-y-1 text-center">
              <div className="flex items-center justify-center gap-1">
                <Zap className="h-3 w-3 text-orange-400" />
                <span className="text-lg font-semibold">{stats.webhook_orders}</span>
              </div>
              <p className="text-xs text-muted-foreground">Via Webhook</p>
            </div>
            <div className="space-y-1 text-center">
              <div className="flex items-center justify-center gap-1">
                <Database className="h-3 w-3 text-blue-400" />
                <span className="text-lg font-semibold">{stats.imported_orders}</span>
              </div>
              <p className="text-xs text-muted-foreground">Via Import</p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>Last order: {formatTime(stats.last_order_event)}</span>
          </div>

          {stats.total_orders === 0 && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 rounded p-2">
              <AlertCircle className="h-3 w-3" />
              <div>
                <p><strong>No orders yet.</strong> You can:</p>
                <ul className="list-disc list-inside mt-1">
                  <li>Set up webhooks for real-time notifications</li>
                  <li>Import historical orders from the Import tab</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Notification Performance */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Notification Performance</h4>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 rounded-lg bg-muted/30">
              <Eye className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
              <span className="text-lg font-bold">{stats.total_views.toLocaleString()}</span>
              <p className="text-xs text-muted-foreground">Views</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/30">
              <MousePointer className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
              <span className="text-lg font-bold">{stats.total_clicks.toLocaleString()}</span>
              <p className="text-xs text-muted-foreground">Clicks</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/30">
              <CheckCircle className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
              <span className="text-lg font-bold">
                {stats.total_views > 0 ? ((stats.total_clicks / stats.total_views) * 100).toFixed(1) : 0}%
              </span>
              <p className="text-xs text-muted-foreground">CTR</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
