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

interface IntegrationConfig {
  id: string;
  integration_type: string;
  is_active: boolean;
  config: any;
  requires_oauth: boolean;
  webhook_secret?: string;
  api_credentials?: any;
  connector_type?: string;
  polling_interval_minutes?: number;
  rate_limit_per_user?: number;
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
    const phase = metadata.phase || 3;
    if (!acc[phase]) acc[phase] = [];
    acc[phase].push(integration);
    return acc;
  }, {} as Record<number, IntegrationConfig[]>);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Integration Management</h1>
        <p className="text-muted-foreground mt-2">
          Configure and enable integrations for your users
        </p>
      </div>

      <Tabs defaultValue="phase3" className="space-y-6">
        <TabsList>
          <TabsTrigger value="phase1">Phase 1: Foundation</TabsTrigger>
          <TabsTrigger value="phase2">Phase 2: Growth</TabsTrigger>
          <TabsTrigger value="phase3">Phase 3: Expansion</TabsTrigger>
          <TabsTrigger value="logs">Activity Logs</TabsTrigger>
        </TabsList>

        {[1, 2, 3].map((phase) => (
          <TabsContent key={phase} value={`phase${phase}`} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {groupedIntegrations?.[phase]?.map((integration) => {
                const metadata = getIntegrationMetadata(integration.integration_type);
                const Icon = metadata.icon;

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
                    <CardContent className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        {metadata.description}
                      </p>
                      
                      <div className="flex flex-wrap gap-2">
                        <Badge variant={integration.is_active ? "default" : "secondary"}>
                          {integration.is_active ? "Active" : "Inactive"}
                        </Badge>
                        {integration.requires_oauth && (
                          <Badge variant="outline">OAuth Required</Badge>
                        )}
                        {metadata.connectorType && (
                          <Badge variant="outline">{metadata.connectorType}</Badge>
                        )}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => handleConfigure(integration)}
                      >
                        <Settings className="h-4 w-4 mr-2" />
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
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {log.status === "success" && (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      )}
                      {log.status === "error" && (
                        <XCircle className="h-5 w-5 text-red-500" />
                      )}
                      {log.status === "warning" && (
                        <Clock className="h-5 w-5 text-yellow-500" />
                      )}
                      <div>
                        <p className="font-medium">
                          {getIntegrationMetadata(log.integration_type).displayName}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {log.action} • {new Date(log.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    {log.duration_ms && (
                      <Badge variant="outline">{log.duration_ms}ms</Badge>
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
