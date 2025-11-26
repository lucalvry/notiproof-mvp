import { useState, useEffect } from "react";
import { useWebsiteContext } from "@/contexts/WebsiteContext";
import { useNotificationWeights, DEFAULT_WEIGHTS, NotificationWeight } from "@/hooks/useNotificationWeights";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { RotateCcw, Save, TrendingUp, Package, MessageSquare, UserPlus, Megaphone, Users } from "lucide-react";
import { toast } from "sonner";

const EVENT_TYPE_CONFIG = {
  purchase: {
    label: 'Purchases',
    icon: Package,
    description: 'Recent purchase notifications',
    color: 'text-green-600'
  },
  testimonial: {
    label: 'Testimonials',
    icon: MessageSquare,
    description: 'Customer reviews and testimonials',
    color: 'text-blue-600'
  },
  signup: {
    label: 'Sign Ups',
    icon: UserPlus,
    description: 'New user registrations',
    color: 'text-purple-600'
  },
  announcement: {
    label: 'Announcements',
    icon: Megaphone,
    description: 'Important updates and news',
    color: 'text-orange-600'
  },
  live_visitors: {
    label: 'Live Visitors',
    icon: Users,
    description: 'Active visitors on your site',
    color: 'text-pink-600'
  }
};

export default function NotificationWeights() {
  const { currentWebsite } = useWebsiteContext();
  const { weights, loading, saving, saveAllWeights, resetToDefaults } = useNotificationWeights(currentWebsite?.id);
  const [localWeights, setLocalWeights] = useState<NotificationWeight[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (weights.length > 0) {
      setLocalWeights(weights);
      setHasChanges(false);
    }
  }, [weights]);

  if (!currentWebsite) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Please select a website to manage notification weights</p>
        </div>
      </div>
    );
  }

  const handleWeightChange = (eventType: string, field: 'weight' | 'max_per_queue' | 'ttl_days', value: number) => {
    setLocalWeights(prev => prev.map(w =>
      w.event_type === eventType
        ? { ...w, [field]: value }
        : w
    ));
    setHasChanges(true);
  };

  const handleSave = async () => {
    const result = await saveAllWeights(localWeights);
    if (result.success) {
      setHasChanges(false);
    }
  };

  const handleReset = async () => {
    const result = await resetToDefaults();
    if (result.success) {
      setHasChanges(false);
    }
  };

  const calculateDistribution = () => {
    const totalWeight = localWeights.reduce((sum, w) => sum + w.weight, 0);
    return localWeights.map(w => ({
      event_type: w.event_type,
      percentage: totalWeight > 0 ? Math.round((w.weight / totalWeight) * 100) : 0
    }));
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Loading notification weights...</p>
      </div>
    );
  }

  const distribution = calculateDistribution();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notification Weights</h1>
          <p className="text-muted-foreground mt-2">
            Configure how often each notification type appears on your website
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={saving}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset to Defaults
          </Button>
          <Button
            onClick={handleSave}
            disabled={!hasChanges || saving}
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Expected Distribution
          </CardTitle>
          <CardDescription>
            Preview how your notifications will be distributed based on current weights
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {distribution.map(d => {
              const config = EVENT_TYPE_CONFIG[d.event_type as keyof typeof EVENT_TYPE_CONFIG];
              return (
                <Badge key={d.event_type} variant="secondary" className="px-3 py-2">
                  {config?.label}: {d.percentage}%
                </Badge>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6">
        {localWeights.map(weight => {
          const config = EVENT_TYPE_CONFIG[weight.event_type as keyof typeof EVENT_TYPE_CONFIG];
          if (!config) return null;
          
          const Icon = config.icon;
          const defaultWeight = DEFAULT_WEIGHTS[weight.event_type];

          return (
            <Card key={weight.event_type}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-muted ${config.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">{config.label}</CardTitle>
                      <CardDescription>{config.description}</CardDescription>
                    </div>
                  </div>
                  <Badge variant="outline">
                    Weight: {weight.weight}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Priority Weight (1-10)</Label>
                      <span className="text-sm text-muted-foreground">
                        Default: {defaultWeight?.weight}
                      </span>
                    </div>
                    <Slider
                      value={[weight.weight]}
                      onValueChange={([value]) => handleWeightChange(weight.event_type, 'weight', value)}
                      min={1}
                      max={10}
                      step={1}
                      className="w-full"
                    />
                    <p className="text-xs text-muted-foreground">
                      Higher weight = appears more often in the notification queue
                    </p>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Max Per Queue</Label>
                        <span className="text-xs text-muted-foreground">
                          Default: {defaultWeight?.max_per_queue}
                        </span>
                      </div>
                      <Input
                        type="number"
                        min={1}
                        max={100}
                        value={weight.max_per_queue}
                        onChange={(e) => handleWeightChange(weight.event_type, 'max_per_queue', parseInt(e.target.value) || 1)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Maximum events of this type in the queue
                      </p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>TTL (Days)</Label>
                        <span className="text-xs text-muted-foreground">
                          Default: {defaultWeight?.ttl_days}
                        </span>
                      </div>
                      <Input
                        type="number"
                        min={1}
                        max={365}
                        value={weight.ttl_days}
                        onChange={(e) => handleWeightChange(weight.event_type, 'ttl_days', parseInt(e.target.value) || 1)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Events older than this are excluded
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {hasChanges && (
        <div className="fixed bottom-6 right-6 bg-card border rounded-lg shadow-lg p-4 flex items-center gap-3">
          <p className="text-sm text-muted-foreground">You have unsaved changes</p>
          <Button onClick={handleSave} disabled={saving} size="sm">
            <Save className="h-4 w-4 mr-2" />
            Save Now
          </Button>
        </div>
      )}
    </div>
  );
}
