import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, ExternalLink, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { NotificationTypeSelector } from '@/components/NotificationTypeSelector';
import { FeatureTooltip, HelpTooltip } from '@/components/help/RichTooltip';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { SmartDefaultsInfo, SuggestedIntegrations, getSmartDefaults } from '@/components/SmartDefaults';
import { TemplateSelector } from '@/components/TemplateSelector';
import { EventTemplate } from '@/data/industryTemplates';

const templates = [
  {
    id: 'notification-popup',
    name: 'Notification Popup',
    description: 'Clean popup notification in the bottom corner',
    preview: '🔔 Someone from New York just signed up!'
  },
  {
    id: 'live-activity',
    name: 'Live Activity Bar',
    description: 'Horizontal bar showing recent activity',
    preview: '⚡ 12 people are viewing this page right now'
  },
  {
    id: 'social-proof',
    name: 'Social Proof Badge',
    description: 'Compact badge showing social proof',
    preview: '✅ Trusted by 1,000+ customers'
  },
  {
    id: 'urgency-timer',
    name: 'Urgency Timer',
    description: 'Creates urgency with countdown elements',
    preview: '⏰ Limited offer - 2 hours left!'
  },
  {
    id: 'testimonial-popup',
    name: 'Testimonial Popup',
    description: 'Shows customer testimonials and reviews',
    preview: '⭐ "Amazing product!" - Sarah M.'
  }
];

const CreateWidget = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    template_name: '',
    position: 'bottom-left',
    delay: '3000',
    color: '#3B82F6',
    campaign_id: 'none'
  });

  const [selectedNotificationTypes, setSelectedNotificationTypes] = useState<string[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [marketplaceTemplates, setMarketplaceTemplates] = useState<any[]>([]);
  const [showMarketplace, setShowMarketplace] = useState(false);
  const [selectedEventTemplate, setSelectedEventTemplate] = useState<EventTemplate | null>(null);
  const [showEventTemplates, setShowEventTemplates] = useState(false);

  // Apply smart defaults and fetch data on component mount
  useEffect(() => {
    const fetchData = async () => {
      if (!profile) return;
      
      // Apply smart defaults based on business type
      const smartDefaults = getSmartDefaults(profile.business_type);
      setFormData(prev => ({
        ...prev,
        template_name: smartDefaults.defaultTemplate,
        position: smartDefaults.suggestedPosition,
        delay: smartDefaults.defaultDelay.toString(),
        color: smartDefaults.defaultColor
      }));
      
      setDisplayRules(prev => ({
        ...prev,
        ...smartDefaults.displayRules
      }));
      
      // Fetch campaigns
      const { data: campaignsData } = await supabase
        .from('campaigns' as any)
        .select('id, name, status')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });
      setCampaigns(campaignsData || []);
      
      // Fetch marketplace templates
      const { data: templatesData } = await (supabase as any)
        .from('widget_templates')
        .select(`
          id,
          name,
          description,
          template_name,
          style_config,
          display_rules,
          preview_image,
          downloads_count,
          creator:profiles(name)
        `)
        .eq('is_public', true)
        .order('is_featured', { ascending: false })
        .limit(20);
      setMarketplaceTemplates(templatesData || []);
    };
    fetchData();
  }, [profile]);

const [displayRules, setDisplayRules] = useState({
  show_duration_ms: 5000,
  interval_ms: 8000,
  max_per_page: 5,
  max_per_session: 20,
  triggers: {
    min_time_on_page_ms: 0,
    scroll_depth_pct: 0,
    exit_intent: false,
  },
  enforce_verified_only: false,
  url_allowlist: '',
  url_denylist: '',
  referrer_allowlist: '',
  referrer_denylist: '',
  geo_allowlist: '',
  geo_denylist: '',
});

const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setLoading(true);
    try {
const parseList = (s: string) => s.split(',').map(t => t.trim()).filter(Boolean);

const rules: any = {
  show_duration_ms: Number(displayRules.show_duration_ms) || 5000,
  interval_ms: Number(displayRules.interval_ms) || 8000,
  max_per_page: Number(displayRules.max_per_page) || 5,
  max_per_session: Number(displayRules.max_per_session) || 20,
  triggers: {
    min_time_on_page_ms: Number(displayRules.triggers.min_time_on_page_ms) || 0,
    scroll_depth_pct: Number(displayRules.triggers.scroll_depth_pct) || 0,
    exit_intent: !!displayRules.triggers.exit_intent,
  },
  enforce_verified_only: !!displayRules.enforce_verified_only,
  url_allowlist: parseList(displayRules.url_allowlist),
  url_denylist: parseList(displayRules.url_denylist),
  referrer_allowlist: parseList(displayRules.referrer_allowlist),
  referrer_denylist: parseList(displayRules.referrer_denylist),
  geo_allowlist: parseList(displayRules.geo_allowlist),
  geo_denylist: parseList(displayRules.geo_denylist),
};

const { data, error } = await supabase
  .from('widgets')
  .insert({
    user_id: profile.id,
    name: formData.name,
    template_name: formData.template_name,
    campaign_id: formData.campaign_id === 'none' ? null : formData.campaign_id,
    style_config: {
      position: formData.position,
      delay: parseInt(formData.delay),
      color: formData.color
    },
    display_rules: rules as any,
  } as any)
  .select()
  .single();

      if (error) throw error;

      toast({
        title: "Widget created",
        description: "Your widget has been created successfully!",
      });

      navigate('/dashboard/widgets');
    } catch (error) {
      console.error('Error creating widget:', error);
      toast({
        title: "Error",
        description: "Failed to create widget",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" asChild>
          <Link to="/dashboard/widgets">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">Create Widget</h1>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Form */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Widget Configuration</CardTitle>
              <CardDescription>
                Set up your social proof widget
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Widget Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Homepage Social Proof"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="campaign_id">Campaign (Optional)</Label>
                  <Select 
                    value={formData.campaign_id} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, campaign_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a campaign" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Campaign</SelectItem>
                      {campaigns.map((campaign) => (
                        <SelectItem key={campaign.id} value={campaign.id}>
                          {campaign.name} ({campaign.status})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Assign this widget to a campaign for coordinated display rules
                  </p>
                </div>

                <div>
                  <Label>Notification Types</Label>
                  <NotificationTypeSelector
                    selectedTypes={selectedNotificationTypes}
                    onSelectionChange={setSelectedNotificationTypes}
                    maxSelections={3}
                  />
                </div>

                {/* Industry-Specific Event Templates */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      <FeatureTooltip
                        feature="Industry Event Templates"
                        description="Pre-built event templates tailored to your industry"
                        examples={[
                          "E-commerce: Purchase completed, cart abandonment, product views",
                          "SaaS: User signups, plan upgrades, feature usage",
                          "Services: Bookings, consultations, quote requests"
                        ]}
                      >
                        <Label>Event Templates</Label>
                      </FeatureTooltip>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowEventTemplates(!showEventTemplates)}
                    >
                      {showEventTemplates ? "Hide Templates" : "Browse Templates"}
                    </Button>
                  </div>

                  {selectedEventTemplate && (
                    <div className="mb-4 p-4 bg-muted rounded-lg border">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-lg">{selectedEventTemplate.businessContext.icon}</span>
                          <span className="font-medium">{selectedEventTemplate.name}</span>
                          <Badge variant="secondary" className="text-xs">
                            {selectedEventTemplate.category}
                          </Badge>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedEventTemplate(null)}
                        >
                          Remove
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {selectedEventTemplate.description}
                      </p>
                      <div className="bg-background p-3 rounded border">
                        <code className="text-xs text-muted-foreground">
                          Template: {selectedEventTemplate.messageTemplate}
                        </code>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {selectedEventTemplate.placeholders.map((placeholder) => (
                          <Badge key={placeholder} variant="outline" className="text-xs">
                            {placeholder}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {showEventTemplates && (
                    <div className="border rounded-lg p-4 max-h-96 overflow-y-auto">
                      <TemplateSelector
                        selectedTemplate={selectedEventTemplate || undefined}
                        onTemplateSelect={(template) => {
                          setSelectedEventTemplate(template);
                          setShowEventTemplates(false);
                          toast({
                            title: "Template selected!",
                            description: `${template.name} template will be used for your widget events.`,
                          });
                        }}
                        businessType={profile?.business_type}
                      />
                    </div>
                  )}
                </div>

                 <div data-tour="widget-templates">
                   <div className="flex items-center justify-between">
                     <FeatureTooltip
                       feature="Widget Templates"
                       description="Choose from proven notification templates optimized for conversions"
                       examples={[
                         "Notification Popup: Shows real-time activities like signups",
                         "Live Activity Bar: Displays visitor count and page views", 
                         "Social Proof Badge: Highlights customer testimonials"
                       ]}
                     >
                       <Label>Template</Label>
                     </FeatureTooltip>
                     <Dialog open={showMarketplace} onOpenChange={setShowMarketplace}>
                       <DialogTrigger asChild>
                         <Button variant="outline" size="sm">
                           <ExternalLink className="h-4 w-4 mr-2" />
                           Browse Templates
                         </Button>
                       </DialogTrigger>
                        <DialogContent className="sm:max-w-[800px] max-h-[600px] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Choose from Marketplace</DialogTitle>
                            <DialogDescription>
                              Select from community-created templates to get started quickly
                            </DialogDescription>
                          </DialogHeader>
                          <div className="grid gap-4">
                            {marketplaceTemplates.length > 0 ? marketplaceTemplates.map((template) => (
                              <div
                                key={template.id}
                                className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors"
                              >
                                <div className="flex-1">
                                  <h4 className="font-medium">{template.name}</h4>
                                  <p className="text-sm text-muted-foreground">
                                    {template.description}
                                  </p>
                                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                    <span>📊 {template.downloads_count || 0} downloads</span>
                                    <span>⭐ Template by community</span>
                                  </div>
                                </div>
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    setFormData(prev => ({
                                      ...prev,
                                      template_name: template.template_name || template.name.toLowerCase().replace(/\s+/g, '-'),
                                      name: prev.name || `${template.name} Widget`,
                                      color: template.style_config?.color || prev.color
                                    }));
                                    if (template.style_config) {
                                      // Copy over template configuration
                                      const templateConfig = template.style_config;
                                      if (templateConfig.position) {
                                        setFormData(prev => ({ ...prev, position: templateConfig.position }));
                                      }
                                    }
                                    setShowMarketplace(false);
                                    toast({
                                      title: "Template applied!",
                                      description: `${template.name} template has been applied to your widget.`,
                                    });
                                  }}
                                >
                                  Use Template
                                </Button>
                              </div>
                            )) : (
                              <div className="text-center py-8 text-muted-foreground">
                                <p>No marketplace templates available yet.</p>
                                <p className="text-sm mt-1">Check back soon for community templates!</p>
                              </div>
                            )}
                          </div>
                        </DialogContent>
                     </Dialog>
                   </div>
                   <div className="grid gap-3 mt-2">
                     {templates.map((template) => (
                       <div
                         key={template.id}
                         className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                           formData.template_name === template.id
                             ? 'border-primary bg-primary/5'
                             : 'border-border hover:border-primary/50'
                         }`}
                         onClick={() => setFormData(prev => ({ ...prev, template_name: template.id }))}
                       >
                         <div className="flex justify-between items-start mb-2">
                           <h4 className="font-medium">{template.name}</h4>
                           {formData.template_name === template.id && (
                             <Badge>Selected</Badge>
                           )}
                         </div>
                         <p className="text-sm text-muted-foreground mb-2">
                           {template.description}
                         </p>
                         <div className="text-sm bg-muted p-2 rounded">
                           {template.preview}
                         </div>
                       </div>
                     ))}
                   </div>
                 </div>

                <div className="grid grid-cols-2 gap-4" data-tour="widget-customization">
                  <div>
                    <FeatureTooltip
                      feature="Widget Position"
                      description="Control where your widget appears on your website"
                      examples={[
                        "Bottom Right: Most common, non-intrusive",
                        "Bottom Left: Good for right-to-left languages",
                        "Top positions: More attention-grabbing"
                      ]}
                    >
                      <Label htmlFor="position">Position</Label>
                    </FeatureTooltip>
                    <Select 
                      value={formData.position} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, position: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bottom-left">Bottom Left</SelectItem>
                        <SelectItem value="bottom-right">Bottom Right</SelectItem>
                        <SelectItem value="top-left">Top Left</SelectItem>
                        <SelectItem value="top-right">Top Right</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <FeatureTooltip
                      feature="Display Delay"
                      description="How long to wait before showing the first notification"
                      examples={[
                        "3000ms (3s): Good for immediate engagement",
                        "5000ms (5s): Less intrusive, better user experience",
                        "0ms: Shows immediately (may feel spammy)"
                      ]}
                    >
                      <Label htmlFor="delay">Delay (ms)</Label>
                    </FeatureTooltip>
                    <Input
                      id="delay"
                      type="number"
                      value={formData.delay}
                      onChange={(e) => setFormData(prev => ({ ...prev, delay: e.target.value }))}
                      min="0"
                      step="500"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="color">Primary Color</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      id="color"
                      type="color"
                      value={formData.color}
                      onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                      className="w-16 h-10"
                    />
                    <Input
                      value={formData.color}
                      onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                      placeholder="#3B82F6"
                      className="flex-1"
                    />
                  </div>
                </div>

                {/* Display Rules */}
                <div className="space-y-3 border-t pt-4">
                  <h4 className="font-medium">Display Rules</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="show_duration_ms">Show Duration (ms)</Label>
                      <Input id="show_duration_ms" type="number" value={displayRules.show_duration_ms}
                        onChange={(e) => setDisplayRules(prev => ({ ...prev, show_duration_ms: Number(e.target.value) }))} />
                    </div>
                    <div>
                      <Label htmlFor="interval_ms">Interval Between (ms)</Label>
                      <Input id="interval_ms" type="number" value={displayRules.interval_ms}
                        onChange={(e) => setDisplayRules(prev => ({ ...prev, interval_ms: Number(e.target.value) }))} />
                    </div>
                    <div>
                      <Label htmlFor="max_per_page">Max Per Page</Label>
                      <Input id="max_per_page" type="number" value={displayRules.max_per_page}
                        onChange={(e) => setDisplayRules(prev => ({ ...prev, max_per_page: Number(e.target.value) }))} />
                    </div>
                    <div>
                      <Label htmlFor="max_per_session">Max Per Session</Label>
                      <Input id="max_per_session" type="number" value={displayRules.max_per_session}
                        onChange={(e) => setDisplayRules(prev => ({ ...prev, max_per_session: Number(e.target.value) }))} />
                    </div>
                    <div>
                      <Label htmlFor="min_time_on_page_ms">Min Time on Page (ms)</Label>
                      <Input id="min_time_on_page_ms" type="number" value={displayRules.triggers.min_time_on_page_ms}
                        onChange={(e) => setDisplayRules(prev => ({ ...prev, triggers: { ...prev.triggers, min_time_on_page_ms: Number(e.target.value) } }))} />
                    </div>
                    <div>
                      <Label htmlFor="scroll_depth_pct">Scroll Depth (%)</Label>
                      <Input id="scroll_depth_pct" type="number" value={displayRules.triggers.scroll_depth_pct}
                        onChange={(e) => setDisplayRules(prev => ({ ...prev, triggers: { ...prev.triggers, scroll_depth_pct: Number(e.target.value) } }))} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 items-center">
                    <div className="flex items-center justify-between rounded-md border p-3">
                      <Label className="mr-4">Exit Intent</Label>
                      <Switch checked={displayRules.triggers.exit_intent}
                        onCheckedChange={(v) => setDisplayRules(prev => ({ ...prev, triggers: { ...prev.triggers, exit_intent: v } }))} />
                    </div>
                    <div className="flex items-center justify-between rounded-md border p-3">
                      <Label className="mr-4">Verified Only</Label>
                      <Switch checked={displayRules.enforce_verified_only}
                        onCheckedChange={(v) => setDisplayRules(prev => ({ ...prev, enforce_verified_only: v }))} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>URL Allowlist (comma separated)</Label>
                      <Input value={displayRules.url_allowlist}
                        onChange={(e) => setDisplayRules(prev => ({ ...prev, url_allowlist: e.target.value }))} />
                    </div>
                    <div>
                      <Label>URL Denylist (comma separated)</Label>
                      <Input value={displayRules.url_denylist}
                        onChange={(e) => setDisplayRules(prev => ({ ...prev, url_denylist: e.target.value }))} />
                    </div>
                    <div>
                      <Label>Referrer Allowlist</Label>
                      <Input value={displayRules.referrer_allowlist}
                        onChange={(e) => setDisplayRules(prev => ({ ...prev, referrer_allowlist: e.target.value }))} />
                    </div>
                    <div>
                      <Label>Referrer Denylist</Label>
                      <Input value={displayRules.referrer_denylist}
                        onChange={(e) => setDisplayRules(prev => ({ ...prev, referrer_denylist: e.target.value }))} />
                    </div>
                    <div>
                      <Label>Geo Allowlist (ISO country codes, comma separated)</Label>
                      <Input value={displayRules.geo_allowlist}
                        onChange={(e) => setDisplayRules(prev => ({ ...prev, geo_allowlist: e.target.value.toUpperCase() }))} />
                    </div>
                    <div>
                      <Label>Geo Denylist (ISO country codes, comma separated)</Label>
                      <Input value={displayRules.geo_denylist}
                        onChange={(e) => setDisplayRules(prev => ({ ...prev, geo_denylist: e.target.value.toUpperCase() }))} />
                    </div>
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={loading || !formData.template_name}>
                  {loading ? 'Creating...' : 'Create Widget'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Smart Defaults & Preview */}
        <div className="space-y-6">
          <SmartDefaultsInfo />
          <SuggestedIntegrations />
          <Card data-tour="widget-preview">
            <CardHeader>
              <CardTitle>Preview</CardTitle>
              <CardDescription>
                See how your widget will look
              </CardDescription>
            </CardHeader>
            <CardContent>
              {formData.template_name ? (
                <div className="relative bg-muted rounded-lg p-8 min-h-[300px]">
                  <div 
                    className={`absolute p-4 bg-background border rounded-lg shadow-lg max-w-xs ${
                      formData.position.includes('bottom') ? 'bottom-4' : 'top-4'
                    } ${
                      formData.position.includes('right') ? 'right-4' : 'left-4'
                    }`}
                    style={{ borderLeftColor: formData.color, borderLeftWidth: '4px' }}
                  >
                    <div className="text-sm">
                      {templates.find(t => t.id === formData.template_name)?.preview}
                    </div>
                  </div>
                  <div className="text-center text-muted-foreground">
                    Website Preview
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  Select a template to see preview
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CreateWidget;