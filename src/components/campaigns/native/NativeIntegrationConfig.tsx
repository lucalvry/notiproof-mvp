import { useState } from "react";
import { AnnouncementConfig } from "./AnnouncementConfig";
import { LiveVisitorConfig } from "./LiveVisitorConfig";
import { InstantCaptureConfig } from "./InstantCaptureConfig";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";

interface NativeIntegrationConfigProps {
  dataSource: string;
  config: any;
  onConfigComplete: (config: any) => void;
}

export function NativeIntegrationConfig({ 
  dataSource, 
  config,
  onConfigComplete 
}: NativeIntegrationConfigProps) {
  // Default configurations for each native integration type
  const getDefaultConfig = () => {
    switch (dataSource) {
      case 'announcements':
        return {
          title: '',
          message: '',
          cta_text: '',
          cta_url: '',
          schedule_type: 'instant' as const,
          priority: 5,
          variables: {},
        };
      case 'live_visitors':
        return {
          mode: 'simulated' as const,
          scope: 'site' as const,
          min_count: 10,
          max_count: 30,
          variance_percent: 30,
          update_interval_seconds: 10,
          target_pages: [],
        };
      case 'instant_capture':
        return {
          target_url: '',
          auto_detect: true,
          field_mappings: {},
          require_moderation: false,
        };
      default:
        return {};
    }
  };

  // Use local state to prevent auto-navigation on every keystroke
  const [localConfig, setLocalConfig] = useState(() => config || getDefaultConfig());

  const handleChange = (updatedConfig: any) => {
    setLocalConfig(updatedConfig); // Only update local state, don't call onConfigComplete
  };

  // Render specific config UI based on native integration type
  const renderConfigUI = () => {
    switch (dataSource) {
      case 'announcements':
        return <AnnouncementConfig config={localConfig} onChange={handleChange} />;
      case 'live_visitors':
        return <LiveVisitorConfig config={localConfig} onChange={handleChange} />;
      case 'instant_capture':
        return <InstantCaptureConfig config={localConfig} onChange={handleChange} />;
      default:
        return (
          <Card>
            <CardHeader>
              <CardTitle>Unknown Integration</CardTitle>
              <CardDescription>
                Configuration for "{dataSource}" is not available
              </CardDescription>
            </CardHeader>
          </Card>
        );
    }
  };

  return (
    <div className="space-y-6">
      {renderConfigUI()}
      
      <div className="flex justify-end">
        <Button 
          size="lg"
          onClick={() => onConfigComplete(localConfig)}
          className="gap-2"
        >
          <CheckCircle2 className="h-5 w-5" />
          Continue to Design
        </Button>
      </div>
    </div>
  );
}
