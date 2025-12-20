import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { ArrowLeft, Home, Info, Palette, List, CheckCircle, XCircle, Globe, Settings } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { IntegrationDesignDefaults } from '@/components/integrations/IntegrationDesignDefaults';
import { getIntegrationMetadata } from '@/lib/integrationMetadata';

interface IntegrationData {
  id: string;
  name: string;
  provider: string;
  status: string;
  is_active: boolean;
  website_id: string;
  website_domain?: string;
  last_sync_at?: string;
  integrationType: 'native' | 'connector';
}

export default function IntegrationSettings() {
  const { integrationId } = useParams<{ integrationId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const defaultTab = searchParams.get('tab') || 'info';
  
  const [integration, setIntegration] = useState<IntegrationData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (integrationId) {
      fetchIntegration();
    }
  }, [integrationId]);

  async function fetchIntegration() {
    if (!integrationId) return;
    
    setLoading(true);
    try {
      // Try integrations table first (native integrations)
      let { data: nativeData, error: nativeError } = await supabase
        .from('integrations')
        .select('id, name, provider, is_active, website_id, last_sync_at')
        .eq('id', integrationId)
        .single();

      if (!nativeError && nativeData) {
        // Fetch website domain
        const { data: website } = await supabase
          .from('websites')
          .select('domain')
          .eq('id', nativeData.website_id)
          .single();

        setIntegration({
          ...nativeData,
          status: nativeData.is_active ? 'connected' : 'disconnected',
          website_domain: website?.domain,
          integrationType: 'native',
        });
        setLoading(false);
        return;
      }

      // Try integration_connectors table (webhook/API integrations)
      const { data: connectorData, error: connectorError } = await supabase
        .from('integration_connectors')
        .select('id, name, integration_type, status, website_id, last_sync')
        .eq('id', integrationId)
        .single();

      if (!connectorError && connectorData) {
        // Fetch website domain
        const { data: website } = await supabase
          .from('websites')
          .select('domain')
          .eq('id', connectorData.website_id)
          .single();

        setIntegration({
          id: connectorData.id,
          name: connectorData.name,
          provider: connectorData.integration_type,
          status: connectorData.status || 'disconnected',
          is_active: connectorData.status === 'active',
          website_id: connectorData.website_id,
          website_domain: website?.domain,
          last_sync_at: connectorData.last_sync,
          integrationType: 'connector',
        });
        setLoading(false);
        return;
      }

      toast.error('Integration not found');
      navigate('/integrations');
    } catch (error) {
      console.error('Error fetching integration:', error);
      toast.error('Failed to load integration');
      navigate('/integrations');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!integration) {
    return null;
  }

  const metadata = getIntegrationMetadata(integration.provider);
  const Icon = metadata.icon;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard">
              <Home className="h-4 w-4" />
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/integrations">Integrations</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{integration.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/integrations')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
            <Icon className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              {integration.name}
              <Badge variant={integration.is_active ? 'default' : 'secondary'}>
                {integration.is_active ? (
                  <>
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Connected
                  </>
                ) : (
                  <>
                    <XCircle className="h-3 w-3 mr-1" />
                    Disconnected
                  </>
                )}
              </Badge>
            </h1>
            <p className="text-muted-foreground flex items-center gap-2">
              <Globe className="h-4 w-4" />
              {integration.website_domain}
            </p>
          </div>
        </div>
      </div>

      <Tabs defaultValue={defaultTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="info" className="flex items-center gap-2">
            <Info className="h-4 w-4" />
            Info
          </TabsTrigger>
          <TabsTrigger value="design" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Design Defaults
          </TabsTrigger>
          <TabsTrigger value="events" className="flex items-center gap-2">
            <List className="h-4 w-4" />
            Events
          </TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Integration Details</CardTitle>
              <CardDescription>Information about this integration connection</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Provider</p>
                  <p className="text-sm">{metadata.displayName}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <Badge variant={integration.is_active ? 'default' : 'secondary'}>
                    {integration.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Website</p>
                  <p className="text-sm">{integration.website_domain}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Last Sync</p>
                  <p className="text-sm">
                    {integration.last_sync_at
                      ? new Date(integration.last_sync_at).toLocaleString()
                      : 'Never'}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Description</p>
                <p className="text-sm">{metadata.description}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="design" className="space-y-6">
          <IntegrationDesignDefaults
            integrationId={integration.id}
            integrationType={integration.integrationType}
            integrationName={integration.name}
            provider={integration.provider}
          />
        </TabsContent>

        <TabsContent value="events" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Events</CardTitle>
              <CardDescription>Events captured from this integration</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <List className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">
                  View and moderate events from this integration
                </p>
                <Button onClick={() => navigate('/events')}>
                  Go to Event Moderation
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
