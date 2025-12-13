import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Megaphone, FileText, Star, Bell, Target, Plus } from "lucide-react";
import { EmptyState } from "./EmptyState";

interface CampaignPerformance {
  id: string;
  name: string;
  type: string;
  status: string;
  views: number;
  clicks: number;
  ctr: number;
}

interface CampaignPerformanceTableProps {
  campaigns: CampaignPerformance[];
  isLoading: boolean;
}

const typeIcons: Record<string, typeof Bell> = {
  announcement: Megaphone,
  form_capture: FileText,
  testimonial: Star,
  notification: Bell,
  native_integration: Target,
};

const typeLabels: Record<string, string> = {
  announcement: "Announcement",
  form_capture: "Form Capture",
  testimonial: "Testimonial",
  notification: "Notification",
  native_integration: "Integration",
};

export function CampaignPerformanceTable({ campaigns, isLoading }: CampaignPerformanceTableProps) {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Notification Performance</CardTitle>
          <CardDescription>How your notifications are performing</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!campaigns || campaigns.length === 0) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Notification Performance</CardTitle>
            <CardDescription>How your notifications are performing</CardDescription>
          </div>
          <Button onClick={() => navigate('/campaigns?openWizard=true')} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Create Notification
          </Button>
        </CardHeader>
        <CardContent>
          <EmptyState
            title="No notifications yet"
            description="Create your first notification to start showing social proof to your visitors"
            icon={Bell}
            action={{
              label: "Create Notification",
              onClick: () => navigate('/campaigns?openWizard=true'),
            }}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Notification Performance</CardTitle>
          <CardDescription>How your notifications are performing</CardDescription>
        </div>
        <Button onClick={() => navigate('/campaigns?openWizard=true')} size="sm" variant="outline">
          <Plus className="h-4 w-4 mr-2" />
          New Notification
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Notification</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Views</TableHead>
              <TableHead className="text-right">Clicks</TableHead>
              <TableHead className="text-right">CTR</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {campaigns.slice(0, 5).map((campaign) => {
              const Icon = typeIcons[campaign.type] || Bell;
              const typeLabel = typeLabels[campaign.type] || campaign.type;

              return (
                <TableRow 
                  key={campaign.id} 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => navigate(`/campaigns/${campaign.id}`)}
                >
                  <TableCell className="font-medium">{campaign.name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">{typeLabel}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">{campaign.views.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{campaign.clicks.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{campaign.ctr.toFixed(1)}%</TableCell>
                  <TableCell>
                    <Badge variant={campaign.status === 'active' ? 'default' : 'secondary'}>
                      {campaign.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        {campaigns.length > 5 && (
          <div className="mt-4 text-center">
            <Button variant="ghost" size="sm" onClick={() => navigate('/campaigns')}>
              View all {campaigns.length} notifications
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
