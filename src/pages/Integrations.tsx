import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, CheckCircle, ExternalLink, Code, Settings, Zap, Mail, ShoppingCart } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';

interface Integration {
  id: string;
  type: string;
  url: string;
  config: any;
  created_at: string;
}

const Integrations = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ecommerce');
  
  // E-commerce integration states
  const [shopifyConfig, setShopifyConfig] = useState({
    shop_domain: '',
    access_token: '',
    widget_id: ''
  });
  
  const [wooCommerceConfig, setWooCommerceConfig] = useState({
    site_url: '',
    consumer_key: '',
    consumer_secret: '',
    widget_id: ''
  });

  // Email integration states
  const [emailProvider, setEmailProvider] = useState<'mailchimp' | 'convertkit' | 'klaviyo'>('mailchimp');
  const [emailConfig, setEmailConfig] = useState({
    api_key: '',
    list_id: '',
    api_secret: '',
    form_id: '',
    widget_id: ''
  });

  // Form tracking state
  const [formTrackingCode, setFormTrackingCode] = useState('');
  const [selectedWidget, setSelectedWidget] = useState('');
  const [widgets, setWidgets] = useState<any[]>([]);

  useEffect(() => {
    loadIntegrations();
    loadWidgets();
  }, []);

  const loadIntegrations = async () => {
    if (!profile) return;

    try {
      const { data, error } = await (supabase as any)
        .from('integration_hooks')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setIntegrations(data || []);
    } catch (error) {
      console.error('Error loading integrations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadWidgets = async () => {
    if (!profile) return;

    try {
      const { data, error } = await (supabase as any)
        .from('widgets')
        .select('id, name')
        .eq('user_id', profile.id)
        .eq('status', 'active');

      if (error) throw error;
      setWidgets(data || []);
    } catch (error) {
      console.error('Error loading widgets:', error);
    }
  };

  const setupShopifyIntegration = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('ecommerce-integration', {
        body: {
          action: 'setup_shopify_integration',
          data: {
            user_id: profile?.id,
            ...shopifyConfig
          }
        }
      });

      if (error) throw error;

      toast({
        title: "Shopify Integration Setup",
        description: "Integration configured successfully. Add the webhook URL to your Shopify admin.",
      });

      loadIntegrations();
    } catch (error) {
      console.error('Error setting up Shopify integration:', error);
      toast({
        title: "Error",
        description: "Failed to setup Shopify integration",
        variant: "destructive",
      });
    }
  };

  const setupWooCommerceIntegration = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('ecommerce-integration', {
        body: {
          action: 'setup_woocommerce_integration',
          data: {
            user_id: profile?.id,
            ...wooCommerceConfig
          }
        }
      });

      if (error) throw error;

      toast({
        title: "WooCommerce Integration Setup",
        description: "Integration configured successfully.",
      });

      loadIntegrations();
    } catch (error) {
      console.error('Error setting up WooCommerce integration:', error);
      toast({
        title: "Error",
        description: "Failed to setup WooCommerce integration",
        variant: "destructive",
      });
    }
  };

  const setupEmailIntegration = async () => {
    try {
      const action = `setup_${emailProvider}`;
      const { data, error } = await supabase.functions.invoke('email-integration', {
        body: {
          action,
          data: {
            user_id: profile?.id,
            ...emailConfig
          }
        }
      });

      if (error) throw error;

      toast({
        title: "Email Integration Setup",
        description: `${emailProvider} integration configured successfully.`,
      });

      loadIntegrations();
    } catch (error) {
      console.error('Error setting up email integration:', error);
      toast({
        title: "Error",
        description: `Failed to setup ${emailProvider} integration`,
        variant: "destructive",
      });
    }
  };

  const testIntegration = async (type: string, widgetId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('ecommerce-integration', {
        body: {
          action: 'test_integration',
          data: {
            integration_type: type,
            widget_id: widgetId
          }
        }
      });

      if (error) throw error;

      toast({
        title: "Test Event Created",
        description: "Check your widget to see the test notification.",
      });
    } catch (error) {
      console.error('Error testing integration:', error);
      toast({
        title: "Error",
        description: "Failed to create test event",
        variant: "destructive",
      });
    }
  };

  const generateFormTrackingCode = () => {
    if (!selectedWidget) return;

    const code = `
<!-- NotiProof Form Tracking -->
<script>
(function() {
  const widgetId = '${selectedWidget}';
  const apiUrl = 'https://ewymvxhpkswhsirdrjub.functions.supabase.co/email-integration';
  
  // Track form submissions
  document.addEventListener('submit', function(e) {
    const form = e.target;
    if (form.tagName !== 'FORM') return;
    
    // Extract form data
    const formData = new FormData(form);
    const email = formData.get('email') || formData.get('EMAIL') || 
                  form.querySelector('input[type="email"]')?.value;
    
    if (!email) return;
    
    const firstName = formData.get('first_name') || formData.get('FNAME') || 
                     formData.get('firstname') || '';
    const lastName = formData.get('last_name') || formData.get('LNAME') || 
                    formData.get('lastname') || '';
    
    // Send tracking data
    fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'track_subscription',
        widgetId: widgetId,
        data: {
          email: email,
          first_name: firstName,
          last_name: lastName,
          location: 'Unknown',
          source: 'form_submission'
        }
      })
    }).catch(console.error);
  });
})();
</script>`;

    setFormTrackingCode(code);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Integrations</h1>
        <p className="text-muted-foreground">
          Connect NotiProof with your favorite tools and platforms
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="ecommerce" className="gap-2">
            <ShoppingCart className="h-4 w-4" />
            E-commerce
          </TabsTrigger>
          <TabsTrigger value="email" className="gap-2">
            <Mail className="h-4 w-4" />
            Email Marketing
          </TabsTrigger>
          <TabsTrigger value="forms" className="gap-2">
            <Code className="h-4 w-4" />
            Form Tracking
          </TabsTrigger>
        </TabsList>

        {/* E-commerce Integrations */}
        <TabsContent value="ecommerce" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Shopify Integration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-green-500 rounded flex items-center justify-center text-white font-bold">S</div>
                  Shopify
                </CardTitle>
                <CardDescription>
                  Track order notifications from your Shopify store
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="shop_domain">Shop Domain</Label>
                  <Input
                    id="shop_domain"
                    placeholder="your-shop.myshopify.com"
                    value={shopifyConfig.shop_domain}
                    onChange={(e) => setShopifyConfig(prev => ({ ...prev, shop_domain: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="shopify_token">Access Token</Label>
                  <Input
                    id="shopify_token"
                    type="password"
                    placeholder="shpat_xxxxx"
                    value={shopifyConfig.access_token}
                    onChange={(e) => setShopifyConfig(prev => ({ ...prev, access_token: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="shopify_widget">Widget</Label>
                  <Select value={shopifyConfig.widget_id} onValueChange={(value) => 
                    setShopifyConfig(prev => ({ ...prev, widget_id: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue placeholder="Select widget" />
                    </SelectTrigger>
                    <SelectContent>
                      {widgets.map((widget) => (
                        <SelectItem key={widget.id} value={widget.id}>
                          {widget.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={setupShopifyIntegration} className="w-full">
                  Setup Shopify Integration
                </Button>
              </CardContent>
            </Card>

            {/* WooCommerce Integration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-purple-500 rounded flex items-center justify-center text-white font-bold">W</div>
                  WooCommerce
                </CardTitle>
                <CardDescription>
                  Track order notifications from your WooCommerce store
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="site_url">Site URL</Label>
                  <Input
                    id="site_url"
                    placeholder="https://yourstore.com"
                    value={wooCommerceConfig.site_url}
                    onChange={(e) => setWooCommerceConfig(prev => ({ ...prev, site_url: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="consumer_key">Consumer Key</Label>
                  <Input
                    id="consumer_key"
                    placeholder="ck_xxxxx"
                    value={wooCommerceConfig.consumer_key}
                    onChange={(e) => setWooCommerceConfig(prev => ({ ...prev, consumer_key: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="consumer_secret">Consumer Secret</Label>
                  <Input
                    id="consumer_secret"
                    type="password"
                    placeholder="cs_xxxxx"
                    value={wooCommerceConfig.consumer_secret}
                    onChange={(e) => setWooCommerceConfig(prev => ({ ...prev, consumer_secret: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="woo_widget">Widget</Label>
                  <Select value={wooCommerceConfig.widget_id} onValueChange={(value) => 
                    setWooCommerceConfig(prev => ({ ...prev, widget_id: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue placeholder="Select widget" />
                    </SelectTrigger>
                    <SelectContent>
                      {widgets.map((widget) => (
                        <SelectItem key={widget.id} value={widget.id}>
                          {widget.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={setupWooCommerceIntegration} className="w-full">
                  Setup WooCommerce Integration
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Email Marketing Integrations */}
        <TabsContent value="email" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Email Marketing Providers</CardTitle>
              <CardDescription>
                Track signups from your email marketing platforms
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="email_provider">Provider</Label>
                <Select value={emailProvider} onValueChange={(value: 'mailchimp' | 'convertkit' | 'klaviyo') => 
                  setEmailProvider(value)
                }>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mailchimp">Mailchimp</SelectItem>
                    <SelectItem value="convertkit">ConvertKit</SelectItem>
                    <SelectItem value="klaviyo">Klaviyo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="email_api_key">API Key</Label>
                <Input
                  id="email_api_key"
                  type="password"
                  placeholder="Your API key"
                  value={emailConfig.api_key}
                  onChange={(e) => setEmailConfig(prev => ({ ...prev, api_key: e.target.value }))}
                />
              </div>

              {emailProvider === 'mailchimp' && (
                <div>
                  <Label htmlFor="list_id">List ID</Label>
                  <Input
                    id="list_id"
                    placeholder="Mailchimp List ID"
                    value={emailConfig.list_id}
                    onChange={(e) => setEmailConfig(prev => ({ ...prev, list_id: e.target.value }))}
                  />
                </div>
              )}

              {emailProvider === 'convertkit' && (
                <>
                  <div>
                    <Label htmlFor="ck_secret">API Secret</Label>
                    <Input
                      id="ck_secret"
                      type="password"
                      placeholder="ConvertKit API Secret"
                      value={emailConfig.api_secret}
                      onChange={(e) => setEmailConfig(prev => ({ ...prev, api_secret: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="form_id">Form ID</Label>
                    <Input
                      id="form_id"
                      placeholder="ConvertKit Form ID"
                      value={emailConfig.form_id}
                      onChange={(e) => setEmailConfig(prev => ({ ...prev, form_id: e.target.value }))}
                    />
                  </div>
                </>
              )}

              {emailProvider === 'klaviyo' && (
                <div>
                  <Label htmlFor="klaviyo_list">List ID</Label>
                  <Input
                    id="klaviyo_list"
                    placeholder="Klaviyo List ID"
                    value={emailConfig.list_id}
                    onChange={(e) => setEmailConfig(prev => ({ ...prev, list_id: e.target.value }))}
                  />
                </div>
              )}

              <div>
                <Label htmlFor="email_widget">Widget</Label>
                <Select value={emailConfig.widget_id} onValueChange={(value) => 
                  setEmailConfig(prev => ({ ...prev, widget_id: value }))
                }>
                  <SelectTrigger>
                    <SelectValue placeholder="Select widget" />
                  </SelectTrigger>
                  <SelectContent>
                    {widgets.map((widget) => (
                      <SelectItem key={widget.id} value={widget.id}>
                        {widget.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={setupEmailIntegration} className="w-full">
                Setup {emailProvider} Integration
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Form Tracking */}
        <TabsContent value="forms" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Form Submission Tracking</CardTitle>
              <CardDescription>
                Track form submissions and signups from any website
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="tracking_widget">Widget</Label>
                <Select value={selectedWidget} onValueChange={setSelectedWidget}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select widget to track" />
                  </SelectTrigger>
                  <SelectContent>
                    {widgets.map((widget) => (
                      <SelectItem key={widget.id} value={widget.id}>
                        {widget.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={generateFormTrackingCode} disabled={!selectedWidget}>
                Generate Tracking Code
              </Button>

              {formTrackingCode && (
                <div>
                  <Label htmlFor="tracking_code">Tracking Code</Label>
                  <Textarea
                    id="tracking_code"
                    value={formTrackingCode}
                    readOnly
                    rows={10}
                    className="font-mono text-sm"
                  />
                  <p className="text-sm text-muted-foreground mt-2">
                    Add this code to your website before the closing &lt;/body&gt; tag to track form submissions.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Active Integrations */}
      <Card>
        <CardHeader>
          <CardTitle>Active Integrations</CardTitle>
          <CardDescription>
            Manage your connected integrations
          </CardDescription>
        </CardHeader>
        <CardContent>
          {integrations.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No integrations configured yet. Set up your first integration above.
            </p>
          ) : (
            <div className="space-y-4">
              {integrations.map((integration) => (
                <div key={integration.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded flex items-center justify-center text-white font-bold ${
                      integration.type === 'shopify' ? 'bg-green-500' :
                      integration.type === 'woocommerce' ? 'bg-purple-500' :
                      integration.type === 'mailchimp' ? 'bg-yellow-500' :
                      integration.type === 'convertkit' ? 'bg-red-500' :
                      integration.type === 'klaviyo' ? 'bg-orange-500' : 'bg-gray-500'
                    }`}>
                      {integration.type.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium capitalize">{integration.type}</div>
                      <div className="text-sm text-muted-foreground">
                        {integration.url}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Active
                    </Badge>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => testIntegration(integration.type, integration.config.widget_id)}
                    >
                      Test
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Integrations;
