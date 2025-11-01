import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface EventData {
  eventType: string;
  message: string;
  views: number;
  clicks: number;
  ctr: number;
}

interface TopEventsProps {
  events: EventData[];
  isLoading?: boolean;
}

export function TopEvents({ events, isLoading = false }: TopEventsProps) {
  const getCTRBadge = (ctr: number) => {
    if (ctr >= 10) return { variant: 'default' as const, label: 'Excellent' };
    if (ctr >= 5) return { variant: 'secondary' as const, label: 'Good' };
    if (ctr >= 2) return { variant: 'outline' as const, label: 'Average' };
    return { variant: 'outline' as const, label: 'Low' };
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Performing Events</CardTitle>
        <CardDescription>Events with highest click-through rates</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex h-[300px] items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : events.length === 0 ? (
          <div className="flex h-[300px] items-center justify-center">
            <p className="text-muted-foreground">No event data available</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event Type</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead className="text-right">Views</TableHead>
                  <TableHead className="text-right">Clicks</TableHead>
                  <TableHead className="text-right">CTR</TableHead>
                  <TableHead className="text-right">Performance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((event, index) => {
                  const badge = getCTRBadge(event.ctr);
                  return (
                    <TableRow key={index}>
                      <TableCell className="font-medium capitalize">{event.eventType}</TableCell>
                      <TableCell className="max-w-xs truncate">{event.message}</TableCell>
                      <TableCell className="text-right">{event.views.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{event.clicks.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-semibold">{event.ctr.toFixed(2)}%</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
