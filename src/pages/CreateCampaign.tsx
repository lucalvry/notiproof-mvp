import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { CalendarIcon, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const CreateCampaign = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    start_date: undefined as Date | undefined,
    end_date: undefined as Date | undefined,
    auto_repeat: false,
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setLoading(true);
    try {
      const parseList = (s: string) => s.split(',').map(t => t.trim()).filter(Boolean);
      const rules = {
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
        .from('campaigns' as any)
        .insert({
          user_id: profile.id,
          name: formData.name,
          description: formData.description,
          start_date: formData.start_date?.toISOString(),
          end_date: formData.end_date?.toISOString(),
          auto_repeat: formData.auto_repeat,
          display_rules: rules,
          status: 'draft'
        });

      if (error) throw error;

      toast({
        title: "Campaign created",
        description: "Your campaign has been created successfully!",
      });

      navigate('/dashboard/campaigns');
    } catch (error) {
      console.error('Error creating campaign:', error);
      toast({
        title: "Error",
        description: "Failed to create campaign",
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
          <Link to="/dashboard/campaigns">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">Create Campaign</h1>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle>Campaign Configuration</CardTitle>
            <CardDescription>
              Set up your campaign schedule and targeting rules
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
                  placeholder="e.g., Black Friday Promotion"
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe the purpose of this campaign..."
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
                        {formData.start_date ? format(formData.start_date, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={formData.start_date}
                        onSelect={(date) => setFormData(prev => ({ ...prev, start_date: date }))}
                        initialFocus
                        className="pointer-events-auto"
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
                        {formData.end_date ? format(formData.end_date, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={formData.end_date}
                        onSelect={(date) => setFormData(prev => ({ ...prev, end_date: date }))}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-md border p-3">
                <Label className="mr-4">Auto-repeat Campaign</Label>
                <Switch
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
                </div>

                <div className="flex items-center justify-between rounded-md border p-3">
                  <Label className="mr-4">Verified Events Only</Label>
                  <Switch checked={displayRules.enforce_verified_only}
                    onCheckedChange={(v) => setDisplayRules(prev => ({ ...prev, enforce_verified_only: v }))} />
                </div>
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? 'Creating...' : 'Create Campaign'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Preview */}
        <Card>
          <CardHeader>
            <CardTitle>Campaign Preview</CardTitle>
            <CardDescription>
              Preview how your campaign will be scheduled
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium mb-2">Schedule</h4>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Start:</span>{' '}
                    {formData.start_date ? format(formData.start_date, "PPP") : 'Not set'}
                  </div>
                  <div>
                    <span className="text-muted-foreground">End:</span>{' '}
                    {formData.end_date ? format(formData.end_date, "PPP") : 'Not set'}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Auto-repeat:</span>{' '}
                    {formData.auto_repeat ? 'Yes' : 'No'}
                  </div>
                </div>
              </div>

              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium mb-2">Display Limits</h4>
                <div className="space-y-2 text-sm">
                  <div>Max per page: {displayRules.max_per_page}</div>
                  <div>Max per session: {displayRules.max_per_session}</div>
                  <div>Show duration: {displayRules.show_duration_ms}ms</div>
                  <div>Interval: {displayRules.interval_ms}ms</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CreateCampaign;