import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, XCircle, Plug, RefreshCw, AlertCircle, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { IntegrationConnectionDialog } from "@/components/integrations/IntegrationConnectionDialog";
import { SocialProofConnectors } from "@/components/integrations/SocialProofConnectors";
import { getIntegrationMetadata } from "@/lib/integrationMetadata";

interface Integration {
  id: string;
  name: string;
  type: string;
  description: string;
  status: "connected" | "disconnected" | "error";
  lastSync?: string;
  eventCount?: number;
  icon: any;
  connector?: any;
}

export default function Integrations() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentWebsiteId, setCurrentWebsiteId] = useState<string | null>(null);
  const [integrationQuotas, setIntegrationQuotas] = useState<Record<string, { quota: number; used: number }>>({});

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const fetchIntegrations = async () => {
    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user's primary website
      const { data: websites } = await supabase
        .from("websites")
        .select("id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
        .limit(1);

      const websiteId = websites?.[0]?.id;
      setCurrentWebsiteId(websiteId);

      if (!websiteId) {
        toast.error("Please create a website first");
        return;
      }

      // Get user's subscription plan
      const { data: subscription } = await supabase
        .from('user_subscriptions')
        .select('plan:subscription_plans(*)')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();

      const userPlan = subscription?.plan?.name?.toLowerCase() || 'free';

      // Fetch integration configs - only active integrations from database
      const { data: configs } = await supabase
        .from('integrations_config')
        .select('*')
        .eq('is_active', true);

      if (!configs || configs.length === 0) {
        setIntegrations([]);
        setLoading(false);
        return;
      }

      // Fetch user's integration connectors
      const { data: connectors, error } = await supabase
        .from("integration_connectors")
        .select("*")
        .eq("website_id", websiteId);

      if (error) throw error;

      // Build integrations list dynamically from database configs
      const mappedIntegrations = configs.map(config => {
        const metadata = getIntegrationMetadata(config.integration_type);
        const connector = connectors?.find(c => c.integration_type === config.integration_type);
        const configData = config.config as any;
        const quota = configData?.quota_per_plan?.[userPlan] || 1;
        const used = connectors?.filter(c => c.integration_type === config.integration_type).length || 0;
        
        return {
          id: config.integration_type,
          name: metadata.displayName,
          type: metadata.type,
          description: metadata.description,
          icon: metadata.icon,
          status: connector ? (connector.status === "active" ? "connected" : "error") : "disconnected",
          lastSync: connector?.last_sync || undefined,
          connector: connector || undefined,
        } as Integration;
      });

      // Calculate quotas for each integration
      const quotas: Record<string, { quota: number; used: number }> = {};
      configs.forEach(config => {
        const configData = config.config as any;
        const quota = configData?.quota_per_plan?.[userPlan] || 1;
        const used = connectors?.filter(c => c.integration_type === config.integration_type).length || 0;
        quotas[config.integration_type] = { quota, used };
      });
      setIntegrationQuotas(quotas);

      setIntegrations(mappedIntegrations);
    } catch (error) {
      console.error("Error fetching integrations:", error);
      toast.error("Failed to load integrations");
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = (integration: Integration) => {
    setSelectedIntegration(integration);
    setDialogOpen(true);
  };

  const handleSync = async (integration: Integration) => {
    if (!integration.connector) return;

    try {
      toast.info("Syncing integration...");
      
      // Update last_sync timestamp
      const { error } = await supabase
        .from("integration_connectors")
        .update({ last_sync: new Date().toISOString() })
        .eq("id", integration.connector.id);

      if (error) throw error;

      toast.success("Sync initiated");
      fetchIntegrations();
    } catch (error) {
      console.error("Error syncing:", error);
      toast.error("Failed to sync integration");
    }
  };

  const handleDisconnect = async (integration: Integration) => {
    if (!integration.connector) return;

    try {
      const { error } = await supabase
        .from("integration_connectors")
        .delete()
        .eq("id", integration.connector.id);

      if (error) throw error;

      toast.success(`${integration.name} disconnected`);
      fetchIntegrations();
    } catch (error) {
      console.error("Error disconnecting:", error);
      toast.error("Failed to disconnect integration");
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full">Loading...</div>;
  }

  if (!currentWebsiteId) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4">
        <p className="text-lg text-muted-foreground">Please create a website first to use integrations</p>
        <Button onClick={() => navigate("/websites")}>Go to Websites</Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Integrations</h1>
        <p className="text-muted-foreground">
          Connect your favorite tools to automatically create social proof notifications
        </p>
      </div>

      <Tabs defaultValue="all" className="space-y-6">
        <TabsList className="grid grid-cols-3 lg:grid-cols-7 gap-2">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="webhook">Webhooks</TabsTrigger>
          <TabsTrigger value="forms">Forms</TabsTrigger>
          <TabsTrigger value="ecommerce">E-Commerce</TabsTrigger>
          <TabsTrigger value="social">Social</TabsTrigger>
          <TabsTrigger value="cms">CMS</TabsTrigger>
          <TabsTrigger value="education">Education</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {integrations.map((integration) => {
              const Icon = integration.icon;
              const isConnected = integration.status === "connected";
              const hasError = integration.status === "error";
              const quota = integrationQuotas[integration.id];
              const canConnect = !quota || quota.used < quota.quota;
              
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
                          <div className="flex gap-2 mt-1">
                            <Badge
                              variant={isConnected ? "default" : hasError ? "destructive" : "secondary"}
                            >
                              {isConnected && <CheckCircle className="h-3 w-3 mr-1" />}
                              {hasError && <AlertCircle className="h-3 w-3 mr-1" />}
                              {!isConnected && !hasError && <XCircle className="h-3 w-3 mr-1" />}
                              {integration.status}
                            </Badge>
                            {quota && (
                              <Badge variant="outline">
                                {quota.used}/{quota.quota} used
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      {integration.description}
                    </p>
                    
                    {isConnected && (
                      <div className="space-y-2 text-sm">
                        {integration.lastSync && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Last sync:</span>
                            <span>{new Date(integration.lastSync).toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex gap-2">
                      {!isConnected ? (
                        <Button 
                          className="flex-1"
                          onClick={() => handleConnect(integration)}
                          disabled={!canConnect}
                        >
                          <Plug className="h-4 w-4 mr-2" />
                          {canConnect ? 'Connect' : 'Quota Reached'}
                        </Button>
                      ) : (
                        <>
                          <Button 
                            variant="outline"
                            className="flex-1"
                            onClick={() => handleSync(integration)}
                          >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Sync
                          </Button>
                          <Button 
                            variant="outline"
                            onClick={() => handleConnect(integration)}
                          >
                            <Settings className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="destructive"
                            onClick={() => handleDisconnect(integration)}
                          >
                            Disconnect
                          </Button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="webhook" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {integrations
              .filter(int => int.type === "webhook" || int.type === "automation")
              .map((integration) => {
              const Icon = integration.icon;
              const isConnected = integration.status === "connected";
              const hasError = integration.status === "error";
              const quota = integrationQuotas[integration.id];
              const canConnect = !quota || quota.used < quota.quota;
              
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
                          <div className="flex gap-2 mt-1">
                            <Badge
                              variant={isConnected ? "default" : hasError ? "destructive" : "secondary"}
                            >
                              {isConnected && <CheckCircle className="h-3 w-3 mr-1" />}
                              {hasError && <AlertCircle className="h-3 w-3 mr-1" />}
                              {!isConnected && !hasError && <XCircle className="h-3 w-3 mr-1" />}
                              {integration.status}
                            </Badge>
                            {quota && (
                              <Badge variant="outline">
                                {quota.used}/{quota.quota} used
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      {integration.description}
                    </p>
                    
                    {isConnected && (
                      <div className="space-y-2 text-sm">
                        {integration.lastSync && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Last sync:</span>
                            <span>{new Date(integration.lastSync).toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex gap-2">
                      {!isConnected ? (
                        <Button 
                          className="flex-1"
                          onClick={() => handleConnect(integration)}
                          disabled={!canConnect}
                        >
                          <Plug className="h-4 w-4 mr-2" />
                          {canConnect ? 'Connect' : 'Quota Reached'}
                        </Button>
                      ) : (
                        <>
                          <Button 
                            variant="outline"
                            className="flex-1"
                            onClick={() => handleSync(integration)}
                          >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Sync
                          </Button>
                          <Button 
                            variant="outline"
                            onClick={() => handleConnect(integration)}
                          >
                            <Settings className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="destructive"
                            onClick={() => handleDisconnect(integration)}
                          >
                            Disconnect
                          </Button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="forms" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {integrations
              .filter(int => int.type === "forms" || int.type === "scheduling")
              .map((integration) => {
              const Icon = integration.icon;
              const isConnected = integration.status === "connected";
              const hasError = integration.status === "error";
              const quota = integrationQuotas[integration.id];
              const canConnect = !quota || quota.used < quota.quota;
              
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
                          <div className="flex gap-2 mt-1">
                            <Badge
                              variant={isConnected ? "default" : hasError ? "destructive" : "secondary"}
                            >
                              {isConnected && <CheckCircle className="h-3 w-3 mr-1" />}
                              {hasError && <AlertCircle className="h-3 w-3 mr-1" />}
                              {!isConnected && !hasError && <XCircle className="h-3 w-3 mr-1" />}
                              {integration.status}
                            </Badge>
                            {quota && (
                              <Badge variant="outline">
                                {quota.used}/{quota.quota} used
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      {integration.description}
                    </p>
                    
                    {isConnected && (
                      <div className="space-y-2 text-sm">
                        {integration.lastSync && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Last sync:</span>
                            <span>{new Date(integration.lastSync).toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex gap-2">
                      {!isConnected ? (
                        <Button 
                          className="flex-1"
                          onClick={() => handleConnect(integration)}
                          disabled={!canConnect}
                        >
                          <Plug className="h-4 w-4 mr-2" />
                          {canConnect ? 'Connect' : 'Quota Reached'}
                        </Button>
                      ) : (
                        <>
                          <Button 
                            variant="outline"
                            className="flex-1"
                            onClick={() => handleSync(integration)}
                          >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Sync
                          </Button>
                          <Button 
                            variant="outline"
                            onClick={() => handleConnect(integration)}
                          >
                            <Settings className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="destructive"
                            onClick={() => handleDisconnect(integration)}
                          >
                            Disconnect
                          </Button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="ecommerce" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {integrations
              .filter(int => int.type === "ecommerce" || int.type === "payment")
              .map((integration) => {
              const Icon = integration.icon;
              const isConnected = integration.status === "connected";
              const hasError = integration.status === "error";
              const quota = integrationQuotas[integration.id];
              const canConnect = !quota || quota.used < quota.quota;
              
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
                          <div className="flex gap-2 mt-1">
                            <Badge
                              variant={isConnected ? "default" : hasError ? "destructive" : "secondary"}
                            >
                              {isConnected && <CheckCircle className="h-3 w-3 mr-1" />}
                              {hasError && <AlertCircle className="h-3 w-3 mr-1" />}
                              {!isConnected && !hasError && <XCircle className="h-3 w-3 mr-1" />}
                              {integration.status}
                            </Badge>
                            {quota && (
                              <Badge variant="outline">
                                {quota.used}/{quota.quota} used
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      {integration.description}
                    </p>
                    
                    {isConnected && (
                      <div className="space-y-2 text-sm">
                        {integration.lastSync && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Last sync:</span>
                            <span>{new Date(integration.lastSync).toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex gap-2">
                      {!isConnected ? (
                        <Button 
                          className="flex-1"
                          onClick={() => handleConnect(integration)}
                          disabled={!canConnect}
                        >
                          <Plug className="h-4 w-4 mr-2" />
                          {canConnect ? 'Connect' : 'Quota Reached'}
                        </Button>
                      ) : (
                        <>
                          <Button 
                            variant="outline"
                            className="flex-1"
                            onClick={() => handleSync(integration)}
                          >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Sync
                          </Button>
                          <Button 
                            variant="outline"
                            onClick={() => handleConnect(integration)}
                          >
                            <Settings className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="destructive"
                            onClick={() => handleDisconnect(integration)}
                          >
                            Disconnect
                          </Button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="social">
          <SocialProofConnectors />
        </TabsContent>

        <TabsContent value="cms" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {integrations
              .filter(int => int.type === "cms" || int.type === "content")
              .map((integration) => {
              const Icon = integration.icon;
              const isConnected = integration.status === "connected";
              const hasError = integration.status === "error";
              const quota = integrationQuotas[integration.id];
              const canConnect = !quota || quota.used < quota.quota;
              
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
                          <div className="flex gap-2 mt-1">
                            <Badge
                              variant={isConnected ? "default" : hasError ? "destructive" : "secondary"}
                            >
                              {isConnected && <CheckCircle className="h-3 w-3 mr-1" />}
                              {hasError && <AlertCircle className="h-3 w-3 mr-1" />}
                              {!isConnected && !hasError && <XCircle className="h-3 w-3 mr-1" />}
                              {integration.status}
                            </Badge>
                            {quota && (
                              <Badge variant="outline">
                                {quota.used}/{quota.quota} used
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      {integration.description}
                    </p>
                    
                    {isConnected && (
                      <div className="space-y-2 text-sm">
                        {integration.lastSync && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Last sync:</span>
                            <span>{new Date(integration.lastSync).toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex gap-2">
                      {!isConnected ? (
                        <Button 
                          className="flex-1"
                          onClick={() => handleConnect(integration)}
                          disabled={!canConnect}
                        >
                          <Plug className="h-4 w-4 mr-2" />
                          {canConnect ? 'Connect' : 'Quota Reached'}
                        </Button>
                      ) : (
                        <>
                          <Button 
                            variant="outline"
                            className="flex-1"
                            onClick={() => handleSync(integration)}
                          >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Sync
                          </Button>
                          <Button 
                            variant="outline"
                            onClick={() => handleConnect(integration)}
                          >
                            <Settings className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="destructive"
                            onClick={() => handleDisconnect(integration)}
                          >
                            Disconnect
                          </Button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="education" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {integrations
              .filter(int => int.type === "education")
              .map((integration) => {
              const Icon = integration.icon;
              const isConnected = integration.status === "connected";
              const hasError = integration.status === "error";
              const quota = integrationQuotas[integration.id];
              const canConnect = !quota || quota.used < quota.quota;
              
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
                          <div className="flex gap-2 mt-1">
                            <Badge
                              variant={isConnected ? "default" : hasError ? "destructive" : "secondary"}
                            >
                              {isConnected && <CheckCircle className="h-3 w-3 mr-1" />}
                              {hasError && <AlertCircle className="h-3 w-3 mr-1" />}
                              {!isConnected && !hasError && <XCircle className="h-3 w-3 mr-1" />}
                              {integration.status}
                            </Badge>
                            {quota && (
                              <Badge variant="outline">
                                {quota.used}/{quota.quota} used
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      {integration.description}
                    </p>
                    
                    {isConnected && (
                      <div className="space-y-2 text-sm">
                        {integration.lastSync && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Last sync:</span>
                            <span>{new Date(integration.lastSync).toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex gap-2">
                      {!isConnected ? (
                        <Button 
                          className="flex-1"
                          onClick={() => handleConnect(integration)}
                          disabled={!canConnect}
                        >
                          <Plug className="h-4 w-4 mr-2" />
                          {canConnect ? 'Connect' : 'Quota Reached'}
                        </Button>
                      ) : (
                        <>
                          <Button 
                            variant="outline"
                            className="flex-1"
                            onClick={() => handleSync(integration)}
                          >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Sync
                          </Button>
                          <Button 
                            variant="outline"
                            onClick={() => handleConnect(integration)}
                          >
                            <Settings className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="destructive"
                            onClick={() => handleDisconnect(integration)}
                          >
                            Disconnect
                          </Button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {selectedIntegration && (
        <IntegrationConnectionDialog
          integration={selectedIntegration}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          websiteId={currentWebsiteId}
          onSuccess={fetchIntegrations}
        />
      )}
    </div>
  );
}
