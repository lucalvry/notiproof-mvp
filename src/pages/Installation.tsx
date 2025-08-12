import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Copy, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

interface Widget {
  id: string;
  name: string;
  status: string;
}

const Installation = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [selectedWidget, setSelectedWidget] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [hostType, setHostType] = useState<'staging' | 'custom'>('staging');
  const [customHost, setCustomHost] = useState('');

  useEffect(() => {
    const fetchWidgets = async () => {
      if (!profile) return;

      try {
        const { data, error } = await supabase
          .from('widgets')
          .select('id, name, status')
          .eq('user_id', profile.id)
          .eq('status', 'active')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setWidgets(data || []);
        if (data && data.length > 0) {
          setSelectedWidget(data[0].id);
        }
      } catch (error) {
        console.error('Error fetching widgets:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchWidgets();
  }, [profile]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: "The embed code has been copied to your clipboard.",
    });
  };

  const normalizedHost = (hostType === 'custom' && customHost ? customHost : 'https://preview--notiproof-mvp.lovable.app').replace(/\/+$/, '');
  const embedCode = selectedWidget ? `
  <!-- NotiProof Widget -->
  <script src="${normalizedHost}/widget.js"
          data-widget-id="${selectedWidget}"
          data-api-base="https://ewymvxhpkswhsirdrjub.supabase.co/functions/v1/widget-api"
          data-disable-beacon="true"
          defer></script>
    `.trim() : '';

  const dynamicEmbedCode = selectedWidget ? `
  <!-- NotiProof Widget (Dynamic Injection with defer) -->
  <script>
    (function() {
      var script = document.createElement('script');
      script.src = '${normalizedHost}/widget.js';
      script.defer = true;
      script.setAttribute('data-widget-id', '${selectedWidget}');
      script.setAttribute('data-api-base', 'https://ewymvxhpkswhsirdrjub.supabase.co/functions/v1/widget-api');
      script.setAttribute('data-disable-beacon', 'true');
      document.head.appendChild(script);
    })();
  </script>
    `.trim() : '';

  const apiEndpoint = selectedWidget 
    ? `https://ewymvxhpkswhsirdrjub.supabase.co/functions/v1/widget-api/api/widgets/${selectedWidget}`
    : '';

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Installation</h1>
        <div className="animate-pulse">
          <div className="h-4 bg-muted rounded w-1/3 mb-4"></div>
          <div className="h-32 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Installation</h1>
        <p className="text-muted-foreground">
          Add social proof notifications to your website
        </p>
      </div>

      {widgets.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <h3 className="text-lg font-semibold mb-2">No active widgets</h3>
            <p className="text-muted-foreground mb-4">
              You need to create and activate at least one widget before you can install it.
            </p>
            <Button asChild>
              <a href="/dashboard/widgets/create">Create Your First Widget</a>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Widget Selection */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Select Widget</CardTitle>
                <CardDescription>
                  Choose which widget you want to install
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {widgets.map((widget) => (
                    <div
                      key={widget.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedWidget === widget.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => setSelectedWidget(widget.id)}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{widget.name}</span>
                        <Badge variant={selectedWidget === widget.id ? 'default' : 'secondary'}>
                          {selectedWidget === widget.id ? 'Selected' : 'Select'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* API Information */}
            <Card>
              <CardHeader>
                <CardTitle>API Information</CardTitle>
                <CardDescription>
                  Use these endpoints to manage your widget data
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Widget API Endpoint</Label>
                  <div className="flex gap-2 mt-1">
                    <Input value={apiEndpoint} readOnly />
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => copyToClipboard(apiEndpoint)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  <p>Use this endpoint to:</p>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li>Fetch widget events (GET)</li>
                    <li>Track views and clicks (POST)</li>
                    <li>Add new events (POST)</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Installation Instructions */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Embed Code</CardTitle>
                <CardDescription>
                  Add this code to your website's HTML
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label>Embed Host</Label>
                    <div className="mt-1 flex flex-col gap-2">
                      <div className="flex gap-2">
                        <Select value={hostType} onValueChange={(v) => setHostType(v as any)}>
                          <SelectTrigger className="w-48"><SelectValue placeholder="Host type" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="staging">Staging (preview)</SelectItem>
                            <SelectItem value="custom">Production CDN</SelectItem>
                          </SelectContent>
                        </Select>
                        {hostType === 'custom' && (
                          <Input
                            placeholder="https://cdn.your-domain.com"
                            value={customHost}
                            onChange={(e) => setCustomHost(e.target.value)}
                          />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Script source: {`${(hostType === 'custom' && customHost ? customHost : 'https://preview--notiproof-mvp.lovable.app').replace(/\/+$/, '')}/widget.js`}
                      </p>
                    </div>
                  </div>
                  <div>
                    <Label>HTML Embed Code (Recommended)</Label>
                    <div className="relative mt-1">
                      <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
                        <code>{embedCode}</code>
                      </pre>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={() => copyToClipboard(embedCode)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label>Dynamic Injection (Optional)</Label>
                    <div className="relative mt-1">
                      <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
                        <code>{dynamicEmbedCode}</code>
                      </pre>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={() => copyToClipboard(dynamicEmbedCode)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg">
                    <h4 className="font-medium mb-2">Installation Steps:</h4>
                    <ol className="list-decimal list-inside space-y-1 text-sm">
                      <li>Copy one of the snippets above</li>
                      <li>Paste it just before the closing &lt;/head&gt; tag on your website</li>
                      <li>The widget will automatically start displaying notifications</li>
                      <li>Add events via the dashboard or API to show social proof</li>
                    </ol>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Next Steps</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-bold">
                    1
                  </div>
                  <div>
                    <p className="font-medium">Add Events</p>
                    <p className="text-sm text-muted-foreground">
                      Create events to display as social proof notifications
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-bold">
                    2
                  </div>
                  <div>
                    <p className="font-medium">Test Your Widget</p>
                    <p className="text-sm text-muted-foreground">
                      Visit your website to see the notifications in action
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-bold">
                    3
                  </div>
                  <div>
                    <p className="font-medium">Monitor Performance</p>
                    <p className="text-sm text-muted-foreground">
                      Check your dashboard for views, clicks, and engagement metrics
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default Installation;