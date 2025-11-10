import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Send, Sparkles, Link2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { WidgetInstallationSuccess } from "./WidgetInstallationSuccess";

interface ReviewActivateProps {
  campaignData: any;
  onComplete: () => void;
  selectedTemplate?: any;
}

export function ReviewActivate({ campaignData, onComplete, selectedTemplate }: ReviewActivateProps) {
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [campaignName, setCampaignName] = useState("");
  const [saving, setSaving] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdWidget, setCreatedWidget] = useState<{ id: string; campaignId: string } | null>(null);

  const handleSaveDraft = async () => {
    if (!campaignName) {
      toast.error("Please enter a campaign name");
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get website_id
      const websiteIdFromParams = searchParams.get('website');
      const websiteIdFromCampaign = campaignData.website_id;
      
      let websiteId = websiteIdFromParams || websiteIdFromCampaign;
      
      if (!websiteId) {
        const { data: websites } = await supabase
          .from("websites")
          .select("id")
          .eq("user_id", user.id)
          .order("created_at", { ascending: true })
          .limit(1);

        if (!websites || websites.length === 0) {
          toast.error("Please create a website first");
          setSaving(false);
          return;
        }
        websiteId = websites[0].id;
      }

      // Create campaign as draft
      const { data: campaign, error: campaignError } = await supabase
        .from("campaigns")
        .insert([{
          user_id: user.id,
          name: campaignName,
          description: `${campaignData.type} campaign - ${campaignData.data_source}`,
          status: "draft",
          website_id: websiteId,
          data_source: campaignData.data_source || 'manual',
          // Save native config for native integrations
          native_config: campaignData.integration_settings || {},
          integration_settings: campaignData.integration_settings || {
            locale: "en",
            actions: [],
            image_fallback_url: ""
          },
          display_rules: {
            ...campaignData.settings,
            frequency: campaignData.rules?.frequency,
            sessionLimit: campaignData.rules?.sessionLimit,
            pageTargeting: campaignData.rules?.pageTargeting,
            deviceTargeting: campaignData.rules?.deviceTargeting,
          },
          polling_config: campaignData.polling_config || {
            enabled: false,
            interval_minutes: 5,
            max_events_per_fetch: 10,
            last_poll_at: null
          },
        }])
        .select()
        .single();

      if (campaignError) throw campaignError;

      // Create draft widget too
      const { error: widgetError } = await supabase
        .from("widgets")
        .insert({
          user_id: user.id,
          website_id: websiteId,
          campaign_id: campaign.id,
          name: `${campaignName} Widget`,
          template_name: campaignData.settings?.layout || "notification",
          status: "draft", // Draft widget
          integration: campaignData.data_source || "manual",
          style_config: {
            borderRadius: campaignData.settings?.borderRadius,
            showImage: campaignData.settings?.showImage,
            headline: campaignData.settings?.headline,
            subtext: campaignData.settings?.subtext,
            ctaEnabled: campaignData.settings?.ctaEnabled,
            ctaLabel: campaignData.settings?.ctaLabel,
          },
          display_rules: {
            show_duration_ms: 5000,
            interval_ms: (campaignData.rules?.frequency || 10) * 1000,
            max_per_session: campaignData.rules?.sessionLimit || 5,
          },
        });

      if (widgetError) throw widgetError;

      toast.success("Campaign saved as draft");
      
      // Invalidate queries before navigating
      await queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      onComplete();
    } catch (error) {
      console.error("Error saving campaign:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to save campaign";
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleActivate = async () => {
    if (!campaignName) {
      toast.error("Please enter a campaign name");
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get website_id from URL params, campaign data, or user's first website
      const websiteIdFromParams = searchParams.get('website');
      const websiteIdFromCampaign = campaignData.website_id;
      
      let websiteId = websiteIdFromParams || websiteIdFromCampaign;
      
      if (!websiteId) {
        // Fallback to user's first website
        const { data: websites } = await supabase
          .from("websites")
          .select("id, business_type")
          .eq("user_id", user.id)
          .order("created_at", { ascending: true })
          .limit(1);

        if (!websites || websites.length === 0) {
          toast.error("Please create a website first");
          setSaving(false);
          return;
        }
        websiteId = websites[0].id;
      }

      // Get business type for demo events
      const { data: website } = await supabase
        .from("websites")
        .select("business_type")
        .eq("id", websiteId)
        .single();

      // Create campaign with start/end dates
      const { data: campaign, error: campaignError } = await supabase
        .from("campaigns")
        .insert([{
          user_id: user.id,
          name: campaignName,
          description: `${campaignData.type} campaign - ${campaignData.data_source}`,
          status: "active",
          website_id: websiteId,
          data_source: campaignData.data_source || 'manual',
          start_date: campaignData.rules?.startDate || new Date().toISOString(),
          end_date: campaignData.rules?.endDate || null,
          // Save native config for native integrations
          native_config: campaignData.integration_settings || {},
          integration_settings: campaignData.integration_settings || {
            locale: "en",
            actions: [],
            image_fallback_url: ""
          },
          display_rules: {
            ...campaignData.settings,
            frequency: campaignData.rules?.frequency,
            sessionLimit: campaignData.rules?.sessionLimit,
            pageTargeting: campaignData.rules?.pageTargeting,
            deviceTargeting: campaignData.rules?.deviceTargeting,
          },
          polling_config: campaignData.polling_config || {
            enabled: false,
            interval_minutes: 5,
            max_events_per_fetch: 10,
            last_poll_at: null
          },
        }])
        .select()
        .single();

      if (campaignError) throw campaignError;

      // Create widget for this campaign
      const { data: newWidget, error: widgetError } = await supabase
        .from("widgets")
        .insert({
          user_id: user.id,
          website_id: websiteId,
          campaign_id: campaign.id,
          name: `${campaignName} Widget`,
          template_name: campaignData.settings?.layout || "notification",
          status: "active",
          integration: campaignData.data_source || "manual",
          allowed_event_sources: ['natural', 'integration', 'quick-win', 'demo'],
          style_config: {
            borderRadius: campaignData.settings?.borderRadius,
            showImage: campaignData.settings?.showImage,
            headline: campaignData.settings?.headline,
            subtext: campaignData.settings?.subtext,
            ctaEnabled: campaignData.settings?.ctaEnabled,
            ctaLabel: campaignData.settings?.ctaLabel,
          },
          display_rules: {
            show_duration_ms: 5000,
            interval_ms: (campaignData.rules?.frequency || 10) * 1000,
            max_per_session: campaignData.rules?.sessionLimit || 5,
          },
        })
        .select()
        .single();

      if (widgetError) throw widgetError;

      // Auto-generate demo events based on business type
      const demoEvents = generateDemoEvents(newWidget.id, website?.business_type || 'saas');
      const { error: eventsError } = await supabase
        .from("events")
        .insert(demoEvents);

      if (eventsError) console.error("Error creating demo events:", eventsError);

      toast.success("Campaign and widget created successfully!");
      
      // Show success modal with installation code
      setCreatedWidget({ id: newWidget.id, campaignId: campaign.id });
      setShowSuccessModal(true);
    } catch (error) {
      console.error("Error activating campaign:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to activate campaign";
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleSendTest = async () => {
    if (!campaignName) {
      toast.error("Please enter a campaign name first");
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) throw new Error("No email found");

      // Create test event data
      const testEvent = {
        user_name: "Sarah Johnson",
        location: "San Francisco, CA",
        product_name: "Premium Plan",
        action: "completed test action",
        count: "47",
        page_name: "Pricing Page",
        price: "$99.99",
        plan_name: "Pro Subscription",
        timestamp: new Date().toISOString(),
      };

      // Replace placeholders in headline
      let testMessage = campaignData.settings?.headline || "Test notification";
      Object.entries(testEvent).forEach(([key, value]) => {
        testMessage = testMessage.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
      });

      // Send test email via edge function
      const { error } = await supabase.functions.invoke('send-test-notification', {
        body: {
          email: user.email,
          campaignName: campaignName,
          message: testMessage,
          subtext: campaignData.settings?.subtext || "",
          settings: campaignData.settings,
        }
      });

      if (error) throw error;
      toast.success(`Test notification sent to ${user.email}!`);
    } catch (error) {
      console.error("Error sending test:", error);
      toast.error("Failed to send test notification");
    } finally {
      setSaving(false);
    }
  };

  // Generate demo events based on business type
  const generateDemoEvents = (widgetId: string, businessType: string) => {
    const baseTime = new Date();
    const demoMessages: Record<string, string[]> = {
      ecommerce: [
        'Sarah M. from New York just purchased Premium Package',
        'John D. from Los Angeles added items to cart',
        'Emma W. from Chicago completed checkout'
      ],
      saas: [
        'Alex K. from San Francisco just started a free trial',
        'Maria S. from Austin scheduled a demo',
        'David L. from Seattle upgraded to Pro plan'
      ],
      services: [
        'Michael B. just booked a consultation',
        'Jennifer R. submitted a service request',
        'Robert T. scheduled an appointment'
      ],
      default: [
        'Someone from New York just signed up',
        'A visitor from California engaged with your content',
        'New activity on your site'
      ]
    };

    const messages = demoMessages[businessType] || demoMessages.default;
    
    return messages.map((message, index) => ({
      widget_id: widgetId,
      event_type: businessType === 'ecommerce' ? 'purchase' : 'conversion',
      source: 'demo' as const,
      status: 'approved' as const,
      message_template: message,
      user_name: message.split(' ')[0],
      user_location: message.includes('from') ? message.split('from ')[1].split(' just')[0] : 'United States',
      created_at: new Date(baseTime.getTime() - (index * 5 * 60 * 1000)).toISOString(),
      views: 0,
      clicks: 0,
      event_data: { demo: true }
    }));
  };

  return (
    <>
      <WidgetInstallationSuccess
        open={showSuccessModal}
        onClose={async () => {
          setShowSuccessModal(false);
          // Force refresh campaigns list before navigating
          await queryClient.invalidateQueries({ queryKey: ['campaigns'] });
          onComplete();
        }}
        widgetId={createdWidget?.id || ""}
        campaignName={campaignName}
        campaignId={createdWidget?.campaignId || ""}
      />
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Campaign Name</CardTitle>
          <CardDescription>Give your campaign a memorable name</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="campaign-name">Name</Label>
            <Input
              id="campaign-name"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              placeholder="e.g., Holiday Sales Proof"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Campaign Configuration</CardTitle>
          <CardDescription>Complete setup overview</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Campaign Type</p>
              <p className="font-medium capitalize flex items-center gap-2">
                {campaignData.type?.replace("-", " ")}
                <Badge variant="outline" className="text-xs">
                  {campaignData.integration_path === 'integration' ? 'Live Data' : 
                   campaignData.integration_path === 'demo' ? 'Demo Mode' : 'Manual Upload'}
                </Badge>
              </p>
            </div>
            
            {campaignData.data_source && campaignData.data_source !== 'manual' && campaignData.data_source !== 'demo' && (
              <div>
                <p className="text-sm text-muted-foreground">Connected Integration</p>
                <p className="font-medium capitalize flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  {campaignData.data_source}
                </p>
              </div>
            )}
            
            <div>
              <p className="text-sm text-muted-foreground">Layout</p>
              <p className="font-medium capitalize">
                {campaignData.settings?.layout?.replace("-", " ") || "Notification"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Frequency</p>
              <p className="font-medium">Every {campaignData.rules?.frequency || "10"}s</p>
            </div>
            
            {campaignData.settings?.headline && (
              <div className="col-span-2">
                <p className="text-sm text-muted-foreground">Message Template</p>
                <p className="font-medium text-sm bg-muted p-2 rounded">
                  {campaignData.settings.headline}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedTemplate && (
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Applied Template
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <p className="font-medium">{selectedTemplate.name}</p>
                <p className="text-sm text-muted-foreground mt-1">{selectedTemplate.description}</p>
              </div>
              {selectedTemplate.supported_campaign_types && selectedTemplate.supported_campaign_types.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {selectedTemplate.supported_campaign_types.map((type: string) => (
                    <Badge key={type} variant="outline" className="text-xs">
                      {type.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                    </Badge>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t">
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  <span>Design pre-filled</span>
                </div>
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  <span>Rules configured</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Design Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-muted rounded-lg p-6 flex items-center justify-center">
            <div
              className="max-w-sm bg-card border shadow-lg p-4 rounded-lg"
              style={{
                borderRadius: `${campaignData.settings?.borderRadius || 12}px`,
              }}
            >
              <div className="flex gap-3">
                {campaignData.settings?.showImage && (
                  <div className="w-12 h-12 rounded bg-primary/10 flex items-center justify-center text-primary text-xs">
                    IMG
                  </div>
                )}
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    {campaignData.settings?.headline || "Your notification preview"}
                  </p>
                  {campaignData.settings?.subtext && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {campaignData.settings.subtext}
                    </p>
                  )}
                  {campaignData.settings?.ctaEnabled && (
                    <Button size="sm" className="mt-2">
                      {campaignData.settings.ctaLabel || "Learn More"}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rules Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <span className="text-sm">
                Show every {campaignData.rules?.frequency || "10"} seconds
              </span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <span className="text-sm">
                Max {campaignData.rules?.sessionLimit || "5"} per session
              </span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <span className="text-sm capitalize">
                Target: {campaignData.rules?.pageTargeting?.replace("-", " ") || "All pages"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <span className="text-sm capitalize">
                Devices: {campaignData.rules?.deviceTargeting || "Both"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button variant="outline" onClick={handleSaveDraft} disabled={saving} className="flex-1">
          Save as Draft
        </Button>
        <Button variant="outline" onClick={handleSendTest} disabled={saving}>
          <Send className="h-4 w-4 mr-2" />
          Send Test
        </Button>
        <Button onClick={handleActivate} disabled={saving} className="flex-1">
          Activate Campaign
        </Button>
      </div>
      </div>
    </>
  );
}
