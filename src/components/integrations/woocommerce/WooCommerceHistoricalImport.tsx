import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  History,
  Loader2,
  CheckCircle,
  AlertCircle,
  Download,
  ShoppingCart
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface WooCommerceHistoricalImportProps {
  connectorId: string;
  websiteId: string;
  siteUrl: string;
  consumerKey: string;
  consumerSecret: string;
  onImportComplete?: () => void;
}

type DateRange = '7' | '30' | '90' | '180';

interface ImportResult {
  orders_imported: number;
  events_created: number;
  errors: string[];
}

export function WooCommerceHistoricalImport({
  connectorId,
  websiteId,
  siteUrl,
  consumerKey,
  consumerSecret,
  onImportComplete
}: WooCommerceHistoricalImportProps) {
  const [dateRange, setDateRange] = useState<DateRange>('30');
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);

  const handleImport = async () => {
    setImporting(true);
    setProgress(0);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('import-woocommerce-orders', {
        body: {
          connector_id: connectorId,
          website_id: websiteId,
          site_url: siteUrl,
          consumer_key: consumerKey,
          consumer_secret: consumerSecret,
          days_back: parseInt(dateRange),
        },
      });

      if (error) throw error;

      setResult(data);
      setProgress(100);
      
      if (data.events_created > 0) {
        toast.success(`Imported ${data.events_created} orders as social proof events`);
        onImportComplete?.();
      } else {
        toast.info("No completed orders found in the selected period");
      }
    } catch (error: any) {
      console.error('Import error:', error);
      toast.error(error.message || "Failed to import orders");
      setResult({
        orders_imported: 0,
        events_created: 0,
        errors: [error.message || 'Unknown error'],
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <Card className="border border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10">
            <History className="h-5 w-5 text-purple-500" />
          </div>
          <div>
            <CardTitle className="text-base">Import Historical Orders</CardTitle>
            <CardDescription className="text-xs">
              Convert past WooCommerce orders into social proof events
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-muted/30 rounded-lg p-3 text-xs text-muted-foreground">
          <p>
            Import your recent completed orders to show as social proof notifications. 
            This is a one-time import - future orders will be received automatically via webhooks.
          </p>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-medium">Import orders from the last</Label>
          <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 days</SelectItem>
              <SelectItem value="30">30 days</SelectItem>
              <SelectItem value="90">90 days</SelectItem>
              <SelectItem value="180">180 days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {importing && (
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-muted-foreground text-center">
              Fetching orders from WooCommerce...
            </p>
          </div>
        )}

        {result && (
          <div className={`rounded-lg p-4 ${
            result.errors.length > 0 ? 'bg-destructive/10' : 'bg-success/10'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              {result.errors.length > 0 ? (
                <AlertCircle className="h-4 w-4 text-destructive" />
              ) : (
                <CheckCircle className="h-4 w-4 text-success" />
              )}
              <span className="font-medium text-sm">
                {result.errors.length > 0 ? 'Import completed with errors' : 'Import successful'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-3">
              <div className="text-center">
                <ShoppingCart className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                <span className="text-lg font-bold">{result.orders_imported}</span>
                <p className="text-xs text-muted-foreground">Orders Found</p>
              </div>
              <div className="text-center">
                <Download className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                <span className="text-lg font-bold">{result.events_created}</span>
                <p className="text-xs text-muted-foreground">Events Created</p>
              </div>
            </div>
            {result.errors.length > 0 && (
              <div className="mt-3 text-xs text-destructive">
                {result.errors.map((err, i) => (
                  <p key={i}>• {err}</p>
                ))}
              </div>
            )}
          </div>
        )}

        <Button
          className="w-full"
          onClick={handleImport}
          disabled={importing}
        >
          {importing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Importing Orders...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Import Historical Orders
            </>
          )}
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          Only completed orders will be imported. Pending or cancelled orders are excluded.
        </p>
      </CardContent>
    </Card>
  );
}
