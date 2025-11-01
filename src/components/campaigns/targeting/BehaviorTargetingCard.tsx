import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Activity } from "lucide-react";

interface BehaviorTargetingCardProps {
  behavior: {
    min_time_on_page_seconds?: number;
    min_scroll_depth_percent?: number;
    trigger_on_exit_intent?: boolean;
    show_to_returning_visitors?: boolean;
  };
  onChange: (behavior: any) => void;
}

export function BehaviorTargetingCard({ behavior, onChange }: BehaviorTargetingCardProps) {
  const updateBehavior = (updates: Partial<typeof behavior>) => {
    onChange({ ...behavior, ...updates });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          <CardTitle>Behavior Triggers</CardTitle>
        </div>
        <CardDescription>
          Show campaigns based on visitor behavior
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Minimum Time on Page (seconds)</Label>
          <Input
            type="number"
            min="0"
            max="300"
            value={behavior.min_time_on_page_seconds || 0}
            onChange={(e) =>
              updateBehavior({ min_time_on_page_seconds: parseInt(e.target.value) || 0 })
            }
            placeholder="0"
          />
          <p className="text-xs text-muted-foreground">
            Wait this many seconds before showing the campaign (0 = show immediately)
          </p>
        </div>

        <div className="space-y-2">
          <Label>Minimum Scroll Depth (%)</Label>
          <Input
            type="number"
            min="0"
            max="100"
            value={behavior.min_scroll_depth_percent || 0}
            onChange={(e) =>
              updateBehavior({ min_scroll_depth_percent: parseInt(e.target.value) || 0 })
            }
            placeholder="0"
          />
          <p className="text-xs text-muted-foreground">
            Show only after visitor scrolls this percentage of the page (0 = no requirement)
          </p>
        </div>

        <div className="flex items-center justify-between rounded-lg border p-3">
          <div className="space-y-0.5">
            <Label>Exit Intent Trigger</Label>
            <p className="text-xs text-muted-foreground">
              Show when visitor is about to leave the page
            </p>
          </div>
          <Switch
            checked={behavior.trigger_on_exit_intent || false}
            onCheckedChange={(checked) => updateBehavior({ trigger_on_exit_intent: checked })}
          />
        </div>

        <div className="flex items-center justify-between rounded-lg border p-3">
          <div className="space-y-0.5">
            <Label>Show to Returning Visitors</Label>
            <p className="text-xs text-muted-foreground">
              Display to visitors who have been here before
            </p>
          </div>
          <Switch
            checked={behavior.show_to_returning_visitors ?? true}
            onCheckedChange={(checked) => updateBehavior({ show_to_returning_visitors: checked })}
          />
        </div>
      </CardContent>
    </Card>
  );
}
