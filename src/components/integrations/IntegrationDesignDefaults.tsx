import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Save, RotateCcw, Palette, Info } from 'lucide-react';
import { TailoredDesignEditor } from './TailoredDesignEditor';
import { useIntegrationDesignDefaults } from '@/hooks/useIntegrationDesignDefaults';
import { useTemplates } from '@/hooks/useTemplates';
import { getIntegrationDesignConfig } from '@/lib/integrationDesignConfig';

interface IntegrationDesignDefaultsProps {
  integrationId: string;
  integrationType: 'native' | 'connector';
  integrationName: string;
  provider?: string;
}

export function IntegrationDesignDefaults({
  integrationId,
  integrationType,
  integrationName,
  provider,
}: IntegrationDesignDefaultsProps) {
  const {
    designDefaults,
    setDesignDefaults,
    loading,
    hasDefaults,
    fetchDesignDefaults,
    saveDesignDefaults,
    resetToSystemDefaults,
  } = useIntegrationDesignDefaults(integrationId, integrationType);

  // Fetch templates for this provider to use in preview
  const { data: templates = [] } = useTemplates(provider);
  
  // Get integration-specific config
  const config = getIntegrationDesignConfig(provider || 'default');

  useEffect(() => {
    fetchDesignDefaults();
  }, [fetchDesignDefaults]);

  const handleSave = async () => {
    await saveDesignDefaults(designDefaults);
  };

  const handleReset = () => {
    resetToSystemDefaults();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Alert>
        <Palette className="h-4 w-4" />
        <AlertDescription>
          Set default notification styles for <strong>{integrationName}</strong> ({config.displayName}). 
          All campaigns using this integration will inherit these defaults, which can be overridden per-campaign.
        </AlertDescription>
      </Alert>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {hasDefaults ? (
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <Info className="h-4 w-4" />
              Custom defaults configured
            </span>
          ) : (
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <Info className="h-4 w-4" />
              Using system defaults
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleReset} disabled={loading}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset to System Defaults
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            <Save className="h-4 w-4 mr-2" />
            Save Defaults
          </Button>
        </div>
      </div>

      <TailoredDesignEditor
        settings={designDefaults}
        onChange={setDesignDefaults}
        provider={provider || 'default'}
        templates={templates}
      />
    </div>
  );
}
