import { useState, useEffect } from "react";
import { IntegrationConnectionFlow } from "./IntegrationConnectionFlow";
import { supabase } from "@/integrations/supabase/client";
import { useWebsiteContext } from "@/contexts/WebsiteContext";
import { Button } from "@/components/ui/button";
import { CheckCircle2, RefreshCw } from "lucide-react";
import { getIntegrationMetadata } from "@/lib/integrationMetadata";

interface IntegrationConnectionStepProps {
  dataSource: string;
  onConnectionComplete: (config?: any) => void;
}

export function IntegrationConnectionStep({ 
  dataSource, 
  onConnectionComplete 
}: IntegrationConnectionStepProps) {
  const { currentWebsite } = useWebsiteContext();
  const [existingConnector, setExistingConnector] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showReconnect, setShowReconnect] = useState(false);

  useEffect(() => {
    const checkExistingConnection = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !currentWebsite?.id) {
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('integration_connectors')
          .select('*')
          .eq('user_id', user.id)
          .eq('website_id', currentWebsite.id)
          .eq('integration_type', dataSource as any)
          .eq('status', 'active')
          .maybeSingle();

        if (error) {
          console.error('Error checking existing connection:', error);
        }

        setExistingConnector(data);
      } catch (error) {
        console.error('Error in checkExistingConnection:', error);
      } finally {
        setLoading(false);
      }
    };

    checkExistingConnection();
  }, [dataSource, currentWebsite?.id]);

  if (loading) {
    return (
      <div className="py-12 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
        <p className="mt-4 text-sm text-muted-foreground">Checking connection status...</p>
      </div>
    );
  }

  if (existingConnector && !showReconnect) {
    const metadata = getIntegrationMetadata(dataSource);
    
    return (
      <div className="py-6">
        <div className="max-w-md mx-auto text-center space-y-6">
          <div className="flex justify-center">
            <div className="rounded-full bg-success/10 p-4">
              <CheckCircle2 className="h-16 w-16 text-success" />
            </div>
          </div>
          
          <div className="space-y-2">
            <h3 className="text-2xl font-bold">Already Connected!</h3>
            <p className="text-muted-foreground">
              Your {metadata.displayName} integration is already set up and active.
            </p>
          </div>

          {existingConnector.config?.webhook_url && (
            <div className="bg-muted p-4 rounded-lg text-left">
              <p className="text-xs font-medium mb-2 text-muted-foreground">Webhook URL:</p>
              <code className="text-xs break-all block bg-background p-2 rounded border">
                {existingConnector.config.webhook_url}
              </code>
            </div>
          )}

          {existingConnector.last_sync && (
            <p className="text-sm text-muted-foreground">
              Last synced: {new Date(existingConnector.last_sync).toLocaleString()}
            </p>
          )}

          <div className="flex gap-3 justify-center pt-4">
            <Button 
              size="lg"
              onClick={() => onConnectionComplete({ connectorId: existingConnector.id })}
            >
              Continue with Existing Connection
            </Button>
            <Button 
              size="lg"
              variant="outline" 
              onClick={() => setShowReconnect(true)}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Reconnect
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-6">
      <IntegrationConnectionFlow
        integrationType={dataSource}
        onConnectionComplete={onConnectionComplete}
      />
    </div>
  );
}
