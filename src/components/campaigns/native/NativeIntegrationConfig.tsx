import { useState } from "react";
import { AnnouncementConfig } from "./AnnouncementConfig";
import { LiveVisitorConfig } from "./LiveVisitorConfig";
import { InstantCaptureConfig } from "./InstantCaptureConfig";
import { TestimonialTemplateConfig } from "./TestimonialTemplateConfig";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";

interface NativeIntegrationConfigProps {
  dataSource: string;
  websiteId: string;
  config: any;
  onConfigComplete: (config: any) => void;
  onPreviewUpdate?: (config: any) => void;
}

export function NativeIntegrationConfig({ 
  dataSource,
  websiteId, 
  config,
  onConfigComplete,
  onPreviewUpdate
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
          image_type: 'icon' as const,
          emoji: '📢',
          icon: '📢',
          image_url: '',
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
      case 'testimonials':
        return {
          formId: '',
          minRating: 3,
          limit: 50,
          onlyApproved: true,
        };
      default:
        return {};
    }
  };

  // Use local state to prevent auto-navigation on every keystroke
  // Merge incoming config with defaults to ensure all required fields exist
  const [localConfig, setLocalConfig] = useState(() => {
    const defaults = getDefaultConfig();
    return { ...defaults, ...config };
  });

  const handleChange = (updatedConfig: any) => {
    // Ensure all updates preserve existing fields
    const mergedConfig = { ...localConfig, ...updatedConfig };
    
    // STEP 5: Comprehensive logging for config changes
    console.log('🔧 [NativeIntegrationConfig] Config updated');
    console.log('  - Data source:', dataSource);
    console.log('  - Updated fields:', Object.keys(updatedConfig));
    console.log('  - Merged config:', JSON.stringify(mergedConfig, null, 2));
    
    // STEP 5: Log announcement-specific fields if applicable
    if (dataSource === 'announcements') {
      console.log('  - Announcement fields check:');
      console.log('    * title:', mergedConfig.title || '(empty)');
      console.log('    * message:', mergedConfig.message || '(empty)');
      console.log('    * cta_text:', mergedConfig.cta_text || '(empty)');
      console.log('    * cta_url:', mergedConfig.cta_url || '(empty)');
      console.log('    * image_type:', mergedConfig.image_type);
      console.log('    * icon/emoji:', mergedConfig.icon || mergedConfig.emoji);
    }
    
    setLocalConfig(mergedConfig);
    onPreviewUpdate?.(mergedConfig); // Update preview in real-time
  };

  const handleConfigComplete = () => {
    // STEP 5: Comprehensive logging before passing to parent
    console.log('✅ [NativeIntegrationConfig] Configuration complete - passing to parent');
    console.log('  - Data source:', dataSource);
    console.log('  - Final config:', JSON.stringify(localConfig, null, 2));
    console.log('  - Config completeness:');
    
    if (dataSource === 'announcements') {
      console.log('    ANNOUNCEMENT CONFIG VALIDATION:');
      console.log('    ✓ title present:', !!localConfig.title, `(${localConfig.title?.length || 0} chars)`);
      console.log('    ✓ message present:', !!localConfig.message, `(${localConfig.message?.length || 0} chars)`);
      console.log('    ✓ cta_text present:', !!localConfig.cta_text, `(${localConfig.cta_text?.length || 0} chars)`);
      console.log('    ✓ cta_url present:', !!localConfig.cta_url, `(${localConfig.cta_url?.length || 0} chars)`);
      console.log('    ✓ image_type:', localConfig.image_type);
      console.log('    ✓ icon/emoji:', localConfig.icon || localConfig.emoji);
      
      if (!localConfig.title || !localConfig.message) {
        console.warn('    ⚠️ WARNING: Missing required announcement fields!');
      }
    }
    
    onConfigComplete(localConfig);
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
      case 'testimonials':
        return (
          <TestimonialTemplateConfig 
            websiteId={websiteId}
            config={localConfig} 
            onChange={handleChange} 
          />
        );
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
          onClick={handleConfigComplete}
          className="gap-2"
        >
          <CheckCircle2 className="h-5 w-5" />
          Continue to Design
        </Button>
      </div>
    </div>
  );
}
