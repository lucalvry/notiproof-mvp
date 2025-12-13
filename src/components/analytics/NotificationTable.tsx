import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";

interface Notification {
  id: string;
  name: string;
  type: string;
  views: number;
  clicks: number;
  ctr: number;
  status: string;
  lastActive: string | null;
}

interface NotificationTableProps {
  notifications: Notification[];
  isLoading?: boolean;
}

type SortField = 'name' | 'type' | 'views' | 'clicks' | 'ctr' | 'status' | 'lastActive';
type SortDirection = 'asc' | 'desc';

export function NotificationTable({ notifications, isLoading = false }: NotificationTableProps) {
  const [sortField, setSortField] = useState<SortField>('views');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedNotifications = [...notifications].sort((a, b) => {
    const multiplier = sortDirection === 'asc' ? 1 : -1;
    if (sortField === 'name' || sortField === 'type' || sortField === 'status') {
      return multiplier * (a[sortField] || '').localeCompare(b[sortField] || '');
    }
    if (sortField === 'lastActive') {
      const aDate = a.lastActive ? new Date(a.lastActive).getTime() : 0;
      const bDate = b.lastActive ? new Date(b.lastActive).getTime() : 0;
      return multiplier * (aDate - bDate);
    }
    return multiplier * ((a[sortField] as number) - (b[sortField] as number));
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-500">Active</Badge>;
      case 'paused':
        return <Badge variant="secondary">Paused</Badge>;
      case 'draft':
        return <Badge variant="outline">Draft</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    const typeLabels: Record<string, string> = {
      'announcement': 'Announcement',
      'form_capture': 'Form Capture',
      'testimonial': 'Testimonial',
      'notification': 'Notification',
      'social_proof': 'Social Proof',
    };
    return <Badge variant="outline" className="capitalize">{typeLabels[type] || type}</Badge>;
  };

  const SortButton = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => handleSort(field)}
      className="flex items-center gap-1 -ml-3"
    >
      {children}
      <ArrowUpDown className="h-3 w-3" />
    </Button>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification Breakdown</CardTitle>
        <CardDescription>Performance comparison across all notifications</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex h-[200px] items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col h-[200px] items-center justify-center gap-2">
            <p className="text-muted-foreground">No notifications yet</p>
            <p className="text-sm text-muted-foreground">Create your first notification to start tracking performance</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead><SortButton field="name">Notification</SortButton></TableHead>
                  <TableHead><SortButton field="type">Type</SortButton></TableHead>
                  <TableHead className="text-right"><SortButton field="views">Views</SortButton></TableHead>
                  <TableHead className="text-right"><SortButton field="clicks">Clicks</SortButton></TableHead>
                  <TableHead className="text-right"><SortButton field="ctr">CTR</SortButton></TableHead>
                  <TableHead><SortButton field="status">Status</SortButton></TableHead>
                  <TableHead><SortButton field="lastActive">Last Active</SortButton></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedNotifications.map((notification) => (
                  <TableRow key={notification.id}>
                    <TableCell className="font-medium">{notification.name}</TableCell>
                    <TableCell>{getTypeBadge(notification.type)}</TableCell>
                    <TableCell className="text-right">{notification.views.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{notification.clicks.toLocaleString()}</TableCell>
                    <TableCell className="text-right font-semibold">{notification.ctr.toFixed(2)}%</TableCell>
                    <TableCell>{getStatusBadge(notification.status)}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {notification.lastActive 
                        ? formatDistanceToNow(new Date(notification.lastActive), { addSuffix: true })
                        : 'Never'
                      }
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
