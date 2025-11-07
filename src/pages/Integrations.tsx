import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, XCircle, Plug, RefreshCw, AlertCircle, Settings, Upload, Search, TrendingUp, Star, Zap as ZapIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { IntegrationConnectionDialog } from "@/components/integrations/IntegrationConnectionDialog";
import { IntegrationModerationDialog } from "@/components/integrations/IntegrationModerationDialog";
import { CSVUploadDialog } from "@/components/integrations/CSVUploadDialog";
import { SocialProofConnectors } from "@/components/integrations/SocialProofConnectors";
import { IntegrationCard } from "@/components/integrations/IntegrationCard";
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
  const [csvDialogOpen, setCSVDialogOpen] = useState(false);
  const [currentWebsiteId, setCurrentWebsiteId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [integrationQuotas, setIntegrationQuotas] = useState<Record<string, { quota: number; used: number }>>({});
  const [moderationDialog, setModerationDialog] = useState<{ open: boolean; type: string; name: string }>({ 
    open: false, 
    type: "", 
    name: "" 
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "connected" | "available">("all");
  const [authTypeFilter, setAuthTypeFilter] = useState<"all" | "oauth" | "webhook">("all");
  const [sortBy, setSortBy] = useState<"name" | "popularity">("popularity");

  // Fetch pending event counts per integration
  const { data: pendingCounts = {} } = useQuery({
    queryKey: ["integration-pending-count", currentUserId],
    queryFn: async () => {
      if (!currentUserId) return {};

      const { data, error } = await supabase
        .from("events")
        .select(`
          integration_type,
          widgets!inner(user_id)
        `)
        .eq("widgets.user_id", currentUserId)
        .eq("moderation_status", "pending");

      if (error) throw error;

      const counts: Record<string, number> = {};
      data?.forEach((event: any) => {
        const type = event.integration_type || "manual";
        counts[type] = (counts[type] || 0) + 1;
      });

      return counts;
    },
    enabled: !!currentUserId,
  });

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const fetchIntegrations = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }

      setCurrentUserId(user.id);


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
          popularityScore: metadata.popularityScore || 50,
          isTrending: metadata.isTrending || false,
          connectorType: metadata.connectorType,
        } as Integration & { popularityScore: number; isTrending: boolean; connectorType?: string };
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

  // Filter and sort integrations
  const getFilteredIntegrations = (categoryType?: string) => {
    let filtered = integrations;

    // Category filter
    if (categoryType && categoryType !== 'all') {
      filtered = filtered.filter(int => int.type === categoryType || int.type === categoryType.replace(/_/g, ''));
    }

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(int => 
        int.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        int.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'connected') {
        filtered = filtered.filter(int => int.status === 'connected');
      } else if (statusFilter === 'available') {
        filtered = filtered.filter(int => int.status === 'disconnected');
      }
    }

    // Auth type filter
    if (authTypeFilter !== 'all') {
      filtered = filtered.filter(int => {
        const metadata = getIntegrationMetadata(int.id);
        if (authTypeFilter === 'oauth') {
          return metadata.requiresOauth === true;
        } else if (authTypeFilter === 'webhook') {
          return metadata.connectorType === 'webhook';
        }
        return true;
      });
    }

    // Sort
    if (sortBy === 'popularity') {
      filtered = [...filtered].sort((a, b) => {
        const aScore = (a as any).popularityScore || 0;
        const bScore = (b as any).popularityScore || 0;
        return bScore - aScore;
      });
    } else {
      filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name));
    }

    return filtered;
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Integrations Marketplace</h1>
          <p className="text-muted-foreground">
            Connect 35+ tools to automatically create social proof notifications
          </p>
          <div className="flex gap-3 mt-2">
            <Badge variant="outline" className="gap-1">
              <Plug className="h-3 w-3" />
              {integrations.length} Total
            </Badge>
            <Badge variant="outline" className="gap-1">
              <CheckCircle className="h-3 w-3" />
              {integrations.filter(i => i.status === 'connected').length} Connected
            </Badge>
            <Badge variant="outline" className="gap-1">
              <TrendingUp className="h-3 w-3" />
              {integrations.filter((i: any) => i.isTrending).length} Trending
            </Badge>
          </div>
        </div>
        <Button onClick={() => setCSVDialogOpen(true)} variant="outline">
          <Upload className="h-4 w-4 mr-2" />
          Import CSV
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search integrations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="connected">Connected</SelectItem>
              <SelectItem value="available">Available</SelectItem>
            </SelectContent>
          </Select>
          <Select value={authTypeFilter} onValueChange={(v: any) => setAuthTypeFilter(v)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Auth Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="oauth">OAuth</SelectItem>
              <SelectItem value="webhook">Webhook</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="popularity">Popularity</SelectItem>
              <SelectItem value="name">Name (A-Z)</SelectItem>
            </SelectContent>
          </Select>
        </div>
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
          {getFilteredIntegrations().length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No integrations found matching your filters.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {getFilteredIntegrations().map((integration) => (
                <IntegrationCard
                  key={integration.id}
                  integration={integration}
                  onConnect={() => handleConnect(integration)}
                  onSync={() => handleSync(integration)}
                  onSettings={() => handleConnect(integration)}
                  onDisconnect={() => handleDisconnect(integration)}
                  onModerate={
                    integration.status === "connected"
                      ? () => setModerationDialog({ 
                          open: true, 
                          type: integration.id, 
                          name: integration.name 
                        })
                      : undefined
                  }
                  quota={integrationQuotas[integration.id]}
                  pendingCount={pendingCounts[integration.id] || 0}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="webhook" className="space-y-4">
          {getFilteredIntegrations("webhook").length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No webhook integrations found.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {getFilteredIntegrations("webhook").map((integration) => (
                <IntegrationCard
                  key={integration.id}
                  integration={integration}
                  onConnect={() => handleConnect(integration)}
                  onSync={() => handleSync(integration)}
                  onSettings={() => handleConnect(integration)}
                  onDisconnect={() => handleDisconnect(integration)}
                  onModerate={
                    integration.status === "connected"
                      ? () => setModerationDialog({ 
                          open: true, 
                          type: integration.id, 
                          name: integration.name 
                        })
                      : undefined
                  }
                  quota={integrationQuotas[integration.id]}
                  pendingCount={pendingCounts[integration.id] || 0}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="forms" className="space-y-4">
          {getFilteredIntegrations("forms").length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No form integrations found.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {getFilteredIntegrations("forms").map((integration) => (
                <IntegrationCard
                  key={integration.id}
                  integration={integration}
                  onConnect={() => handleConnect(integration)}
                  onSync={() => handleSync(integration)}
                  onSettings={() => handleConnect(integration)}
                  onDisconnect={() => handleDisconnect(integration)}
                  quota={integrationQuotas[integration.id]}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="ecommerce" className="space-y-4">
          {getFilteredIntegrations("ecommerce").length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No e-commerce integrations found.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {getFilteredIntegrations("ecommerce").map((integration) => (
                <IntegrationCard
                  key={integration.id}
                  integration={integration}
                  onConnect={() => handleConnect(integration)}
                  onSync={() => handleSync(integration)}
                  onSettings={() => handleConnect(integration)}
                  onDisconnect={() => handleDisconnect(integration)}
                  quota={integrationQuotas[integration.id]}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="social" className="space-y-4">
          {getFilteredIntegrations("social").length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No social media integrations found.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {getFilteredIntegrations("social").map((integration) => (
                <IntegrationCard
                  key={integration.id}
                  integration={integration}
                  onConnect={() => handleConnect(integration)}
                  onSync={() => handleSync(integration)}
                  onSettings={() => handleConnect(integration)}
                  onDisconnect={() => handleDisconnect(integration)}
                  quota={integrationQuotas[integration.id]}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="cms" className="space-y-4">
          {getFilteredIntegrations("cms").length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No CMS integrations found.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {getFilteredIntegrations("cms").map((integration) => (
                <IntegrationCard
                  key={integration.id}
                  integration={integration}
                  onConnect={() => handleConnect(integration)}
                  onSync={() => handleSync(integration)}
                  onSettings={() => handleConnect(integration)}
                  onDisconnect={() => handleDisconnect(integration)}
                  quota={integrationQuotas[integration.id]}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="education" className="space-y-4">
          {getFilteredIntegrations("education").length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No education integrations found.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {getFilteredIntegrations("education").map((integration) => (
                <IntegrationCard
                  key={integration.id}
                  integration={integration}
                  onConnect={() => handleConnect(integration)}
                  onSync={() => handleSync(integration)}
                  onSettings={() => handleConnect(integration)}
                  onDisconnect={() => handleDisconnect(integration)}
                  quota={integrationQuotas[integration.id]}
                />
              ))}
            </div>
          )}
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

      <CSVUploadDialog
        open={csvDialogOpen}
        onOpenChange={setCSVDialogOpen}
        websiteId={currentWebsiteId || ''}
        onSuccess={fetchIntegrations}
      />

      <IntegrationModerationDialog
        integrationType={moderationDialog.type}
        integrationName={moderationDialog.name}
        open={moderationDialog.open}
        onClose={() => setModerationDialog({ open: false, type: "", name: "" })}
      />
    </div>
  );
}
