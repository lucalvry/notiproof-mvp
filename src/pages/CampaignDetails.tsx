import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Play, Pause, BarChart, Settings, Activity, Edit, Copy, Code, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCampaignMetrics } from "@/hooks/useCampaignMetrics";
import { useCampaignAnalytics } from "@/hooks/useCampaignAnalytics";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CampaignEditor } from "@/components/campaigns/CampaignEditor";
import { NotificationPreview } from "@/components/templates/NotificationPreview";
import { TemplateRenderer } from "@/components/templates/TemplateRenderer";
import { PerformanceGraph } from "@/components/analytics/PerformanceGraph";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDistanceToNow } from "date-fns";
import { AnnouncementConfig } from "@/components/campaigns/native/AnnouncementConfig";
import { FormCaptureEditor } from "@/components/campaigns/FormCaptureEditor";
import { TestimonialCampaignEditor } from "@/components/campaigns/TestimonialCampaignEditor";
import { VisitorsPulseCampaignEditor } from "@/components/campaigns/VisitorsPulseCampaignEditor";
import { WooCommerceCampaignEditor } from "@/components/campaigns/WooCommerceCampaignEditor";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function CampaignDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<any>(null);
  const [widgets, setWidgets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [events, setEvents] = useState<any[]>([]);
  const [sampleEvent, setSampleEvent] = useState<any>(null);
  const [sampleTestimonial, setSampleTestimonial] = useState<any>(null);
  const [dateRange, setDateRange] = useState(30);
  const [campaignTemplate, setCampaignTemplate] = useState<any>(null);
  const [editingConfig, setEditingConfig] = useState<any>(null);
  
  // Determine campaign data sources
  const dataSources = Array.isArray(campaign?.data_sources) ? campaign.data_sources : [];
  const hasGA4 = dataSources.some((ds: any) => ds.provider === 'ga4');
  const isAnnouncementCampaign = dataSources.some((ds: any) => ds.provider === 'announcements');
  const isFormCaptureCampaign = dataSources.some((ds: any) => ds.provider === 'form_hook');
  const isTestimonialCampaign = dataSources.some((ds: any) => ds.provider === 'testimonials');
  const isVisitorsPulseCampaign = dataSources.some((ds: any) => ds.provider === 'live_visitors');
  const isWooCommerceCampaign = dataSources.some((ds: any) => ds.provider === 'woocommerce');
  const [settingsForm, setSettingsForm] = useState({
    name: "",
    status: "draft",
    position: "bottom-right",
    animation: "slide",
    showDuration: 5000,
    intervalMs: 8000,
    maxPerSession: 20,
  });
  const metrics = useCampaignMetrics(id);
  const { dailyStats, loading: analyticsLoading } = useCampaignAnalytics(id, dateRange);

  useEffect(() => {
    fetchCampaign();
    fetchPreviewData();
  }, [id]);

  // Fetch events after campaign is loaded (needed for data_sources check)
  useEffect(() => {
    if (campaign) {
      fetchEvents();
    }
  }, [campaign?.id]);

  // Simple Mustache-style template renderer
  const renderTemplate = (template: string, data: Record<string, any>): string => {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => data[key] || '');
  };

  // Fetch campaign-type-specific preview data
  const fetchPreviewData = async () => {
    if (!campaign?.website_id) return;
    
    const dataSources = Array.isArray(campaign?.data_sources) ? campaign.data_sources : [];
    const provider = dataSources[0]?.provider;
    
    if (provider === 'testimonials') {
      try {
        // Build query with filters from integration_settings
        const filters = campaign?.integration_settings?.testimonial_filters || {};
        let query = supabase
          .from('testimonials')
          .select('*')
          .eq('website_id', campaign.website_id)
          .eq('status', 'approved')
          .order('created_at', { ascending: false })
          .limit(1);
        
        // Apply filters
        if (filters.minRating) {
          query = query.gte('rating', filters.minRating);
        }
        if (filters.mediaFilter === 'video') {
          query = query.not('video_url', 'is', null);
        } else if (filters.mediaFilter === 'image') {
          query = query.not('image_url', 'is', null);
        }
        
        const { data, error } = await query;
        
        if (!error && data && data.length > 0) {
          setSampleTestimonial(data[0]);
        }
      } catch (error) {
        console.error('Error fetching testimonial for preview:', error);
      }
    }
  };

  // Re-fetch preview data when campaign changes
  useEffect(() => {
    if (campaign) {
      fetchPreviewData();
    }
  }, [campaign?.id, campaign?.website_id]);

  useEffect(() => {
    if (!id) return;

    // Subscribe to real-time events
    const channel = supabase
      .channel('campaign-events')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'events',
          filter: `widget_id=in.(${widgets.map(w => w.id).join(',')})`,
        },
        (payload) => {
          setEvents((prev) => [payload.new, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, widgets]);

  const fetchCampaign = async () => {
    try {
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      setCampaign(data);

      // Fetch template if campaign has one
      if (data.template_id) {
        const { data: templateData } = await supabase
          .from('marketplace_templates')
          .select('*')
          .eq('id', data.template_id)
          .single();
        
        if (templateData) {
          setCampaignTemplate(templateData);
        }
      }

      // Initialize settings form
      const displayRules = (data.display_rules as any) || {};
      const settings = (data as any).settings || {};
      setSettingsForm({
        name: data.name,
        status: data.status,
        position: settings.position || "bottom-right",
        animation: settings.animation || "slide",
        showDuration: displayRules.show_duration_ms || 5000,
        intervalMs: displayRules.interval_ms || 8000,
        maxPerSession: displayRules.max_per_session || 20,
      });

      // Fetch widgets for this campaign
      const { data: widgetData } = await supabase
        .from("widgets")
        .select("id, name, website_id")
        .eq("campaign_id", id);
      
      setWidgets(widgetData || []);
    } catch (error) {
      console.error("Error fetching campaign:", error);
      toast.error("Failed to load campaign");
    } finally {
      setLoading(false);
    }
  };

  const fetchEvents = async () => {
    try {
      // For Visitors Pulse, fetch from campaign_stats
      const dataSources = Array.isArray(campaign?.data_sources) ? campaign.data_sources : [];
      const isLiveVisitors = dataSources.some((ds: any) => ds.provider === 'live_visitors');
      
      if (isLiveVisitors) {
        // Fetch campaign_stats for Visitors Pulse
        const { data: statsData, error: statsError } = await supabase
          .from("campaign_stats")
          .select("*")
          .eq("campaign_id", id)
          .order("date", { ascending: false })
          .limit(50);
        
        if (statsError) throw statsError;
        
        // Transform campaign_stats to event-like format for display
        const statsAsEvents = (statsData || []).map((stat: any) => ({
          id: stat.id,
          created_at: stat.date,
          source: 'live_visitors',
          status: 'approved',
          event_type: 'notification_display',
          views: stat.views || 0,
          clicks: stat.clicks || 0,
          event_data: { date: stat.date },
        }));
        
        setEvents(statsAsEvents);
        return;
      }
      
      // For other campaign types, fetch from events table
      const { data: widgetData } = await supabase
        .from("widgets")
        .select("id")
        .eq("campaign_id", id);

      if (!widgetData || widgetData.length === 0) return;

      const widgetIds = widgetData.map((w) => w.id);

      const { data: eventsData, error } = await supabase
        .from("events")
        .select("*")
        .in("widget_id", widgetIds)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setEvents(eventsData || []);
      
      // Set first event as sample for preview
      if (eventsData && eventsData.length > 0) {
        setSampleEvent(eventsData[0]);
      }
    } catch (error) {
      console.error("Error fetching events:", error);
    }
  };

  const handleStatusToggle = async () => {
    try {
      const newStatus = campaign.status === "active" ? "paused" : "active";
      const { error } = await supabase
        .from("campaigns")
        .update({ status: newStatus })
        .eq("id", id);

      if (error) throw error;
      toast.success(`Campaign ${newStatus}`);
      fetchCampaign();
    } catch (error) {
      console.error("Error updating campaign:", error);
      toast.error("Failed to update campaign");
    }
  };

  const handleManualSync = async () => {
    if (!campaign.website_id) {
      toast.error("No website connected to this campaign");
      return;
    }
    
    if (!hasGA4) {
      toast.error("Manual sync only available for GA4 campaigns");
      return;
    }

    setSyncing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const loadingToast = toast.loading("Syncing GA4 data...");

      const { data, error } = await supabase.functions.invoke('sync-ga4', {
        body: {
          campaign_id: id,
          user_id: user.id,
          website_id: campaign.website_id
        }
      });

      toast.dismiss(loadingToast);

      if (error) {
        // Parse specific error types
        const errorMessage = error.message || String(error);
        
        if (errorMessage.includes('GA4_AUTH_EXPIRED') || errorMessage.includes('authentication expired')) {
          toast.error('GA4 connection expired. Please reconnect Google Analytics.', {
            duration: 8000,
            action: {
              label: 'Reconnect',
              onClick: () => window.location.href = '/integrations'
            }
          });
        } else if (errorMessage.includes('quota_exceeded')) {
          toast.error(
            `Event quota exceeded. ${data?.quota_remaining || 0} events remaining this month.`,
            { duration: 6000 }
          );
        } else {
          toast.error(`Failed to sync: ${errorMessage}`);
        }
        return;
      }

      if (!data?.success) {
        toast.error(data?.reason || 'Sync failed');
        return;
      }

      toast.success(
        `Successfully synced ${data.events_synced} events! ${data.quota_remaining} events remaining.`,
        { duration: 5000 }
      );
      fetchCampaign();
      fetchEvents();
    } catch (error: any) {
      console.error('GA4 sync error:', error);
      const errorMessage = error?.message || String(error);
      
      if (errorMessage.includes('GA4_AUTH_EXPIRED') || errorMessage.includes('authentication expired')) {
        toast.error('GA4 connection expired. Please reconnect Google Analytics.', {
          duration: 8000,
          action: {
            label: 'Reconnect',
            onClick: () => window.location.href = '/integrations'
          }
        });
      } else {
        toast.error(errorMessage || 'Failed to sync GA4 data');
      }
    } finally {
      setSyncing(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      const currentSettings = (campaign as any).settings || {};
      const currentDisplayRules = (campaign.display_rules as any) || {};
      
      const { error } = await supabase
        .from("campaigns")
        .update({
          name: settingsForm.name,
          status: settingsForm.status,
          settings: {
            ...currentSettings,
            position: settingsForm.position,
            animation: settingsForm.animation,
          } as any,
          display_rules: {
            ...currentDisplayRules,
            show_duration_ms: settingsForm.showDuration,
            interval_ms: settingsForm.intervalMs,
            max_per_session: settingsForm.maxPerSession,
          } as any,
        })
        .eq("id", id);

      if (error) throw error;
      toast.success("Settings saved successfully");
      fetchCampaign();
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Failed to save settings");
    }
  };

  if (loading || metrics.loading) {
    return (
      <div className="mx-auto max-w-7xl space-y-6">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!campaign) {
    return <div className="flex items-center justify-center h-full">Campaign not found</div>;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/campaigns")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{campaign.name}</h1>
            <p className="text-muted-foreground capitalize">
              {campaign.type?.replace("-", " ") || "Campaign"}
            </p>
          </div>
          <Badge
            variant={campaign.status === "active" ? "default" : "secondary"}
          >
            {campaign.status}
          </Badge>
        </div>
        <div className="flex gap-2">
          {hasGA4 && (
            <Button 
              variant="outline" 
              onClick={handleManualSync}
              disabled={syncing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
              Sync GA4
            </Button>
          )}
          <Button variant="outline" onClick={handleStatusToggle}>
            {campaign.status === "active" ? (
              <>
                <Pause className="h-4 w-4 mr-2" />
                Pause
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Activate
              </>
            )}
          </Button>
          <Button variant="outline" onClick={() => setEditMode(true)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
        </div>
      </div>

      {/* Feature Upgrade Notice for Version 1 Widgets */}
      {widgets.length > 0 && widgets[0]?.feature_flags?.version < 2 && (
        <Alert variant="default" className="border-primary/50 bg-primary/5">
          <Sparkles className="h-4 w-4 text-primary" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-semibold text-foreground">New features available!</p>
              <p className="text-sm text-muted-foreground">
                Your campaign was created before product images and linkification were added.
                Upgrade to version 2 to enable these features:
              </p>
              <ul className="text-sm text-muted-foreground list-disc list-inside ml-2 space-y-1">
                <li>Product image previews in notifications</li>
                <li>Clickable product links</li>
                <li>Enhanced event formatting</li>
              </ul>
              <Button 
                size="sm" 
                className="mt-2"
                onClick={async () => {
                  try {
                    const { error } = await supabase
                      .from('widgets')
                      .update({ 
                        feature_flags: {
                          showProductImages: true,
                          linkifyProducts: true,
                          fallbackIcon: 'default',
                          version: 2
                        }
                      } as any)
                      .eq('id', widgets[0].id);
                    
                    if (error) throw error;
                    
                    toast.success('Campaign upgraded to version 2! Please re-embed the widget code to see new features.', {
                      duration: 8000
                    });
                    fetchCampaign();
                  } catch (error: any) {
                    console.error('Error upgrading campaign:', error);
                    toast.error('Failed to upgrade campaign features');
                  }
                }}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Enable New Features
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}


      <Tabs defaultValue={new URLSearchParams(window.location.search).get('tab') || 'overview'} className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="events">Events Feed</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Impressions</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics.totalViews.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">Total views</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Clicks</CardTitle>
                <BarChart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics.totalClicks.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">CTA interactions</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">CTR</CardTitle>
                <Settings className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics.ctr.toFixed(2)}%
                </div>
                <p className="text-xs text-muted-foreground">Click-through rate</p>
              </CardContent>
            </Card>
          </div>

          {hasGA4 && campaign.polling_config && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw className="h-5 w-5" />
                  GA4 Sync Status
                </CardTitle>
                <CardDescription>Automatic data synchronization</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {campaign.polling_config.last_poll_at ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Last synced:</span>
                      <span className="text-sm font-medium">
                        {formatDistanceToNow(new Date(campaign.polling_config.last_poll_at), { addSuffix: true })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Next sync:</span>
                      <span className="text-sm font-medium">
                        in {campaign.polling_config.interval_minutes || 5} minutes
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Sync interval:</span>
                      <span className="text-sm font-medium">
                        Every {campaign.polling_config.interval_minutes || 5} minutes
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    Waiting for first sync...
                  </div>
                )}
                <Button 
                  onClick={handleManualSync} 
                  disabled={syncing}
                  className="w-full"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                  Sync Now
                </Button>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Campaign Preview</CardTitle>
              <CardDescription>How your notification appears to visitors</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-96">
                {isAnnouncementCampaign && campaignTemplate ? (
                  <TemplateRenderer
                    template={campaignTemplate}
                    event={{
                      event_id: 'preview',
                      provider: 'announcements',
                      provider_event_type: 'announcement_preview',
                      timestamp: new Date().toISOString(),
                      payload: {},
                      normalized: {
                        'template.title': (campaign as any).integration_settings?.title || (campaign as any).native_config?.title || 'Announcement',
                        'template.message': (campaign as any).integration_settings?.message || (campaign as any).native_config?.message || '',
                        'template.icon': (campaign as any).integration_settings?.icon || (campaign as any).integration_settings?.emoji || (campaign as any).native_config?.icon || (campaign as any).native_config?.emoji || '📢',
                        'template.cta_text': (campaign as any).integration_settings?.cta_text || (campaign as any).native_config?.cta_text || '',
                        'template.cta_url': (campaign as any).integration_settings?.cta_url || (campaign as any).native_config?.cta_url || '',
                        'template.image_url': (campaign as any).integration_settings?.image_url || (campaign as any).native_config?.image_url || '',
                      }
                    }}
                    className="scale-75 origin-top-left"
                  />
                ) : (
                  <NotificationPreview
                    template={{
                      name: campaign.name,
                      template_config: {
                        position: ((campaign as any).settings?.position) || ((campaign as any).integration_settings?.position) || "bottom-right",
                        animation: ((campaign as any).settings?.animation) || ((campaign as any).integration_settings?.animation) || "slide",
                        previewData: (() => {
                          // Testimonial campaigns - show actual testimonial data
                          if (isTestimonialCampaign && sampleTestimonial) {
                            return {
                              userName: sampleTestimonial.author_name,
                              userAvatar: sampleTestimonial.author_avatar_url,
                              message: `"${sampleTestimonial.message?.substring(0, 100)}${sampleTestimonial.message?.length > 100 ? '...' : ''}"`,
                              rating: sampleTestimonial.rating,
                              time: formatDistanceToNow(new Date(sampleTestimonial.created_at), { addSuffix: true }),
                            };
                          }
                          // Testimonial campaigns - fallback when no data
                          if (isTestimonialCampaign) {
                            return {
                              userName: "Happy Customer",
                              message: '"Great product! Highly recommended."',
                              rating: 5,
                              time: "Just now",
                            };
                          }
                          // Form capture campaigns - show actual form data
                          if (isFormCaptureCampaign && sampleEvent) {
                            const formData = sampleEvent.event_data?.flattened_fields || sampleEvent.event_data || {};
                            const renderedMessage = renderTemplate(
                              sampleEvent.message_template || '{{name}} just signed up',
                              formData
                            );
                            return {
                              userName: formData.name || formData.firstName || 'Someone',
                              message: renderedMessage,
                              time: formatDistanceToNow(new Date(sampleEvent.created_at), { addSuffix: true }),
                            };
                          }
                          // Form capture campaigns - fallback when no data
                          if (isFormCaptureCampaign) {
                            return {
                              userName: "New Signup",
                              message: "just signed up",
                              time: "Just now",
                            };
                          }
                          // WooCommerce/Purchase campaigns - extract structured data
                          if (isWooCommerceCampaign && sampleEvent) {
                            const eventData = sampleEvent.event_data || {};
                            return {
                              userName: sampleEvent.user_name || 'Someone',
                              productImage: eventData.product_image,
                              message: `purchased ${eventData.product_name || 'a product'}`,
                              location: sampleEvent.user_location,
                              time: formatDistanceToNow(new Date(sampleEvent.created_at), { addSuffix: true }),
                            };
                          }
                          // WooCommerce fallback when no data
                          if (isWooCommerceCampaign) {
                            return {
                              userName: "Jane Smith",
                              message: "purchased Premium Sneakers",
                              location: "Lagos, Nigeria",
                              time: "Just now",
                            };
                          }
                          // Default fallback for other campaign types
                          if (sampleEvent) {
                            return {
                              userName: sampleEvent.user_name,
                              message: sampleEvent.message_template || "Someone just took action",
                              location: sampleEvent.user_location || "Unknown",
                              time: formatDistanceToNow(new Date(sampleEvent.created_at), { addSuffix: true }),
                            };
                          }
                          return {
                            userName: "Sarah M.",
                            location: "San Francisco",
                            action: "just signed up",
                            time: "2 minutes ago",
                          };
                        })(),
                      },
                      style_config: {
                        accentColor: ((campaign as any).settings?.accentColor) || ((campaign as any).integration_settings?.primary_color) || "#3B82F6",
                        backgroundColor: ((campaign as any).settings?.backgroundColor) || ((campaign as any).integration_settings?.background_color) || "#ffffff",
                        textColor: ((campaign as any).settings?.textColor) || ((campaign as any).integration_settings?.text_color) || "#1a1a1a",
                        borderRadius: ((campaign as any).settings?.borderRadius) || ((campaign as any).integration_settings?.border_radius) || 12,
                      },
                    }}
                  />
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <PerformanceGraph
            dailyStats={dailyStats}
            isLoading={analyticsLoading}
          />
        </TabsContent>

        <TabsContent value="events">
          <Card>
            <CardHeader>
              <CardTitle>Real-time Events Feed</CardTitle>
              <CardDescription>Live stream of proof notifications</CardDescription>
            </CardHeader>
            <CardContent>
              {events.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  No events yet. Events will appear here as they are created.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Views</TableHead>
                      <TableHead className="text-right">Clicks</TableHead>
                      <TableHead>Event Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {events.map((event) => (
                      <TableRow key={event.id}>
                        <TableCell className="text-xs">
                          {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {event.source}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={event.status === "approved" ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {event.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{event.views || 0}</TableCell>
                        <TableCell className="text-right">{event.clicks || 0}</TableCell>
                        <TableCell className="max-w-xs truncate text-xs">
                          <div className="flex items-center gap-2">
                            {event.user_name && <span className="text-muted-foreground">{event.user_name} •</span>}
                            <Badge 
                              variant="outline" 
                              className={
                                event.event_data?.ga4_event_name === 'page_view' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                event.event_data?.ga4_event_name === 'purchase' ? 'bg-green-50 text-green-700 border-green-200' :
                                event.event_data?.ga4_event_name === 'sign_up' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                event.event_data?.ga4_event_name === 'session_start' ? 'bg-cyan-50 text-cyan-700 border-cyan-200' :
                                event.event_data?.ga4_event_name === 'user_engagement' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                'bg-gray-50 text-gray-700 border-gray-200'
                              }
                            >
                              {event.event_data?.ga4_event_name || event.event_type}
                            </Badge>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          {/* Widget Installation Codes */}
          {widgets.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code className="h-5 w-5" />
                  Widget Installation Codes
                </CardTitle>
                <CardDescription>
                  Copy and paste these codes into your website to display notifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {widgets.map((widget) => (
                  <div key={widget.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">{widget.name}</Label>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const code = `<script src="https://ewymvxhpkswhsirdrjub.supabase.co/functions/v1/widget-script" data-widget-id="${widget.id}"></script>`;
                          navigator.clipboard.writeText(code);
                          toast.success("Widget code copied!");
                        }}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copy Code
                      </Button>
                    </div>
                    <div className="rounded-lg bg-muted p-4">
                      <code className="text-sm break-all font-mono">
                        {`<script src="https://ewymvxhpkswhsirdrjub.supabase.co/functions/v1/widget-script" data-widget-id="${widget.id}"></script>`}
                      </code>
                    </div>
                  </div>
                ))}
                <div className="rounded-lg border bg-card p-4">
                  <h4 className="font-medium text-sm mb-2">Installation Instructions:</h4>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                    <li>Copy the widget code above</li>
                    <li>Paste it into your website's HTML</li>
                    <li>Place it right before the closing {`</body>`} tag</li>
                    <li>Save and publish - notifications will appear automatically!</li>
                  </ol>
                </div>
              </CardContent>
            </Card>
          )}
          
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>Edit notification configuration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Basic Settings */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold">Basic Settings</h3>
                <div className="space-y-2">
                  <Label htmlFor="campaign-name">Notification Name</Label>
                  <Input
                    id="campaign-name"
                    value={settingsForm.name}
                    onChange={(e) => setSettingsForm({ ...settingsForm, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="campaign-status">Status</Label>
                  <Select
                    value={settingsForm.status}
                    onValueChange={(value) => setSettingsForm({ ...settingsForm, status: value })}
                  >
                    <SelectTrigger id="campaign-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="paused">Paused</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Display Settings */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold">Display Settings</h3>
                <div className="space-y-2">
                  <Label htmlFor="position">Position</Label>
                  <Select
                    value={settingsForm.position}
                    onValueChange={(value) => setSettingsForm({ ...settingsForm, position: value })}
                  >
                    <SelectTrigger id="position">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bottom-left">Bottom Left</SelectItem>
                      <SelectItem value="bottom-right">Bottom Right</SelectItem>
                      <SelectItem value="bottom-center">Bottom Center</SelectItem>
                      <SelectItem value="top-left">Top Left</SelectItem>
                      <SelectItem value="top-right">Top Right</SelectItem>
                      <SelectItem value="top-center">Top Center</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="animation">Animation</Label>
                  <Select
                    value={settingsForm.animation}
                    onValueChange={(value) => setSettingsForm({ ...settingsForm, animation: value })}
                  >
                    <SelectTrigger id="animation">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="slide">Slide</SelectItem>
                      <SelectItem value="fade">Fade</SelectItem>
                      <SelectItem value="bounce">Bounce</SelectItem>
                      <SelectItem value="pulse">Pulse</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Advanced Settings */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold">Advanced Settings</h3>
                <div className="space-y-2">
                  <Label htmlFor="show-duration">Display Duration (ms)</Label>
                  <Input
                    id="show-duration"
                    type="number"
                    value={settingsForm.showDuration}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, showDuration: parseInt(e.target.value) })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="interval">Interval Between Notifications (ms)</Label>
                  <Input
                    id="interval"
                    type="number"
                    value={settingsForm.intervalMs}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, intervalMs: parseInt(e.target.value) })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max-session">Max Per Session</Label>
                  <Input
                    id="max-session"
                    type="number"
                    value={settingsForm.maxPerSession}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, maxPerSession: parseInt(e.target.value) })
                    }
                  />
                </div>
              </div>

              <Button onClick={handleSaveSettings} className="w-full">
                Save Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {isAnnouncementCampaign ? (
        <Dialog open={editMode} onOpenChange={(open) => {
          if (!open) {
            setEditMode(false);
            setEditingConfig(null);
          }
        }}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Announcement</DialogTitle>
              <CardDescription>Make changes to your announcement configuration</CardDescription>
            </DialogHeader>
            <AnnouncementConfig
              config={editingConfig || campaign.native_config || campaign.integration_settings || {}}
              onChange={(newConfig) => {
                setEditingConfig(newConfig);
              }}
              selectedTemplate={campaignTemplate}
              showSaveButton={true}
              onSave={async () => {
                try {
                  const { error } = await supabase
                    .from('campaigns')
                    .update({ 
                      native_config: editingConfig,
                      integration_settings: editingConfig,
                      updated_at: new Date().toISOString()
                    })
                    .eq('id', id);
                  
                  if (error) throw error;
                  
                  // Also update widget style_config with content_alignment
                  if (widgets.length > 0) {
                    for (const widget of widgets) {
                      const { data: widgetData } = await supabase
                        .from('widgets')
                        .select('style_config')
                        .eq('id', widget.id)
                        .single();
                      
                      const existingConfig = (widgetData?.style_config as Record<string, unknown>) || {};
                      await supabase
                        .from('widgets')
                        .update({
                          style_config: {
                            ...existingConfig,
                            contentAlignment: editingConfig?.content_alignment || 'top',
                          },
                        })
                        .eq('id', widget.id);
                    }
                  }
                  
                  toast.success('Announcement updated successfully');
                  setEditMode(false);
                  setEditingConfig(null);
                  fetchCampaign();
                } catch (error) {
                  console.error('Error updating announcement:', error);
                  toast.error('Failed to update announcement');
                }
              }}
            />
          </DialogContent>
        </Dialog>
      ) : isFormCaptureCampaign ? (
        <FormCaptureEditor
          campaignId={id!}
          websiteId={campaign.website_id}
          open={editMode}
          onClose={() => setEditMode(false)}
          onSave={() => {
            setEditMode(false);
            fetchCampaign();
          }}
          integrationSettings={campaign.integration_settings || campaign.native_config || {}}
        />
      ) : isTestimonialCampaign ? (
        <TestimonialCampaignEditor
          campaignId={id!}
          websiteId={campaign.website_id}
          open={editMode}
          onClose={() => setEditMode(false)}
          onSave={() => {
            setEditMode(false);
            fetchCampaign();
          }}
          integrationSettings={campaign.integration_settings || campaign.native_config || {}}
        />
      ) : isVisitorsPulseCampaign ? (
        <VisitorsPulseCampaignEditor
          campaignId={id!}
          websiteId={campaign.website_id}
          open={editMode}
          onClose={() => setEditMode(false)}
          onSave={() => {
            setEditMode(false);
            fetchCampaign();
          }}
          integrationSettings={campaign.integration_settings || campaign.native_config || {}}
        />
      ) : isWooCommerceCampaign ? (
        <WooCommerceCampaignEditor
          campaignId={id!}
          websiteId={campaign.website_id}
          open={editMode}
          onClose={() => setEditMode(false)}
          onSave={() => {
            setEditMode(false);
            fetchCampaign();
          }}
          integrationSettings={campaign.integration_settings || campaign.display_rules || {}}
          templateId={campaign.template_id}
        />
      ) : (
        <CampaignEditor
          campaignId={id!}
          open={editMode}
          onClose={() => setEditMode(false)}
          onSave={() => {
            setEditMode(false);
            fetchCampaign();
          }}
        />
      )}
    </div>
  );
}
