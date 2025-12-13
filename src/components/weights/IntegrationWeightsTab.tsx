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
import { RotateCcw, Save, TrendingUp, Package, MessageSquare, UserPlus, Megaphone, Users, FileInput } from "lucide-react";

const EVENT_TYPE_CONFIG: Record<string, { label: string; icon: any; description: string; color: string }> = {
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
    label: 'Visitors Pulse',
    icon: Users,
    description: 'Active visitors on your site',
    color: 'text-pink-600'
  },
  form_capture: {
    label: 'Form Captures',
    icon: FileInput,
    description: 'Form submission notifications',
    color: 'text-cyan-600'
  }
};

interface IntegrationWeightsTabProps {
  eventType: string;
}

export function IntegrationWeightsTab({ eventType }: IntegrationWeightsTabProps) {
  const { currentWebsite } = useWebsiteContext();
  const { weights, loading, saving, saveAllWeights } = useNotificationWeights(currentWebsite?.id);
  const [localWeight, setLocalWeight] = useState<NotificationWeight | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    const weight = weights.find(w => w.event_type === eventType);
    if (weight) {
      setLocalWeight(weight);
      setHasChanges(false);
    } else if (DEFAULT_WEIGHTS[eventType]) {
      setLocalWeight({
        event_type: eventType,
        ...DEFAULT_WEIGHTS[eventType]
      } as NotificationWeight);
    }
  }, [weights, eventType]);

  if (!currentWebsite) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Please select a website to manage weights</p>
      </div>
    );
  }

  if (loading || !localWeight) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-muted-foreground">Loading weight settings...</p>
      </div>
    );
  }

  const config = EVENT_TYPE_CONFIG[eventType];
  const defaultWeight = DEFAULT_WEIGHTS[eventType];
  const Icon = config?.icon || Package;

  const handleChange = (field: 'weight' | 'max_per_queue' | 'ttl_days', value: number) => {
    setLocalWeight(prev => prev ? { ...prev, [field]: value } : null);
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!localWeight) return;
    
    const updatedWeights = weights.map(w => 
      w.event_type === eventType ? localWeight : w
    );
    
    // If the weight doesn't exist in the array, add it
    if (!weights.find(w => w.event_type === eventType)) {
      updatedWeights.push(localWeight);
    }
    
    const result = await saveAllWeights(updatedWeights);
    if (result.success) {
      setHasChanges(false);
    }
  };

  const handleReset = () => {
    if (defaultWeight) {
      setLocalWeight({
        event_type: eventType,
        ...defaultWeight
      } as NotificationWeight);
      setHasChanges(true);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Queue Priority Settings</h3>
          <p className="text-sm text-muted-foreground">
            Control how often {config?.label || eventType} notifications appear in the queue
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleReset} disabled={saving}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <Button size="sm" onClick={handleSave} disabled={!hasChanges || saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-muted ${config?.color || 'text-primary'}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-xl">{config?.label || eventType}</CardTitle>
                <CardDescription>{config?.description || 'Notification weight settings'}</CardDescription>
              </div>
            </div>
            <Badge variant="outline">Weight: {localWeight.weight}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Priority Weight (1-10)</Label>
                <span className="text-sm text-muted-foreground">
                  Default: {defaultWeight?.weight || 5}
                </span>
              </div>
              <Slider
                value={[localWeight.weight]}
                onValueChange={([value]) => handleChange('weight', value)}
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
                    Default: {defaultWeight?.max_per_queue || 5}
                  </span>
                </div>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={localWeight.max_per_queue}
                  onChange={(e) => handleChange('max_per_queue', parseInt(e.target.value) || 1)}
                />
                <p className="text-xs text-muted-foreground">
                  Maximum events of this type in the queue
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>TTL (Days)</Label>
                  <span className="text-xs text-muted-foreground">
                    Default: {defaultWeight?.ttl_days || 30}
                  </span>
                </div>
                <Input
                  type="number"
                  min={1}
                  max={365}
                  value={localWeight.ttl_days}
                  onChange={(e) => handleChange('ttl_days', parseInt(e.target.value) || 1)}
                />
                <p className="text-xs text-muted-foreground">
                  Events older than this are excluded
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4" />
            How Weights Work
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            <strong>Priority Weight:</strong> Controls how often this notification type appears relative to others. 
            A weight of 10 means this type will appear roughly twice as often as a type with weight 5.
          </p>
          <p>
            <strong>Max Per Queue:</strong> Limits how many of this notification type can be in any single queue. 
            This prevents one type from dominating the display.
          </p>
          <p>
            <strong>TTL (Time to Live):</strong> Events older than this are automatically excluded from queues 
            to keep your notifications fresh and relevant.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
