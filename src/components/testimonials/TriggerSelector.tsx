import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Zap, Upload, Share2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { TestimonialCSVUpload } from './TestimonialCSVUpload';
import { AutomaticTriggerConfigDialog } from './AutomaticTriggerConfigDialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TriggerSelectorProps {
  formId: string;
  websiteId?: string;
  onCsvUpload?: (recipients: Array<{ email: string; name?: string; company?: string }>) => void;
}

export function TriggerSelector({ formId, websiteId, onCsvUpload }: TriggerSelectorProps) {
  const [showCsvDialog, setShowCsvDialog] = useState(false);
  const [showTriggerDialog, setShowTriggerDialog] = useState(false);
  const [hasIntegrations, setHasIntegrations] = useState(false);
  const [loadedWebsiteId, setLoadedWebsiteId] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Get website_id from form if not provided
        let website_id = websiteId;
        if (!website_id) {
          const { data: form } = await supabase
            .from('testimonial_forms')
            .select('website_id')
            .eq('id', formId)
            .single();
          website_id = form?.website_id;
        }

        if (website_id) {
          setLoadedWebsiteId(website_id);
          
          // Check if user has any active integrations
          const { data } = await supabase
            .from('integration_connectors')
            .select('id')
            .eq('website_id', website_id)
            .eq('status', 'active')
            .limit(1);
          
          setHasIntegrations(!!data && data.length > 0);
        }
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };

    loadData();
  }, [formId, websiteId]);

  const formUrl = `${window.location.origin}/collect/${formId}`;

  const shareOnSocial = (platform: 'twitter' | 'linkedin' | 'facebook') => {
    const text = "I'd love to hear your feedback!";
    const urls = {
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(formUrl)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(formUrl)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(formUrl)}`,
    };

    window.open(urls[platform], '_blank', 'width=600,height=400');
  };

  const copyEmbedCode = () => {
    const embedCode = `<iframe src="${formUrl}" width="100%" height="600" frameborder="0"></iframe>`;
    navigator.clipboard.writeText(embedCode);
    toast.success('Embed code copied to clipboard');
  };

  const copyLink = () => {
    navigator.clipboard.writeText(formUrl);
    toast.success('Link copied to clipboard');
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Automatic Trigger */}
        <Card className={hasIntegrations ? "border-2 border-primary/20" : "border-dashed"}>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-primary/10 rounded-md">
                <Zap className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-base">Automatic</CardTitle>
                {hasIntegrations && (
                  <Badge className="mt-1">Available</Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Auto-send invites based on integration events like purchases, sign-ups, or bookings
            </CardDescription>
            <Button 
              onClick={() => setShowTriggerDialog(true)} 
              disabled={!hasIntegrations}
              className="w-full mt-4"
            >
              Configure Triggers
            </Button>
            {!hasIntegrations && (
              <p className="text-xs text-muted-foreground mt-2">
                Connect an integration first to enable automatic triggers
              </p>
            )}
          </CardContent>
        </Card>

        {/* Campaign (CSV Upload) */}
        <Card className="border-2 border-primary/20">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-primary/10 rounded-md">
                <Upload className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-base">Campaign</CardTitle>
                <Badge className="mt-1">Bulk Send</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Upload a CSV/XLSX file with customer emails to send invites in bulk
            </CardDescription>
            <Button onClick={() => setShowCsvDialog(true)} className="w-full mt-4">
              <Upload className="h-4 w-4 mr-2" />
              Upload CSV
            </Button>
          </CardContent>
        </Card>

        {/* Manual (Share Links) */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-primary/10 rounded-md">
                <Share2 className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-base">Manual</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <CardDescription className="mb-4">
              Share your form link directly or on social media
            </CardDescription>
            <Button onClick={copyLink} variant="outline" className="w-full">
              Copy Link
            </Button>
            <Button onClick={copyEmbedCode} variant="outline" className="w-full">
              Copy Embed Code
            </Button>
            <div className="flex gap-2 pt-2">
              <Button onClick={() => shareOnSocial('twitter')} variant="outline" size="sm" className="flex-1">
                Twitter
              </Button>
              <Button onClick={() => shareOnSocial('linkedin')} variant="outline" size="sm" className="flex-1">
                LinkedIn
              </Button>
              <Button onClick={() => shareOnSocial('facebook')} variant="outline" size="sm" className="flex-1">
                Facebook
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* CSV Upload Dialog */}
      <TestimonialCSVUpload
        open={showCsvDialog}
        onOpenChange={setShowCsvDialog}
        onUpload={(recipients) => {
          onCsvUpload?.(recipients);
          setShowCsvDialog(false);
        }}
      />

      {/* Automatic Trigger Config Dialog */}
      {loadedWebsiteId && (
        <AutomaticTriggerConfigDialog
          open={showTriggerDialog}
          onOpenChange={setShowTriggerDialog}
          formId={formId}
          websiteId={loadedWebsiteId}
        />
      )}
    </div>
  );
}
