import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { NotificationTypeSelector } from '@/components/NotificationTypeSelector';
import { DemoEventManager } from '@/components/DemoEventManager';
import { EventSourcesManager } from '@/components/EventSourcesManager';
import { EnhancedQuickWinManager } from '@/components/EnhancedQuickWinManager';

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

const EditWidget = () => {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    template_name: '',
    position: 'bottom-left',
    delay: '3000',
    color: '#3B82F6',
    status: 'active',
    campaign_id: 'none'
  });

const [displayRules, setDisplayRules] = useState({
  show_duration_ms: 5000,
  interval_ms: 8000,
  max_per_page: 5,
  max_per_session: 20,
  triggers: { min_time_on_page_ms: 0, scroll_depth_pct: 0, exit_intent: false },
  enforce_verified_only: false,
  url_allowlist: '',
  url_denylist: '',
  referrer_allowlist: '',
  referrer_denylist: '',
  geo_allowlist: '',
  geo_denylist: '',
});

const [goals, setGoals] = useState<any[]>([]);
const [loadingGoals, setLoadingGoals] = useState(false);
const [newGoal, setNewGoal] = useState({ name: '', type: 'url_match', pattern: '' });
const [campaigns, setCampaigns] = useState<any[]>([]);
const [selectedNotificationTypes, setSelectedNotificationTypes] = useState<string[]>([]);

useEffect(() => {
    if (id && profile) {
      fetchWidget();
      fetchCampaigns();
    }
  }, [id, profile]);

  const fetchCampaigns = async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('campaigns' as any)
      .select('id, name, status')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false });
    setCampaigns(data || []);
  };

  const fetchWidget = async () => {
    if (!id || !profile) return;

    try {
      const { data: widget, error } = await supabase
        .from('widgets')
        .select('*')
        .eq('id', id)
        .eq('user_id', profile.id)
        .single();

      if (error) throw error;

      if (widget) {
        const styleConfig = widget.style_config as any || {};
        setFormData({
          name: widget.name,
          template_name: widget.template_name,
          position: styleConfig.position || 'bottom-left',
          delay: String(styleConfig.delay || 3000),
          color: styleConfig.color || '#3B82F6',
          status: widget.status,
          campaign_id: (widget as any).campaign_id || 'none'
        });
        const dr = (widget as any).display_rules || {};
        setDisplayRules({
          show_duration_ms: dr.show_duration_ms ?? 5000,
          interval_ms: dr.interval_ms ?? 8000,
          max_per_page: dr.max_per_page ?? 5,
          max_per_session: dr.max_per_session ?? 20,
          triggers: {
            min_time_on_page_ms: dr.triggers?.min_time_on_page_ms ?? 0,
            scroll_depth_pct: dr.triggers?.scroll_depth_pct ?? 0,
            exit_intent: !!(dr.triggers?.exit_intent),
          },
          enforce_verified_only: !!dr.enforce_verified_only,
          url_allowlist: Array.isArray(dr.url_allowlist) ? dr.url_allowlist.join(', ') : '',
          url_denylist: Array.isArray(dr.url_denylist) ? dr.url_denylist.join(', ') : '',
          referrer_allowlist: Array.isArray(dr.referrer_allowlist) ? dr.referrer_allowlist.join(', ') : '',
          referrer_denylist: Array.isArray(dr.referrer_denylist) ? dr.referrer_denylist.join(', ') : '',
          geo_allowlist: Array.isArray(dr.geo_allowlist) ? dr.geo_allowlist.join(', ') : '',
          geo_denylist: Array.isArray(dr.geo_denylist) ? dr.geo_denylist.join(', ') : '',
        });
        setSelectedNotificationTypes((widget as any).notification_types || []);
        
        // Load goals for this widget
        setLoadingGoals(true);
        const { data: goalsData } = await supabase.from('goals').select('*').eq('widget_id', id);
        setGoals(goalsData || []);
        setLoadingGoals(false);
      }
    } catch (error) {
      console.error('Error fetching widget:', error);
      toast({
        title: "Error",
        description: "Failed to load widget",
        variant: "destructive",
      });
      navigate('/dashboard/widgets');
    } finally {
      setFetching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !id) return;

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

const { error } = await supabase
  .from('widgets')
  .update({
    name: formData.name,
    template_name: formData.template_name,
    status: formData.status,
    notification_types: selectedNotificationTypes,
    style_config: {
      position: formData.position,
      delay: parseInt(formData.delay),
      color: formData.color
    },
    display_rules: rules as any,
    updated_at: new Date().toISOString()
  } as any)
  .eq('id', id)
  .eq('user_id', profile.id);

      if (error) throw error;

      toast({
        title: "Widget updated",
        description: "Your widget has been updated successfully!",
      });

      navigate('/dashboard/widgets');
    } catch (error) {
      console.error('Error updating widget:', error);
      toast({
        title: "Error",
        description: "Failed to update widget",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-9 w-9" />
          <Skeleton className="h-9 w-40" />
        </div>
        <div className="grid lg:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-4 w-40" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-80 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" asChild>
          <Link to="/dashboard/widgets">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">Edit Widget</h1>
      </div>

      <Tabs defaultValue="configuration" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="configuration">Configuration</TabsTrigger>
          <TabsTrigger value="event-sources">Event Sources</TabsTrigger>
          <TabsTrigger value="quick-wins">Quick-Wins</TabsTrigger>
          <TabsTrigger value="demo">Demo Mode</TabsTrigger>
        </TabsList>

        <TabsContent value="configuration">
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Form */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Widget Configuration</CardTitle>
                  <CardDescription>
                    Update your social proof widget settings
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
                      <Label htmlFor="status">Status</Label>
                      <Select 
                        value={formData.status} 
                        onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
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
                      <Label>Template</Label>
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

                     <div>
                       <Label>Notification Types</Label>
                       <NotificationTypeSelector
                         selectedTypes={selectedNotificationTypes}
                         onSelectionChange={setSelectedNotificationTypes}
                         maxSelections={3}
                       />
                     </div>
                      <div>
                        <Label htmlFor="position">Position</Label>
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
                        <Label htmlFor="delay">Delay (ms)</Label>
                        <Input
                          id="delay"
                          type="number"
                          value={formData.delay}
                          onChange={(e) => setFormData(prev => ({ ...prev, delay: e.target.value }))}
                          min="0"
                          step="500"
                        />
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
                        {loading ? 'Updating...' : 'Update Widget'}
                      </Button>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* Preview */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Preview</CardTitle>
                  <CardDescription>
                    See how your widget will look
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted/30 p-8 rounded-lg">
                    <div className="max-w-sm mx-auto">
                      <div
                        className="p-4 rounded-lg shadow-lg border"
                        style={{
                          backgroundColor: 'white',
                          borderColor: formData.color,
                          borderWidth: '2px'
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className="w-3 h-3 rounded-full mt-1.5"
                            style={{ backgroundColor: formData.color }}
                          ></div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900 truncate">
                              Someone from New York
                            </div>
                            <div className="text-sm text-gray-600">
                              just made a purchase
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              2 minutes ago
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="event-sources">
          <EventSourcesManager widgetId={id || ''} />
        </TabsContent>

        <TabsContent value="quick-wins">
          <EnhancedQuickWinManager widgetId={id || ''} />
        </TabsContent>

        <TabsContent value="demo">
          <DemoEventManager 
            widgetId={id || ''} 
            notificationTypes={selectedNotificationTypes}
            businessType={profile?.business_type || 'ecommerce'}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EditWidget;