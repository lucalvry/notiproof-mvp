import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, CheckCircle, XCircle, FileText, Activity, AlertCircle, TrendingUp, Database } from "lucide-react";
import { toast } from "sonner";
import { logIntegrationAction } from "@/lib/auditLog";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

interface Integration {
  id: string;
  name: string;
  type: string;
  description: string;
  status: "active" | "inactive" | "error";
  connectedUsers: number;
  icon: any;
  apiCalls?: number;
  errors?: number;
  errorRate?: string;
  is_active?: boolean;
  config?: any;
}

interface IntegrationStats {
  totalIntegrations: number;
  activeConnections: number;
  apiCalls24h: number;
  avgErrorRate: number;
}


export default function AdminIntegrations() {
  const { loading: authLoading } = useAdminAuth();
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [configForm, setConfigForm] = useState({
    clientId: "",
    clientSecret: "",
    webhookSecret: "",
    apiKey: "",
  });
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [stats, setStats] = useState<IntegrationStats>({
    totalIntegrations: 0,
    activeConnections: 0,
    apiCalls24h: 0,
    avgErrorRate: 0,
  });
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    if (!authLoading) {
      fetchIntegrations();
    }
  }, [authLoading]);

  const fetchIntegrations = async () => {
    try {
      setLoading(true);

      // Fetch integration configs
      const { data: configsData, error: configsError } = await supabase
        .from("integrations_config")
        .select("*");

      if (configsError) throw configsError;

      // Get count of connected users per integration type
      const { data: connectorsData } = await supabase
        .from("integration_connectors")
        .select("integration_type, status");

      // Get API call volumes (last 24h)
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: logsData } = await supabase
        .from("integration_logs")
        .select("integration_type, action, status")
        .gte("created_at", yesterday);

      // Map to Integration format
      const availableIntegrations = [
        {
          id: "shopify",
          name: "Shopify",
          type: "ecommerce",
          description: "Track purchases and cart activity from Shopify stores",
          icon: Database,
        },
        {
          id: "woocommerce",
          name: "WooCommerce",
          type: "ecommerce",
          description: "Capture orders from WooCommerce websites",
          icon: Database,
        },
        {
          id: "stripe",
          name: "Stripe",
          type: "payment",
          description: "Monitor payments and subscriptions",
          icon: Database,
        },
        {
          id: "webhook",
          name: "Generic Webhook",
          type: "webhook",
          description: "Accept HTTP POST requests from any external system",
          icon: Activity,
        },
        {
          id: "zapier",
          name: "Zapier",
          type: "automation",
          description: "Connect to 5000+ apps via Zapier",
          icon: Activity,
        },
        {
          id: "typeform",
          name: "Typeform",
          type: "forms",
          description: "Capture form submissions and display them as social proof notifications",
          icon: FileText,
        },
        {
          id: "calendly",
          name: "Calendly",
          type: "scheduling",
          description: "Show notifications when meetings are scheduled or canceled",
          icon: Activity,
        },
        {
          id: "ga4",
          name: "Google Analytics 4",
          type: "analytics",
          description: "Real-time active visitor tracking via GA4 Realtime API",
          icon: TrendingUp,
        },
        {
          id: "google_reviews",
          name: "Google Reviews",
          type: "social",
          description: "Display Google Business reviews",
          icon: Activity,
        },
      ];

      // Calculate stats
      let totalActiveConnections = 0;
      let totalApiCalls = 0;
      let totalErrors = 0;
      const chartDataMap: Record<string, any> = {};

      const mappedIntegrations = availableIntegrations.map(int => {
        const config = configsData?.find(c => c.integration_type === int.id);
        const activeConnectors = connectorsData?.filter(
          c => c.integration_type === int.id && c.status === 'active'
        ).length || 0;
        
        const integrationLogs = logsData?.filter(l => l.integration_type === int.id) || [];
        const apiCalls = integrationLogs.length;
        const errors = integrationLogs.filter(l => l.status === 'error').length;
        const errorRate = apiCalls > 0 ? ((errors / apiCalls) * 100).toFixed(2) : "0.00";

        totalActiveConnections += activeConnectors;
        totalApiCalls += apiCalls;
        totalErrors += errors;

        // Prepare chart data
        chartDataMap[int.id] = {
          name: int.name,
          calls: apiCalls,
          errors: errors,
        };
        
        return {
          ...int,
          status: config?.is_active ? "active" : "inactive",
          connectedUsers: activeConnectors,
          apiCalls,
          errors,
          errorRate,
          is_active: config?.is_active || false,
          config: config,
        } as Integration;
      });

      // Update stats
      const avgError = totalApiCalls > 0 ? ((totalErrors / totalApiCalls) * 100).toFixed(2) : "0.00";
      setStats({
        totalIntegrations: availableIntegrations.length,
        activeConnections: totalActiveConnections,
        apiCalls24h: totalApiCalls,
        avgErrorRate: parseFloat(avgError),
      });

      // Update chart data
      setChartData(Object.values(chartDataMap).filter(d => d.calls > 0));

      setIntegrations(mappedIntegrations);
    } catch (error) {
      console.error("Error fetching integrations:", error);
      toast.error("Failed to load integrations");
    } finally {
      setLoading(false);
    }
  };

  const fetchLogsForIntegration = async (integrationType: string) => {
    try {
      const { data, error } = await supabase
        .from("integration_logs")
        .select("*")
        .eq("integration_type", integrationType)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      setRecentLogs(data || []);
    } catch (error) {
      console.error("Error fetching logs:", error);
    }
  };

  const handleSaveConfig = async () => {
    if (!selectedIntegration) return;

    try {
      const config: any = { ...configForm };
      
      // Add rate limiting and quota config for webhook-based integrations
      if (selectedIntegration.type === 'webhook' || selectedIntegration.type === 'automation') {
        config.enabled_globally = true;
        config.rate_limit_per_user = 1000; // requests per hour
        config.quota_per_plan = {
          free: 1,
          pro: 5,
          business: 20
        };
      }

      // Add GA4-specific configuration
      if (selectedIntegration.type === 'analytics' && selectedIntegration.id === 'ga4') {
        config.enabled_globally = true;
        config.rate_limit_per_user = 240; // 4 requests per minute
        config.cache_duration_seconds = 15; // Cache for 15 seconds
        config.scopes = ['https://www.googleapis.com/auth/analytics.readonly'];
        config.redirect_uri = `${window.location.origin}/integrations/ga4/callback`;
      }

      const { error } = await supabase
        .from("integrations_config")
        .upsert({
          integration_type: selectedIntegration.id,
          config: config,
          is_active: true,
        }, {
          onConflict: 'integration_type'
        });

      if (error) throw error;

      await logIntegrationAction(
        "integration_configured",
        selectedIntegration.id,
        { integration: selectedIntegration.name }
      );

      toast.success(`${selectedIntegration.name} configuration saved`);
      setDialogOpen(false);
      fetchIntegrations();
    } catch (error) {
      console.error("Error saving config:", error);
      toast.error("Failed to save configuration");
    }
  };

  const checkIntegrationHealth = async (integration: Integration) => {
    try {
      const startTime = Date.now();
      toast.info(`Testing ${integration.name} connection...`);

      const { data, error } = await supabase.functions.invoke('test-integration', {
        body: { type: integration.id }
      });
      
      const duration = Date.now() - startTime;

      if (error) {
        await supabase.from("integration_logs").insert({
          integration_type: integration.id,
          action: "health_check",
          status: "error",
          details: { error: error.message, duration_ms: duration },
        });
        
        toast.error(`❌ ${integration.name} connection failed: ${error.message}`);
        return;
      }

      // Log successful health check
      await supabase.from("integration_logs").insert({
        integration_type: integration.id,
        action: "health_check",
        status: "success",
        details: { duration_ms: duration },
        duration_ms: duration,
      });

      await logIntegrationAction(
        "integration_health_check",
        integration.id,
        { integration: integration.name, latency: duration, status: 'healthy' }
      );

      toast.success(`✅ ${integration.name} is healthy (${duration}ms)`);
      
      // Refresh integration stats
      fetchIntegrations();
    } catch (error: any) {
      console.error("Health check error:", error);
      toast.error(`❌ ${integration.name} connection failed: ${error.message || 'Unknown error'}`);
    }
  };

  const handleTestIntegration = async () => {
    if (!selectedIntegration) return;
    await checkIntegrationHealth(selectedIntegration);
  };

  const toggleIntegration = async (integration: Integration) => {
    try {
      const newStatus = !integration.is_active;

      // If no config exists, create one with default values
      if (!integration.config?.id) {
        const defaultConfig = {
          enabled_globally: true,
          quota_per_plan: {
            free: 1,
            pro: 5,
            business: 20
          }
        };

        const { error: insertError } = await supabase
          .from("integrations_config")
          .insert({
            integration_type: integration.id,
            config: defaultConfig,
            is_active: newStatus,
          });

        if (insertError) throw insertError;

        toast.success(`Integration ${newStatus ? 'enabled' : 'disabled'} successfully`);
        if (!newStatus) {
          toast.info("Configure integration settings for best results");
        }
      } else {
        // Update existing config
        const { error } = await supabase
          .from("integrations_config")
          .update({ is_active: newStatus })
          .eq("id", integration.config.id);

        if (error) throw error;

        toast.success(`Integration ${newStatus ? 'enabled' : 'disabled'} successfully`);
      }

      await logIntegrationAction(
        newStatus ? "integration_enabled" : "integration_disabled",
        integration.id,
        { integration: integration.name }
      );

      fetchIntegrations();
    } catch (error) {
      console.error("Error toggling integration:", error);
      toast.error("Failed to update integration status");
    }
  };

  if (authLoading || loading) {
    return <div className="flex items-center justify-center h-full">Loading...</div>;
  }

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--destructive))', 'hsl(var(--warning))', 'hsl(var(--success))'];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Integration Management</h1>
        <p className="text-muted-foreground">
          Monitor and configure third-party integrations
        </p>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Integrations</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalIntegrations}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {integrations.filter(i => i.is_active).length} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Connections</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeConnections}</div>
            <p className="text-xs text-muted-foreground mt-1">
              User connectors
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">API Calls (24h)</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.apiCalls24h.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Last 24 hours
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Error Rate</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgErrorRate.toFixed(2)}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.avgErrorRate < 5 ? 'Healthy' : 'Needs attention'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* API Calls Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>API Activity (Last 24 Hours)</CardTitle>
            <CardDescription>Calls and errors per integration</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="calls" fill="hsl(var(--primary))" name="API Calls" />
                <Bar dataKey="errors" fill="hsl(var(--destructive))" name="Errors" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Integration Cards */}
      <div className="space-y-4">
        {integrations.map((integration) => {
          const Icon = integration.icon;
          return (
            <Card key={integration.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{integration.name}</CardTitle>
                      <div className="flex gap-2 mt-2">
                        <Badge
                          variant={integration.is_active ? "default" : "secondary"}
                        >
                          {integration.is_active ? (
                            <CheckCircle className="h-3 w-3 mr-1" />
                          ) : (
                            <XCircle className="h-3 w-3 mr-1" />
                          )}
                          {integration.is_active ? 'Active' : 'Disabled'}
                        </Badge>
                        <Badge variant="outline">
                          {integration.connectedUsers} connections
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <Switch
                    checked={integration.is_active}
                    onCheckedChange={() => toggleIntegration(integration)}
                  />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  {integration.description}
                </p>
                
                {/* Stats Grid */}
                <div className="grid gap-4 md:grid-cols-3 mb-4">
                  <div>
                    <p className="text-xs text-muted-foreground">API Calls (24h)</p>
                    <p className="text-xl font-bold">{integration.apiCalls || 0}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Errors (24h)</p>
                    <p className="text-xl font-bold text-destructive">{integration.errors || 0}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Error Rate</p>
                    <p className="text-xl font-bold">{integration.errorRate || '0.00'}%</p>
                  </div>
                </div>
                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Dialog open={dialogOpen && selectedIntegration?.id === integration.id} onOpenChange={(open) => {
                    setDialogOpen(open);
                    if (open) {
                      setSelectedIntegration(integration);
                      fetchLogsForIntegration(integration.id);
                    }
                  }}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="flex-1">
                        <Settings className="h-4 w-4 mr-2" />
                        Configure
                      </Button>
                    </DialogTrigger>
                  <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                      <DialogTitle>Configure {integration.name}</DialogTitle>
                      <DialogDescription>
                        Set up your {integration.name} integration
                      </DialogDescription>
                    </DialogHeader>
                    <Tabs defaultValue="config">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="config">Configuration</TabsTrigger>
                        <TabsTrigger value="logs">Logs</TabsTrigger>
                      </TabsList>
                      <TabsContent value="config" className="space-y-4">
                        <div className="space-y-4">
                          {integration.type === "ecommerce" && (
                            <>
                              <div className="space-y-2">
                                <Label htmlFor="clientId">Client ID</Label>
                                <Input
                                  id="clientId"
                                  placeholder="Enter client ID"
                                  value={configForm.clientId}
                                  onChange={(e) =>
                                    setConfigForm({ ...configForm, clientId: e.target.value })
                                  }
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="clientSecret">Client Secret</Label>
                                <Input
                                  id="clientSecret"
                                  type="password"
                                  placeholder="Enter client secret"
                                  value={configForm.clientSecret}
                                  onChange={(e) =>
                                    setConfigForm({ ...configForm, clientSecret: e.target.value })
                                  }
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="webhookSecret">Webhook Secret</Label>
                                <Input
                                  id="webhookSecret"
                                  type="password"
                                  placeholder="Enter webhook secret"
                                  value={configForm.webhookSecret}
                                  onChange={(e) =>
                                    setConfigForm({ ...configForm, webhookSecret: e.target.value })
                                  }
                                />
                              </div>
                            </>
                          )}
                          {integration.type === "webhook" && (
                            <div className="space-y-4">
                              <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                                <h4 className="font-medium mb-2">Global Webhook Configuration</h4>
                                <p className="text-sm text-muted-foreground mb-3">
                                  Configure rate limits and quotas for all webhook connectors.
                                </p>
                                <div className="space-y-2">
                                  <div className="flex justify-between text-sm">
                                    <span>Rate Limit:</span>
                                    <span className="font-medium">1,000 requests/hour per user</span>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <span>Free Plan Quota:</span>
                                    <span className="font-medium">1 connector</span>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <span>Pro Plan Quota:</span>
                                    <span className="font-medium">5 connectors</span>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <span>Business Plan Quota:</span>
                                    <span className="font-medium">20 connectors</span>
                                  </div>
                                </div>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Tokens are generated server-side for security. Users create webhooks through the Integrations page.
                              </p>
                            </div>
                          )}
                          {integration.type === "automation" && (
                            <div className="space-y-4">
                              <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                                <h4 className="font-medium mb-2">Zapier Integration Settings</h4>
                                <p className="text-sm text-muted-foreground mb-3">
                                  Configure rate limits and quotas for Zapier connectors.
                                </p>
                                <div className="space-y-2">
                                  <div className="flex justify-between text-sm">
                                    <span>Rate Limit:</span>
                                    <span className="font-medium">1,000 requests/hour per user</span>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <span>Free Plan Quota:</span>
                                    <span className="font-medium">1 connector</span>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <span>Pro Plan Quota:</span>
                                    <span className="font-medium">5 connectors</span>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <span>Business Plan Quota:</span>
                                    <span className="font-medium">20 connectors</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                          {integration.type === "analytics" && integration.id === "ga4" && (
                            <div className="space-y-4">
                              <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                                <h4 className="font-medium mb-2">Google Analytics 4 Configuration</h4>
                                <p className="text-sm text-muted-foreground mb-3">
                                  Replace old active visitor tracking with GA4 Realtime API for accurate, scalable data.
                                </p>
                                <div className="space-y-2">
                                  <div className="space-y-2">
                                    <Label htmlFor="clientId">OAuth Client ID</Label>
                                    <Input
                                      id="clientId"
                                      placeholder="Your Google Cloud OAuth Client ID"
                                      value={configForm.clientId}
                                      onChange={(e) =>
                                        setConfigForm({ ...configForm, clientId: e.target.value })
                                      }
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor="clientSecret">OAuth Client Secret</Label>
                                    <Input
                                      id="clientSecret"
                                      type="password"
                                      placeholder="Your Google Cloud OAuth Client Secret"
                                      value={configForm.clientSecret}
                                      onChange={(e) =>
                                        setConfigForm({ ...configForm, clientSecret: e.target.value })
                                      }
                                    />
                                  </div>
                                  <div className="flex justify-between text-sm mt-3">
                                    <span>Rate Limit:</span>
                                    <span className="font-medium">240 requests/hour per user</span>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <span>Cache Duration:</span>
                                    <span className="font-medium">15 seconds</span>
                                  </div>
                                </div>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Users will connect their GA4 properties via OAuth. Real-time visitor counts will be fetched from GA4 instead of polling the database.
                              </p>
                            </div>
                          )}
                          {integration.type === "social" && (
                            <div className="space-y-2">
                              <Label htmlFor="apiKey">API Key</Label>
                              <Input
                                id="apiKey"
                                type="password"
                                placeholder="Enter API key"
                                value={configForm.apiKey}
                                onChange={(e) =>
                                  setConfigForm({ ...configForm, apiKey: e.target.value })
                                }
                              />
                            </div>
                          )}
                          {integration.type !== "webhook" && integration.type !== "automation" && integration.type !== "analytics" && (
                            <div className="bg-muted p-3 rounded-md">
                              <p className="text-sm text-muted-foreground">
                                <strong>Webhook URL (Read-only):</strong>
                                <br />
                                <code className="text-xs">
                                  https://api.notiproof.com/webhooks/{integration.id}
                                </code>
                              </p>
                            </div>
                          )}
                          <div className="flex gap-2">
                            {integration.type !== "webhook" && integration.type !== "automation" && integration.type !== "analytics" && (
                              <Button onClick={handleTestIntegration} variant="outline" className="flex-1">
                                Test Connection
                              </Button>
                            )}
                            <Button onClick={handleSaveConfig} className="flex-1">
                              {integration.status === "active" ? "Update Configuration" : "Enable Integration"}
                            </Button>
                          </div>
                        </div>
                      </TabsContent>
                      <TabsContent value="logs" className="space-y-4">
                        <div className="space-y-2">
                          {recentLogs.length === 0 ? (
                            <div className="flex items-center gap-2 text-sm">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              <span className="text-muted-foreground">No recent logs</span>
                            </div>
                          ) : (
                            <div className="space-y-2 max-h-[300px] overflow-y-auto">
                              {recentLogs.map((log) => (
                                <div key={log.id} className="border rounded p-2 text-xs">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="font-medium">{log.action}</span>
                                    <Badge variant={log.status === "success" ? "default" : "destructive"} className="text-xs">
                                      {log.status}
                                    </Badge>
                                  </div>
                                  <p className="text-muted-foreground">
                                    {new Date(log.created_at).toLocaleString()}
                                  </p>
                                  {log.error_message && (
                                    <p className="text-destructive mt-1">{log.error_message}</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </TabsContent>
                    </Tabs>
                  </DialogContent>
                </Dialog>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={() => checkIntegrationHealth(integration)}
                  disabled={!integration.is_active}
                >
                  <Activity className="h-4 w-4 mr-2" />
                  Test Connection
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={() => {
                    setSelectedIntegration(integration);
                    fetchLogsForIntegration(integration.id);
                  }}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  View Logs
                </Button>
              </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
