import { useState, useEffect } from "react";
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
import { WidgetPreviewFrame } from "./WidgetPreviewFrame";
import { useWebsiteContext } from "@/contexts/WebsiteContext";

interface ReviewActivateProps {
  campaignData: any;
  onComplete: () => void;
  selectedTemplate?: any;
}

export function ReviewActivate({ campaignData, onComplete, selectedTemplate }: ReviewActivateProps) {
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { currentWebsite } = useWebsiteContext();
  const [campaignName, setCampaignName] = useState("");
  const [saving, setSaving] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdWidget, setCreatedWidget] = useState<{ id: string; campaignId: string } | null>(null);
  const [previewTestimonial, setPreviewTestimonial] = useState<any>(null);
  const [templateFromDb, setTemplateFromDb] = useState<any>(null);

  // Fetch preview testimonial and template for live preview
  useEffect(() => {
    async function fetchPreviewTestimonial() {
      const primaryProvider = campaignData.data_sources?.[0]?.provider;
      if (primaryProvider !== 'testimonials') return;

      const config = campaignData.integration_settings || campaignData.native_config;
      
      try {
        // If specific testimonials selected, fetch the first one
        if (config?.display_mode === 'specific' && config?.testimonial_ids?.length > 0) {
          const { data } = await supabase
            .from('testimonials')
            .select('*')
            .in('id', config.testimonial_ids)
            .eq('status', 'approved')
            .limit(1)
            .single();
          
          setPreviewTestimonial(data);
        } else {
          // Fetch first testimonial matching filters
          let query = supabase
            .from('testimonials')
            .select('*')
            .eq('website_id', campaignData.website_id)
            .eq('status', 'approved');
          
          if (config?.testimonial_filters?.minRating) {
            query = query.gte('rating', config.testimonial_filters.minRating);
          }
          
          if (config?.testimonial_filters?.onlyVerified) {
            query = query.eq('metadata->>verified_purchase', 'true');
          }
          
          const { data } = await query.order('created_at', { ascending: false }).limit(1).single();
          setPreviewTestimonial(data);
        }
      } catch (error) {
        console.error('Error fetching preview testimonial:', error);
      }
    }
    
    fetchPreviewTestimonial();
  }, [campaignData]);

  // Fetch template from database
  useEffect(() => {
    async function fetchTemplate() {
      if (!campaignData.template_id) return;
      
      try {
        const { data, error } = await supabase
          .from('templates')
          .select('*')
          .eq('id', campaignData.template_id)
          .single();
        
        if (!error && data) {
          setTemplateFromDb(data);
        }
      } catch (error) {
        console.error('Error fetching template:', error);
      }
    }
    
    fetchTemplate();
  }, [campaignData.template_id]);

  const handleSaveDraft = async () => {
    if (!campaignName) {
      toast.error("Please enter a campaign name");
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get website_id - prioritize URL params, then campaign data, then current context
      const websiteIdFromParams = searchParams.get('website');
      const websiteIdFromCampaign = campaignData.website_id;
      
      let websiteId = websiteIdFromParams || websiteIdFromCampaign || currentWebsite?.id;
      
      if (!websiteId) {
        // Last fallback: query for most recent website
        const { data: websites } = await supabase
          .from("websites")
          .select("id")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1);

        if (!websites || websites.length === 0) {
          toast.error("Please create a website first");
          setSaving(false);
          return;
        }
        websiteId = websites[0].id;
      }

      // Create campaign as draft
      // STEP 5: Log what we're about to save to the database
      console.log('💾 [ReviewActivate - DRAFT] Preparing to save campaign draft');
      console.log('  - Campaign name:', campaignName);
      console.log('  - Data sources:', campaignData.data_sources);
      console.log('  - native_config (from integration_settings):', 
        JSON.stringify(campaignData.integration_settings, null, 2));
      
      const primaryProvider = Array.isArray(campaignData.data_sources) && campaignData.data_sources.length > 0 
        ? (campaignData.data_sources[0] as any).provider 
        : 'manual';
      
      if (primaryProvider === 'announcements') {
        console.log('  ANNOUNCEMENT DRAFT SAVE - Config validation:');
        console.log('    - title:', campaignData.integration_settings?.title || '(missing)');
        console.log('    - message:', campaignData.integration_settings?.message || '(missing)');
        console.log('    - cta_text:', campaignData.integration_settings?.cta_text || '(missing)');
        console.log('    - cta_url:', campaignData.integration_settings?.cta_url || '(missing)');
        console.log('    - image_type:', campaignData.integration_settings?.image_type);
        console.log('    - icon/emoji:', campaignData.integration_settings?.icon || campaignData.integration_settings?.emoji);
      }
      
      const { data: campaign, error: campaignError } = await supabase
        .from("campaigns")
        .insert([{
          user_id: user.id,
          name: campaignName,
          description: campaignData.campaign_type === 'announcements' 
            ? 'Smart Announcement campaign'
            : `${campaignData.type} campaign`,
          status: "draft",
          website_id: websiteId,
          
          // Multi-integration support
          data_sources: campaignData.data_sources || null,
          
          // Template system
          template_id: campaignData.template_id || null,
          template_mapping: campaignData.template_mapping || {},
          
          // Orchestration
          priority: campaignData.priority || 50,
          frequency_cap: campaignData.frequency_cap || {
            per_user: 3,
            per_session: 1,
            cooldown_seconds: 600,
          },
          schedule: campaignData.schedule || null,
          
          // Legacy: Native config for native integrations
          native_config: campaignData.integration_settings || {},
          integration_settings: campaignData.integration_settings || {
            locale: "en",
            actions: [],
            image_fallback_url: ""
          },
          display_rules: campaignData.display_rules || {
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
      
      console.log('✅ [ReviewActivate - DRAFT] Campaign draft saved successfully:', campaign.id);

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
          integration: primaryProvider,
          style_config: {
            borderRadius: campaignData.settings?.borderRadius,
            showImage: campaignData.settings?.showImage,
            headline: campaignData.settings?.headline,
            subtext: campaignData.settings?.subtext,
            ctaEnabled: campaignData.settings?.ctaEnabled,
            ctaLabel: campaignData.settings?.ctaLabel,
            contentAlignment: campaignData.integration_settings?.content_alignment || 
                              campaignData.settings?.contentAlignment || 'top',
          },
          display_rules: {
            show_duration_ms: 5000,
            interval_ms: (campaignData.rules?.frequency || 10) * 1000,
            max_per_session: campaignData.rules?.sessionLimit || 5,
          },
        });

      if (widgetError) throw widgetError;

      // For Smart Announcements in draft mode, create the announcement event
      if (primaryProvider === 'announcements' && campaignData.integration_settings) {
        const announcementConfig = campaignData.integration_settings;
        
        let messageTemplate = announcementConfig.title || '';
        if (announcementConfig.message) {
          messageTemplate += (messageTemplate ? ' - ' : '') + announcementConfig.message;
        }

        // Note: For draft widgets, we don't have a widget_id yet, so skip event creation
        // Events will be created when the campaign is activated
      }

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

      // Get website_id - prioritize URL params, then campaign data, then current context
      const websiteIdFromParams = searchParams.get('website');
      const websiteIdFromCampaign = campaignData.website_id;
      
      let websiteId = websiteIdFromParams || websiteIdFromCampaign || currentWebsite?.id;
      
      if (!websiteId) {
        // Last fallback: query for most recent website
        const { data: websites } = await supabase
          .from("websites")
          .select("id, business_type")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
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
      // STEP 5: Log what we're about to save to the database
      console.log('💾 [ReviewActivate - ACTIVATE] Preparing to save active campaign');
      console.log('  - Campaign name:', campaignName);
      console.log('  - Data sources:', campaignData.data_sources);
      
      const primaryProvider = Array.isArray(campaignData.data_sources) && campaignData.data_sources.length > 0 
        ? (campaignData.data_sources[0] as any).provider 
        : 'manual';
      console.log('  - Website ID:', websiteId);
      console.log('  - Business type:', website?.business_type);
      console.log('  - native_config (from integration_settings):', 
        JSON.stringify(campaignData.integration_settings, null, 2));
      console.log('  - Settings:', JSON.stringify(campaignData.settings, null, 2));
      
      if (primaryProvider === 'announcements') {
        console.log('  ANNOUNCEMENT ACTIVATION - Config validation:');
        console.log('    - title:', campaignData.integration_settings?.title || '(missing)');
        console.log('    - message:', campaignData.integration_settings?.message || '(missing)');
        console.log('    - cta_text:', campaignData.integration_settings?.cta_text || '(missing)');
        console.log('    - cta_url:', campaignData.integration_settings?.cta_url || '(missing)');
        console.log('    - image_type:', campaignData.integration_settings?.image_type);
        console.log('    - icon:', campaignData.integration_settings?.icon);
        console.log('    - emoji:', campaignData.integration_settings?.emoji);
        console.log('    - schedule_type:', campaignData.integration_settings?.schedule_type);
        
        if (!campaignData.integration_settings?.title || !campaignData.integration_settings?.message) {
          console.error('  ❌ CRITICAL: Missing required announcement fields before save!');
        }
        
        if (!campaignData.integration_settings?.cta_text || !campaignData.integration_settings?.cta_url) {
          console.warn('  ⚠️ WARNING: Missing CTA fields - button will not render!');
        }
      }
      
      const { data: campaign, error: campaignError } = await supabase
        .from("campaigns")
        .insert([{
          user_id: user.id,
          name: campaignName,
          description: `${campaignData.type} campaign - ${primaryProvider}`,
          status: "active",
          website_id: websiteId,
          start_date: campaignData.rules?.startDate || campaignData.schedule?.start_date || new Date().toISOString(),
          end_date: campaignData.rules?.endDate || campaignData.schedule?.end_date || null,
          
          // Multi-integration support
          data_sources: campaignData.data_sources || [],
          
          // Template system
          template_id: campaignData.template_id || null,
          template_mapping: campaignData.template_mapping || {},
          
          // Orchestration
          priority: campaignData.priority || 50,
          frequency_cap: campaignData.frequency_cap || {
            per_user: 3,
            per_session: 1,
            cooldown_seconds: 600,
          },
          schedule: campaignData.schedule || null,
          
          // Legacy: Native config for native integrations
          native_config: campaignData.integration_settings || {},
          integration_settings: campaignData.integration_settings || {
            locale: "en",
            actions: [],
            image_fallback_url: ""
          },
          display_rules: campaignData.display_rules || {
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

      // STEP 5: Confirm what was saved to the database
      console.log('✅ [ReviewActivate - ACTIVATE] Campaign saved successfully!');
      console.log('  - Campaign ID:', campaign.id);
      console.log('  - Campaign status:', campaign.status);
      console.log('  - Saved native_config:', JSON.stringify(campaign.native_config, null, 2));
      console.log('  - Saved integration_settings:', JSON.stringify(campaign.integration_settings, null, 2));
      
      if (campaignData.campaign_type === 'announcements') {
        const nativeConfig = campaign.native_config as any;
        console.log('  ANNOUNCEMENT SAVED - Verification:');
        console.log('    ✓ title in DB:', nativeConfig?.title);
        console.log('    ✓ message in DB:', nativeConfig?.message);
        console.log('    ✓ cta_text in DB:', nativeConfig?.cta_text);
        console.log('    ✓ cta_url in DB:', nativeConfig?.cta_url);
        console.log('    ✓ image_type in DB:', nativeConfig?.image_type);
        console.log('    ✓ icon/emoji in DB:', nativeConfig?.icon || nativeConfig?.emoji);
      }

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
          integration: primaryProvider,
          allowed_event_sources: ['natural', 'integration', 'quick-win', 'demo'],
          style_config: {
            borderRadius: campaignData.settings?.borderRadius,
            showImage: campaignData.settings?.showImage,
            headline: campaignData.settings?.headline,
            subtext: campaignData.settings?.subtext,
            ctaEnabled: campaignData.settings?.ctaEnabled,
            ctaLabel: campaignData.settings?.ctaLabel,
            contentAlignment: campaignData.integration_settings?.content_alignment || 
                              campaignData.settings?.contentAlignment || 'top',
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

      // PHASE 4: Only create demo events for non-native integrations when explicitly requested
      // Native integrations (announcements, live_visitors, instant_capture) should create their own events
      const isNativeIntegration = ['announcements', 'live_visitors', 'instant_capture'].includes(
        primaryProvider
      );

      if (!isNativeIntegration && campaignData.integration_path === 'demo') {
        // Only generate demo events if user explicitly chose demo mode
        const demoEvents = generateDemoEvents(newWidget.id, websiteId, website?.business_type || 'saas');
        const { error: eventsError } = await supabase
          .from("events")
          .insert(demoEvents);

        if (eventsError) console.error("Error creating demo events:", eventsError);
      }

      // PHASE 3: For Smart Announcements, create the actual announcement event
      if (primaryProvider === 'announcements' && campaignData.integration_settings) {
        const announcementConfig = campaignData.integration_settings;
        
        // Validation logging
        console.log('📢 [ReviewActivate] Creating announcement event:');
        console.log('  - widget_id:', newWidget.id);
        console.log('  - website_id:', websiteId);
        console.log('  - title:', announcementConfig.title);
        console.log('  - message:', announcementConfig.message);
        console.log('  - cta_text:', announcementConfig.cta_text);
        console.log('  - cta_url:', announcementConfig.cta_url);
        
        if (!websiteId) {
          console.error('❌ CRITICAL: website_id is missing! Event will not be queryable!');
          throw new Error('website_id is required for announcement events');
        }
        
        // Create the announcement event with ALL configuration data
        const { error: announcementError } = await supabase
          .from("events")
          .insert([{
            widget_id: newWidget.id,
            website_id: websiteId,
            event_type: 'announcement',
            source: 'manual' as const,
            status: 'approved',
            message_template: announcementConfig.title || 'Announcement',
            event_data: {
              title: announcementConfig.title,
              message: announcementConfig.message,
              cta_text: announcementConfig.cta_text,
              cta_url: announcementConfig.cta_url,
              // Include image configuration
              image_type: announcementConfig.image_type || 'emoji',
              emoji: announcementConfig.emoji,
              icon: announcementConfig.icon,
              image_url: announcementConfig.image_url,
              schedule_type: announcementConfig.schedule_type || 'instant',
              priority: announcementConfig.priority || 5,
            },
            views: 0,
            clicks: 0,
          }]);

        if (announcementError) {
          console.error("Error creating announcement event:", announcementError);
          toast.error("Campaign created but announcement event failed. Please check the Events tab.");
        }
      }

      toast.success("Campaign and widget created successfully!");
      
      // Redirect to campaigns page immediately
      onComplete();
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
  const generateDemoEvents = (widgetId: string, websiteId: string, businessType: string) => {
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
      website_id: websiteId,
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
          <CardTitle>Notification Name</CardTitle>
          <CardDescription>Give your notification a memorable name</CardDescription>
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
            
            {(() => {
              const primaryProvider = Array.isArray(campaignData.data_sources) && campaignData.data_sources.length > 0
                ? (campaignData.data_sources[0] as any).provider
                : 'manual';
              
              return primaryProvider && primaryProvider !== 'manual' ? (
                <div>
                  <p className="text-sm text-muted-foreground">Connected Integration</p>
                  <p className="font-medium capitalize flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    {primaryProvider}
                  </p>
                </div>
              ) : null;
            })()}
            
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

      {/* Live Preview Section */}
      <Card>
        <CardHeader>
          <CardTitle>Live Preview</CardTitle>
          <CardDescription>Exactly how your notification will appear on your website</CardDescription>
        </CardHeader>
        <CardContent>
          <WidgetPreviewFrame
            settings={{
              ...campaignData.display_rules,
              integration_settings: campaignData.integration_settings || campaignData.native_config,
              headline: campaignData.integration_settings?.title || campaignData.native_config?.title,
              subtext: campaignData.integration_settings?.message || campaignData.native_config?.message,
              icon: campaignData.integration_settings?.icon || campaignData.integration_settings?.emoji || 
                    campaignData.native_config?.icon || campaignData.native_config?.emoji,
              cta_text: campaignData.integration_settings?.cta_text || campaignData.native_config?.cta_text,
              cta_url: campaignData.integration_settings?.cta_url || campaignData.native_config?.cta_url,
              testimonialData: previewTestimonial ? {
                author_name: previewTestimonial.author_name,
                author_avatar: previewTestimonial.author_avatar_url,
                author_position: previewTestimonial.metadata?.position || previewTestimonial.author_position,
                author_company: previewTestimonial.metadata?.company || previewTestimonial.author_company,
                rating: previewTestimonial.rating,
                rating_stars: '★'.repeat(previewTestimonial.rating) + '☆'.repeat(5 - previewTestimonial.rating),
                message: previewTestimonial.message,
                verified: previewTestimonial.metadata?.verified_purchase,
                image_url: previewTestimonial.image_url,
                video_url: previewTestimonial.video_url,
              } : null,
            }}
            messageTemplate={
              campaignData.integration_settings?.title || 
              campaignData.native_config?.title || 
              campaignData.integration_settings?.message || 
              campaignData.native_config?.message || 
              "Your notification preview"
            }
            campaignType={campaignData.type}
            websiteDomain={campaignData.website_id || "your-site.com"}
            position={campaignData.display_rules?.position || "bottom-left"}
            animation={campaignData.display_rules?.animation || "slide"}
            selectedTemplate={templateFromDb || selectedTemplate}
          />
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
