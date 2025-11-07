import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, X, CheckCircle, XCircle } from "lucide-react";
import { getIntegrationMetadata } from "@/lib/integrationMetadata";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { GA4Config } from "./oauth-configs/GA4Config";
import { InstagramConfig } from "./oauth-configs/InstagramConfig";
import { GoogleReviewsConfig } from "./oauth-configs/GoogleReviewsConfig";
import { GenericOAuthConfig } from "./oauth-configs/GenericOAuthConfig";

interface IntegrationConfig {
  id: string;
  integration_type: string;
  is_active: boolean;
  config: {
    oauth_config?: {
      client_id: string;
      client_secret: string;
      redirect_uri?: string;
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
}

interface IntegrationConfigDialogProps {
  integration: IntegrationConfig | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (config: Partial<IntegrationConfig>) => void;
  isSaving: boolean;
}

export function IntegrationConfigDialog({
  integration,
  open,
  onOpenChange,
  onSave,
  isSaving,
}: IntegrationConfigDialogProps) {
  const [oauthConfig, setOauthConfig] = useState({
    client_id: "",
    client_secret: "",
    redirect_uri: "" as string | undefined,
    authorization_url: "" as string | undefined,
    token_url: "" as string | undefined,
    scopes: [] as string[] | undefined,
  });

  const [webhookConfig, setWebhookConfig] = useState({
    signing_secret: "" as string | undefined,
    supported_events: [] as string[] | undefined,
  });

  const [apiConfig, setApiConfig] = useState({
    api_endpoint: "" as string | undefined,
    required_headers: {} as Record<string, string> | undefined,
  });

  const [rateLimits, setRateLimits] = useState({
    requests_per_hour_per_user: 1000,
    requests_per_hour_global: 10000,
  });

  const [quotaPerPlan, setQuotaPerPlan] = useState({
    free: 1,
    pro: 5,
    business: 20,
  });

  const [featureFlags, setFeatureFlags] = useState({
    is_beta: false,
    requires_approval: false,
  });

  const [newScope, setNewScope] = useState("");
  const [newEvent, setNewEvent] = useState("");
  const [newHeaderKey, setNewHeaderKey] = useState("");
  const [newHeaderValue, setNewHeaderValue] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ valid: boolean; message: string } | null>(null);

  // Initialize form when integration changes
  useState(() => {
    if (integration) {
      const config = integration.config || {};
      
      // OAuth Config
      if (config.oauth_config) {
        setOauthConfig({
          client_id: config.oauth_config.client_id || "",
          client_secret: config.oauth_config.client_secret || "",
          redirect_uri: config.oauth_config.redirect_uri || "",
          authorization_url: config.oauth_config.authorization_url || "",
          token_url: config.oauth_config.token_url || "",
          scopes: config.oauth_config.scopes || [],
        });
      }

      // Webhook Config
      if (config.webhook_config) {
        setWebhookConfig({
          signing_secret: config.webhook_config.signing_secret || "",
          supported_events: config.webhook_config.supported_events || [],
        });
      }

      // API Config
      if (config.api_config) {
        setApiConfig({
          api_endpoint: config.api_config.api_endpoint || "",
          required_headers: config.api_config.required_headers || {},
        });
      }

      // Rate Limits
      if (config.rate_limits) {
        setRateLimits(config.rate_limits);
      }

      // Quotas
      if (config.quota_per_plan) {
        setQuotaPerPlan(config.quota_per_plan);
      }

      // Feature Flags
      if (config.feature_flags) {
        setFeatureFlags(config.feature_flags);
      }
    }
  });

  const handleSave = async () => {
    const updates: Partial<IntegrationConfig> = {
      config: {
        oauth_config: {
          client_id: oauthConfig.client_id,
          client_secret: oauthConfig.client_secret,
        },
        webhook_config: webhookConfig,
        api_config: apiConfig,
        rate_limits: rateLimits,
        quota_per_plan: quotaPerPlan,
        feature_flags: featureFlags,
      },
    };

    onSave(updates);
    
    // Auto-test after save if OAuth integration
    if (integration?.requires_oauth) {
      setTimeout(() => handleTestConnection(), 1000);
    }
  };

  const handleTestConnection = async () => {
    if (!integration) return;
    
    setTesting(true);
    setTestResult(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('validate-oauth-config', {
        body: { integration_type: integration.integration_type }
      });

      if (error) throw error;

      if (data.valid) {
        setTestResult({ valid: true, message: 'Configuration is valid! Users can now connect this integration.' });
        toast.success('OAuth configuration validated successfully!');
      } else {
        setTestResult({ valid: false, message: data.error || 'Configuration validation failed' });
        toast.error(`Validation failed: ${data.error}`);
      }
    } catch (error) {
      console.error('Test connection error:', error);
      setTestResult({ valid: false, message: 'Failed to test connection. Please try again.' });
      toast.error('Failed to validate configuration');
    } finally {
      setTesting(false);
    }
  };

  const getRedirectUri = () => {
    const functionName = integration?.integration_type === 'ga4' 
      ? 'ga4-auth' 
      : `oauth-${integration?.integration_type}`;
    return `${window.location.origin.replace('5173', '54321')}/functions/v1/${functionName}?action=callback`;
  };

  const renderOAuthConfig = () => {
    if (!integration) return null;

    const redirectUri = getRedirectUri();
    const config = { client_id: oauthConfig.client_id, client_secret: oauthConfig.client_secret };
    
    const onChange = (newConfig: any) => {
      setOauthConfig({
        ...oauthConfig,
        client_id: newConfig.client_id || '',
        client_secret: newConfig.client_secret || '',
      });
    };

    switch (integration.integration_type) {
      case 'ga4':
        return <GA4Config config={config} onChange={onChange} redirectUri={redirectUri} />;
      case 'instagram':
        return <InstagramConfig config={config} onChange={onChange} redirectUri={redirectUri} />;
      case 'google_reviews':
        return <GoogleReviewsConfig config={config} onChange={onChange} redirectUri={redirectUri} />;
      case 'hubspot':
      case 'intercom':
      case 'salesforce':
      case 'mailchimp':
        return <GenericOAuthConfig config={config} onChange={onChange} redirectUri={redirectUri} />;
      default:
        return <GenericOAuthConfig config={config} onChange={onChange} redirectUri={redirectUri} />;
    }
  };

  const addScope = () => {
    if (newScope.trim()) {
      setOauthConfig({
        ...oauthConfig,
        scopes: [...oauthConfig.scopes, newScope.trim()],
      });
      setNewScope("");
    }
  };

  const removeScope = (index: number) => {
    setOauthConfig({
      ...oauthConfig,
      scopes: oauthConfig.scopes.filter((_, i) => i !== index),
    });
  };

  const addEvent = () => {
    if (newEvent.trim()) {
      setWebhookConfig({
        ...webhookConfig,
        supported_events: [...webhookConfig.supported_events, newEvent.trim()],
      });
      setNewEvent("");
    }
  };

  const removeEvent = (index: number) => {
    setWebhookConfig({
      ...webhookConfig,
      supported_events: webhookConfig.supported_events.filter((_, i) => i !== index),
    });
  };

  const addHeader = () => {
    if (newHeaderKey.trim() && newHeaderValue.trim()) {
      setApiConfig({
        ...apiConfig,
        required_headers: {
          ...apiConfig.required_headers,
          [newHeaderKey.trim()]: newHeaderValue.trim(),
        },
      });
      setNewHeaderKey("");
      setNewHeaderValue("");
    }
  };

  const removeHeader = (key: string) => {
    const { [key]: _, ...rest } = apiConfig.required_headers;
    setApiConfig({
      ...apiConfig,
      required_headers: rest,
    });
  };

  if (!integration) return null;

  const metadata = getIntegrationMetadata(integration.integration_type);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-2xl lg:max-w-3xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader className="space-y-1 sm:space-y-2">
          <DialogTitle className="text-lg sm:text-xl">Configure {metadata.displayName}</DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Set up credentials, rate limits, and advanced configuration for this integration
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="oauth" className="w-full">
          <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 gap-1">
            <TabsTrigger value="oauth" className="text-xs sm:text-sm">
              <span className="hidden sm:inline">OAuth & API</span>
              <span className="sm:hidden">OAuth</span>
            </TabsTrigger>
            <TabsTrigger value="webhook" className="text-xs sm:text-sm">
              Webhook
            </TabsTrigger>
            <TabsTrigger value="limits" className="text-xs sm:text-sm">
              <span className="hidden sm:inline">Limits & Features</span>
              <span className="sm:hidden">Limits</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="oauth" className="space-y-4 mt-4">
            {renderOAuthConfig()}

            {testResult && (
              <div className={`flex items-start gap-2 p-3 rounded-lg ${testResult.valid ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                {testResult.valid ? (
                  <CheckCircle className="h-4 w-4 mt-0.5" />
                ) : (
                  <XCircle className="h-4 w-4 mt-0.5" />
                )}
                <p className="text-sm">{testResult.message}</p>
              </div>
            )}

            <Button 
              variant="outline" 
              onClick={handleTestConnection}
              disabled={testing || !oauthConfig.client_id || !oauthConfig.client_secret}
            >
              {testing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                'Test Connection'
              )}
            </Button>
          </TabsContent>

          <TabsContent value="webhook" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signing_secret">Webhook Signing Secret</Label>
                <Input
                  id="signing_secret"
                  type="password"
                  placeholder="Optional - for webhook signature verification"
                  value={webhookConfig.signing_secret}
                  onChange={(e) => setWebhookConfig({ ...webhookConfig, signing_secret: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Leave empty to skip signature verification (not recommended for production)
                </p>
              </div>

              <div className="space-y-2">
                <Label>Supported Events</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g., order.created, booking.confirmed"
                    value={newEvent}
                    onChange={(e) => setNewEvent(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addEvent())}
                  />
                  <Button type="button" size="sm" onClick={addEvent}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {webhookConfig.supported_events.map((event, index) => (
                    <Badge key={index} variant="secondary">
                      {event}
                      <button
                        type="button"
                        className="ml-2"
                        onClick={() => removeEvent(index)}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="limits" className="space-y-4 mt-4">
            <div className="space-y-6">
              <div className="space-y-4">
                <h4 className="font-medium">Rate Limits</h4>
                
                <div className="space-y-2">
                  <Label htmlFor="user_limit">Requests per Hour (Per User)</Label>
                  <Input
                    id="user_limit"
                    type="number"
                    value={rateLimits.requests_per_hour_per_user}
                    onChange={(e) => setRateLimits({
                      ...rateLimits,
                      requests_per_hour_per_user: parseInt(e.target.value) || 0,
                    })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="global_limit">Requests per Hour (Global)</Label>
                  <Input
                    id="global_limit"
                    type="number"
                    value={rateLimits.requests_per_hour_global}
                    onChange={(e) => setRateLimits({
                      ...rateLimits,
                      requests_per_hour_global: parseInt(e.target.value) || 0,
                    })}
                  />
                </div>
              </div>

              <div className="border-t pt-4 space-y-4">
                <h4 className="font-medium">Quota per Plan</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="quota_free">Free Plan</Label>
                    <Input
                      id="quota_free"
                      type="number"
                      value={quotaPerPlan.free}
                      onChange={(e) => setQuotaPerPlan({
                        ...quotaPerPlan,
                        free: parseInt(e.target.value) || 0,
                      })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="quota_pro">Pro Plan</Label>
                    <Input
                      id="quota_pro"
                      type="number"
                      value={quotaPerPlan.pro}
                      onChange={(e) => setQuotaPerPlan({
                        ...quotaPerPlan,
                        pro: parseInt(e.target.value) || 0,
                      })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="quota_business">Business Plan</Label>
                    <Input
                      id="quota_business"
                      type="number"
                      value={quotaPerPlan.business}
                      onChange={(e) => setQuotaPerPlan({
                        ...quotaPerPlan,
                        business: parseInt(e.target.value) || 0,
                      })}
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-4 space-y-4">
                <h4 className="font-medium">Feature Flags</h4>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="is_beta">Beta Feature</Label>
                    <p className="text-xs text-muted-foreground">
                      Mark this integration as beta/experimental
                    </p>
                  </div>
                  <Switch
                    id="is_beta"
                    checked={featureFlags.is_beta}
                    onCheckedChange={(checked) => setFeatureFlags({
                      ...featureFlags,
                      is_beta: checked,
                    })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="requires_approval">Requires Admin Approval</Label>
                    <p className="text-xs text-muted-foreground">
                      Users must request access before enabling
                    </p>
                  </div>
                  <Switch
                    id="requires_approval"
                    checked={featureFlags.requires_approval}
                    onCheckedChange={(checked) => setFeatureFlags({
                      ...featureFlags,
                      requires_approval: checked,
                    })}
                  />
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Configuration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

