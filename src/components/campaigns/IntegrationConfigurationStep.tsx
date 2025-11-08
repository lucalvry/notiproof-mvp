import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, AlertCircle, Settings } from "lucide-react";
import { IntegrationConnectionFlow } from "./IntegrationConnectionFlow";
import { MessageTemplateBuilder } from "./MessageTemplateBuilder";
import { PlaceholderSelector } from "./PlaceholderSelector";
import { IntegrationConfigCard } from "./IntegrationConfigCard";
import { getIntegrationMetadata } from "@/lib/integrationMetadata";
import { supabase } from "@/integrations/supabase/client";
import { useWebsiteContext } from "@/contexts/WebsiteContext";

interface IntegrationConfigurationStepProps {
  dataSource: string;
  campaignType: string;
  existingConfig?: {
    messageTemplate: string;
    placeholders: string[];
    connectorId?: string;
    integrationSettings?: {
      message_template: string;
      image_fallback_url: string;
      locale: string;
      actions: Array<{
        type: 'replace_variable' | 'change_url' | 'change_image' | 'hide_event';
        condition: string;
        value: string;
      }>;
    };
  };
  onConfigComplete: (config: {
    messageTemplate: string;
    placeholders: string[];
    connectorId?: string;
    integrationSettings?: {
      message_template: string;
      image_fallback_url: string;
      locale: string;
      actions: Array<{
        type: 'replace_variable' | 'change_url' | 'change_image' | 'hide_event';
        condition: string;
        value: string;
      }>;
    };
  }) => void;
}

export function IntegrationConfigurationStep({
  dataSource,
  campaignType,
  existingConfig,
  onConfigComplete,
}: IntegrationConfigurationStepProps) {
  const { currentWebsite } = useWebsiteContext();
  const [isConnected, setIsConnected] = useState(false);
  const [connectorId, setConnectorId] = useState<string | null>(null);
  const [messageTemplate, setMessageTemplate] = useState(existingConfig?.messageTemplate || "");
  const [selectedPlaceholders, setSelectedPlaceholders] = useState<string[]>(existingConfig?.placeholders || []);
  const [isCheckingConnection, setIsCheckingConnection] = useState(true);
  
  // Integration-specific settings
  const [integrationSettings, setIntegrationSettings] = useState({
    message_template: existingConfig?.integrationSettings?.message_template || "",
    image_fallback_url: existingConfig?.integrationSettings?.image_fallback_url || "",
    locale: existingConfig?.integrationSettings?.locale || "en",
    actions: existingConfig?.integrationSettings?.actions || [],
  });

  const metadata = getIntegrationMetadata(dataSource);

  // Check if integration is already connected
  useState(() => {
    const checkConnection = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !currentWebsite?.id) {
          setIsCheckingConnection(false);
          return;
        }

        const { data } = await supabase
          .from('integration_connectors')
          .select('id, status')
          .eq('user_id', user.id)
          .eq('website_id', currentWebsite.id)
          .eq('integration_type', dataSource as any)
          .eq('status', 'active')
          .maybeSingle();

        if (data) {
          setIsConnected(true);
          setConnectorId(data.id);
        }
      } catch (error) {
        console.error('Error checking connection:', error);
      } finally {
        setIsCheckingConnection(false);
      }
    };

    checkConnection();
  });

  const handleComplete = () => {
    onConfigComplete({
      messageTemplate: integrationSettings.message_template || messageTemplate,
      placeholders: selectedPlaceholders,
      connectorId: connectorId || undefined,
      integrationSettings,
    });
  };

  const canComplete = messageTemplate.trim() !== "" || isConnected;

  if (isCheckingConnection) {
    return (
      <div className="py-12 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
        <p className="mt-4 text-sm text-muted-foreground">Checking connection status...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Settings className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">Configure {metadata.displayName}</h2>
        </div>
        <p className="text-muted-foreground">
          Set up your integration and customize notification messages
        </p>
      </div>

      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            {isConnected ? (
              <>
                <CheckCircle2 className="h-5 w-5 text-success" />
                Connected
              </>
            ) : (
              <>
                <AlertCircle className="h-5 w-5 text-warning" />
                Connection Required
              </>
            )}
          </CardTitle>
          <CardDescription>
            {isConnected
              ? `Your ${metadata.displayName} integration is active and ready to use`
              : `Connect ${metadata.displayName} to start syncing data`}
          </CardDescription>
        </CardHeader>
        {!isConnected && (
          <CardContent>
            <IntegrationConnectionFlow
              integrationType={dataSource}
              onConnectionComplete={(config) => {
                setIsConnected(true);
                setConnectorId(config?.connectorId || null);
              }}
            />
          </CardContent>
        )}
      </Card>

      {/* Integration Settings with Tabs */}
      {isConnected && (
        <>
          <IntegrationConfigCard
            dataSource={dataSource}
            campaignType={campaignType}
            config={integrationSettings}
            onChange={setIntegrationSettings}
          />

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Available Variables</CardTitle>
              <CardDescription>
                Select which data to display in your notifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PlaceholderSelector
                dataSource={dataSource}
                selected={selectedPlaceholders}
                onSelect={setSelectedPlaceholders}
              />
            </CardContent>
          </Card>
        </>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 pt-4">
        <Button
          size="lg"
          onClick={handleComplete}
          disabled={!canComplete}
        >
          Continue to Design
        </Button>
      </div>

      {!canComplete && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please connect your integration and set up a message template to continue
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
