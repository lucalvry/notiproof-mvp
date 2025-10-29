import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, Check, Plus, Trash2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface WebhookConnectorProps {
  websiteId: string;
  onSuccess: () => void;
  integrationType?: string;
}

export function WebhookConnector({ websiteId, onSuccess, integrationType = 'webhook' }: WebhookConnectorProps) {
  const [name, setName] = useState("");
  const [fieldMapping, setFieldMapping] = useState({
    message: "message",
    user_name: "user.name",
    user_location: "user.location",
    event_type: "type",
    page_url: "url",
    custom_fields: {} as Record<string, string>
  });
  const [copied, setCopied] = useState(false);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [existingConnector, setExistingConnector] = useState<any>(null);
  const [webhookUrl, setWebhookUrl] = useState("");

  useEffect(() => {
    loadExistingConnector();
  }, [websiteId, integrationType]);

  const loadExistingConnector = async () => {
    try {
      setLoading(true);
      const { data: connector } = await supabase
        .from('integration_connectors')
        .select('*')
        .eq('website_id', websiteId)
        .eq('integration_type', integrationType as any)
        .eq('status', 'active')
        .maybeSingle();

      if (connector) {
        setExistingConnector(connector);
        setName(connector.name);
        
        // Properly type the config object
        const config = connector.config as any;
        setWebhookUrl(config?.webhook_url || '');
        
        if (config?.field_mapping) {
          setFieldMapping(config.field_mapping);
        }
      }
    } catch (error) {
      console.error('Error loading connector:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("Please enter a name for this integration");
      return;
    }

    setCreating(true);
    try {
      if (existingConnector) {
        // Update existing connector
        const { error } = await supabase
          .from('integration_connectors')
          .update({
            name: name,
            config: {
              ...existingConnector.config,
              field_mapping: fieldMapping
            }
          })
          .eq('id', existingConnector.id);

        if (error) throw error;
        toast.success("Integration updated successfully!");
      } else {
        // Call server-side function to create connector with secure token
        const { data, error } = await supabase.functions.invoke('create-webhook-connector', {
          body: {
            website_id: websiteId,
            name,
            integration_type: integrationType,
            field_mapping: fieldMapping
          }
        });

        if (error) throw error;

        if (data?.error) {
          toast.error(data.message || data.error);
          return;
        }

        toast.success("Integration created successfully!");
      }

      await loadExistingConnector(); // Reload to get webhook URL
      onSuccess();
    } catch (error: any) {
      console.error('Error saving integration:', error);
      toast.error(error.message || "Failed to save integration");
    } finally {
      setCreating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const addCustomField = () => {
    const fieldName = prompt("Enter custom field name:");
    if (fieldName) {
      setFieldMapping(prev => ({
        ...prev,
        custom_fields: {
          ...prev.custom_fields,
          [fieldName]: ""
        }
      }));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const getTitle = () => {
    switch (integrationType) {
      case 'zapier': return 'Connect Zapier';
      case 'typeform': return 'Connect Typeform';
      case 'calendly': return 'Connect Calendly';
      default: return 'Create Generic Webhook';
    }
  };

  const getDescription = () => {
    switch (integrationType) {
      case 'zapier': return 'Send data from 5,000+ apps to NotiProof using Zapier';
      case 'typeform': return 'Display notifications when forms are submitted';
      case 'calendly': return 'Show notifications for new bookings and cancellations';
      default: return 'Receive data from any external system via HTTP POST requests';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{getTitle()}</CardTitle>
          <CardDescription>{getDescription()}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Integration Name</Label>
            <Input
              placeholder={`${integrationType.charAt(0).toUpperCase() + integrationType.slice(1)} Integration`}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {existingConnector && webhookUrl && (
            <div className="space-y-2">
              <Label>Webhook URL</Label>
              <div className="flex gap-2">
                <Input
                  value={webhookUrl}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(webhookUrl)}
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Use this URL in your {integrationType} configuration
              </p>
            </div>
          )}

          <div className="space-y-4">
            <Label>Field Mapping (JSON path)</Label>
            <p className="text-sm text-muted-foreground">
              Map fields from your webhook payload to NotiProof event fields
            </p>

            <div className="grid gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm">Message Path</Label>
                  <Input
                    placeholder="message"
                    value={fieldMapping.message}
                    onChange={(e) => setFieldMapping(prev => ({ ...prev, message: e.target.value }))}
                  />
                </div>
                <div>
                  <Label className="text-sm">Event Type Path</Label>
                  <Input
                    placeholder="type"
                    value={fieldMapping.event_type}
                    onChange={(e) => setFieldMapping(prev => ({ ...prev, event_type: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm">User Name Path (optional)</Label>
                  <Input
                    placeholder="user.name"
                    value={fieldMapping.user_name}
                    onChange={(e) => setFieldMapping(prev => ({ ...prev, user_name: e.target.value }))}
                  />
                </div>
                <div>
                  <Label className="text-sm">Location Path (optional)</Label>
                  <Input
                    placeholder="user.location"
                    value={fieldMapping.user_location}
                    onChange={(e) => setFieldMapping(prev => ({ ...prev, user_location: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <Label className="text-sm">Page URL Path (optional)</Label>
                <Input
                  placeholder="url"
                  value={fieldMapping.page_url}
                  onChange={(e) => setFieldMapping(prev => ({ ...prev, page_url: e.target.value }))}
                />
              </div>

              {Object.entries(fieldMapping.custom_fields).map(([key, path]) => (
                <div key={key} className="flex gap-2">
                  <Input value={key} disabled />
                  <Input
                    placeholder="data.path.to.field"
                    value={path}
                    onChange={(e) => setFieldMapping(prev => ({
                      ...prev,
                      custom_fields: {
                        ...prev.custom_fields,
                        [key]: e.target.value
                      }
                    }))}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setFieldMapping(prev => {
                        const newFields = { ...prev.custom_fields };
                        delete newFields[key];
                        return { ...prev, custom_fields: newFields };
                      });
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              <Button variant="outline" size="sm" onClick={addCustomField}>
                <Plus className="h-4 w-4 mr-2" />
                Add Custom Field
              </Button>
            </div>
          </div>

          <Button onClick={handleCreate} disabled={creating} className="w-full">
            {creating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              existingConnector ? 'Update Integration' : `Create Integration`
            )}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Example Payload</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
{`POST ${integrationType === 'typeform' ? '/webhook-typeform' : integrationType === 'calendly' ? '/webhook-calendly' : '/webhook-generic'}?token=YOUR_TOKEN
Content-Type: application/json

{
  "message": "John just purchased Premium Plan",
  "type": "purchase",
  "user": {
    "name": "John Doe",
    "location": "Lagos, Nigeria"
  },
  "url": "https://yoursite.com/checkout",
  "amount": 9999,
  "product": "Premium Plan"
}`}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
