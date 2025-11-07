import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { getIntegrationMetadata } from "@/lib/integrationMetadata";
import { Settings, CheckCircle2, XCircle, Clock, Loader2 } from "lucide-react";
import { IntegrationConfigDialog } from "@/components/admin/IntegrationConfigDialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface IntegrationConfig {
  id: string;
  integration_type: string;
  is_active: boolean;
  config: {
    oauth_config?: {
      client_id: string;
      client_secret: string;
      authorization_url?: string;
      token_url?: string;
      scopes?: string[];
    };
    webhook_config?: {
      signing_secret?: string;
      supported_events?: string[];
    };
    api_config?: {
      api_endpoint?: string;
      required_headers?: Record<string, string>;
    };
    rate_limits?: {
      requests_per_hour_per_user: number;
      requests_per_hour_global: number;
    };
    quota_per_plan?: {
      free: number;
      pro: number;
      business: number;
    };
    feature_flags?: {
      is_beta: boolean;
      requires_approval: boolean;
    };
  };
  requires_oauth: boolean;
  connector_type?: string;
  polling_interval_minutes?: number;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export default function AdminIntegrations() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedIntegration, setSelectedIntegration] = useState<IntegrationConfig | null>(null);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);

  const { data: integrations, isLoading } = useQuery({
    queryKey: ["admin-integrations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("integrations_config")
        .select("*")
        .order("integration_type");
      
      if (error) throw error;
      return data as IntegrationConfig[];
    },
  });

  const { data: logs } = useQuery({
    queryKey: ["integration-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("integration_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return data;
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("integrations_config")
        .update({ is_active })
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-integrations"] });
      toast({
        title: "Integration updated",
        description: "Integration status has been changed successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateConfigMutation = useMutation({
    mutationFn: async (config: Partial<IntegrationConfig>) => {
      const { error } = await supabase
        .from("integrations_config")
        .update(config)
        .eq("id", selectedIntegration!.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-integrations"] });
      setConfigDialogOpen(false);
      toast({
        title: "Configuration saved",
        description: "Integration configuration has been updated",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleConfigure = (integration: IntegrationConfig) => {
    setSelectedIntegration(integration);
    setConfigDialogOpen(true);
  };

  const handleSaveConfig = async (updates: Partial<IntegrationConfig>) => {
    if (!selectedIntegration) return;
    
    const { error } = await supabase
      .from("integrations_config")
      .update(updates)
      .eq("id", selectedIntegration.id);
    
    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    queryClient.invalidateQueries({ queryKey: ["admin-integrations"] });
    setConfigDialogOpen(false);
    toast({
      title: "Configuration saved",
      description: "Integration configuration has been updated successfully",
    });
  };

  const groupedIntegrations = integrations?.reduce((acc, integration) => {
    const metadata = getIntegrationMetadata(integration.integration_type);
    const category = metadata.category || 'other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(integration);
    return acc;
  }, {} as Record<string, IntegrationConfig[]>);

  const categories = [
    { key: 'all', label: 'All Integrations', count: integrations?.length || 0 },
    { key: 'ecommerce', label: 'E-commerce & Payments', count: (groupedIntegrations?.ecommerce?.length || 0) + (groupedIntegrations?.payment?.length || 0) },
    { key: 'forms', label: 'Forms & Scheduling', count: (groupedIntegrations?.forms?.length || 0) },
    { key: 'social', label: 'Social & Reviews', count: groupedIntegrations?.social?.length || 0 },
    { key: 'crm', label: 'CRM & Sales', count: groupedIntegrations?.crm?.length || 0 },
    { key: 'cms', label: 'Content & Publishing', count: (groupedIntegrations?.cms?.length || 0) + (groupedIntegrations?.content?.length || 0) },
    { key: 'email', label: 'Email Marketing', count: groupedIntegrations?.email?.length || 0 },
    { key: 'analytics', label: 'Analytics', count: groupedIntegrations?.analytics?.length || 0 },
    { key: 'education', label: 'Education', count: groupedIntegrations?.education?.length || 0 },
    { key: 'music', label: 'Music & Entertainment', count: groupedIntegrations?.music?.length || 0 },
    { key: 'automation', label: 'Automation & Other', count: (groupedIntegrations?.automation?.length || 0) + (groupedIntegrations?.community?.length || 0) + (groupedIntegrations?.fintech?.length || 0) + (groupedIntegrations?.other?.length || 0) },
  ];

  const getIntegrationsByCategory = (categoryKey: string) => {
    if (categoryKey === 'all') return integrations || [];
    if (categoryKey === 'ecommerce') return [...(groupedIntegrations?.ecommerce || []), ...(groupedIntegrations?.payment || [])];
    if (categoryKey === 'cms') return [...(groupedIntegrations?.cms || []), ...(groupedIntegrations?.content || [])];
    if (categoryKey === 'automation') return [
      ...(groupedIntegrations?.automation || []),
      ...(groupedIntegrations?.community || []),
      ...(groupedIntegrations?.fintech || []),
      ...(groupedIntegrations?.other || []),
    ];
    return groupedIntegrations?.[categoryKey] || [];
  };

  const getConfigStatus = (integration: IntegrationConfig) => {
    if (!integration.is_active) return { label: 'Inactive', variant: 'secondary' as const };
    if (integration.requires_oauth && !integration.config?.oauth_config?.client_id) return { label: 'Needs Setup', variant: 'destructive' as const };
    if (integration.connector_type === 'webhook' && !integration.config?.webhook_config?.signing_secret) return { label: 'Partial', variant: 'outline' as const };
    return { label: 'Active', variant: 'default' as const };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-4 lg:p-6">
      <div className="space-y-1 sm:space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold">Integration Management</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Configure and enable integrations for your users
        </p>
      </div>

      <Tabs defaultValue="all" className="space-y-6">
        <ScrollArea className="w-full pb-2">
          <TabsList className="inline-flex h-auto flex-nowrap w-auto gap-1">
            {categories.map((cat) => (
              <TabsTrigger 
                key={cat.key} 
                value={cat.key} 
                className="whitespace-nowrap text-xs sm:text-sm px-2 py-1.5 sm:px-3 sm:py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <span className="hidden sm:inline">{cat.label}</span>
                <span className="sm:hidden">{cat.label.split(' ')[0]}</span>
                <span className="ml-1 text-[10px] sm:text-xs opacity-70">({cat.count})</span>
              </TabsTrigger>
            ))}
            <TabsTrigger value="logs" className="whitespace-nowrap text-xs sm:text-sm px-2 py-1.5 sm:px-3 sm:py-2">
              Logs
            </TabsTrigger>
          </TabsList>
        </ScrollArea>

        {categories.map((category) => (
          <TabsContent key={category.key} value={category.key} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {getIntegrationsByCategory(category.key).map((integration) => {
                const metadata = getIntegrationMetadata(integration.integration_type);
                const Icon = metadata.icon;
                const status = getConfigStatus(integration);

                return (
                  <Card key={integration.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <Icon className="h-8 w-8" />
                          <div>
                            <CardTitle className="text-lg">
                              {metadata.displayName}
                            </CardTitle>
                            <CardDescription className="text-sm">
                              {metadata.type}
                            </CardDescription>
                          </div>
                        </div>
                        <Switch
                          checked={integration.is_active}
                          onCheckedChange={(checked) =>
                            toggleMutation.mutate({
                              id: integration.id,
                              is_active: checked,
                            })
                          }
                        />
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3 sm:space-y-4">
                      <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
                        {metadata.description}
                      </p>
                      
                      <div className="flex flex-wrap gap-1.5 sm:gap-2">
                        <Badge variant={status.variant}>
                          {status.label}
                        </Badge>
                        {integration.requires_oauth && (
                          <Badge variant="outline">OAuth</Badge>
                        )}
                        {metadata.connectorType && (
                          <Badge variant="outline">{metadata.connectorType}</Badge>
                        )}
                        {metadata.setupComplexity && (
                          <Badge variant="secondary">{metadata.setupComplexity}</Badge>
                        )}
                        {metadata.setupTime && (
                          <Badge variant="secondary">{metadata.setupTime}</Badge>
                        )}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-xs sm:text-sm"
                        onClick={() => handleConfigure(integration)}
                      >
                        <Settings className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                        Configure
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        ))}

        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>
                Last 100 integration events across all users
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {logs?.map((log: any) => (
                  <div
                    key={log.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-2.5 sm:p-3 border rounded-lg gap-2 sm:gap-3"
                  >
                    <div className="flex items-start sm:items-center gap-2 sm:gap-3 flex-1 min-w-0">
                      {log.status === "success" && (
                        <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-green-500 flex-shrink-0 mt-0.5 sm:mt-0" />
                      )}
                      {log.status === "error" && (
                        <XCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-500 flex-shrink-0 mt-0.5 sm:mt-0" />
                      )}
                      {log.status === "warning" && (
                        <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500 flex-shrink-0 mt-0.5 sm:mt-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm sm:text-base truncate">
                          {getIntegrationMetadata(log.integration_type).displayName}
                        </p>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          <span className="font-medium">{log.action}</span>
                          <span className="hidden sm:inline"> • </span>
                          <span className="block sm:inline text-[11px] sm:text-xs mt-0.5 sm:mt-0">
                            {new Date(log.created_at).toLocaleString(undefined, { 
                              dateStyle: 'short', 
                              timeStyle: 'short' 
                            })}
                          </span>
                        </p>
                      </div>
                    </div>
                    {log.duration_ms && (
                      <Badge variant="outline" className="self-start sm:self-center text-[10px] sm:text-xs">
                        {log.duration_ms}ms
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <IntegrationConfigDialog
        integration={selectedIntegration}
        open={configDialogOpen}
        onOpenChange={setConfigDialogOpen}
        onSave={handleSaveConfig}
        isSaving={false}
      />
    </div>
  );
}
