import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Activity } from "lucide-react";

interface EventData {
  eventType: string;
  count: number;
  percentage: number;
}

interface EventInsightsProps {
  events: EventData[];
  isLoading?: boolean;
}

const eventTypeLabels: Record<string, string> = {
  'form_submitted': 'Form Submissions',
  'testimonial_submitted': 'Testimonial Submissions',
  'announcement_displayed': 'Announcement Displays',
  'announcement_clicked': 'Announcement Clicks',
  'notification_displayed': 'Notification Displays',
  'notification_clicked': 'Notification Clicks',
  'widget_displayed': 'Widget Displays',
  'widget_clicked': 'Widget Clicks',
  'purchase': 'Purchases',
  'signup': 'Sign Ups',
  'review': 'Reviews',
  'unknown': 'Other Events',
};

export function EventInsights({ events, isLoading = false }: EventInsightsProps) {
  const getEventLabel = (eventType: string) => {
    return eventTypeLabels[eventType] || eventType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const totalCount = events.reduce((sum, e) => sum + e.count, 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          <CardTitle>Event Insights</CardTitle>
        </div>
        <CardDescription>Distribution of events by type</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex h-[200px] items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : events.length === 0 ? (
          <div className="flex flex-col h-[200px] items-center justify-center gap-2">
            <p className="text-muted-foreground">No events recorded yet</p>
            <p className="text-sm text-muted-foreground">Add the widget to your site to start tracking events</p>
          </div>
        ) : (
          <div className="space-y-4">
            {events.slice(0, 8).map((event) => (
              <div key={event.eventType} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{getEventLabel(event.eventType)}</span>
                  <span className="text-muted-foreground">
                    {event.count.toLocaleString()} ({event.percentage.toFixed(1)}%)
                  </span>
                </div>
                <Progress value={event.percentage} className="h-2" />
              </div>
            ))}
            {events.length > 8 && (
              <p className="text-xs text-muted-foreground text-center pt-2">
                And {events.length - 8} more event types...
              </p>
            )}
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between text-sm font-medium">
                <span>Total Events</span>
                <span>{totalCount.toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
