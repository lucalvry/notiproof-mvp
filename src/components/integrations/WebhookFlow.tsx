import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, Check, Loader2, ExternalLink, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface WebhookFlowProps {
  integration: any;
  websiteId: string;
  onSuccess: () => void;
}

export function WebhookFlow({ integration, websiteId, onSuccess }: WebhookFlowProps) {
  const [name, setName] = useState(`${integration.name} Connection`);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [existingConnector, setExistingConnector] = useState<any>(null);

  useEffect(() => {
    loadExistingConnector();
  }, [websiteId, integration.id]);

  const loadExistingConnector = async () => {
    try {
      setLoading(true);
      const { data: connector } = await supabase
        .from('integration_connectors')
        .select('*')
        .eq('website_id', websiteId)
        .eq('integration_type', integration.id)
        .eq('status', 'active')
        .maybeSingle();

      if (connector) {
        setExistingConnector(connector);
        setName(connector.name);
        const config = connector.config as any;
        setWebhookUrl(config?.webhook_url || '');
      }
    } catch (error) {
      console.error('Error loading connector:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("Please enter a name for this connection");
      return;
    }

    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-webhook-connector', {
        body: {
          website_id: websiteId,
          name,
          integration_type: integration.id,
        }
      });

      if (error) throw error;
      if (data?.error) {
        toast.error(data.message || data.error);
        return;
      }

      toast.success(`${integration.name} connected successfully!`);
      await loadExistingConnector();
      onSuccess();
    } catch (error: any) {
      console.error('Error creating connector:', error);
      toast.error(error.message || "Failed to create connection");
    } finally {
      setCreating(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    toast.success("Webhook URL copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const openSetupGuide = () => {
    window.open(`https://docs.notiproof.com/integrations/${integration.id}`, '_blank');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const Icon = integration.icon;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
            <Icon className="h-6 w-6 text-primary" />
          </div>
          <div>
            <CardTitle>Setup {integration.name} Webhook</CardTitle>
            <CardDescription>Connect in 3 simple steps</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {!existingConnector ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="connection-name">Connection Name</Label>
              <Input
                id="connection-name"
                placeholder={`${integration.name} Connection`}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <Button 
              className="w-full" 
              onClick={handleCreate}
              disabled={creating}
            >
              {creating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating Connection...
                </>
              ) : (
                <>
                  Create Connection
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-success/10 border border-success/20 rounded-lg p-4">
              <div className="flex items-center gap-2 text-success">
                <CheckCircle2 className="h-5 w-5" />
                <p className="font-medium">Connection Created Successfully!</p>
              </div>
            </div>

            <ol className="space-y-4">
              <li className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                    1
                  </div>
                  <Label className="text-base font-semibold">Copy your webhook URL</Label>
                </div>
                <div className="ml-8 flex gap-2">
                  <Input 
                    value={webhookUrl} 
                    readOnly 
                    className="font-mono text-xs"
                  />
                  <Button 
                    variant="outline"
                    size="icon"
                    onClick={copyToClipboard}
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </li>

              <li className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                    2
                  </div>
                  <Label className="text-base font-semibold">Add to {integration.name}</Label>
                </div>
                <div className="ml-8 space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Go to {integration.name} Settings → Webhooks → Paste the URL above
                  </p>
                  <Button 
                    variant="outline"
                    onClick={openSetupGuide}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Step-by-Step Guide
                  </Button>
                </div>
              </li>

              <li className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                    3
                  </div>
                  <Label className="text-base font-semibold">Test the connection</Label>
                </div>
                <div className="ml-8">
                  <p className="text-sm text-muted-foreground">
                    Trigger a test event from {integration.name} to verify the connection is working
                  </p>
                </div>
              </li>
            </ol>

            <div className="bg-muted p-4 rounded-lg">
              <p className="text-xs text-muted-foreground">
                💡 <strong>Pro Tip:</strong> After adding the webhook URL to {integration.name}, 
                send a test event to ensure everything is working correctly.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
