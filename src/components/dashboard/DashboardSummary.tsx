import { Eye, MousePointer, TrendingUp, Bell, CheckCircle, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface DashboardSummaryProps {
  totalViews: number;
  totalClicks: number;
  ctr: number;
  activeNotifications: number;
  widgetInstalled: boolean;
  isLoading: boolean;
  days: number;
}

export function DashboardSummary({
  totalViews,
  totalClicks,
  ctr,
  activeNotifications,
  widgetInstalled,
  isLoading,
  days,
}: DashboardSummaryProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
        {[...Array(5)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-20" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const metrics = [
    {
      title: "Views",
      value: totalViews.toLocaleString(),
      icon: Eye,
      description: `Last ${days} days`,
    },
    {
      title: "Clicks",
      value: totalClicks.toLocaleString(),
      icon: MousePointer,
      description: `Last ${days} days`,
    },
    {
      title: "CTR",
      value: `${ctr.toFixed(1)}%`,
      icon: TrendingUp,
      description: "Click-through rate",
    },
    {
      title: "Active Notifications",
      value: activeNotifications.toString(),
      icon: Bell,
      description: "Currently running",
    },
  ];

  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
      {metrics.map((metric) => {
        const Icon = metric.icon;
        return (
          <Card key={metric.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {metric.title}
              </CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metric.value}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {metric.description}
              </p>
            </CardContent>
          </Card>
        );
      })}

      {/* Widget Status Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Widget Status
          </CardTitle>
          {widgetInstalled ? (
            <CheckCircle className="h-4 w-4 text-green-500" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          )}
        </CardHeader>
        <CardContent>
          <Badge variant={widgetInstalled ? "default" : "secondary"}>
            {widgetInstalled ? "Installed" : "Not Installed"}
          </Badge>
          <p className="text-xs text-muted-foreground mt-2">
            {widgetInstalled ? "Tracking active" : "Install to start tracking"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
