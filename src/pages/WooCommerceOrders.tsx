import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  ShoppingCart, 
  Search, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  Eye, 
  MousePointer, 
  Trash2,
  Home,
  ArrowLeft,
  Loader2,
  Package,
  TrendingUp,
  Clock,
  Filter,
  Settings,
  Webhook,
  History,
  Activity,
  EyeOff
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useWebsiteContext } from "@/contexts/WebsiteContext";
import { formatDistanceToNow } from "date-fns";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { WooCommerceWebhookSetup } from "@/components/integrations/woocommerce/WooCommerceWebhookSetup";
import { WooCommerceStatusDashboard } from "@/components/integrations/woocommerce/WooCommerceStatusDashboard";
import { WooCommerceHistoricalImport } from "@/components/integrations/woocommerce/WooCommerceHistoricalImport";

interface WooCommerceEvent {
  id: string;
  message_template: string;
  user_name: string;
  user_location: string | null;
  created_at: string;
  status: string;
  moderation_status: string;
  views: number;
  clicks: number;
  event_data: Record<string, any> | null;
}

interface Stats {
  total_orders: number;
  webhook_orders: number;
  imported_orders: number;
  total_views: number;
  total_clicks: number;
  ctr: number;
  pending_count: number;
  approved_count: number;
  rejected_count: number;
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

export default function WooCommerceOrders() {
  const navigate = useNavigate();
  const { currentWebsite } = useWebsiteContext();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<WooCommerceEvent[]>([]);
  const [stats, setStats] = useState<Stats>({
    total_orders: 0,
    webhook_orders: 0,
    imported_orders: 0,
    total_views: 0,
    total_clicks: 0,
    ctr: 0,
    pending_count: 0,
    approved_count: 0,
    rejected_count: 0,
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedEvents, setSelectedEvents] = useState<Set<string>>(new Set());
  const [syncing, setSyncing] = useState(false);
  const [connector, setConnector] = useState<ConnectorData | null>(null);
  const [activeTab, setActiveTab] = useState("orders");

  // Settings state
  const [settingsSiteUrl, setSettingsSiteUrl] = useState("");
  const [settingsConsumerKey, setSettingsConsumerKey] = useState("");
  const [settingsConsumerSecret, setSettingsConsumerSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    if (currentWebsite?.id) {
      fetchConnector();
      fetchEvents();
    }
  }, [currentWebsite?.id, statusFilter]);

  const fetchConnector = async () => {
    if (!currentWebsite?.id) return;
    
    try {
      const { data } = await supabase
        .from('integration_connectors')
        .select('*')
        .eq('website_id', currentWebsite.id)
        .eq('integration_type', 'woocommerce')
        .eq('status', 'active')
        .single();

      if (data) {
        const config = data.config as { site_url?: string; consumer_key?: string; consumer_secret?: string } | null;
        const connectorData: ConnectorData = {
          id: data.id,
          config: {
            site_url: config?.site_url || '',
            consumer_key: config?.consumer_key || '',
            consumer_secret: config?.consumer_secret || '',
          },
          status: data.status || 'active',
        };
        setConnector(connectorData);
        setSettingsSiteUrl(config?.site_url || '');
        setSettingsConsumerKey(config?.consumer_key || '');
        setSettingsConsumerSecret(config?.consumer_secret || '');
      }
    } catch (error) {
      console.error('Error fetching connector:', error);
    }
  };

  const fetchEvents = async () => {
    if (!currentWebsite?.id) return;
    
    try {
      setLoading(true);
      
      let query = supabase
        .from('events')
        .select('*')
        .eq('website_id', currentWebsite.id)
        .eq('integration_type', 'woocommerce')
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('moderation_status', statusFilter as 'pending' | 'approved' | 'rejected' | 'flagged');
      }

      const { data, error } = await query.limit(100);

      if (error) throw error;

      const mappedEvents: WooCommerceEvent[] = (data || []).map(e => ({
        ...e,
        event_data: e.event_data as Record<string, any> | null,
      }));

      setEvents(mappedEvents);

      // Calculate stats
      const allEvents = mappedEvents;
      const webhookOrders = allEvents.filter(e => (e.event_data as any)?.source_type === 'webhook').length;
      const importedOrders = allEvents.filter(e => (e.event_data as any)?.source_type === 'import' || (e.event_data as any)?.imported).length;
      const totalViews = allEvents.reduce((sum, e) => sum + (e.views || 0), 0);
      const totalClicks = allEvents.reduce((sum, e) => sum + (e.clicks || 0), 0);
      
      setStats({
        total_orders: allEvents.length,
        webhook_orders: webhookOrders,
        imported_orders: importedOrders,
        total_views: totalViews,
        total_clicks: totalClicks,
        ctr: totalViews > 0 ? (totalClicks / totalViews) * 100 : 0,
        pending_count: allEvents.filter(e => e.moderation_status === 'pending').length,
        approved_count: allEvents.filter(e => e.moderation_status === 'approved').length,
        rejected_count: allEvents.filter(e => e.moderation_status === 'rejected').length,
      });

    } catch (error) {
      console.error('Error fetching events:', error);
      toast.error('Failed to load WooCommerce orders');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (eventIds: string[]) => {
    try {
      const { error } = await supabase
        .from('events')
        .update({ moderation_status: 'approved', status: 'approved' })
        .in('id', eventIds);

      if (error) throw error;
      
      toast.success(`Approved ${eventIds.length} event(s)`);
      setSelectedEvents(new Set());
      fetchEvents();
    } catch (error) {
      console.error('Error approving events:', error);
      toast.error('Failed to approve events');
    }
  };

  const handleReject = async (eventIds: string[]) => {
    try {
      const { error } = await supabase
        .from('events')
        .update({ moderation_status: 'rejected', status: 'rejected' })
        .in('id', eventIds);

      if (error) throw error;
      
      toast.success(`Rejected ${eventIds.length} event(s)`);
      setSelectedEvents(new Set());
      fetchEvents();
    } catch (error) {
      console.error('Error rejecting events:', error);
      toast.error('Failed to reject events');
    }
  };

  const handleDelete = async (eventIds: string[]) => {
    if (!confirm(`Are you sure you want to delete ${eventIds.length} event(s)?`)) return;
    
    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .in('id', eventIds);

      if (error) throw error;
      
      toast.success(`Deleted ${eventIds.length} event(s)`);
      setSelectedEvents(new Set());
      fetchEvents();
    } catch (error) {
      console.error('Error deleting events:', error);
      toast.error('Failed to delete events');
    }
  };

  const handleResync = async () => {
    if (!currentWebsite?.id || !connector) return;
    
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('import-woocommerce-orders', {
        body: {
          connector_id: connector.id,
          website_id: currentWebsite.id,
          site_url: connector.config.site_url,
          consumer_key: connector.config.consumer_key,
          consumer_secret: connector.config.consumer_secret,
          days_back: 30,
        },
      });

      if (error) throw error;

      toast.success(`Synced ${data?.events_created || 0} new orders`);
      fetchEvents();
    } catch (error) {
      console.error('Sync error:', error);
      toast.error('Failed to sync orders');
    } finally {
      setSyncing(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!connector) return;
    
    setSavingSettings(true);
    try {
      const { error } = await supabase
        .from('integration_connectors')
        .update({
          config: {
            site_url: settingsSiteUrl,
            consumer_key: settingsConsumerKey,
            consumer_secret: settingsConsumerSecret,
          },
        })
        .eq('id', connector.id);

      if (error) throw error;

      toast.success('Settings saved successfully');
      fetchConnector();
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSavingSettings(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedEvents.size === filteredEvents.length) {
      setSelectedEvents(new Set());
    } else {
      setSelectedEvents(new Set(filteredEvents.map(e => e.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedEvents);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedEvents(newSelected);
  };

  const filteredEvents = events.filter(event => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      event.user_name?.toLowerCase().includes(query) ||
      event.event_data?.product_name?.toLowerCase().includes(query) ||
      event.user_location?.toLowerCase().includes(query)
    );
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge variant="default" className="bg-green-500">Approved</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (!currentWebsite?.id) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4">
        <p className="text-muted-foreground">Please select a website first</p>
        <Button onClick={() => navigate('/websites')}>Go to Websites</Button>
      </div>
    );
  }

  if (!connector) {
    return (
      <div className="mx-auto max-w-7xl space-y-6">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/dashboard"><Home className="h-4 w-4" /></BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="/integrations">Integrations</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>WooCommerce Orders</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <ShoppingCart className="h-12 w-12 text-muted-foreground" />
          <h2 className="text-xl font-semibold">WooCommerce Not Connected</h2>
          <p className="text-muted-foreground text-center max-w-md">
            You need to connect your WooCommerce store first before you can manage orders.
          </p>
          <Button onClick={() => navigate('/integrations')}>
            Go to Integrations
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard"><Home className="h-4 w-4" /></BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/integrations">Integrations</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>WooCommerce Orders</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/integrations')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <ShoppingCart className="h-8 w-8 text-primary" />
              WooCommerce Management
            </h1>
            <p className="text-muted-foreground">Manage orders, webhooks, imports, and settings</p>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="orders" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Orders
            {stats.pending_count > 0 && (
              <Badge variant="secondary" className="ml-1">{stats.pending_count}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="status" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Status
          </TabsTrigger>
          <TabsTrigger value="webhooks" className="flex items-center gap-2">
            <Webhook className="h-4 w-4" />
            Webhooks
          </TabsTrigger>
          <TabsTrigger value="import" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Import
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        {/* Orders Tab */}
        <TabsContent value="orders" className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <span className="text-2xl font-bold">{stats.total_orders}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Total Orders</p>
                <p className="text-xs text-muted-foreground">
                  Webhook: {stats.webhook_orders} | Import: {stats.imported_orders}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-muted-foreground" />
                  <span className="text-2xl font-bold">{stats.total_views.toLocaleString()}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Total Views</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <MousePointer className="h-4 w-4 text-muted-foreground" />
                  <span className="text-2xl font-bold">{stats.total_clicks.toLocaleString()}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Total Clicks</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <span className="text-2xl font-bold">{stats.ctr.toFixed(1)}%</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Click-Through Rate</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-2xl font-bold">{stats.approved_count}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Approved</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-yellow-500" />
                  <span className="text-2xl font-bold">{stats.pending_count}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Pending Review</p>
              </CardContent>
            </Card>
          </div>

          {/* Filters and Actions */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                <div className="flex flex-1 gap-4 items-center">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search orders..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[150px]">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={handleResync} disabled={syncing} variant="outline">
                    {syncing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                    {syncing ? 'Syncing...' : 'Re-sync'}
                  </Button>
                </div>
                
                {selectedEvents.size > 0 && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleApprove(Array.from(selectedEvents))}>
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Approve ({selectedEvents.size})
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleReject(Array.from(selectedEvents))}>
                      <XCircle className="h-4 w-4 mr-1" />
                      Reject ({selectedEvents.size})
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(Array.from(selectedEvents))}>
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete ({selectedEvents.size})
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Events List */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Orders ({filteredEvents.length})</CardTitle>
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={selectedEvents.size === filteredEvents.length && filteredEvents.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                  <span className="text-sm text-muted-foreground">Select All</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredEvents.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No WooCommerce orders found</p>
                  <p className="text-sm">Orders will appear here after webhooks are configured or imports are run.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredEvents.map((event) => (
                    <div
                      key={event.id}
                      className={`flex items-center gap-4 p-4 rounded-lg border transition-colors ${
                        selectedEvents.has(event.id) ? 'bg-primary/5 border-primary/20' : 'hover:bg-muted/50'
                      }`}
                    >
                      <Checkbox
                        checked={selectedEvents.has(event.id)}
                        onCheckedChange={() => toggleSelect(event.id)}
                      />
                      
                      {event.event_data?.product_image ? (
                        <img
                          src={event.event_data.product_image}
                          alt=""
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                          <ShoppingCart className="h-5 w-5 text-primary" />
                        </div>
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{event.user_name}</span>
                          {event.user_location && (
                            <span className="text-sm text-muted-foreground">from {event.user_location}</span>
                          )}
                          {getStatusBadge(event.moderation_status)}
                          <Badge variant="outline" className="text-xs">
                            {event.event_data?.source_type === 'webhook' ? 'Webhook' : 'Import'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {event.event_data?.product_name || 'Product'}
                          {event.event_data?.total && ` - ${event.event_data.currency || '$'}${event.event_data.total}`}
                        </p>
                        <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                          <span>{formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}</span>
                          <span className="flex items-center gap-1">
                            <Eye className="h-3 w-3" /> {event.views || 0}
                          </span>
                          <span className="flex items-center gap-1">
                            <MousePointer className="h-3 w-3" /> {event.clicks || 0}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {event.moderation_status === 'pending' && (
                          <>
                            <Button size="icon" variant="ghost" onClick={() => handleApprove([event.id])}>
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => handleReject([event.id])}>
                              <XCircle className="h-4 w-4 text-red-500" />
                            </Button>
                          </>
                        )}
                        <Button size="icon" variant="ghost" onClick={() => handleDelete([event.id])}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Status Tab */}
        <TabsContent value="status" className="space-y-6">
          <WooCommerceStatusDashboard
            connectorId={connector.id}
            websiteId={currentWebsite.id}
            siteUrl={connector.config.site_url}
            consumerKey={connector.config.consumer_key}
            consumerSecret={connector.config.consumer_secret}
          />
        </TabsContent>

        {/* Webhooks Tab */}
        <TabsContent value="webhooks" className="space-y-6">
          <WooCommerceWebhookSetup
            connectorId={connector.id}
            websiteId={currentWebsite.id}
            siteUrl={connector.config.site_url}
            consumerSecret={connector.config.consumer_secret}
          />
        </TabsContent>

        {/* Import Tab */}
        <TabsContent value="import" className="space-y-6">
          <WooCommerceHistoricalImport
            connectorId={connector.id}
            websiteId={currentWebsite.id}
            siteUrl={connector.config.site_url}
            consumerKey={connector.config.consumer_key}
            consumerSecret={connector.config.consumer_secret}
          />
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Connection Settings</CardTitle>
              <CardDescription>
                Update your WooCommerce API credentials
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="settings-site-url">Store URL</Label>
                <Input
                  id="settings-site-url"
                  type="url"
                  placeholder="https://yourstore.com"
                  value={settingsSiteUrl}
                  onChange={(e) => setSettingsSiteUrl(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="settings-consumer-key">Consumer Key</Label>
                <Input
                  id="settings-consumer-key"
                  type="text"
                  placeholder="ck_..."
                  value={settingsConsumerKey}
                  onChange={(e) => setSettingsConsumerKey(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="settings-consumer-secret">Consumer Secret</Label>
                <div className="relative">
                  <Input
                    id="settings-consumer-secret"
                    type={showSecret ? "text" : "password"}
                    placeholder="cs_..."
                    value={settingsConsumerSecret}
                    onChange={(e) => setSettingsConsumerSecret(e.target.value)}
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

              <Button onClick={handleSaveSettings} disabled={savingSettings}>
                {savingSettings ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Settings'
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
