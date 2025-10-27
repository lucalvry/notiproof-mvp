import { TrendingUp, Eye, MousePointer, Zap } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useWidgetStats } from "@/hooks/useWidgetStats";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

export default function Dashboard() {
  const [userId, setUserId] = useState<string>();
  const { data: stats, isLoading } = useWidgetStats(userId);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id);
    });
  }, []);

  const statCards = [
    {
      title: "Total Views",
      value: isLoading ? "..." : stats?.totalViews.toLocaleString() || "0",
      change: "+12.5%",
      icon: Eye,
      trend: "up",
    },
    {
      title: "Clicks",
      value: isLoading ? "..." : stats?.totalClicks.toLocaleString() || "0",
      change: "+8.2%",
      icon: MousePointer,
      trend: "up",
    },
    {
      title: "Active Widgets",
      value: isLoading ? "..." : stats?.activeWidgets.toString() || "0",
      change: "+23.1%",
      icon: Zap,
      trend: "up",
    },
    {
      title: "Conversion Rate",
      value: isLoading ? "..." : `${stats?.conversionRate.toFixed(1) || "0.0"}%`,
      change: "+2.4%",
      icon: TrendingUp,
      trend: "up",
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your proof campaigns
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-success">
                  {stat.change} from last period
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts Placeholder */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Your proof notifications in the last 7 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex h-64 items-center justify-center rounded-lg border-2 border-dashed">
              <p className="text-muted-foreground">Chart placeholder</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Top Campaigns</CardTitle>
            <CardDescription>
              Best performing campaigns this month
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex h-64 items-center justify-center rounded-lg border-2 border-dashed">
              <p className="text-muted-foreground">Chart placeholder</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
