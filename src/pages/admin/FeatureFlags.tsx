import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Flag, AlertTriangle, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

interface FeatureFlag {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  rollout_percentage: number;
  created_at: string;
  updated_at: string;
}

export default function FeatureFlags() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFlags();
  }, []);

  async function loadFlags() {
    try {
      const { data, error } = await supabase
        .from('feature_flags')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFlags(data || []);
    } catch (error) {
      console.error('Error loading flags:', error);
      toast.error('Failed to load feature flags');
    } finally {
      setLoading(false);
    }
  }

  async function updateFlag(id: string, updates: Partial<FeatureFlag>) {
    try {
      const { error } = await supabase
        .from('feature_flags')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      setFlags(flags.map(f => f.id === id ? { ...f, ...updates } : f));
      toast.success('Feature flag updated');
    } catch (error) {
      console.error('Error updating flag:', error);
      toast.error('Failed to update feature flag');
    }
  }

  async function createFlag() {
    try {
      const { data, error } = await supabase
        .from('feature_flags')
        .insert({
          name: 'new_feature',
          description: 'New feature flag',
          enabled: false,
          rollout_percentage: 0,
        })
        .select()
        .single();

      if (error) throw error;
      setFlags([data, ...flags]);
      toast.success('Feature flag created');
    } catch (error) {
      console.error('Error creating flag:', error);
      toast.error('Failed to create feature flag');
    }
  }

  function getRolloutBadge(percentage: number) {
    if (percentage === 0) return <Badge variant="outline">Not Rolled Out</Badge>;
    if (percentage < 25) return <Badge variant="secondary">10% Rollout</Badge>;
    if (percentage < 75) return <Badge variant="default">50% Rollout</Badge>;
    if (percentage < 100) return <Badge className="bg-green-600">90% Rollout</Badge>;
    return <Badge className="bg-blue-600">100% Rollout</Badge>;
  }

  const canonicalSystemFlag = flags.find(f => f.name === 'v2_canonical_system');
  const testimonialSystemFlag = flags.find(f => f.name === 'testimonial_system');

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Feature Flags</h1>
          <p className="text-muted-foreground">
            Phase 12: Gradual rollout control for new features
          </p>
        </div>
        <Button onClick={createFlag}>
          <Flag className="h-4 w-4 mr-2" />
          Create Flag
        </Button>
      </div>

      <Alert>
        <TrendingUp className="h-4 w-4" />
        <AlertDescription>
          Use gradual rollout (10% → 50% → 100%) to safely deploy new features.
          Monitor telemetry and revert if issues arise.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4">
        {/* Critical System Flags */}
        <Card className="border-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Flag className="h-5 w-5 text-primary" />
              Canonical Campaign System
            </CardTitle>
            <CardDescription>
              Master flag for the unified integration and template system
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>System Enabled</Label>
                <div className="text-sm text-muted-foreground">
                  Turn on the canonical campaign system
                </div>
              </div>
              <Switch
                checked={canonicalSystemFlag?.enabled || false}
                onCheckedChange={(checked) =>
                  canonicalSystemFlag && updateFlag(canonicalSystemFlag.id, { enabled: checked })
                }
              />
            </div>

            {canonicalSystemFlag?.enabled && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Rollout Percentage</Label>
                    {getRolloutBadge(canonicalSystemFlag.rollout_percentage)}
                  </div>
                  <Slider
                    value={[canonicalSystemFlag.rollout_percentage]}
                    onValueChange={([value]) =>
                      updateFlag(canonicalSystemFlag.id, { rollout_percentage: value })
                    }
                    max={100}
                    step={10}
                  />
                  <div className="text-xs text-muted-foreground">
                    {canonicalSystemFlag.rollout_percentage}% of users will see the new system
                  </div>
                </div>

                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Gradual Rollout Plan:</strong><br />
                    1. Start at 10% → Monitor for 24h<br />
                    2. Increase to 50% → Monitor for 48h<br />
                    3. Increase to 100% → Full deployment
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-secondary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Flag className="h-5 w-5 text-secondary" />
              Testimonial System
            </CardTitle>
            <CardDescription>
              Testimonial collection, moderation, and display features
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Testimonials Enabled</Label>
                <div className="text-sm text-muted-foreground">
                  Enable testimonial collection and campaigns
                </div>
              </div>
              <Switch
                checked={testimonialSystemFlag?.enabled || false}
                onCheckedChange={(checked) =>
                  testimonialSystemFlag && updateFlag(testimonialSystemFlag.id, { enabled: checked })
                }
              />
            </div>

            {testimonialSystemFlag?.enabled && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Rollout Percentage</Label>
                  {getRolloutBadge(testimonialSystemFlag.rollout_percentage)}
                </div>
                <Slider
                  value={[testimonialSystemFlag.rollout_percentage]}
                  onValueChange={([value]) =>
                    updateFlag(testimonialSystemFlag.id, { rollout_percentage: value })
                  }
                  max={100}
                  step={10}
                />
                <div className="text-xs text-muted-foreground">
                  {testimonialSystemFlag.rollout_percentage}% of users can use testimonials
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Other Flags */}
        {flags.filter(f => !['v2_canonical_system', 'testimonial_system'].includes(f.name)).map((flag) => (
          <Card key={flag.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Flag className="h-4 w-4" />
                    {flag.name}
                  </CardTitle>
                  <CardDescription>{flag.description}</CardDescription>
                </div>
                {getRolloutBadge(flag.rollout_percentage)}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Enabled</Label>
                <Switch
                  checked={flag.enabled}
                  onCheckedChange={(checked) => updateFlag(flag.id, { enabled: checked })}
                />
              </div>

              {flag.enabled && (
                <div className="space-y-2">
                  <Label>Rollout: {flag.rollout_percentage}%</Label>
                  <Slider
                    value={[flag.rollout_percentage]}
                    onValueChange={([value]) => updateFlag(flag.id, { rollout_percentage: value })}
                    max={100}
                    step={10}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
