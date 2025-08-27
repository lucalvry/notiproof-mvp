import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Copy, Check, Globe, FileText, Zap, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { Website } from '@/hooks/useWebsites';
import type { UserWidget } from '@/hooks/useUserWidgets';

interface WebsiteVerificationMethodsProps {
  website: Website;
  userWidgets?: UserWidget[];
  onVerificationSuccess?: () => void;
}

export const WebsiteVerificationMethods = ({ 
  website, 
  userWidgets = [],
  onVerificationSuccess 
}: WebsiteVerificationMethodsProps) => {
  const { toast } = useToast();
  const [copied, setCopied] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [dnsRecord, setDnsRecord] = useState('');
  const [selectedWidgetId, setSelectedWidgetId] = useState<string>('');

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
      toast({
        title: "Copied to clipboard",
        description: `${type} verification code copied successfully.`,
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Please copy the code manually.",
        variant: "destructive",
      });
    }
  };

  const verifyDNS = async () => {
    if (!dnsRecord.trim()) {
      toast({
        title: "DNS record required",
        description: "Please enter the DNS TXT record value.",
        variant: "destructive",
      });
      return;
    }

    setIsVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke('widget-api', {
        body: {
          action: 'verify_dns',
          website_id: website.id,
          dns_record: dnsRecord,
          domain: website.domain
        }
      });

      if (error) throw error;

      if (data.verified) {
        toast({
          title: "DNS verification successful",
          description: "Your website has been verified via DNS record.",
        });
        onVerificationSuccess?.();
      } else {
        toast({
          title: "DNS verification failed",
          description: data.message || "DNS record not found or incorrect.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('DNS verification error:', error);
      toast({
        title: "Verification failed",
        description: "Failed to verify DNS record. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const verifyMetaTag = async () => {
    setIsVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke('widget-api', {
        body: {
          action: 'verify_meta_tag',
          website_id: website.id,
          domain: website.domain
        }
      });

      if (error) throw error;

      if (data.verified) {
        toast({
          title: "Meta tag verification successful",
          description: "Your website has been verified via meta tag.",
        });
        onVerificationSuccess?.();
      } else {
        toast({
          title: "Meta tag verification failed",
          description: data.message || "Meta tag not found on your homepage.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Meta tag verification error:', error);
      toast({
        title: "Verification failed",
        description: "Failed to verify meta tag. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const getWidgetCode = () => {
    const widgetId = selectedWidgetId || (userWidgets.length > 0 ? userWidgets[0].id : 'YOUR_WIDGET_ID');
    return `<script
  src="https://ewymvxhpkswhsirdrjub.supabase.co/functions/v1/widget-api/widget.js"
  data-widget-id="${widgetId}"
  data-api-base="https://ewymvxhpkswhsirdrjub.supabase.co/functions/v1/widget-api"
  async
></script>`;
  };

  const metaTagCode = `<meta name="notiproof-verification" content="${website.verification_token || 'VERIFICATION_TOKEN'}" />`;

  const dnsRecordValue = `notiproof-verification=${website.verification_token || 'VERIFICATION_TOKEN'}`;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Globe className="h-12 w-12 text-primary mx-auto mb-4" />
        <h2 className="text-2xl font-bold">Website Verification Methods</h2>
        <p className="text-muted-foreground">
          Choose your preferred method to verify ownership of {website.domain}
        </p>
      </div>

      <Tabs defaultValue="widget" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="widget" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Widget Install
          </TabsTrigger>
          <TabsTrigger value="meta" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Meta Tag
          </TabsTrigger>
          <TabsTrigger value="dns" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            DNS Record
          </TabsTrigger>
        </TabsList>

        <TabsContent value="widget" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-green-600" />
                Automatic Widget Verification
              </CardTitle>
              <CardDescription>
                Install a widget on your website and verification will happen automatically.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {userWidgets.length > 0 && (
                <div>
                  <Label htmlFor="widgetSelect">Select a Widget ID:</Label>
                  <select
                    id="widgetSelect"
                    className="w-full mt-1 p-2 border rounded-md bg-background"
                    value={selectedWidgetId}
                    onChange={(e) => setSelectedWidgetId(e.target.value)}
                  >
                    {userWidgets.map((widget) => (
                      <option key={widget.id} value={widget.id}>
                        {widget.name} ({widget.id})
                      </option>
                    ))}
                  </select>
                </div>
              )}
              
              <div>
                <Label>Widget Installation Code:</Label>
                <div className="relative mt-2">
                  <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto pr-12">
{getWidgetCode()}
                  </pre>
                  <Button
                    variant="outline"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => copyToClipboard(getWidgetCode(), 'Widget code')}
                  >
                    {copied === 'Widget code' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              
              {userWidgets.length === 0 ? (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    You need to create a widget first before using this verification method. Use Meta Tag or DNS verification instead, or create a widget after verification.
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Install the code above on your website. Verification happens automatically when the widget loads on your site.
                  </AlertDescription>
                </Alert>
              )}

              <Badge variant="outline" className="w-fit">
                ✓ Recommended method - works automatically
              </Badge>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="meta" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                HTML Meta Tag Verification
              </CardTitle>
              <CardDescription>
                Add a meta tag to your website's homepage HTML head section.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Meta Tag to Add:</Label>
                <div className="relative mt-2">
                  <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto pr-12">
{metaTagCode}
                  </pre>
                  <Button
                    variant="outline"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => copyToClipboard(metaTagCode, 'Meta tag')}
                  >
                    {copied === 'Meta tag' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Add this meta tag to the &lt;head&gt; section of your homepage at {website.domain}
                </AlertDescription>
              </Alert>

              <Button 
                onClick={verifyMetaTag}
                disabled={isVerifying}
                className="w-full"
              >
                {isVerifying ? "Checking..." : "Verify Meta Tag"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dns" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-purple-600" />
                DNS TXT Record Verification
              </CardTitle>
              <CardDescription>
                Add a DNS TXT record to verify domain ownership (recommended for enterprises).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>DNS TXT Record to Add:</Label>
                <div className="relative mt-2">
                  <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto pr-12">
Name: _notiproof
Type: TXT
Value: {dnsRecordValue}
                  </pre>
                  <Button
                    variant="outline"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => copyToClipboard(dnsRecordValue, 'DNS record')}
                  >
                    {copied === 'DNS record' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div>
                <Label htmlFor="dnsRecord">Enter the DNS TXT record value you added:</Label>
                <Input
                  id="dnsRecord"
                  value={dnsRecord}
                  onChange={(e) => setDnsRecord(e.target.value)}
                  placeholder={dnsRecordValue}
                  className="mt-1"
                />
              </div>

              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  DNS changes can take up to 24 hours to propagate. Make sure to add the TXT record to your domain's DNS settings.
                </AlertDescription>
              </Alert>

              <Button 
                onClick={verifyDNS}
                disabled={isVerifying || !dnsRecord.trim()}
                className="w-full"
              >
                {isVerifying ? "Verifying DNS..." : "Verify DNS Record"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};