import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const EditCampaign = () => {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'draft',
    start_date: undefined as Date | undefined,
    end_date: undefined as Date | undefined,
    auto_repeat: false,
  });

  const [displayRules, setDisplayRules] = useState({
    show_duration_ms: 5000,
    interval_ms: 8000,
    max_per_page: 5,
    max_per_session: 20,
    url_allowlist: '',
    url_denylist: '',
    referrer_allowlist: '',
    referrer_denylist: '',
    min_time_on_page_ms: 0,
    scroll_depth_pct: 0,
    exit_intent: false,
    enforce_verified_only: false,
    geo_allowlist: '',
    geo_denylist: '',
  });

  useEffect(() => {
    if (id && profile) {
      fetchCampaign();
    }
  }, [id, profile]);

  const fetchCampaign = async () => {
    if (!id || !profile) return;

    try {
      const { data: campaign, error } = await supabase
        .from('campaigns' as any)
        .select('*')
        .eq('id', id)
        .eq('user_id', profile.id)
        .single();

      if (error) throw error;

      if (campaign) {
        setFormData({
          name: (campaign as any).name || '',
          description: (campaign as any).description || '',
          status: (campaign as any).status || 'draft',
          start_date: (campaign as any).start_date ? new Date((campaign as any).start_date) : undefined,
          end_date: (campaign as any).end_date ? new Date((campaign as any).end_date) : undefined,
          auto_repeat: (campaign as any).auto_repeat || false,
        });

        const rules = (campaign as any).display_rules as any || {};
        setDisplayRules({
          show_duration_ms: rules.show_duration_ms || 5000,
          interval_ms: rules.interval_ms || 8000,
          max_per_page: rules.max_per_page || 5,
          max_per_session: rules.max_per_session || 20,
          url_allowlist: Array.isArray(rules.url_allowlist) ? rules.url_allowlist.join(', ') : '',
          url_denylist: Array.isArray(rules.url_denylist) ? rules.url_denylist.join(', ') : '',
          referrer_allowlist: Array.isArray(rules.referrer_allowlist) ? rules.referrer_allowlist.join(', ') : '',
          referrer_denylist: Array.isArray(rules.referrer_denylist) ? rules.referrer_denylist.join(', ') : '',
          min_time_on_page_ms: rules.triggers?.min_time_on_page_ms || 0,
          scroll_depth_pct: rules.triggers?.scroll_depth_pct || 0,
          exit_intent: rules.triggers?.exit_intent || false,
          enforce_verified_only: rules.enforce_verified_only || false,
          geo_allowlist: Array.isArray(rules.geo_allowlist) ? rules.geo_allowlist.join(', ') : '',
          geo_denylist: Array.isArray(rules.geo_denylist) ? rules.geo_denylist.join(', ') : '',
        });
      }
    } catch (error) {
      console.error('Error fetching campaign:', error);
      toast({
        title: "Error",
        description: "Failed to load campaign",
        variant: "destructive",
      });
      navigate('/dashboard/campaigns');
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

      const rules = {
        show_duration_ms: Number(displayRules.show_duration_ms) || 5000,
        interval_ms: Number(displayRules.interval_ms) || 8000,
        max_per_page: Number(displayRules.max_per_page) || 5,
        max_per_session: Number(displayRules.max_per_session) || 20,
        url_allowlist: parseList(displayRules.url_allowlist),
        url_denylist: parseList(displayRules.url_denylist),
        referrer_allowlist: parseList(displayRules.referrer_allowlist),
        referrer_denylist: parseList(displayRules.referrer_denylist),
        triggers: {
          min_time_on_page_ms: Number(displayRules.min_time_on_page_ms) || 0,
          scroll_depth_pct: Number(displayRules.scroll_depth_pct) || 0,
          exit_intent: !!displayRules.exit_intent,
        },
        enforce_verified_only: !!displayRules.enforce_verified_only,
        geo_allowlist: parseList(displayRules.geo_allowlist),
        geo_denylist: parseList(displayRules.geo_denylist),
      };

      const { error } = await supabase
        .from('campaigns' as any)
        .update({
          name: formData.name,
          description: formData.description,
          status: formData.status,
          start_date: formData.start_date?.toISOString(),
          end_date: formData.end_date?.toISOString(),
          auto_repeat: formData.auto_repeat,
          display_rules: rules,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', profile.id);

      if (error) throw error;

      toast({
        title: "Campaign updated",
        description: "Your campaign has been updated successfully!",
      });

      navigate('/dashboard/campaigns');
    } catch (error) {
      console.error('Error updating campaign:', error);
      toast({
        title: "Error",
        description: "Failed to update campaign",
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
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" asChild>
          <Link to="/dashboard/campaigns">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">Edit Campaign</h1>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Campaign Details</CardTitle>
              <CardDescription>
                Update your campaign configuration
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Campaign Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Black Friday Campaign"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe your campaign goals and target audience"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Start Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !formData.start_date && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.start_date ? format(formData.start_date, "PPP") : "Select date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={formData.start_date}
                          onSelect={(date) => setFormData(prev => ({ ...prev, start_date: date }))}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div>
                    <Label>End Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !formData.end_date && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.end_date ? format(formData.end_date, "PPP") : "Select date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={formData.end_date}
                          onSelect={(date) => setFormData(prev => ({ ...prev, end_date: date }))}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-md border p-3">
                  <Label htmlFor="auto_repeat" className="cursor-pointer">
                    Auto-repeat campaign
                  </Label>
                  <Switch
                    id="auto_repeat"
                    checked={formData.auto_repeat}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, auto_repeat: checked }))}
                  />
                </div>

                {/* Display Rules */}
                <div className="space-y-3 border-t pt-4">
                  <h4 className="font-medium">Display Rules</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="show_duration_ms">Show Duration (ms)</Label>
                      <Input
                        id="show_duration_ms"
                        type="number"
                        value={displayRules.show_duration_ms}
                        onChange={(e) => setDisplayRules(prev => ({ ...prev, show_duration_ms: Number(e.target.value) }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="interval_ms">Interval Between (ms)</Label>
                      <Input
                        id="interval_ms"
                        type="number"
                        value={displayRules.interval_ms}
                        onChange={(e) => setDisplayRules(prev => ({ ...prev, interval_ms: Number(e.target.value) }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="max_per_page">Max Per Page</Label>
                      <Input
                        id="max_per_page"
                        type="number"
                        value={displayRules.max_per_page}
                        onChange={(e) => setDisplayRules(prev => ({ ...prev, max_per_page: Number(e.target.value) }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="max_per_session">Max Per Session</Label>
                      <Input
                        id="max_per_session"
                        type="number"
                        value={displayRules.max_per_session}
                        onChange={(e) => setDisplayRules(prev => ({ ...prev, max_per_session: Number(e.target.value) }))}
                      />
                    </div>
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Updating...' : 'Update Campaign'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Campaign Preview</CardTitle>
              <CardDescription>
                Review your campaign configuration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Campaign Name</Label>
                <p className="text-sm text-muted-foreground">{formData.name || 'Not set'}</p>
              </div>
              
              <div>
                <Label className="text-sm font-medium">Schedule</Label>
                <p className="text-sm text-muted-foreground">
                  {formData.start_date ? format(formData.start_date, "PPP") : 'No start date'} 
                  {' - '}
                  {formData.end_date ? format(formData.end_date, "PPP") : 'No end date'}
                </p>
              </div>

              <div>
                <Label className="text-sm font-medium">Display Limits</Label>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>Max {displayRules.max_per_page} notifications per page</p>
                  <p>Max {displayRules.max_per_session} notifications per session</p>
                  <p>Show for {displayRules.show_duration_ms}ms every {displayRules.interval_ms}ms</p>
                </div>
              </div>

              {formData.auto_repeat && (
                <div>
                  <Label className="text-sm font-medium">Auto-repeat</Label>
                  <p className="text-sm text-muted-foreground">✅ Campaign will repeat automatically</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default EditCampaign;