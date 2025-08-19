import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertCircle, Clock, Plus, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface IntegrationStatus {
  type: string;
  name: string;
  status: 'connected' | 'error' | 'pending' | 'not_connected';
  lastSync?: string;
  errorMessage?: string;
  setupUrl: string;
  description: string;
  icon: string;
}

export const IntegrationStatusDashboard = () => {
  const { profile } = useAuth();
  const [integrations, setIntegrations] = useState<IntegrationStatus[]>([
    {
      type: 'shopify',
      name: 'Shopify',
      status: 'not_connected',
      setupUrl: '/dashboard/integrations',
      description: 'Show recent purchases and order notifications',
      icon: '🛍️'
    },
    {
      type: 'woocommerce',
      name: 'WooCommerce',
      status: 'not_connected',
      setupUrl: '/dashboard/integrations',
      description: 'Display WooCommerce order activity',
      icon: '🛒'
    },
    {
      type: 'google_reviews',
      name: 'Google Reviews',
      status: 'not_connected',
      setupUrl: '/dashboard/social-connectors',
      description: 'Showcase customer testimonials and ratings',
      icon: '⭐'
    },
    {
      type: 'mailchimp',
      name: 'Mailchimp',
      status: 'not_connected',
      setupUrl: '/dashboard/integrations',
      description: 'Track newsletter signups and subscriptions',
      icon: '📧'
    },
    {
      type: 'stripe',
      name: 'Stripe',
      status: 'not_connected',
      setupUrl: '/dashboard/integrations',
      description: 'Show payment notifications and subscriptions',
      icon: '💳'
    },
    {
      type: 'convertkit',
      name: 'ConvertKit',
      status: 'not_connected',
      setupUrl: '/dashboard/integrations',
      description: 'Display email subscriber notifications',
      icon: '✉️'
    }
  ]);

  const [nextSteps, setNextSteps] = useState<string[]>([]);

  useEffect(() => {
    const checkIntegrationStatus = async () => {
      if (!profile) return;

      try {
        // Check integration hooks
        const { data: hooks } = await supabase
          .from('integration_hooks')
          .select('type, url, created_at')
          .eq('user_id', profile.id);

        // Check social connectors
        const { data: connectors } = await supabase
          .from('social_connectors')
          .select('type, status, last_sync, created_at')
          .eq('user_id', profile.id);

        setIntegrations(prevIntegrations => 
          prevIntegrations.map(integration => {
            // Check integration hooks
            const hook = hooks?.find(h => h.type === integration.type);
            const connector = connectors?.find(c => c.type === integration.type || 
              (c.type === 'google_reviews' && integration.type === 'google_reviews'));

            if (hook) {
              return {
                ...integration,
                status: 'connected' as const,
                lastSync: hook.created_at
              };
            }

            if (connector) {
              return {
                ...integration,
                status: connector.status === 'active' ? 'connected' as const : 
                        connector.status === 'error' ? 'error' as const : 'pending' as const,
                lastSync: connector.last_sync || connector.created_at
              };
            }

            return integration;
          })
        );

        // Generate next steps
        const steps: string[] = [];
        const connectedCount = [...(hooks || []), ...(connectors || [])].length;
        
        if (connectedCount === 0) {
          steps.push("Connect your first integration to start showing social proof");
        } else if (connectedCount < 2) {
          steps.push("Add more integrations to increase social proof variety");
        }

        // Check for widgets
        const { data: widgets } = await supabase
          .from('widgets')
          .select('id, status')
          .eq('user_id', profile.id);

        if (!widgets || widgets.length === 0) {
          steps.unshift("Create your first widget to display social proof");
        } else if (!widgets.some(w => w.status === 'active')) {
          steps.push("Install your widget code on your website");
        }

        // Check for events
        const { data: events } = await supabase
          .from('events')
          .select('id')
          .in('widget_id', widgets?.map(w => w.id) || [])
          .limit(1);

        if (!events || events.length === 0) {
          steps.push("Add some events manually or wait for integration data");
        }

        setNextSteps(steps);

      } catch (error) {
        console.error('Error checking integration status:', error);
      }
    };

    checkIntegrationStatus();
  }, [profile]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      default:
        return <Plus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return <Badge variant="default" className="bg-green-600">Connected</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      default:
        return <Badge variant="outline">Not Connected</Badge>;
    }
  };

  const connectedCount = integrations.filter(i => i.status === 'connected').length;
  const totalCount = integrations.length;

  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Integration Status
            <div className="text-sm font-normal text-muted-foreground">
              {connectedCount}/{totalCount} connected
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1 bg-muted rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all"
                style={{ width: `${(connectedCount / totalCount) * 100}%` }}
              />
            </div>
            <span className="text-sm text-muted-foreground">
              {Math.round((connectedCount / totalCount) * 100)}%
            </span>
          </div>
          
          {nextSteps.length > 0 && (
            <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg">
              <h4 className="font-medium mb-2">🎯 Next Steps</h4>
              <ul className="text-sm space-y-1">
                {nextSteps.map((step, index) => (
                  <li key={index}>• {step}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Integration Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {integrations.map((integration) => (
          <Card key={integration.type} className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{integration.icon}</span>
                  <CardTitle className="text-sm">{integration.name}</CardTitle>
                </div>
                {getStatusIcon(integration.status)}
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-3">
                {integration.description}
              </p>
              
              <div className="flex items-center justify-between mb-3">
                {getStatusBadge(integration.status)}
                {integration.lastSync && (
                  <span className="text-xs text-muted-foreground">
                    {new Date(integration.lastSync).toLocaleDateString()}
                  </span>
                )}
              </div>

              {integration.status === 'error' && integration.errorMessage && (
                <div className="text-xs text-red-600 bg-red-50 dark:bg-red-950/20 p-2 rounded mb-3">
                  {integration.errorMessage}
                </div>
              )}

              <Button 
                size="sm" 
                variant={integration.status === 'connected' ? 'outline' : 'default'}
                className="w-full"
                asChild
              >
                <Link to={integration.setupUrl}>
                  {integration.status === 'connected' ? 'Manage' : 'Setup'}
                  <ExternalLink className="h-3 w-3 ml-2" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Troubleshooting Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">🔧 Common Issues</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div>
              <p className="font-medium">Integration not working?</p>
              <p className="text-muted-foreground">Check your API keys and webhook URLs are correct</p>
            </div>
            <div>
              <p className="font-medium">No data appearing?</p>
              <p className="text-muted-foreground">Ensure your widget is active and properly installed</p>
            </div>
            <div>
              <p className="font-medium">Need help?</p>
              <p className="text-muted-foreground">Visit our documentation or contact support</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};