import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Info, Clock, Zap, Repeat } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface OrchestrationStepProps {
  priority: number;
  frequencyCap: {
    per_user: number;
    per_session: number;
    cooldown_seconds: number;
  };
  schedule: {
    enabled: boolean;
    start_date: string | null;
    end_date: string | null;
    days_of_week: number[];
    time_ranges: Array<{ start: string; end: string }>;
  };
  onPriorityChange: (priority: number) => void;
  onFrequencyCapChange: (cap: { per_user: number; per_session: number; cooldown_seconds: number }) => void;
  onScheduleChange: (schedule: any) => void;
}

export function OrchestrationStep({
  priority,
  frequencyCap,
  schedule,
  onPriorityChange,
  onFrequencyCapChange,
  onScheduleChange,
}: OrchestrationStepProps) {
  
  const formatCooldownDisplay = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    return `${Math.floor(seconds / 3600)}h`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Campaign Orchestration</h3>
        <p className="text-sm text-muted-foreground">
          Control how and when this campaign displays to visitors
        </p>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          These settings help you balance multiple campaigns and prevent notification fatigue.
        </AlertDescription>
      </Alert>

      {/* Priority */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">Campaign Priority</CardTitle>
          </div>
          <CardDescription>
            Higher priority campaigns are shown first when multiple campaigns are active
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Priority Level: {priority}</Label>
              <span className="text-xs text-muted-foreground">
                {priority >= 80 ? 'Critical' : priority >= 50 ? 'High' : priority >= 30 ? 'Normal' : 'Low'}
              </span>
            </div>
            <Slider
              value={[priority]}
              onValueChange={(values) => onPriorityChange(values[0])}
              min={1}
              max={100}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Low</span>
              <span>Normal</span>
              <span>High</span>
              <span>Critical</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Frequency Capping */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Repeat className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">Frequency Capping</CardTitle>
          </div>
          <CardDescription>
            Limit how often visitors see this campaign
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Max per User (Total)</Label>
            <Input
              type="number"
              min={1}
              max={100}
              value={frequencyCap.per_user}
              onChange={(e) => onFrequencyCapChange({
                ...frequencyCap,
                per_user: parseInt(e.target.value) || 1,
              })}
            />
            <p className="text-xs text-muted-foreground">
              Total times a user can see this notification
            </p>
          </div>

          <div className="space-y-2">
            <Label>Max per Session</Label>
            <Input
              type="number"
              min={1}
              max={20}
              value={frequencyCap.per_session}
              onChange={(e) => onFrequencyCapChange({
                ...frequencyCap,
                per_session: parseInt(e.target.value) || 1,
              })}
            />
            <p className="text-xs text-muted-foreground">
              Times per browser session
            </p>
          </div>

          <div className="space-y-3">
            <Label>Cooldown Period: {formatCooldownDisplay(frequencyCap.cooldown_seconds)}</Label>
            <Slider
              value={[frequencyCap.cooldown_seconds]}
              onValueChange={(values) => onFrequencyCapChange({
                ...frequencyCap,
                cooldown_seconds: values[0],
              })}
              min={60}
              max={3600}
              step={60}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>1m</span>
              <span>30m</span>
              <span>1h</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Minimum time between showing the same notification
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Scheduling */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">Schedule</CardTitle>
          </div>
          <CardDescription>
            Control when this campaign is active
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Enable Scheduling</Label>
              <p className="text-xs text-muted-foreground">
                Set start and end dates
              </p>
            </div>
            <Switch
              checked={schedule.enabled}
              onCheckedChange={(enabled) => onScheduleChange({ ...schedule, enabled })}
            />
          </div>

          {schedule.enabled && (
            <>
              <Separator />
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input
                    type="datetime-local"
                    value={schedule.start_date || ''}
                    onChange={(e) => onScheduleChange({
                      ...schedule,
                      start_date: e.target.value || null,
                    })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>End Date (Optional)</Label>
                  <Input
                    type="datetime-local"
                    value={schedule.end_date || ''}
                    onChange={(e) => onScheduleChange({
                      ...schedule,
                      end_date: e.target.value || null,
                    })}
                  />
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <div className="bg-muted/50 rounded-lg p-4">
        <p className="text-xs text-muted-foreground">
          💡 <strong>Best Practice:</strong> Start with conservative frequency caps (1-2 per user) and 
          adjust based on conversion data. High-priority campaigns will be shown first in playlists.
        </p>
      </div>
    </div>
  );
}
