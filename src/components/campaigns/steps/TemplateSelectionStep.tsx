import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { TemplateSelector } from '@/components/templates/TemplateSelector';
import { adapterRegistry } from '@/lib/integrations/AdapterRegistry';
import type { TemplateConfig } from '@/lib/templateEngine';

interface TemplateSelectionStepProps {
  selectedIntegrations: Array<{ id: string; provider: string }>;
  selectedTemplateId: string | null;
  onTemplateSelect: (template: TemplateConfig) => void;
}

export function TemplateSelectionStep({
  selectedIntegrations,
  selectedTemplateId,
  onTemplateSelect,
}: TemplateSelectionStepProps) {
  const [primaryProvider, setPrimaryProvider] = useState<string | null>(null);

  useEffect(() => {
    // Use the first integration's provider as the primary
    if (selectedIntegrations.length > 0) {
      setPrimaryProvider(selectedIntegrations[0].provider);
    }
  }, [selectedIntegrations]);

  if (!primaryProvider) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          No integration selected. Please go back and select at least one data source.
        </AlertDescription>
      </Alert>
    );
  }

  const adapter = adapterRegistry.get(primaryProvider);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Choose Template</h3>
        <p className="text-sm text-muted-foreground">
          Select a notification template for <strong>{adapter?.displayName || primaryProvider}</strong>
        </p>
        {selectedIntegrations.length > 1 && (
          <p className="text-xs text-muted-foreground mt-2">
            📌 Tip: Template is based on your primary integration ({adapter?.displayName}). 
            You can map fields from all selected integrations in the next step.
          </p>
        )}
      </div>

      {selectedTemplateId && (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            Template selected. Continue to customize field mapping.
          </AlertDescription>
        </Alert>
      )}

      <Card className="p-4 max-h-[500px] overflow-y-auto">
        <TemplateSelector
          provider={primaryProvider}
          onSelect={onTemplateSelect}
          selectedTemplateId={selectedTemplateId || undefined}
        />
      </Card>
    </div>
  );
}
