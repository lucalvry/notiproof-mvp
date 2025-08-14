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
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { NotificationTypeSelector } from '@/components/NotificationTypeSelector';

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

  // Fetch campaigns on component mount
  useEffect(() => {
    const fetchCampaigns = async () => {
      if (!profile) return;
      const { data } = await supabase
        .from('campaigns' as any)
        .select('id, name, status')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });
      setCampaigns(data || []);
    };
    fetchCampaigns();
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

                <div className="grid grid-cols-2 gap-4">
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