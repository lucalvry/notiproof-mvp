import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, X } from "lucide-react";
import { getIntegrationMetadata } from "@/lib/integrationMetadata";

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
    authorization_url: "",
    token_url: "",
    scopes: [] as string[],
  });

  const [webhookConfig, setWebhookConfig] = useState({
    signing_secret: "",
    supported_events: [] as string[],
  });

  const [apiConfig, setApiConfig] = useState({
    api_endpoint: "",
    required_headers: {} as Record<string, string>,
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

  // Initialize form when integration changes
  useState(() => {
    if (integration) {
      const config = integration.config || {};
      
      // OAuth Config
      if (config.oauth_config) {
        setOauthConfig(config.oauth_config);
      } else if (integration.api_credentials) {
        setOauthConfig({
          client_id: integration.api_credentials.client_id || "",
          client_secret: integration.api_credentials.client_secret || "",
          authorization_url: "",
          token_url: "",
          scopes: [],
        });
      }

      // Webhook Config
      if (config.webhook_config) {
        setWebhookConfig(config.webhook_config);
      } else if (integration.webhook_secret) {
        setWebhookConfig({
          signing_secret: integration.webhook_secret,
          supported_events: [],
        });
      }

      // API Config
      if (config.api_config) {
        setApiConfig(config.api_config);
      }

      // Rate Limits
      if (config.rate_limits) {
        setRateLimits(config.rate_limits);
      } else if (integration.rate_limit_per_user) {
        setRateLimits({
          requests_per_hour_per_user: integration.rate_limit_per_user,
          requests_per_hour_global: 10000,
        });
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

  const handleSave = () => {
    const updates: Partial<IntegrationConfig> = {
      config: {
        oauth_config: oauthConfig,
        webhook_config: webhookConfig,
        api_config: apiConfig,
        rate_limits: rateLimits,
        quota_per_plan: quotaPerPlan,
        feature_flags: featureFlags,
      },
      // Keep backward compatibility
      webhook_secret: webhookConfig.signing_secret || null,
      api_credentials: integration?.requires_oauth ? {
        client_id: oauthConfig.client_id,
        client_secret: oauthConfig.client_secret,
      } : null,
      rate_limit_per_user: rateLimits.requests_per_hour_per_user,
    };

    onSave(updates);
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
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configure {metadata.displayName}</DialogTitle>
          <DialogDescription>
            Set up credentials, rate limits, and advanced configuration for this integration
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="oauth" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="oauth">OAuth & API</TabsTrigger>
            <TabsTrigger value="webhook">Webhook</TabsTrigger>
            <TabsTrigger value="limits">Limits & Features</TabsTrigger>
          </TabsList>

          <TabsContent value="oauth" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="client_id">Client ID</Label>
                <Input
                  id="client_id"
                  placeholder="Enter OAuth client ID"
                  value={oauthConfig.client_id}
                  onChange={(e) => setOauthConfig({ ...oauthConfig, client_id: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="client_secret">Client Secret</Label>
                <Input
                  id="client_secret"
                  type="password"
                  placeholder="Enter OAuth client secret"
                  value={oauthConfig.client_secret}
                  onChange={(e) => setOauthConfig({ ...oauthConfig, client_secret: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="auth_url">Authorization URL</Label>
                <Input
                  id="auth_url"
                  placeholder="https://provider.com/oauth/authorize"
                  value={oauthConfig.authorization_url}
                  onChange={(e) => setOauthConfig({ ...oauthConfig, authorization_url: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="token_url">Token URL</Label>
                <Input
                  id="token_url"
                  placeholder="https://provider.com/oauth/token"
                  value={oauthConfig.token_url}
                  onChange={(e) => setOauthConfig({ ...oauthConfig, token_url: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>OAuth Scopes</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g., read:data write:data"
                    value={newScope}
                    onChange={(e) => setNewScope(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addScope())}
                  />
                  <Button type="button" size="sm" onClick={addScope}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {oauthConfig.scopes.map((scope, index) => (
                    <Badge key={index} variant="secondary">
                      {scope}
                      <button
                        type="button"
                        className="ml-2"
                        onClick={() => removeScope(index)}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="border-t pt-4 space-y-4">
                <h4 className="font-medium">API Configuration</h4>
                
                <div className="space-y-2">
                  <Label htmlFor="api_endpoint">API Endpoint</Label>
                  <Input
                    id="api_endpoint"
                    placeholder="https://api.provider.com/v1"
                    value={apiConfig.api_endpoint}
                    onChange={(e) => setApiConfig({ ...apiConfig, api_endpoint: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Required Headers</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Header name"
                      value={newHeaderKey}
                      onChange={(e) => setNewHeaderKey(e.target.value)}
                    />
                    <Input
                      placeholder="Header value"
                      value={newHeaderValue}
                      onChange={(e) => setNewHeaderValue(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addHeader())}
                    />
                    <Button type="button" size="sm" onClick={addHeader}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="space-y-2 mt-2">
                    {Object.entries(apiConfig.required_headers).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between bg-muted p-2 rounded">
                        <code className="text-sm">{key}: {value}</code>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeHeader(key)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
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
                
                <div className="grid grid-cols-3 gap-4">
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

