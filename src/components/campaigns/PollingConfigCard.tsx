import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, Zap } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

interface PollingConfigCardProps {
  value: {
    enabled: boolean;
    interval_minutes: number;
    max_events_per_fetch: number;
  };
  onChange: (config: any) => void;
}

export function PollingConfigCard({ value, onChange }: PollingConfigCardProps) {
  const [userId, setUserId] = useState<string | undefined>();
  
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id));
  }, []);

  const { plan } = useSubscription(userId);

  const pollingLimits = (plan as any)?.polling_limits || {
    min_interval_minutes: 15,
    max_interval_minutes: 60,
    max_events_per_fetch: 10,
    allow_realtime: false,
  };

  const intervalOptions = [
    { value: 1, label: "1 minute (Realtime)", requiresRealtime: true },
    { value: 5, label: "5 minutes" },
    { value: 10, label: "10 minutes" },
    { value: 15, label: "15 minutes" },
    { value: 30, label: "30 minutes" },
    { value: 60, label: "1 hour" },
  ];

  const eventsPerFetchOptions = [5, 10, 25, 50, 100];

  const isIntervalAllowed = (interval: number) => {
    if (interval < pollingLimits.min_interval_minutes) {
      return false;
    }
    if (interval === 1 && !pollingLimits.allow_realtime) {
      return false;
    }
    return interval >= pollingLimits.min_interval_minutes && interval <= pollingLimits.max_interval_minutes;
  };

  const isEventsPerFetchAllowed = (count: number) => {
    return count <= pollingLimits.max_events_per_fetch;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Data Polling Configuration
        </CardTitle>
        <CardDescription>
          Control how often we fetch new data from your integrations and how many events to show
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="polling-enabled">Enable Automatic Polling</Label>
            <p className="text-sm text-muted-foreground">
              Automatically fetch new events at regular intervals
            </p>
          </div>
          <Switch
            id="polling-enabled"
            checked={value.enabled}
            onCheckedChange={(enabled) => onChange({ ...value, enabled })}
          />
        </div>

        {value.enabled && (
          <>
            <div className="space-y-2">
              <Label htmlFor="polling-interval">Polling Interval</Label>
              <Select
                value={value.interval_minutes?.toString()}
                onValueChange={(val) => onChange({ ...value, interval_minutes: parseInt(val) })}
              >
                <SelectTrigger id="polling-interval">
                  <SelectValue placeholder="Select interval" />
                </SelectTrigger>
                <SelectContent>
                  {intervalOptions.map((option) => {
                    const allowed = isIntervalAllowed(option.value);
                    return (
                      <SelectItem
                        key={option.value}
                        value={option.value.toString()}
                        disabled={!allowed}
                      >
                        {option.label}
                        {!allowed && " (Upgrade required)"}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Your plan allows: {pollingLimits.min_interval_minutes}-{pollingLimits.max_interval_minutes} minutes
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="max-events">Max Events Per Fetch</Label>
              <Select
                value={value.max_events_per_fetch?.toString()}
                onValueChange={(val) => onChange({ ...value, max_events_per_fetch: parseInt(val) })}
              >
                <SelectTrigger id="max-events">
                  <SelectValue placeholder="Select max events" />
                </SelectTrigger>
                <SelectContent>
                  {eventsPerFetchOptions.map((count) => {
                    const allowed = isEventsPerFetchAllowed(count);
                    return (
                      <SelectItem
                        key={count}
                        value={count.toString()}
                        disabled={!allowed}
                      >
                        {count} events
                        {!allowed && " (Upgrade required)"}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Your plan allows up to {pollingLimits.max_events_per_fetch} events per fetch
              </p>
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                More frequent polling and higher event counts consume your monthly quota faster.
                {!pollingLimits.allow_realtime && " Upgrade to Pro or Business for realtime (1-minute) updates."}
              </AlertDescription>
            </Alert>
          </>
        )}
      </CardContent>
    </Card>
  );
}
