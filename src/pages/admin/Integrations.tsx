import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, CheckCircle, XCircle, FileText } from "lucide-react";
import { toast } from "sonner";
import { logIntegrationAction } from "@/lib/auditLog";

interface Integration {
  id: string;
  name: string;
  type: string;
  description: string;
  status: "active" | "inactive" | "error";
  connectedUsers: number;
  icon: any;
}

const integrations: Integration[] = [
  {
    id: "shopify",
    name: "Shopify",
    type: "ecommerce",
    description: "Track purchases and cart activity from Shopify stores",
    status: "active",
    connectedUsers: 0,
    icon: Settings,
  },
  {
    id: "woocommerce",
    name: "WooCommerce",
    type: "ecommerce",
    description: "Capture orders from WooCommerce websites",
    status: "active",
    connectedUsers: 0,
    icon: Settings,
  },
  {
    id: "stripe",
    name: "Stripe",
    type: "payment",
    description: "Monitor payments and subscriptions",
    status: "active",
    connectedUsers: 0,
    icon: Settings,
  },
  {
    id: "zapier",
    name: "Zapier",
    type: "automation",
    description: "Connect to 5000+ apps via Zapier",
    status: "inactive",
    connectedUsers: 0,
    icon: Settings,
  },
  {
    id: "google_reviews",
    name: "Google Reviews",
    type: "social",
    description: "Display Google Business reviews",
    status: "inactive",
    connectedUsers: 0,
    icon: Settings,
  },
];

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
        .select("integration_type");

      // Map to Integration format
      const availableIntegrations = [
        {
          id: "shopify",
          name: "Shopify",
          type: "ecommerce",
          description: "Track purchases and cart activity from Shopify stores",
          icon: Settings,
        },
        {
          id: "woocommerce",
          name: "WooCommerce",
          type: "ecommerce",
          description: "Capture orders from WooCommerce websites",
          icon: Settings,
        },
        {
          id: "stripe",
          name: "Stripe",
          type: "payment",
          description: "Monitor payments and subscriptions",
          icon: Settings,
        },
        {
          id: "zapier",
          name: "Zapier",
          type: "automation",
          description: "Connect to 5000+ apps via Zapier",
          icon: Settings,
        },
        {
          id: "google_reviews",
          name: "Google Reviews",
          type: "social",
          description: "Display Google Business reviews",
          icon: Settings,
        },
      ];

      const mappedIntegrations = availableIntegrations.map(int => {
        const config = configsData?.find(c => c.integration_type === int.id);
        const userCount = connectorsData?.filter(c => c.integration_type === int.id).length || 0;
        
        return {
          ...int,
          status: config?.is_active ? "active" : "inactive",
          connectedUsers: userCount,
        } as Integration;
      });

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
      const { error } = await supabase
        .from("integrations_config")
        .upsert({
          integration_type: selectedIntegration.id,
          config: configForm,
          is_active: true,
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

  const handleTestIntegration = async () => {
    if (!selectedIntegration) return;

    try {
      // Log the test action
      await supabase.from("integration_logs").insert({
        integration_type: selectedIntegration.id,
        action: "test_connection",
        status: "success",
        details: { message: "Manual test triggered" },
      });

      await logIntegrationAction(
        "integration_tested",
        selectedIntegration.id,
        { integration: selectedIntegration.name }
      );

      toast.success(`${selectedIntegration.name} connection test initiated`);
    } catch (error) {
      console.error("Error testing integration:", error);
      toast.error("Integration test failed");
    }
  };

  if (authLoading || loading) {
    return <div className="flex items-center justify-center h-full">Loading...</div>;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Integrations Management</h1>
        <p className="text-muted-foreground">
          Configure and manage third-party integrations
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {integrations.map((integration) => {
          const Icon = integration.icon;
          return (
            <Card key={integration.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{integration.name}</CardTitle>
                      <Badge
                        variant={integration.status === "active" ? "default" : "secondary"}
                        className="mt-1"
                      >
                        {integration.status === "active" ? (
                          <CheckCircle className="h-3 w-3 mr-1" />
                        ) : (
                          <XCircle className="h-3 w-3 mr-1" />
                        )}
                        {integration.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  {integration.description}
                </p>
                <div className="flex items-center justify-between text-sm mb-4">
                  <span className="text-muted-foreground">Connected users:</span>
                  <span className="font-medium">{integration.connectedUsers}</span>
                </div>
                <Dialog open={dialogOpen && selectedIntegration?.id === integration.id} onOpenChange={(open) => {
                  setDialogOpen(open);
                  if (open) {
                    setSelectedIntegration(integration);
                    fetchLogsForIntegration(integration.id);
                  }
                }}>
                  <DialogTrigger asChild>
                    <Button className="w-full">
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
                          <div className="bg-muted p-3 rounded-md">
                            <p className="text-sm text-muted-foreground">
                              <strong>Webhook URL (Read-only):</strong>
                              <br />
                              <code className="text-xs">
                                https://api.notiproof.com/webhooks/{integration.id}
                              </code>
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button onClick={handleTestIntegration} variant="outline" className="flex-1">
                              Test Connection
                            </Button>
                            <Button onClick={handleSaveConfig} className="flex-1">
                              Save Configuration
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
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
