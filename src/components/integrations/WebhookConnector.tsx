import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, Check, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface WebhookConnectorProps {
  websiteId: string;
  onSuccess: () => void;
  integrationType?: 'webhook' | 'zapier';
}

export function WebhookConnector({ websiteId, onSuccess, integrationType = 'webhook' }: WebhookConnectorProps) {
  const [name, setName] = useState("");
  const [fieldMapping, setFieldMapping] = useState({
    message: "message",
    user_name: "user.name",
    user_location: "user.location",
    event_type: "type",
    custom_fields: {} as Record<string, string>
  });
  const [copied, setCopied] = useState(false);
  const [creating, setCreating] = useState(false);

  const generateWebhookToken = () => {
    const prefix = integrationType === 'zapier' ? 'zap_' : 'whk_';
    return prefix + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("Please enter a name for this webhook");
      return;
    }

    setCreating(true);
    try {
      const webhookToken = generateWebhookToken();
      const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/webhook-generic?token=${webhookToken}`;

      const { error } = await supabase
        .from('integration_connectors')
        .insert({
          website_id: websiteId,
          user_id: (await supabase.auth.getUser()).data.user?.id,
          integration_type: integrationType,
          name: name,
          config: {
            webhook_token: webhookToken,
            webhook_url: webhookUrl,
            field_mapping: fieldMapping
          },
          status: 'active'
        });

      if (error) throw error;

      toast.success(`${integrationType === 'zapier' ? 'Zapier' : 'Webhook'} created successfully!`);
      onSuccess();
    } catch (error) {
      console.error('Error creating webhook:', error);
      toast.error("Failed to create webhook");
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            {integrationType === 'zapier' ? 'Connect Zapier' : 'Create Generic Webhook'}
          </CardTitle>
          <CardDescription>
            {integrationType === 'zapier' 
              ? 'Send data from 5,000+ apps to NotiProof using Zapier'
              : 'Receive data from any external system via HTTP POST requests'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Webhook Name</Label>
            <Input
              placeholder={integrationType === 'zapier' ? "Zapier Integration" : "My Custom Webhook"}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

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
            {creating ? "Creating..." : `Create ${integrationType === 'zapier' ? 'Zapier' : 'Webhook'}`}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Example Payload</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
{`POST /functions/v1/webhook-generic?token=YOUR_TOKEN
Content-Type: application/json

{
  "message": "John just purchased Premium Plan",
  "type": "purchase",
  "user": {
    "name": "John Doe",
    "location": "Lagos, Nigeria"
  },
  "amount": 9999,
  "product": "Premium Plan"
}`}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
