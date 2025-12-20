import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Palette, RotateCcw, Sparkles } from 'lucide-react';
import { DesignEditor } from '@/components/campaigns/DesignEditor';
import { WooCommerceDesignPresets, DesignPreset, WOOCOMMERCE_THEME_PRESETS } from '@/components/campaigns/WooCommerceDesignPresets';
import { fetchIntegrationDesignDefaults, DesignDefaults } from '@/hooks/useIntegrationDesignDefaults';
import { supabase } from '@/integrations/supabase/client';

interface Integration {
  id: string;
  provider: string;
  name: string;
}

interface DesignStepProps {
  selectedIntegrationIds: string[];
  integrations: Integration[];
  designSettings: DesignDefaults;
  onDesignSettingsChange: (settings: DesignDefaults) => void;
  templateName?: string;
  campaignType?: string;
}

const DEFAULT_DESIGN: DesignDefaults = {
  backgroundColor: '#ffffff',
  textColor: '#1a1a1a',
  accentColor: '#2563EB',
  borderRadius: '12',
  shadow: 'md',
  fontSize: 'md',
  position: 'bottom-left',
  animation: 'slide-in',
  borderColor: 'transparent',
  borderWidth: '0',
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  hoverEffect: 'subtle',
  textAlignment: 'left',
  lineHeight: '1.4',
  notificationPadding: '16',
};

export function DesignStep({
  selectedIntegrationIds,
  integrations,
  designSettings,
  onDesignSettingsChange,
  templateName,
  campaignType,
}: DesignStepProps) {
  const [integrationDefaults, setIntegrationDefaults] = useState<DesignDefaults | null>(null);
  const [integrationName, setIntegrationName] = useState<string>('');
  const [useDefaults, setUseDefaults] = useState(true);
  const [loading, setLoading] = useState(true);
  const [selectedPresetId, setSelectedPresetId] = useState<string | undefined>();

  // Detect if this is a WooCommerce campaign
  const selectedIntegration = integrations.find(i => selectedIntegrationIds.includes(i.id));
  const isWooCommerce = selectedIntegration?.provider === 'woocommerce';

  useEffect(() => {
    loadIntegrationDefaults();
  }, [selectedIntegrationIds]);

  async function loadIntegrationDefaults() {
    setLoading(true);
    
    const firstIntegrationId = selectedIntegrationIds[0];
    if (!firstIntegrationId) {
      setLoading(false);
      return;
    }

    const integration = integrations.find(i => i.id === firstIntegrationId);
    if (!integration) {
      setLoading(false);
      return;
    }

    setIntegrationName(integration.name);

    // Determine integration type by checking both tables
    let integrationType: 'native' | 'connector' = 'native';
    
    const { data: nativeData } = await supabase
      .from('integrations')
      .select('id')
      .eq('id', firstIntegrationId)
      .maybeSingle();
    
    if (!nativeData) {
      integrationType = 'connector';
    }

    // Fetch design defaults
    const defaults = await fetchIntegrationDesignDefaults(firstIntegrationId, integrationType);
    
    if (defaults) {
      setIntegrationDefaults(defaults);
      // Only apply defaults if design settings are still at system defaults
      const isUsingSystemDefaults = JSON.stringify(designSettings) === JSON.stringify(DEFAULT_DESIGN) ||
        Object.keys(designSettings).length === 0;
      
      if (isUsingSystemDefaults) {
        onDesignSettingsChange(defaults);
        setUseDefaults(true);
      } else {
        setUseDefaults(false);
      }
    } else {
      setIntegrationDefaults(null);
      // Apply system defaults if no settings configured
      if (Object.keys(designSettings).length === 0) {
        onDesignSettingsChange(DEFAULT_DESIGN);
      }
    }
    
    setLoading(false);
  }

  const handleResetToDefaults = () => {
    if (integrationDefaults) {
      onDesignSettingsChange(integrationDefaults);
      setUseDefaults(true);
    } else {
      onDesignSettingsChange(DEFAULT_DESIGN);
    }
    setSelectedPresetId(undefined);
  };

  const handleCustomize = () => {
    setUseDefaults(false);
  };

  const handlePresetSelect = (preset: DesignPreset) => {
    setSelectedPresetId(preset.id);
    setUseDefaults(false);
    
    // Apply preset colors to design settings
    onDesignSettingsChange({
      ...designSettings,
      primaryColor: preset.colors.primaryColor,
      backgroundColor: preset.colors.backgroundColor,
      textColor: preset.colors.textColor,
      linkColor: preset.colors.linkColor,
      borderRadius: preset.colors.borderRadius,
      shadow: preset.colors.shadow || 'md',
      borderColor: preset.colors.borderColor || 'transparent',
      borderWidth: preset.colors.borderWidth || '0',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const selectedProvider = selectedIntegration?.provider;
  const dataSource = selectedProvider;

  return (
    <div className="space-y-6">
      {/* WooCommerce Theme Presets */}
      {isWooCommerce && (
        <WooCommerceDesignPresets
          selectedPresetId={selectedPresetId}
          onSelect={handlePresetSelect}
        />
      )}

      {integrationDefaults && useDefaults && !selectedPresetId && (
        <Alert className="bg-primary/5 border-primary/20">
          <Sparkles className="h-4 w-4 text-primary" />
          <AlertDescription className="flex items-center justify-between">
            <span>
              Using design defaults from <strong>{integrationName}</strong>
            </span>
            <Button variant="link" size="sm" onClick={handleCustomize} className="text-primary">
              Customize
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <DesignEditor
        settings={designSettings}
        onChange={(newSettings) => {
          onDesignSettingsChange(newSettings);
          if (integrationDefaults) {
            setUseDefaults(false);
          }
        }}
        integrationPath={selectedProvider}
        templateName={templateName}
        dataSource={dataSource}
        campaignType={campaignType}
      />

      {(integrationDefaults || selectedPresetId) && !useDefaults && (
        <Button variant="outline" onClick={handleResetToDefaults} className="w-full">
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset to {selectedPresetId ? 'Default Settings' : 'Integration Defaults'}
        </Button>
      )}
    </div>
  );
}
