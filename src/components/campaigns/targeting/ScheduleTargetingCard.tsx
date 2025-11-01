import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Clock, Plus, X } from "lucide-react";
import { DAY_NAMES, TIMEZONE_OPTIONS } from "@/types/targeting";
import { Badge } from "@/components/ui/badge";

interface ScheduleTargetingCardProps {
  schedule: {
    timezone: string;
    active_days: number[];
    active_hours: { start: string; end: string }[];
  };
  onChange: (schedule: any) => void;
}

export function ScheduleTargetingCard({ schedule, onChange }: ScheduleTargetingCardProps) {
  const updateSchedule = (updates: Partial<typeof schedule>) => {
    onChange({ ...schedule, ...updates });
  };

  const toggleDay = (day: number) => {
    const days = schedule.active_days.includes(day)
      ? schedule.active_days.filter((d) => d !== day)
      : [...schedule.active_days, day].sort((a, b) => a - b);
    updateSchedule({ active_days: days });
  };

  const addTimeRange = () => {
    updateSchedule({
      active_hours: [...schedule.active_hours, { start: '09:00', end: '17:00' }],
    });
  };

  const removeTimeRange = (index: number) => {
    updateSchedule({
      active_hours: schedule.active_hours.filter((_, i) => i !== index),
    });
  };

  const updateTimeRange = (index: number, field: 'start' | 'end', value: string) => {
    const updated = [...schedule.active_hours];
    updated[index] = { ...updated[index], [field]: value };
    updateSchedule({ active_hours: updated });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          <CardTitle>Schedule Targeting</CardTitle>
        </div>
        <CardDescription>
          Control when campaigns are active
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Timezone</Label>
          <Select
            value={schedule.timezone}
            onValueChange={(value) => updateSchedule({ timezone: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIMEZONE_OPTIONS.map((tz) => (
                <SelectItem key={tz.value} value={tz.value}>
                  {tz.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Active Days</Label>
          <div className="grid grid-cols-2 gap-2">
            {DAY_NAMES.map((day, index) => (
              <div
                key={index}
                className="flex items-center gap-2 rounded-lg border p-2 hover:bg-muted/50 transition-colors"
              >
                <Checkbox
                  id={`day-${index}`}
                  checked={schedule.active_days.includes(index)}
                  onCheckedChange={() => toggleDay(index)}
                />
                <Label htmlFor={`day-${index}`} className="cursor-pointer flex-1">
                  {day}
                </Label>
              </div>
            ))}
          </div>
          {schedule.active_days.length === 0 && (
            <p className="text-xs text-destructive">
              At least one day must be selected
            </p>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Active Hours</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addTimeRange}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Time Range
            </Button>
          </div>
          {schedule.active_hours.length === 0 && (
            <p className="text-xs text-muted-foreground">
              No time restrictions (active 24/7)
            </p>
          )}
          {schedule.active_hours.map((range, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                type="time"
                value={range.start}
                onChange={(e) => updateTimeRange(index, 'start', e.target.value)}
                className="flex-1"
              />
              <span className="text-muted-foreground">to</span>
              <Input
                type="time"
                value={range.end}
                onChange={(e) => updateTimeRange(index, 'end', e.target.value)}
                className="flex-1"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeTimeRange(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        {schedule.active_hours.length > 0 && (
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-xs font-medium mb-1">Preview:</p>
            <p className="text-xs text-muted-foreground">
              Campaign will be active on {schedule.active_days.map(d => DAY_NAMES[d]).join(', ')}{' '}
              during{' '}
              {schedule.active_hours.map(r => `${r.start}-${r.end}`).join(', ')}{' '}
              ({schedule.timezone})
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
