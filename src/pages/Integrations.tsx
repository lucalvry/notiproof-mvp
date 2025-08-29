import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Copy, Check, ShoppingCart, Mail, Code, ExternalLink, AlertCircle, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { WebhookVerifier } from '@/components/WebhookVerifier';
import { useWebsiteContext } from '@/contexts/WebsiteContext';

interface Integration {
  id: string;
  type: string;
  url: string;
  created_at: string;
}

export default function Integrations() {
  const { selectedWebsite, isSwitching } = useWebsiteContext();
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedWebhook, setCopiedWebhook] = useState('');
  const { toast } = useToast();

  // Webhook URLs
  const baseUrl = 'https://ewymvxhpkswhsirdrjub.supabase.co/functions/v1';
  const webhookUrls = {
    shopify: `${baseUrl}/shopify-webhook`,
    woocommerce: `${baseUrl}/woocommerce-webhook`,
    mailchimp: `${baseUrl}/email-integration`,
    convertkit: `${baseUrl}/email-integration`,
    klaviyo: `${baseUrl}/email-integration`,
    form: `${baseUrl}/javascript-api`,
  };

  useEffect(() => {
    loadIntegrations();
  }, [selectedWebsite]);

  const loadIntegrations = async () => {
    try {
      // For now, use localStorage to track integrations until DB types are updated
      const stored = localStorage.getItem('noti_integrations');
      const data = stored ? JSON.parse(stored) : [];
      setIntegrations(data);
    } catch (error) {
      console.error('Error loading integrations:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedWebhook(label);
      setTimeout(() => setCopiedWebhook(''), 2000);
      toast({
        title: 'Copied!',
        description: `${label} webhook URL copied to clipboard`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to copy to clipboard',
        variant: 'destructive'
      });
    }
  };

  const saveIntegration = async (type: string, url: string) => {
    try {
      const newIntegration = {
        id: Date.now().toString(),
        type,
        url,
        created_at: new Date().toISOString()
      };
      
      const stored = localStorage.getItem('noti_integrations');
      const existing = stored ? JSON.parse(stored) : [];
      const updated = [...existing, newIntegration];
      localStorage.setItem('noti_integrations', JSON.stringify(updated));

      toast({
        title: 'Integration saved',
        description: `${type} integration has been configured`,
      });

      loadIntegrations();
    } catch (error) {
      console.error('Error saving integration:', error);
      toast({
        title: 'Error',
        description: 'Failed to save integration',
        variant: 'destructive'
      });
    }
  };

  const deleteIntegration = async (id: string) => {
    try {
      const stored = localStorage.getItem('noti_integrations');
      const existing = stored ? JSON.parse(stored) : [];
      const updated = existing.filter((int: Integration) => int.id !== id);
      localStorage.setItem('noti_integrations', JSON.stringify(updated));

      toast({
        title: 'Integration removed',
        description: 'Integration has been deleted',
      });

      loadIntegrations();
    } catch (error) {
      console.error('Error deleting integration:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete integration',
        variant: 'destructive'
      });
    }
  };

  const getIntegrationStatus = (type: string) => {
    return integrations.some(integration => integration.type === type);
  };

  if (loading || isSwitching) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading integrations...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Integrations</h1>
        <p className="text-muted-foreground">Connect your favorite tools to automatically create social proof notifications</p>
      </div>

      <Tabs defaultValue="ecommerce" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="ecommerce" className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" />
            E-commerce
          </TabsTrigger>
          <TabsTrigger value="email" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email Marketing
          </TabsTrigger>
          <TabsTrigger value="custom" className="flex items-center gap-2">
            <Code className="h-4 w-4" />
            Custom & Forms
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ecommerce" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Shopify Integration */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle>Shopify</CardTitle>
                    {getIntegrationStatus('shopify') ? (
                      <Badge variant="default" className="bg-green-100 text-green-700">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Connected
                      </Badge>
                    ) : (
                      <Badge variant="outline">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Not Connected
                      </Badge>
                    )}
                  </div>
                </div>
                <CardDescription>
                  Automatically create purchase notifications from Shopify orders
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Webhook URL</Label>
                  <div className="flex gap-2">
                    <Input 
                      value={webhookUrls.shopify} 
                      readOnly 
                      className="font-mono text-sm"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(webhookUrls.shopify, 'Shopify')}
                    >
                      {copiedWebhook === 'Shopify' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Setup Instructions:</strong>
                    <ol className="list-decimal list-inside mt-2 space-y-1 text-sm">
                      <li>Go to your Shopify Admin → Settings → Notifications</li>
                      <li>Scroll down to "Webhooks" section</li>
                      <li>Click "Create webhook"</li>
                      <li>Set Event: "Order payment" or "Order creation"</li>
                      <li>Paste the webhook URL above</li>
                      <li>Format: JSON</li>
                    </ol>
                  </AlertDescription>
                </Alert>

                <Button 
                  onClick={() => saveIntegration('shopify', webhookUrls.shopify)}
                  className="w-full"
                  disabled={getIntegrationStatus('shopify')}
                >
                  {getIntegrationStatus('shopify') ? 'Connected' : 'Mark as Connected'}
                </Button>
              </CardContent>
            </Card>

            {/* WooCommerce Integration */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle>WooCommerce</CardTitle>
                    {getIntegrationStatus('woocommerce') ? (
                      <Badge variant="default" className="bg-green-100 text-green-700">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Connected
                      </Badge>
                    ) : (
                      <Badge variant="outline">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Not Connected
                      </Badge>
                    )}
                  </div>
                </div>
                <CardDescription>
                  Automatically create purchase notifications from WooCommerce orders
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Webhook URL</Label>
                  <div className="flex gap-2">
                    <Input 
                      value={webhookUrls.woocommerce} 
                      readOnly 
                      className="font-mono text-sm"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(webhookUrls.woocommerce, 'WooCommerce')}
                    >
                      {copiedWebhook === 'WooCommerce' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Complete Setup Instructions:</strong>
                    <ol className="list-decimal list-inside mt-2 space-y-2 text-sm">
                      <li>Go to <strong>WooCommerce → Settings → Advanced → Webhooks</strong></li>
                      <li>Click <strong>"Add webhook"</strong></li>
                      <li><strong>Name:</strong> "NotiProof Order Notifications"</li>
                      <li><strong>Status:</strong> Active (make sure this is enabled)</li>
                      <li><strong>Topic:</strong> Select "Order completed" (recommended) or "Order updated"</li>
                      <li><strong>Delivery URL:</strong> Paste the webhook URL above</li>
                      <li><strong>Secret:</strong> Optional but recommended for security (leave blank for now)</li>
                      <li><strong>API Version:</strong> WP REST API Integration v3</li>
                      <li>Click <strong>"Save webhook"</strong></li>
                      <li>Test the webhook by completing a test order</li>
                    </ol>
                    <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                      <p className="text-xs text-yellow-800">
                        <strong>Security Tip:</strong> For production sites, consider adding a webhook secret to verify requests are from your WooCommerce store.
                      </p>
                    </div>
                  </AlertDescription>
                </Alert>

                <div className="space-y-3">
                  <Button 
                    onClick={() => saveIntegration('woocommerce', webhookUrls.woocommerce)}
                    className="w-full"
                    disabled={getIntegrationStatus('woocommerce')}
                  >
                    {getIntegrationStatus('woocommerce') ? 'Connected' : 'Mark as Connected'}
                  </Button>
                  
                  <WebhookVerifier 
                    webhookUrl={webhookUrls.woocommerce} 
                    platform="woocommerce" 
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="email" className="space-y-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Mailchimp Integration */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle>Mailchimp</CardTitle>
                    {getIntegrationStatus('mailchimp') ? (
                      <Badge variant="default" className="bg-green-100 text-green-700">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Connected
                      </Badge>
                    ) : (
                      <Badge variant="outline">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Not Connected
                      </Badge>
                    )}
                  </div>
                </div>
                <CardDescription>
                  Show signup notifications from Mailchimp subscribers
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Webhook URL</Label>
                  <div className="flex gap-2">
                    <Input 
                      value={webhookUrls.mailchimp} 
                      readOnly 
                      className="font-mono text-sm"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(webhookUrls.mailchimp, 'Mailchimp')}
                    >
                      {copiedWebhook === 'Mailchimp' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <Button 
                  onClick={() => saveIntegration('mailchimp', webhookUrls.mailchimp)}
                  className="w-full"
                  disabled={getIntegrationStatus('mailchimp')}
                >
                  {getIntegrationStatus('mailchimp') ? 'Connected' : 'Mark as Connected'}
                </Button>
              </CardContent>
            </Card>

            {/* ConvertKit Integration */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle>ConvertKit</CardTitle>
                    {getIntegrationStatus('convertkit') ? (
                      <Badge variant="default" className="bg-green-100 text-green-700">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Connected
                      </Badge>
                    ) : (
                      <Badge variant="outline">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Not Connected
                      </Badge>
                    )}
                  </div>
                </div>
                <CardDescription>
                  Show signup notifications from ConvertKit subscribers
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Webhook URL</Label>
                  <div className="flex gap-2">
                    <Input 
                      value={webhookUrls.convertkit} 
                      readOnly 
                      className="font-mono text-sm"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(webhookUrls.convertkit, 'ConvertKit')}
                    >
                      {copiedWebhook === 'ConvertKit' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <Button 
                  onClick={() => saveIntegration('convertkit', webhookUrls.convertkit)}
                  className="w-full"
                  disabled={getIntegrationStatus('convertkit')}
                >
                  {getIntegrationStatus('convertkit') ? 'Connected' : 'Mark as Connected'}
                </Button>
              </CardContent>
            </Card>

            {/* Klaviyo Integration */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle>Klaviyo</CardTitle>
                    {getIntegrationStatus('klaviyo') ? (
                      <Badge variant="default" className="bg-green-100 text-green-700">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Connected
                      </Badge>
                    ) : (
                      <Badge variant="outline">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Not Connected
                      </Badge>
                    )}
                  </div>
                </div>
                <CardDescription>
                  Show signup notifications from Klaviyo subscribers
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Webhook URL</Label>
                  <div className="flex gap-2">
                    <Input 
                      value={webhookUrls.klaviyo} 
                      readOnly 
                      className="font-mono text-sm"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(webhookUrls.klaviyo, 'Klaviyo')}
                    >
                      {copiedWebhook === 'Klaviyo' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <Button 
                  onClick={() => saveIntegration('klaviyo', webhookUrls.klaviyo)}
                  className="w-full"
                  disabled={getIntegrationStatus('klaviyo')}
                >
                  {getIntegrationStatus('klaviyo') ? 'Connected' : 'Mark as Connected'}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="custom" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>JavaScript API & Form Tracking</CardTitle>
              <CardDescription>
                Track form submissions and custom events directly from your website
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label>API Endpoint</Label>
                <div className="flex gap-2">
                  <Input 
                    value={webhookUrls.form} 
                    readOnly 
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(webhookUrls.form, 'API')}
                  >
                    {copiedWebhook === 'API' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">Example: Track Form Submissions</h4>
                <Textarea 
                  readOnly
                  value={`// Add to your website's JavaScript
document.getElementById('signup-form').addEventListener('submit', function(e) {
  e.preventDefault();
  
  // Your existing form submission logic here
  
  // Track the signup event
  fetch('${webhookUrls.form}', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'trackEvent',
      widgetId: 'YOUR_WIDGET_ID',
      data: {
        event_type: 'signup',
        customer_name: 'John D.',
        email: 'john@example.com',
        plan: 'Free Trial',
        location: 'New York, USA'
      }
    })
  });
});`}
                  className="font-mono text-sm"
                  rows={15}
                />
              </div>

              <Alert>
                <Code className="h-4 w-4" />
                <AlertDescription>
                  <strong>Integration Guide:</strong>
                  <ol className="list-decimal list-inside mt-2 space-y-1 text-sm">
                    <li>Copy your Widget ID from the Widgets page</li>
                    <li>Replace 'YOUR_WIDGET_ID' in the code above</li>
                    <li>Add the JavaScript to your website</li>
                    <li>Test the integration using your forms</li>
                  </ol>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Active Integrations */}
      {integrations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Active Integrations</CardTitle>
            <CardDescription>Manage your connected integrations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {integrations.map((integration) => (
                <div key={integration.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium capitalize">{integration.type}</div>
                    <div className="text-sm text-muted-foreground">
                      Connected on {new Date(integration.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => deleteIntegration(integration.id)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}