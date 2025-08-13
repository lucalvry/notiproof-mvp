import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Code, Globe, Facebook, BarChart3, Tag, Copy, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface TrackingPixel {
  id: string;
  platform: 'gtm' | 'facebook' | 'ga4' | 'custom';
  pixel_id: string;
  config: any;
  is_active: boolean;
}

interface AdvancedIntegrationsProps {
  widgetId: string;
}

export const AdvancedIntegrations = ({ widgetId }: AdvancedIntegrationsProps) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [pixels, setPixels] = useState<TrackingPixel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddPixel, setShowAddPixel] = useState(false);
  const [newPixel, setNewPixel] = useState({
    platform: 'gtm' as const,
    pixel_id: '',
    config: {},
    is_active: true
  });

  useEffect(() => {
    loadPixels();
  }, [widgetId]);

  const loadPixels = async () => {
    if (!profile) return;

    try {
      // Temporarily use mock data until Supabase types are updated
      const mockPixels = [
        {
          id: '1',
          platform: 'gtm' as const,
          pixel_id: 'GTM-XXXXXXX',
          config: {},
          is_active: true
        }
      ];
      
      setPixels(mockPixels);
    } catch (error) {
      console.error('Error loading pixels:', error);
    } finally {
      setLoading(false);
    }
  };

  const addPixel = async () => {
    if (!profile) return;

    try {
      // Temporarily use local state until Supabase types are updated
      const newPixelData = {
        id: Date.now().toString(),
        platform: newPixel.platform,
        pixel_id: newPixel.pixel_id,
        config: newPixel.config,
        is_active: newPixel.is_active
      };

      setPixels(prev => [...prev, newPixelData]);
      setNewPixel({ platform: 'gtm', pixel_id: '', config: {}, is_active: true });
      setShowAddPixel(false);

      toast({
        title: "Tracking pixel added",
        description: `${newPixel.platform.toUpperCase()} tracking has been configured.`,
      });
    } catch (error) {
      console.error('Error adding pixel:', error);
      toast({
        title: "Error",
        description: "Failed to add tracking pixel",
        variant: "destructive",
      });
    }
  };

  const togglePixel = async (pixelId: string, isActive: boolean) => {
    try {
      // Temporarily use local state until Supabase types are updated
      setPixels(prev => prev.map(pixel => 
        pixel.id === pixelId ? { ...pixel, is_active: isActive } : pixel
      ));
    } catch (error) {
      console.error('Error updating pixel:', error);
    }
  };

  const generateInstallationCode = () => {
    const baseUrl = "https://ewymvxhpkswhsirdrjub.supabase.co";
    const activePixels = pixels.filter(p => p.is_active);
    
    let installCode = `<!-- NotiProof Widget with Advanced Tracking -->
<script>
(function(w,d,s,o,f,js,fjs){
  w['NotiProofObject']=o;w[o]=w[o]||function(){
  (w[o].q=w[o].q||[]).push(arguments)};w[o].l=1*new Date();
  js=d.createElement(s),fjs=d.getElementsByTagName(s)[0];
  js.async=1;js.src=f;fjs.parentNode.insertBefore(js,fjs);
})(window,document,'script','notiproof','${baseUrl}/functions/v1/widget-api/widget.js');

notiproof('init', '${widgetId}');
notiproof('track', 'pageview');
`;

    // Add Google Tag Manager
    const gtmPixel = activePixels.find(p => p.platform === 'gtm');
    if (gtmPixel) {
      installCode += `
<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${gtmPixel.pixel_id}');</script>
<!-- End Google Tag Manager -->

<!-- GTM NoScript -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${gtmPixel.pixel_id}"
height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
`;
    }

    // Add Facebook Pixel
    const fbPixel = activePixels.find(p => p.platform === 'facebook');
    if (fbPixel) {
      installCode += `
<!-- Facebook Pixel -->
<script>
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window,document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${fbPixel.pixel_id}');
fbq('track', 'PageView');
</script>
<noscript><img height="1" width="1" style="display:none"
src="https://www.facebook.com/tr?id=${fbPixel.pixel_id}&ev=PageView&noscript=1"
/></noscript>
`;
    }

    // Add Google Analytics 4
    const ga4Pixel = activePixels.find(p => p.platform === 'ga4');
    if (ga4Pixel) {
      installCode += `
<!-- Google Analytics 4 -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${ga4Pixel.pixel_id}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', '${ga4Pixel.pixel_id}');
</script>
`;
    }

    installCode += `</script>`;
    return installCode;
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: "Installation code copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'gtm': return <Tag className="h-4 w-4" />;
      case 'facebook': return <Facebook className="h-4 w-4" />;
      case 'ga4': return <BarChart3 className="h-4 w-4" />;
      default: return <Code className="h-4 w-4" />;
    }
  };

  const getPlatformName = (platform: string) => {
    switch (platform) {
      case 'gtm': return 'Google Tag Manager';
      case 'facebook': return 'Facebook Pixel';
      case 'ga4': return 'Google Analytics 4';
      default: return 'Custom Tracking';
    }
  };

  const getPlatformInstructions = (platform: string) => {
    switch (platform) {
      case 'gtm':
        return "Enter your GTM container ID (format: GTM-XXXXXXX)";
      case 'facebook':
        return "Enter your Facebook Pixel ID (numeric ID from Facebook Ads Manager)";
      case 'ga4':
        return "Enter your GA4 Measurement ID (format: G-XXXXXXXXXX)";
      default:
        return "Enter your custom tracking identifier";
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Advanced Tracking Integrations
          </CardTitle>
          <CardDescription>
            Integrate with Google Tag Manager, Facebook Pixel, and Google Analytics 4
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Existing Pixels */}
          {pixels.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium">Active Integrations</h4>
              {pixels.map((pixel) => (
                <Card key={pixel.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getPlatformIcon(pixel.platform)}
                      <div>
                        <div className="font-medium">{getPlatformName(pixel.platform)}</div>
                        <div className="text-sm text-muted-foreground">
                          ID: {pixel.pixel_id}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={pixel.is_active}
                        onCheckedChange={(checked) => togglePixel(pixel.id, checked)}
                      />
                      <Badge variant={pixel.is_active ? "default" : "secondary"}>
                        {pixel.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Add New Pixel */}
          {showAddPixel ? (
            <Card className="p-4">
              <div className="space-y-4">
                <h4 className="font-medium">Add New Integration</h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="platform">Platform</Label>
                    <Select 
                      value={newPixel.platform} 
                      onValueChange={(value: any) => setNewPixel(prev => ({ ...prev, platform: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gtm">Google Tag Manager</SelectItem>
                        <SelectItem value="facebook">Facebook Pixel</SelectItem>
                        <SelectItem value="ga4">Google Analytics 4</SelectItem>
                        <SelectItem value="custom">Custom Tracking</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="pixel_id">Tracking ID</Label>
                    <Input
                      id="pixel_id"
                      value={newPixel.pixel_id}
                      onChange={(e) => setNewPixel(prev => ({ ...prev, pixel_id: e.target.value }))}
                      placeholder={getPlatformInstructions(newPixel.platform)}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="active"
                      checked={newPixel.is_active}
                      onCheckedChange={(checked) => setNewPixel(prev => ({ ...prev, is_active: checked }))}
                    />
                    <Label htmlFor="active">Enable immediately</Label>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button onClick={addPixel} disabled={!newPixel.pixel_id}>
                    Add Integration
                  </Button>
                  <Button variant="outline" onClick={() => setShowAddPixel(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </Card>
          ) : (
            <Button onClick={() => setShowAddPixel(true)}>
              Add Integration
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Installation Code */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            Enhanced Installation Code
          </CardTitle>
          <CardDescription>
            Complete installation code with all your tracking integrations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="relative">
              <Textarea
                value={generateInstallationCode()}
                readOnly
                className="font-mono text-sm min-h-[200px]"
              />
              <Button
                size="sm"
                variant="outline"
                className="absolute top-2 right-2"
                onClick={() => copyToClipboard(generateInstallationCode())}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy
              </Button>
            </div>
            
            <div className="text-sm text-muted-foreground">
              <p className="mb-2">Place this code just before the closing <code>&lt;/head&gt;</code> tag of your website.</p>
              <p>This includes your widget and all active tracking integrations.</p>
            </div>

            {pixels.length > 0 && (
              <div className="border rounded-lg p-4 bg-muted/50">
                <h5 className="font-medium mb-2">Active Tracking:</h5>
                <div className="flex flex-wrap gap-2">
                  {pixels.filter(p => p.is_active).map((pixel) => (
                    <Badge key={pixel.id} variant="outline">
                      {getPlatformName(pixel.platform)}
                    </Badge>
                  ))
                }
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* WordPress Plugin Generator */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            WordPress Plugin
          </CardTitle>
          <CardDescription>
            Generate a custom WordPress plugin for easy installation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Generate a WordPress plugin that automatically installs your widget with all tracking integrations.
            </p>
            <Button variant="outline" className="w-full">
              <ExternalLink className="h-4 w-4 mr-2" />
              Generate WordPress Plugin
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
