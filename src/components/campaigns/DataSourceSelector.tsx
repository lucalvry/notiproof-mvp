import { CheckCircle2, XCircle, Webhook, Upload } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getDataSourcesForCampaignType } from "@/lib/campaignDataSources";
import { getIntegrationMetadata } from "@/lib/integrationMetadata";

interface DataSource {
  id: string;
  name: string;
  connected: boolean;
  comingSoon?: boolean;
}


interface DataSourceSelectorProps {
  selectedSource: string;
  onSelect: (source: string) => void;
  campaignType?: string;
}

export function DataSourceSelector({ selectedSource, onSelect, campaignType }: DataSourceSelectorProps) {
  const [webhookUrl, setWebhookUrl] = useState("");
  const [dataSources, setDataSources] = useState<DataSource[]>([]);

  useEffect(() => {
    fetchAvailableDataSources();
  }, [campaignType]);

  const fetchAvailableDataSources = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get relevant sources for this campaign type
      const relevantSources = campaignType 
        ? getDataSourcesForCampaignType(campaignType)
        : ['manual', 'webhook', 'zapier', 'shopify', 'stripe', 'woocommerce', 'typeform', 'calendly', 'google_reviews', 'ga4', 'rss', 'hubspot'];

      const { data: hooks } = await supabase
        .from("integration_hooks")
        .select("type, url")
        .eq("user_id", user.id);

      const { data: connectors } = await supabase
        .from("integration_connectors")
        .select("integration_type, status")
        .eq("user_id", user.id);

      const allSources: Record<string, { name: string; comingSoon?: boolean }> = {
        manual: { name: "Manual Entry" },
        webhook: { name: "Webhook" },
        zapier: { name: "Zapier" },
        shopify: { name: "Shopify" },
        stripe: { name: "Stripe" },
        woocommerce: { name: "WooCommerce" },
        typeform: { name: "Typeform" },
        calendly: { name: "Calendly" },
        google_reviews: { name: "Google Reviews", comingSoon: true },
        ga4: { name: "Google Analytics 4" },
        rss: { name: "RSS Feeds", comingSoon: true },
        hubspot: { name: "HubSpot" },
      };

      const sources: DataSource[] = relevantSources
        .filter(sourceId => allSources[sourceId])
        .map(sourceId => {
          const isHook = hooks?.some(h => h.type === sourceId);
          const connector = connectors?.find(c => c.integration_type === sourceId);
          const isConnected = sourceId === 'manual' || sourceId === 'webhook' || isHook || connector?.status === 'active';
          
          return {
            id: sourceId,
            name: allSources[sourceId].name,
            connected: isConnected,
            comingSoon: allSources[sourceId].comingSoon && !isConnected,
          };
        });

      setDataSources(sources);
    } catch (error) {
      console.error("Error fetching data sources:", error);
    }
  };

  const handleTestWebhook = () => {
    if (!webhookUrl) {
      toast.error("Please enter a webhook URL");
      return;
    }
    toast.success("Test event sent to webhook");
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Select Data Source</h3>
        <p className="text-sm text-muted-foreground mb-6">
          Choose where your proof notifications will come from
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {dataSources.map((source) => (
          <Card
            key={source.id}
            className={cn(
              "cursor-pointer transition-all hover:shadow-md",
              selectedSource === source.id && "ring-2 ring-primary",
              !source.connected && "opacity-60"
            )}
            onClick={() => source.connected && onSelect(source.id)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{source.name}</CardTitle>
                {source.connected ? (
                  <CheckCircle2 className="h-5 w-5 text-success" />
                ) : (
                  <XCircle className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-xs">
                {source.connected ? "Available" : "Connect Integration"}
              </CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedSource === "webhook" && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Webhook className="h-5 w-5" />
              <CardTitle>Webhook Configuration</CardTitle>
            </div>
            <CardDescription>
              Send POST requests to your webhook URL to trigger proof notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="webhook-url">Webhook URL</Label>
              <Input
                id="webhook-url"
                placeholder="https://your-domain.com/webhook"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
              />
            </div>
            <Button variant="outline" onClick={handleTestWebhook}>
              Send Test Event
            </Button>
            <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
              <strong>Example payload:</strong>
              <pre className="mt-2 text-xs">
{`{
  "name": "John Doe",
  "product": "Premium Plan",
  "city": "New York",
  "action": "purchased"
}`}
              </pre>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedSource === "manual" && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              <CardTitle>Manual Data Upload</CardTitle>
            </div>
            <CardDescription>
              Upload a CSV file with your proof data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-4">
                Drag and drop your CSV file here, or click to browse
              </p>
              <Button variant="outline">Choose File</Button>
            </div>
            <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
              <strong>CSV Format:</strong>
              <pre className="mt-2 text-xs">
{`name,product,city,action
John Doe,Premium Plan,New York,purchased
Jane Smith,Starter Pack,London,signed up`}
              </pre>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
