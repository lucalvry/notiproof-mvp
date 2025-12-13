import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Plus,
  AlertCircle,
  Clock,
  RefreshCw,
  UserPlus,
  Zap
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { FormCaptureRuleCard } from "./FormCaptureRuleCard";
import { FormCaptureRuleDialog } from "./FormCaptureRuleDialog";

interface FormCaptureSetupProps {
  websiteId: string;
}

interface FormCaptureRule {
  id: string;
  targetUrl: string;
  formType: string;
  fieldMappings: Record<string, string>;
  messageTemplate: string;
  requireModeration: boolean;
  enabled: boolean;
}

interface RecentSubmission {
  id: string;
  user_name: string | null;
  user_email: string | null;
  created_at: string;
  moderation_status: string | null;
  page_url: string | null;
}

export function FormCaptureSetup({ websiteId }: FormCaptureSetupProps) {
  const [rules, setRules] = useState<FormCaptureRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [recentSubmissions, setRecentSubmissions] = useState<RecentSubmission[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [websiteDomain, setWebsiteDomain] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<FormCaptureRule | null>(null);
  const [realtimeStatus, setRealtimeStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');

  useEffect(() => {
    loadRules();
    loadWebsiteDomain();
    loadRecentSubmissions();
  }, [websiteId]);

  // Real-time subscription for new submissions
  useEffect(() => {
    let pollInterval: ReturnType<typeof setInterval> | null = null;
    
    const channel = supabase
      .channel(`form-capture-${websiteId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'events',
          filter: `website_id=eq.${websiteId}`,
        },
        (payload) => {
          const newEvent = payload.new as any;
          if (newEvent.event_type === 'form_capture') {
            setRecentSubmissions(prev => [{
              id: newEvent.id,
              user_name: newEvent.user_name,
              user_email: newEvent.user_email,
              created_at: newEvent.created_at,
              moderation_status: newEvent.moderation_status,
              page_url: newEvent.page_url,
            }, ...prev].slice(0, 5));
            toast.success("New form submission captured!");
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setRealtimeStatus('connected');
          if (pollInterval) {
            clearInterval(pollInterval);
            pollInterval = null;
          }
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setRealtimeStatus('error');
          if (!pollInterval) {
            pollInterval = setInterval(loadRecentSubmissions, 5000);
          }
        }
      });

    return () => {
      if (pollInterval) clearInterval(pollInterval);
      supabase.removeChannel(channel);
    };
  }, [websiteId]);

  const loadWebsiteDomain = async () => {
    const { data } = await supabase
      .from("websites")
      .select("domain")
      .eq("id", websiteId)
      .maybeSingle();
    
    if (data) {
      setWebsiteDomain(data.domain);
    }
  };

  const loadRules = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("integration_connectors")
        .select("*")
        .eq("website_id", websiteId)
        .eq("integration_type", "form_hook" as const)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const mappedRules: FormCaptureRule[] = (data || []).map(item => {
        const config = item.config as any;
        return {
          id: item.id,
          targetUrl: config?.target_url || "",
          formType: config?.form_type || "custom",
          fieldMappings: config?.field_mappings || { name: "name", email: "email" },
          messageTemplate: config?.message_template || "{{name}} just submitted a form",
          requireModeration: config?.require_moderation ?? true,
          enabled: item.status === "active",
        };
      });

      setRules(mappedRules);
    } catch (error) {
      console.error("Error loading rules:", error);
      toast.error("Failed to load form capture rules");
    } finally {
      setLoading(false);
    }
  };

  const loadRecentSubmissions = async () => {
    setLoadingSubmissions(true);
    try {
      const { data } = await supabase
        .from("events")
        .select("id, user_name, user_email, created_at, moderation_status, page_url")
        .eq("website_id", websiteId)
        .eq("event_type", "form_capture")
        .order("created_at", { ascending: false })
        .limit(5);

      if (data) {
        setRecentSubmissions(data);
      }
    } catch (error) {
      console.error("Error loading submissions:", error);
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const handleSaveRule = async (rule: FormCaptureRule) => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const configData = {
        target_url: rule.targetUrl,
        form_type: rule.formType,
        field_mappings: rule.fieldMappings,
        message_template: rule.messageTemplate,
        require_moderation: rule.requireModeration,
      };

      if (rule.id) {
        // Update existing rule
        const { error } = await supabase
          .from("integration_connectors")
          .update({
            config: configData,
            status: rule.enabled ? "active" : "inactive",
            updated_at: new Date().toISOString(),
          })
          .eq("id", rule.id);

        if (error) throw error;
        toast.success("Rule updated");
      } else {
        // Create new rule
        const { error } = await supabase
          .from("integration_connectors")
          .insert({
            website_id: websiteId,
            user_id: user.id,
            integration_type: "form_hook" as const,
            name: `Form Capture - ${rule.targetUrl || "All Pages"}`,
            config: configData,
            status: rule.enabled ? "active" : "inactive",
          });

        if (error) throw error;
        toast.success("Rule created");
      }

      loadRules();
      setEditingRule(null);
    } catch (error) {
      console.error("Error saving rule:", error);
      toast.error("Failed to save rule");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    try {
      const { error } = await supabase
        .from("integration_connectors")
        .delete()
        .eq("id", ruleId);

      if (error) throw error;
      toast.success("Rule deleted");
      loadRules();
    } catch (error) {
      console.error("Error deleting rule:", error);
      toast.error("Failed to delete rule");
    }
  };

  const handleToggleRule = async (ruleId: string, enabled: boolean) => {
    try {
      const { error } = await supabase
        .from("integration_connectors")
        .update({
          status: enabled ? "active" : "inactive",
          updated_at: new Date().toISOString(),
        })
        .eq("id", ruleId);

      if (error) throw error;
      setRules(prev => prev.map(r => r.id === ruleId ? { ...r, enabled } : r));
    } catch (error) {
      console.error("Error toggling rule:", error);
      toast.error("Failed to update rule");
    }
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "approved":
        return <Badge variant="default" className="bg-green-500/10 text-green-600 border-green-200">Approved</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  const activeRulesCount = rules.filter(r => r.enabled).length;

  return (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Form Capture Rules</h3>
            <Badge variant="outline">{activeRulesCount} active</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Capture form submissions from different pages with custom templates
          </p>
        </div>
        <Button onClick={() => { setEditingRule(null); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Add Rule
        </Button>
      </div>

      {/* Rules List */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : rules.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <AlertCircle className="h-10 w-10 text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground font-medium">No form capture rules yet</p>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              Add a rule to start capturing form submissions
            </p>
            <Button onClick={() => { setEditingRule(null); setDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Rule
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {rules.map((rule) => (
            <FormCaptureRuleCard
              key={rule.id}
              rule={rule}
              websiteDomain={websiteDomain}
              onEdit={(r) => { setEditingRule(r); setDialogOpen(true); }}
              onDelete={handleDeleteRule}
              onToggle={handleToggleRule}
            />
          ))}
        </div>
      )}

      {/* Recent Submissions */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">Recent Captures</CardTitle>
              <div className={`h-2 w-2 rounded-full ${
                realtimeStatus === 'connected' ? 'bg-green-500 animate-pulse' : 
                realtimeStatus === 'error' ? 'bg-yellow-500' : 'bg-muted-foreground'
              }`} />
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={loadRecentSubmissions}
              disabled={loadingSubmissions}
            >
              <RefreshCw className={`h-4 w-4 ${loadingSubmissions ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {recentSubmissions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <AlertCircle className="h-8 w-8 text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">No submissions captured yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Submit a form on your website to see it here
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentSubmissions.map((sub) => (
                <div 
                  key={sub.id} 
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <UserPlus className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {sub.user_name || sub.user_email || "Anonymous"}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(sub.created_at), { addSuffix: true })}
                        {sub.page_url && (
                          <>
                            <span>•</span>
                            <span className="font-mono">{new URL(sub.page_url).pathname}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  {getStatusBadge(sub.moderation_status)}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rule Dialog */}
      <FormCaptureRuleDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        rule={editingRule}
        onSave={handleSaveRule}
        websiteDomain={websiteDomain}
      />
    </div>
  );
}
