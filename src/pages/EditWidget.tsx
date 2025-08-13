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
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

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
    status: 'active'
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

useEffect(() => {
    if (id && profile) {
      fetchWidget();
    }
  }, [id, profile]);

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
          status: widget.status
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
                See how your updated widget will look
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
                    } ${
                      formData.status === 'inactive' ? 'opacity-50' : ''
                    }`}
                    style={{ borderLeftColor: formData.color, borderLeftWidth: '4px' }}
                  >
                    <div className="text-sm">
                      {templates.find(t => t.id === formData.template_name)?.preview}
                    </div>
                    {formData.status === 'inactive' && (
                      <div className="text-xs text-muted-foreground mt-1">
                        (Widget is inactive)
                      </div>
                    )}
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

        {/* Goals */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Goal Definitions</CardTitle>
              <CardDescription>Track conversions by URL match, custom event, or label</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <Input placeholder="Name" value={newGoal.name} onChange={(e) => setNewGoal({ ...newGoal, name: e.target.value })} />
                  <Select value={newGoal.type} onValueChange={(v) => setNewGoal({ ...newGoal, type: v })}>
                    <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="url_match">URL Match</SelectItem>
                      <SelectItem value="custom_event">Custom Event</SelectItem>
                      <SelectItem value="label">Label</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input placeholder="Pattern (e.g. /checkout)" value={newGoal.pattern} onChange={(e) => setNewGoal({ ...newGoal, pattern: e.target.value })} />
                </div>
                <Button type="button" onClick={async () => {
                  if (!id) return;
                  const { error } = await supabase.from('goals').insert({ widget_id: id, ...newGoal } as any);
                  if (!error) {
                    setNewGoal({ name: '', type: 'url_match', pattern: '' });
                    const { data } = await (supabase.from('goals').select('*').eq('widget_id', id) as any);
                    setGoals(data || []);
                    toast({ title: 'Goal added' });
                  } else {
                    toast({ title: 'Error', description: 'Failed to add goal', variant: 'destructive' });
                  }
                }}>Add Goal</Button>

                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Pattern</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {goals.map((g) => (
                        <TableRow key={g.id}>
                          <TableCell>{g.name}</TableCell>
                          <TableCell><Badge>{g.type}</Badge></TableCell>
                          <TableCell>{g.pattern}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="outline" size="sm" onClick={async () => {
                              const { error } = await supabase.from('goals').delete().eq('id', g.id);
                              if (!error) {
                                setGoals(goals.filter((x) => x.id !== g.id));
                              }
                            }}>Delete</Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {goals.length === 0 && (
                        <TableRow><TableCell colSpan={4} className="text-muted-foreground">No goals yet</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default EditWidget;