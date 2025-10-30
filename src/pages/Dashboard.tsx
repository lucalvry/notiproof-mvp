import { TrendingUp, Eye, MousePointer, Zap, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useWidgetStats } from "@/hooks/useWidgetStats";
import { useWebsiteContext } from "@/contexts/WebsiteContext";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSubscription } from "@/hooks/useSubscription";

export default function Dashboard() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string>();
  const { currentWebsite } = useWebsiteContext();
  const { data: stats, isLoading } = useWidgetStats(userId);
  const { subscription, isLoading: subscriptionLoading } = useSubscription(userId);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id);
    });
  }, []);

  // Check subscription status
  const hasActiveSubscription = subscription && ['active', 'trialing'].includes(subscription.status || '');
  const showAccessWarning = !subscriptionLoading && !hasActiveSubscription;

  const statCards = [
    {
      title: "Total Views",
      value: isLoading ? "..." : stats?.totalViews.toLocaleString() || "0",
      icon: Eye,
    },
    {
      title: "Clicks",
      value: isLoading ? "..." : stats?.totalClicks.toLocaleString() || "0",
      icon: MousePointer,
    },
    {
      title: "Active Widgets",
      value: isLoading ? "..." : stats?.activeWidgets.toString() || "0",
      icon: Zap,
    },
    {
      title: "Conversion Rate",
      value: isLoading ? "..." : `${stats?.conversionRate.toFixed(1) || "0.0"}%`,
      icon: TrendingUp,
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          {currentWebsite ? `Overview for ${currentWebsite.domain}` : "Overview of your proof campaigns"}
        </p>
      </div>

      {showAccessWarning && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No Active Subscription</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>You need an active subscription to access the dashboard and create campaigns.</span>
            <Button onClick={() => navigate('/billing')} variant="outline" size="sm">
              View Plans
            </Button>
          </AlertDescription>
        </Alert>
      )}

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
                <p className="text-xs text-muted-foreground">
                  Last 30 days
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
