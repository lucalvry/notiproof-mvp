import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, TrendingUp, Users, Eye } from "lucide-react";
import { useAnalytics } from "@/hooks/useAnalytics";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

export default function Analytics() {
  const [userId, setUserId] = useState<string>();
  const { data: analytics, isLoading } = useAnalytics(userId, 30);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id);
    });
  }, []);

  const stats = [
    { label: "Total Views", value: isLoading ? "..." : analytics?.totalViews.toLocaleString() || "0", icon: Eye },
    { label: "Total Clicks", value: isLoading ? "..." : analytics?.totalClicks.toLocaleString() || "0", icon: Users },
    { label: "Conversion Rate", value: isLoading ? "..." : `${analytics?.conversionRate.toFixed(1) || "0.0"}%`, icon: TrendingUp },
    { label: "Top Campaigns", value: isLoading ? "..." : analytics?.topCampaigns.length.toString() || "0", icon: BarChart3 },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Analytics</h1>
        <p className="text-muted-foreground">
          Detailed insights about your campaigns
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.label}
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

      {/* Campaign Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Campaign Performance</CardTitle>
          <CardDescription>
            View and compare your campaign metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : analytics?.topCampaigns.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No campaign data yet</p>
          ) : (
            <div className="space-y-4">
              {analytics?.topCampaigns.map((campaign) => (
                <div key={campaign.name} className="flex items-center justify-between border-b pb-4 last:border-0">
                  <div className="space-y-1">
                    <p className="font-medium">{campaign.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {campaign.views.toLocaleString()} views • {campaign.clicks.toLocaleString()} clicks
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">{campaign.conversionRate.toFixed(1)}%</p>
                    <p className="text-xs text-muted-foreground">Click rate</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Traffic Sources */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top Pages</CardTitle>
            <CardDescription>Pages with most campaign views</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-8 w-full" />)}
              </div>
            ) : analytics?.topPages.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No page data yet</p>
            ) : (
              <div className="space-y-3">
                {analytics?.topPages.map((page) => (
                  <div key={page.url} className="flex items-center justify-between">
                    <p className="text-sm font-mono truncate flex-1">{page.url}</p>
                    <p className="text-sm font-medium">{page.views.toLocaleString()}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Device Breakdown</CardTitle>
            <CardDescription>Views by device type</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-center py-8">
              Device tracking coming soon
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
