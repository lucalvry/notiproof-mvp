import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, AlertCircle, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { adapterRegistry, resolveProviderAlias } from '@/lib/integrations/AdapterRegistry';
import type { IntegrationAdapter } from '@/lib/integrations/types';
import { IntegrationConnectionDialog } from '@/components/integrations/IntegrationConnectionDialog';
import { getIntegrationMetadata } from '@/lib/integrationMetadata';

interface IntegrationSelectionStepProps {
  websiteId: string;
  selectedIntegrations: string[];
  onSelectionChange: (integrationIds: string[]) => void;
  onConnectNew: (provider: string) => void;
}

interface IntegrationWithStatus {
  id: string;
  provider: string;
  name: string;
  is_active: boolean;
  last_sync_at: string | null;
  adapter: IntegrationAdapter;
}

export function IntegrationSelectionStep({
  websiteId,
  selectedIntegrations,
  onSelectionChange,
  onConnectNew,
}: IntegrationSelectionStepProps) {
  const [integrations, setIntegrations] = useState<IntegrationWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [availableProviders, setAvailableProviders] = useState<IntegrationAdapter[]>([]);
  const [connectDialogOpen, setConnectDialogOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<any>(null);

  useEffect(() => {
    fetchIntegrations();
    loadAvailableProviders();
  }, [websiteId]);

  async function fetchIntegrations() {
    setLoading(true);
    try {
      // Fetch from integrations table (external integrations)
      const { data: externalData, error: externalError } = await supabase
        .from('integrations')
        .select('*')
        .eq('website_id', websiteId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (externalError) throw externalError;

      // Fetch from integration_connectors table (native integrations like form_hook)
      const { data: nativeData, error: nativeError } = await supabase
        .from('integration_connectors')
        .select('id, integration_type, config, status, last_sync, name')
        .eq('website_id', websiteId)
        .eq('status', 'active');

      if (nativeError) throw nativeError;

      // Enrich external integrations with adapter data, resolving aliases
      const enrichedExternal: IntegrationWithStatus[] = (externalData || [])
        .map(integration => {
          const canonicalProvider = resolveProviderAlias(integration.provider);
          const adapter = adapterRegistry.get(canonicalProvider);
          if (!adapter) return null;
          return {
            ...integration,
            provider: canonicalProvider, // Use canonical provider name
            adapter,
          };
        })
        .filter(Boolean) as IntegrationWithStatus[];

      // Map native integrations to same shape (integration_type -> provider)
      const enrichedNative: IntegrationWithStatus[] = (nativeData || [])
        .map(native => {
          const canonicalProvider = resolveProviderAlias(native.integration_type);
          const adapter = adapterRegistry.get(canonicalProvider);
          if (!adapter) return null;
          return {
            id: native.id,
            provider: canonicalProvider, // Use canonical provider name
            name: native.name || adapter.displayName,
            is_active: native.status === 'active',
            last_sync_at: native.last_sync,
            adapter,
          };
        })
        .filter(Boolean) as IntegrationWithStatus[];

      // Combine both sources and deduplicate by provider
      const allIntegrations = [...enrichedExternal, ...enrichedNative];
      const deduplicatedMap = new Map<string, IntegrationWithStatus>();
      allIntegrations.forEach(integration => {
        const existing = deduplicatedMap.get(integration.provider);
        // Keep the most recently active one
        if (!existing || (integration.is_active && !existing.is_active)) {
          deduplicatedMap.set(integration.provider, integration);
        }
      });
      setIntegrations(Array.from(deduplicatedMap.values()));
    } catch (error) {
      console.error('Error fetching integrations:', error);
    } finally {
      setLoading(false);
    }
  }

  function loadAvailableProviders() {
    const all = adapterRegistry.getAll();
    setAvailableProviders(all);
  }

  const handleToggle = (integrationId: string) => {
    const newSelection = selectedIntegrations.includes(integrationId)
      ? selectedIntegrations.filter(id => id !== integrationId)
      : [...selectedIntegrations, integrationId];
    onSelectionChange(newSelection);
  };

  const unconnectedProviders = availableProviders.filter(
    adapter => !integrations.some(i => resolveProviderAlias(i.provider) === adapter.provider)
  );

  const handleConnectClick = (provider: string) => {
    const adapter = adapterRegistry.get(provider);
    if (!adapter) return;

    const metadata = getIntegrationMetadata(provider);
    setSelectedProvider({
      id: provider,
      name: metadata?.displayName || adapter.displayName,
      metadata,
    });
    setConnectDialogOpen(true);
  };

  const handleConnectionSuccess = () => {
    fetchIntegrations(); // Refresh the list
    setConnectDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Select Data Sources</h3>
        <p className="text-sm text-muted-foreground">
          Choose one or more integrations to power your notification. You can combine multiple sources.
        </p>
      </div>

      {selectedIntegrations.length === 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Select at least one data source to continue
          </AlertDescription>
        </Alert>
      )}

      {selectedIntegrations.length > 0 && (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            {selectedIntegrations.length} source{selectedIntegrations.length > 1 ? 's' : ''} selected
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-4">
        <div>
          <h4 className="font-medium mb-3">Connected Integrations</h4>
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading integrations...</div>
          ) : integrations.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-sm text-muted-foreground mb-4">
                  No integrations connected yet
                </p>
                <Button onClick={() => handleConnectClick('testimonials')} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Connect Integration
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {integrations.map(integration => (
                <Card
                  key={integration.id}
                  className={`cursor-pointer transition-all ${
                    selectedIntegrations.includes(integration.id)
                      ? 'ring-2 ring-primary'
                      : 'hover:border-primary/50'
                  }`}
                  onClick={() => handleToggle(integration.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={selectedIntegrations.includes(integration.id)}
                        onCheckedChange={() => handleToggle(integration.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium truncate">{integration.name}</p>
                          {integration.is_active && (
                            <Badge variant="outline" className="text-xs">
                              Active
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">
                          {integration.adapter.displayName}
                        </p>
                        {integration.last_sync_at && (
                          <p className="text-xs text-muted-foreground">
                            Last synced: {new Date(integration.last_sync_at).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {unconnectedProviders.length > 0 && (
          <div>
            <h4 className="font-medium mb-3">Available Integrations</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {unconnectedProviders.map(adapter => (
                <Card key={adapter.provider}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{adapter.displayName}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Not connected
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleConnectClick(adapter.provider)}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Connect
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Connection Dialog */}
      {selectedProvider && (
        <IntegrationConnectionDialog
          integration={selectedProvider}
          open={connectDialogOpen}
          onOpenChange={setConnectDialogOpen}
          websiteId={websiteId}
          onSuccess={handleConnectionSuccess}
        />
      )}
    </div>
  );
}
