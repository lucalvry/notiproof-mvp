import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  ShoppingCart, 
  CreditCard, 
  Star, 
  MessageSquare, 
  Link2, 
  Code, 
  Webhook,
  Plus,
  Settings,
  ExternalLink,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface IntegrationConnector {
  id: string;
  name: string;
  integration_type: string;
  config: any;
  status: string;
  last_sync: string | null;
  created_at: string;
}

const INTEGRATION_TYPES = [
  {
    id: 'shopify',
    name: 'Shopify',
    description: 'E-commerce purchase events from your Shopify store',
    icon: ShoppingCart,
    category: 'E-commerce',
    fields: [
      { key: 'shop_url', label: 'Shop URL', type: 'text', placeholder: 'yourstore.myshopify.com' },
      { key: 'webhook_secret', label: 'Webhook Secret', type: 'password' }
    ]
  },
  {
    id: 'woocommerce',
    name: 'WooCommerce',
    description: 'Order notifications from your WooCommerce store',
    icon: ShoppingCart,
    category: 'E-commerce',
    fields: [
      { key: 'site_url', label: 'Site URL', type: 'text', placeholder: 'https://yourstore.com' },
      { key: 'consumer_key', label: 'Consumer Key', type: 'text' },
      { key: 'consumer_secret', label: 'Consumer Secret', type: 'password' }
    ]
  },
  {
    id: 'stripe',
    name: 'Stripe',
    description: 'Payment and subscription events from Stripe',
    icon: CreditCard,
    category: 'Payments',
    fields: [
      { key: 'webhook_secret', label: 'Webhook Endpoint Secret', type: 'password' }
    ]
  },
  {
    id: 'google_reviews',
    name: 'Google Reviews',
    description: 'Customer reviews from Google My Business',
    icon: Star,
    category: 'Reviews',
    fields: [
      { key: 'place_id', label: 'Google Place ID', type: 'text', placeholder: 'ChIJN1t_tDeuEmsRUsoyG83frY4' }
    ]
  },
  {
    id: 'typeform',
    name: 'Typeform',
    description: 'Form submissions from Typeform',
    icon: MessageSquare,
    category: 'Forms',
    fields: [
      { key: 'form_id', label: 'Form ID', type: 'text' },
      { key: 'webhook_secret', label: 'Webhook Secret', type: 'password' }
    ]
  },
  {
    id: 'custom_sdk',
    name: 'JavaScript SDK',
    description: 'Custom events tracked via our JavaScript SDK',
    icon: Code,
    category: 'Development',
    fields: []
  },
  {
    id: 'api',
    name: 'REST API',
    description: 'Send events directly via our REST API',
    icon: Link2,
    category: 'Development',
    fields: []
  },
  {
    id: 'webhook',
    name: 'Generic Webhook',
    description: 'Receive events from any service via webhook',
    icon: Webhook,
    category: 'Development',
    fields: [
      { key: 'webhook_url', label: 'Webhook URL', type: 'text', readonly: true }
    ]
  }
];

export default function IntegrationHub() {
  const [connectors, setConnectors] = useState<IntegrationConnector[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIntegration, setSelectedIntegration] = useState<any>(null);
  const [formData, setFormData] = useState<any>({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadConnectors();
  }, []);

  const loadConnectors = async () => {
    try {
      const { data, error } = await supabase
        .from('integration_connectors')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setConnectors(data || []);
    } catch (error) {
      console.error('Error loading connectors:', error);
      toast({
        title: 'Error',
        description: 'Failed to load integration connectors',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateConnector = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      // Generate webhook URL for webhook integrations
      if (selectedIntegration.id === 'webhook') {
        const webhookId = crypto.randomUUID();
        formData.webhook_url = `https://ewymvxhpkswhsirdrjub.supabase.co/functions/v1/webhook-receiver/${webhookId}`;
      }

      const { error } = await supabase
        .from('integration_connectors')
        .insert({
          user_id: user.user.id,
          website_id: 'temp-website-id', // Will be updated when we add website context
          integration_type: selectedIntegration.id,
          name: formData.name || selectedIntegration.name,
          config: formData,
          status: 'active'
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: `${selectedIntegration.name} integration created successfully`
      });

      setDialogOpen(false);
      setFormData({});
      setSelectedIntegration(null);
      loadConnectors();
    } catch (error) {
      console.error('Error creating connector:', error);
      toast({
        title: 'Error',
        description: 'Failed to create integration connector',
        variant: 'destructive'
      });
    }
  };

  const handleSync = async (connector: IntegrationConnector) => {
    try {
      // Call appropriate sync function based on integration type
      const functionName = `${connector.integration_type}-sync`;
      
      const { error } = await supabase.functions.invoke(functionName, {
        body: { 
          connector_id: connector.id,
          widget_id: connector.config.widget_id 
        }
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: `${connector.name} synced successfully`
      });

      // Update last sync time
      await supabase
        .from('integration_connectors')
        .update({ last_sync: new Date().toISOString() })
        .eq('id', connector.id);

      loadConnectors();
    } catch (error) {
      console.error('Error syncing connector:', error);
      toast({
        title: 'Error',
        description: `Failed to sync ${connector.name}`,
        variant: 'destructive'
      });
    }
  };

  const handleDeleteConnector = async (connectorId: string) => {
    try {
      const { error } = await supabase
        .from('integration_connectors')
        .delete()
        .eq('id', connectorId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Integration connector deleted successfully'
      });

      loadConnectors();
    } catch (error) {
      console.error('Error deleting connector:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete integration connector',
        variant: 'destructive'
      });
    }
  };

  const getIntegrationInfo = (type: string) => {
    return INTEGRATION_TYPES.find(t => t.id === type) || INTEGRATION_TYPES[0];
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading integrations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Integration Hub</h1>
          <p className="text-muted-foreground">
            Connect external services to automatically collect natural proof events
          </p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Integration
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Integration</DialogTitle>
              <DialogDescription>
                Choose an integration to start collecting natural proof events automatically
              </DialogDescription>
            </DialogHeader>
            
            {!selectedIntegration ? (
              <div className="grid grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                {INTEGRATION_TYPES.map((integration) => {
                  const Icon = integration.icon;
                  return (
                    <Card 
                      key={integration.id}
                      className="cursor-pointer hover:border-primary transition-colors"
                      onClick={() => setSelectedIntegration(integration)}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-center space-x-2">
                          <Icon className="h-5 w-5" />
                          <CardTitle className="text-base">{integration.name}</CardTitle>
                        </div>
                        <Badge variant="secondary" className="w-fit text-xs">
                          {integration.category}
                        </Badge>
                      </CardHeader>
                      <CardContent>
                        <CardDescription className="text-sm">
                          {integration.description}
                        </CardDescription>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center space-x-2 mb-4">
                  <selectedIntegration.icon className="h-5 w-5" />
                  <h3 className="font-semibold">{selectedIntegration.name}</h3>
                  <Badge variant="secondary">{selectedIntegration.category}</Badge>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Integration Name</Label>
                    <Input
                      id="name"
                      value={formData.name || ''}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder={selectedIntegration.name}
                    />
                  </div>
                  
                  {selectedIntegration.fields.map((field: any) => (
                    <div key={field.key}>
                      <Label htmlFor={field.key}>{field.label}</Label>
                      {field.type === 'textarea' ? (
                        <Textarea
                          id={field.key}
                          value={formData[field.key] || ''}
                          onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                          placeholder={field.placeholder}
                          readOnly={field.readonly}
                        />
                      ) : (
                        <Input
                          id={field.key}
                          type={field.type}
                          value={formData[field.key] || ''}
                          onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                          placeholder={field.placeholder}
                          readOnly={field.readonly}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setSelectedIntegration(null);
                setFormData({});
              }}>
                {selectedIntegration ? 'Back' : 'Cancel'}
              </Button>
              {selectedIntegration && (
                <Button onClick={handleCreateConnector}>
                  Create Integration
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Active Integrations */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Active Integrations</h2>
        {connectors.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Link2 className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No integrations yet</h3>
              <p className="text-muted-foreground text-center max-w-md mb-4">
                Connect your favorite tools to start collecting natural proof events automatically
              </p>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Integration
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {connectors.map((connector) => {
              const integrationInfo = getIntegrationInfo(connector.integration_type);
              const Icon = integrationInfo.icon;
              
              return (
                <Card key={connector.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Icon className="h-5 w-5" />
                        <div>
                          <CardTitle className="text-base">{connector.name}</CardTitle>
                          <CardDescription>{integrationInfo.description}</CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(connector.status)}
                        <Badge variant={connector.status === 'active' ? 'default' : 'destructive'}>
                          {connector.status}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-muted-foreground">
                      <p>Created: {new Date(connector.created_at).toLocaleDateString()}</p>
                      {connector.last_sync && (
                        <p>Last sync: {new Date(connector.last_sync).toLocaleString()}</p>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <div className="flex space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleSync(connector)}
                      >
                        Sync Now
                      </Button>
                      <Button variant="outline" size="sm">
                        <Settings className="h-4 w-4 mr-2" />
                        Configure
                      </Button>
                    </div>
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => handleDeleteConnector(connector.id)}
                    >
                      Delete
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Integration Documentation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <ExternalLink className="h-5 w-5" />
            <span>Integration Documentation</span>
          </CardTitle>
          <CardDescription>
            Need help setting up your integrations? Check out our guides
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium">E-commerce Platforms</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Shopify webhook setup</li>
                <li>• WooCommerce API configuration</li>
                <li>• Product purchase tracking</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Payment Processors</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Stripe webhook endpoints</li>
                <li>• Subscription event tracking</li>
                <li>• Payment success notifications</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Development Tools</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• JavaScript SDK implementation</li>
                <li>• REST API integration</li>
                <li>• Custom webhook setup</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Review Platforms</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Google Reviews API</li>
                <li>• Review monitoring setup</li>
                <li>• Rating display configuration</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}