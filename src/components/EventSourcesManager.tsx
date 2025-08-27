import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { 
  Store, 
  ShoppingCart, 
  CreditCard, 
  Mail, 
  Star, 
  Settings, 
  ExternalLink, 
  CheckCircle, 
  AlertCircle,
  Zap,
  Activity,
  Filter
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface EventSourcesManagerProps {
  widgetId: string;
}

const AVAILABLE_INTEGRATIONS = [
  {
    id: 'shopify',
    name: 'Shopify',
    description: 'Connect your Shopify store for live purchase notifications',
    icon: Store,
    category: 'E-commerce',
    popularity: 95,
    setupUrl: '/dashboard/integrations/shopify'
  },
  {
    id: 'woocommerce',
    name: 'WooCommerce',
    description: 'Show real-time orders from your WordPress store',
    icon: ShoppingCart,
    category: 'E-commerce',
    popularity: 88,
    setupUrl: '/dashboard/integrations/woocommerce'
  },
  {
    id: 'stripe',
    name: 'Stripe',
    description: 'Display payment confirmations and signups',
    icon: CreditCard,
    category: 'Payments',
    popularity: 92,
    setupUrl: '/dashboard/integrations/stripe'
  },
  {
    id: 'mailchimp',
    name: 'Mailchimp',
    description: 'Show new subscribers and email signups',
    icon: Mail,
    category: 'Email Marketing',
    popularity: 75,
    setupUrl: '/dashboard/integrations/mailchimp'
  },
  {
    id: 'google_reviews',
    name: 'Google Reviews',
    description: 'Display recent customer reviews automatically',
    icon: Star,
    category: 'Reviews',
    popularity: 82,
    setupUrl: '/dashboard/integrations/google-reviews'
  }
];

const QUICK_WIN_CATEGORIES = [
  {
    id: 'purchases',
    name: 'Purchase Notifications',
    description: 'Recent purchase alerts and product activity',
    count: 15,
    enabled: true
  },
  {
    id: 'signups',
    name: 'Sign-up Activities',
    description: 'New user registrations and account creation',
    count: 12,
    enabled: true
  },
  {
    id: 'reviews',
    name: 'Review & Testimonials',
    description: 'Customer feedback and rating notifications',
    count: 8,
    enabled: false
  },
  {
    id: 'inventory',
    name: 'Inventory Updates',
    description: 'Stock levels and product availability alerts',
    count: 6,
    enabled: false
  },
  {
    id: 'urgency',
    name: 'Urgency & Scarcity',
    description: 'Limited time offers and low stock warnings',
    count: 10,
    enabled: true
  }
];

export const EventSourcesManager = ({ widgetId }: EventSourcesManagerProps) => {
  const [connectedIntegrations, setConnectedIntegrations] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [quickWinCategories, setQuickWinCategories] = useState(QUICK_WIN_CATEGORIES);
  const [naturalEventsEnabled, setNaturalEventsEnabled] = useState(true);
  const { profile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchConnectedIntegrations();
    fetchWidgetConfiguration();
  }, [widgetId]);

  const fetchConnectedIntegrations = async () => {
    if (!profile) return;

    try {
      const { data, error } = await supabase
        .from('integration_connectors')
        .select('integration_type, status')
        .eq('user_id', profile.id)
        .eq('status', 'active');

      if (error) throw error;

      setConnectedIntegrations(data?.map(d => d.integration_type) || []);
    } catch (error) {
      console.error('Error fetching integrations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchWidgetConfiguration = async () => {
    try {
      const { data, error } = await supabase
        .from('widgets')
        .select('allowed_event_sources')
        .eq('id', widgetId)
        .single();

      if (error) throw error;

      const allowedSources = data?.allowed_event_sources || [];
      setNaturalEventsEnabled(allowedSources.includes('natural'));
    } catch (error) {
      console.error('Error fetching widget config:', error);
    }
  };

  const handleIntegrationSetup = (integration: typeof AVAILABLE_INTEGRATIONS[0]) => {
    // Open integration setup in new tab or navigate
    window.open(integration.setupUrl, '_blank');
  };

  const toggleQuickWinCategory = async (categoryId: string) => {
    setQuickWinCategories(prev => 
      prev.map(cat => 
        cat.id === categoryId 
          ? { ...cat, enabled: !cat.enabled }
          : cat
      )
    );

    toast({
      title: "Category Updated",
      description: `Quick-win category ${categoryId} has been toggled`,
    });
  };

  const toggleNaturalEvents = async () => {
    const newValue = !naturalEventsEnabled;
    setNaturalEventsEnabled(newValue);

    try {
      const { data: widget } = await supabase
        .from('widgets')
        .select('allowed_event_sources')
        .eq('id', widgetId)
        .single();

      let allowedSources = widget?.allowed_event_sources || [];
      
      if (newValue) {
        if (!allowedSources.includes('natural')) {
          allowedSources.push('natural');
        }
      } else {
        allowedSources = allowedSources.filter((s: string) => s !== 'natural');
      }

      await supabase
        .from('widgets')
        .update({ allowed_event_sources: allowedSources })
        .eq('id', widgetId);

      toast({
        title: "Natural Events Updated",
        description: `Natural events have been ${newValue ? 'enabled' : 'disabled'}`,
      });
    } catch (error) {
      console.error('Error updating natural events:', error);
      setNaturalEventsEnabled(!newValue); // Revert on error
    }
  };

  if (loading) {
    return <div>Loading event sources...</div>;
  }

  const connectedCount = connectedIntegrations.length;
  const totalIntegrations = AVAILABLE_INTEGRATIONS.length;
  const connectionRate = (connectedCount / totalIntegrations) * 100;

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Activity className="h-6 w-6 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold">{connectedCount}</div>
                <div className="text-sm text-muted-foreground">Connected Integrations</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-accent/10 rounded-lg">
                <Zap className="h-6 w-6 text-accent" />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {quickWinCategories.filter(c => c.enabled).length}
                </div>
                <div className="text-sm text-muted-foreground">Active Quick-Win Categories</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-secondary/10 rounded-lg">
                <Filter className="h-6 w-6 text-secondary" />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {naturalEventsEnabled ? 'ON' : 'OFF'}
                </div>
                <div className="text-sm text-muted-foreground">Natural Events</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Integration Setup */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Integration Connections
              </CardTitle>
              <CardDescription>
                Connect popular platforms for automatic event generation
              </CardDescription>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium">{connectionRate.toFixed(0)}% Connected</div>
              <Progress value={connectionRate} className="w-24 mt-1" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {AVAILABLE_INTEGRATIONS.map((integration) => {
              const isConnected = connectedIntegrations.includes(integration.id);
              const Icon = integration.icon;

              return (
                <div
                  key={integration.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-muted rounded-lg">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{integration.name}</h4>
                        <Badge variant="outline" className="text-xs">
                          {integration.category}
                        </Badge>
                        {isConnected && (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {integration.description}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="text-xs text-muted-foreground">
                          {integration.popularity}% of users connect this
                        </div>
                        <Progress value={integration.popularity} className="w-16 h-1" />
                      </div>
                    </div>
                  </div>
                  
                  <Button
                    variant={isConnected ? "outline" : "default"}
                    size="sm"
                    onClick={() => handleIntegrationSetup(integration)}
                    className="gap-2"
                  >
                    {isConnected ? (
                      <>
                        <Settings className="h-3 w-3" />
                        Manage
                      </>
                    ) : (
                      <>
                        <ExternalLink className="h-3 w-3" />
                        Setup
                      </>
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Quick-Win Categories */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Quick-Win Categories
          </CardTitle>
          <CardDescription>
            Toggle specific types of promotional notifications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {quickWinCategories.map((category) => (
              <div
                key={category.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h4 className="font-medium">{category.name}</h4>
                    <Badge variant="secondary" className="text-xs">
                      {category.count} templates
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {category.description}
                  </p>
                </div>
                
                <Switch
                  checked={category.enabled}
                  onCheckedChange={() => toggleQuickWinCategory(category.id)}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Natural Events */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Natural Events
          </CardTitle>
          <CardDescription>
            Display manually added events and organic interactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h4 className="font-medium">Manual Event Creation</h4>
              <p className="text-sm text-muted-foreground">
                Allow manually created events to be displayed in your widget
              </p>
            </div>
            <Switch
              checked={naturalEventsEnabled}
              onCheckedChange={toggleNaturalEvents}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};