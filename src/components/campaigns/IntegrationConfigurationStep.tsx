import { useState, useEffect, useRef } from "react";
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
import { InstantCaptureConfig } from "./native/InstantCaptureConfig";
import { LiveVisitorConfig } from "./native/LiveVisitorConfig";
import { AnnouncementConfig } from "./native/AnnouncementConfig";
import { TestimonialTemplateConfig } from "./native/TestimonialTemplateConfig";
import { LiveEventPreview } from "./LiveEventPreview";
import { EventSyncStatus } from "./EventSyncStatus";
import { adapterRegistry } from "@/lib/integrations";

interface IntegrationConfigurationStepProps {
  dataSource: string;
  campaignType: string;
  existingConfig?: {
    messageTemplate: string;
    placeholders: string[];
    connectorId?: string;
    integrationSettings?: any;
  };
  onConfigComplete: (config: {
    messageTemplate: string;
    placeholders: string[];
    connectorId?: string;
    integrationSettings?: any;
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
  const [selectedPlaceholders, setSelectedPlaceholders] = useState<string[]>(existingConfig?.placeholders || []);
  const [isCheckingConnection, setIsCheckingConnection] = useState(true);
  
  // Integration-specific settings
  const [integrationSettings, setIntegrationSettings] = useState({
    message_template: existingConfig?.integrationSettings?.message_template || "",
    image_fallback_url: existingConfig?.integrationSettings?.image_fallback_url || "",
    locale: existingConfig?.integrationSettings?.locale || "en",
    actions: existingConfig?.integrationSettings?.actions || [],
    // Phase 2: Fix CTA fields - initialize as empty strings, not undefined
    cta_text: (existingConfig?.integrationSettings as any)?.cta_text || "",
    cta_url: (existingConfig?.integrationSettings as any)?.cta_url || "",
  });

  const metadata = getIntegrationMetadata(dataSource);

  // Debounced preview update ref
  const previewUpdateTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Update preview when template changes for 3rd party integrations
  useEffect(() => {
    if (isConnected && integrationSettings.message_template) {
      console.log('📡 Emitting preview update from Step 2:', integrationSettings.message_template);
      
      window.dispatchEvent(new CustomEvent('notiproof:preview-update', {
        detail: { 
          settings: {
            headline: integrationSettings.message_template,
            backgroundColor: "#ffffff",
            textColor: "#1a1a1a",
            primaryColor: "#2563EB",
            borderRadius: 12,
            fontSize: 14,
            position: "bottom-left",
            animation: "slide",
            showTimestamp: true,
          }, 
          messageTemplate: integrationSettings.message_template 
        }
      }));
    }
  }, [integrationSettings.message_template, isConnected]);

  // Debounced preview update function (300ms delay)
  const updatePreviewDebounced = (newConfig: any) => {
    // Clear existing timer
    if (previewUpdateTimerRef.current) {
      clearTimeout(previewUpdateTimerRef.current);
    }

    // Set new timer for 300ms delay
    previewUpdateTimerRef.current = setTimeout(() => {
      const message = dataSource === 'announcements' 
        ? (newConfig?.message || newConfig?.title || "")
        : dataSource === 'live_visitors'
        ? `${newConfig?.min_count || 10} people are viewing this page right now`
        : dataSource === 'instant_capture'
        ? "Someone just submitted a form!"
        : "";
      
      const previewSettings = {
        headline: dataSource === 'announcements' ? (newConfig?.title || "") : message,
        message: dataSource === 'announcements' ? (newConfig?.message || "") : message,
        subtext: newConfig?.cta_text || "",
        backgroundColor: "#ffffff",
        textColor: "#1a1a1a",
        primaryColor: "#2563EB",
        borderRadius: 12,
        fontSize: 14,
        position: "bottom-left",
        animation: "slide",
        showTimestamp: true,
        notificationIcon: dataSource === 'announcements' ? '📢' : dataSource === 'live_visitors' ? '👥' : '📋',
      };
      
      console.log('🎨 Local preview update (not calling parent):', { message, previewSettings });
      
      // ✅ Dispatch custom event for preview - DO NOT call parent
      window.dispatchEvent(new CustomEvent('notiproof:preview-update', {
        detail: { 
          settings: previewSettings, 
          messageTemplate: message 
        }
      }));
    }, 300);
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (previewUpdateTimerRef.current) {
        clearTimeout(previewUpdateTimerRef.current);
      }
    };
  }, []);

  // Handle native integrations
  if (metadata.isNative) {
    const nativeConfig = {
      // Instant Capture defaults
      target_url: '',
      auto_detect: true,
      field_mappings: {},
      require_moderation: true,
      
      // Live Visitors defaults
      mode: 'simulated',
      scope: 'site',
      min_count: 5,
      max_count: 50,
      variance_percent: 30,
      update_interval_seconds: 10,
      
      // Announcements defaults
      title: '',
      message: '',
      cta_text: '',
      cta_url: '',
      schedule_type: 'instant',
      priority: 5,
      variables: {},
      
      // Merge with existing config (existing values override defaults)
      ...(existingConfig?.integrationSettings || {}),
    };

    console.log('🔧 Native config initialized:', nativeConfig);

  const handleNativeConfigChange = (newConfig: any) => {
    console.log('📝 Native config changed:', {
      previous: integrationSettings,
      new: newConfig,
      merged: { ...integrationSettings, ...newConfig }
    });
    
    // ✅ MERGE with existing state instead of replacing
    setIntegrationSettings(prev => ({
      ...prev,
      ...newConfig
    }));
    
    updatePreviewDebounced(newConfig);
  };

  const handleNativeContinue = () => {
    // Extract message from native config based on integration type
    const nativeSettings = integrationSettings as any;
    const message = nativeSettings?.message || 
                   nativeSettings?.title ||
                   (dataSource === 'live_visitors' ? `${nativeSettings?.min_count || 10} people are viewing this page right now` : '') ||
                   "";
    
    onConfigComplete({
      messageTemplate: message,
      placeholders: [],
      integrationSettings,
    });
  };

    return (
      <div className="space-y-6">
        {dataSource === 'instant_capture' && (
          <InstantCaptureConfig config={nativeConfig} onChange={handleNativeConfigChange} />
        )}
        
        {dataSource === 'live_visitors' && (
          <LiveVisitorConfig config={nativeConfig} onChange={handleNativeConfigChange} />
        )}
        
        {dataSource === 'announcements' && (
          <AnnouncementConfig config={nativeConfig} onChange={handleNativeConfigChange} />
        )}

        {dataSource === 'testimonials' && currentWebsite?.id && (
          <TestimonialTemplateConfig 
            websiteId={currentWebsite.id}
            config={nativeConfig} 
            onChange={handleNativeConfigChange} 
          />
        )}

        {!['instant_capture', 'live_visitors', 'announcements', 'testimonials'].includes(dataSource) && (
          <div className="text-center text-muted-foreground">Native integration config not found</div>
        )}

        {/* Continue Button for Native Integrations */}
        <div className="flex justify-end gap-3 pt-4">
          <Button
            size="lg"
            onClick={handleNativeContinue}
          >
            Continue to Design
          </Button>
        </div>
      </div>
    );
  }

  // Check if integration is already connected (for 3rd party only)
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
    // Use integration_settings.message_template for 3rd party integrations
    const settings = integrationSettings as any;
    const finalMessageTemplate = integrationSettings.message_template || 
                                  settings.title || 
                                  settings.message || 
                                  "";
    
    console.log('✅ Step 2 Complete - Sending template to Step 3:', finalMessageTemplate);
    
    onConfigComplete({
      messageTemplate: finalMessageTemplate,
      placeholders: selectedPlaceholders,
      connectorId: connectorId || undefined,
      integrationSettings,
    });
  };

  const canComplete = integrationSettings.message_template?.trim() !== "" || isConnected;

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
            onChange={(newConfig) => setIntegrationSettings({
              ...integrationSettings,
              ...newConfig,
              cta_text: newConfig.cta_text ?? integrationSettings.cta_text,
              cta_url: newConfig.cta_url ?? integrationSettings.cta_url,
            })}
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

          {/* Event Sync Status */}
          {connectorId && (
            <EventSyncStatus
              connectorId={connectorId}
              integrationId={dataSource}
            />
          )}

          {/* Live Event Preview */}
          {connectorId && integrationSettings.message_template && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Live Event Preview</CardTitle>
                <CardDescription>
                  See how your template will look with real data
                </CardDescription>
              </CardHeader>
              <CardContent>
                <LiveEventPreview
                  connectorId={connectorId}
                  integrationId={dataSource}
                  template={integrationSettings.message_template}
                />
              </CardContent>
            </Card>
          )}
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
            Please connect your integration to continue
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
