import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useAdminMetrics } from "@/hooks/useAdminMetrics";
import { supabase } from "@/integrations/supabase/client";
import { Users, Globe, Megaphone, DollarSign, TrendingUp, AlertTriangle, Eye, MousePointer, Zap, Activity, Percent } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DashboardSkeleton } from "@/components/ui/loading-skeletons";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckoutMetricsWidget } from "@/components/admin/CheckoutMetricsWidget";
import { SubscriptionMetricsWidget } from "@/components/admin/SubscriptionMetricsWidget";
import { TrialExpirationsWidget } from "@/components/admin/TrialExpirationsWidget";
import { EmailAnalyticsWidget } from "@/components/admin/EmailAnalyticsWidget";
import { DateRangeFilter } from "@/components/dashboard/DateRangeFilter";
import { EventsTrendChart } from "@/components/dashboard/EventsTrendChart";

interface Stats {
  totalUsers: number;
  activeWebsites: number;
  activeCampaigns: number;
  monthlyRevenue: number;
}

export default function AdminDashboard() {
  const { loading: authLoading } = useAdminAuth();
  const [dateRange, setDateRange] = useState(14);
  const { data: metrics, isLoading: metricsLoading } = useAdminMetrics(dateRange);
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    activeWebsites: 0,
    activeCampaigns: 0,
    monthlyRevenue: 0,
  });
  const [loading, setLoading] = useState(true);

  const [trends, setTrends] = useState({
    users: "Calculating...",
    websites: "Calculating...",
    campaigns: "Calculating...",
    revenue: "No data",
  });

  useEffect(() => {
    if (!authLoading) {
      fetchStats();
    }
  }, [authLoading]);

  const calculateTrend = async (tableName: string, statusField?: string) => {
    try {
      const now = new Date();
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, now.getDate());

      // Count current month
      let currentQuery: any = supabase
        .from(tableName as any)
        .select("*", { count: "exact", head: true })
        .gte("created_at", lastMonth.toISOString());
      
      if (statusField) {
        currentQuery = currentQuery.eq(statusField, "active");
      }
      
      const { count: currentCount } = await currentQuery;

      // Count previous month
      let previousQuery: any = supabase
        .from(tableName as any)
        .select("*", { count: "exact", head: true })
        .gte("created_at", twoMonthsAgo.toISOString())
        .lt("created_at", lastMonth.toISOString());
      
      if (statusField) {
        previousQuery = previousQuery.eq(statusField, "active");
      }
      
      const { count: previousCount } = await previousQuery;

      if (!previousCount || previousCount === 0) {
        return currentCount && currentCount > 0 ? "+100% from last month" : "No change";
      }
      
      const growth = ((currentCount! - previousCount) / previousCount) * 100;
      const sign = growth >= 0 ? "+" : "";
      return `${sign}${growth.toFixed(1)}% from last month`;
    } catch (error) {
      console.error("Error calculating trend:", error);
      return "N/A";
    }
  };

  const fetchStats = async () => {
    try {
      setLoading(true);
      
      // Fetch total users count
      const { count: usersCount, error: usersError } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      if (usersError) throw usersError;

      // Fetch active websites count
      const { count: websitesCount, error: websitesError } = await supabase
        .from("websites")
        .select("*", { count: "exact", head: true })
        .eq("status", "active");

      if (websitesError) throw websitesError;

      // Fetch active campaigns count
      const { count: campaignsCount, error: campaignsError } = await supabase
        .from("campaigns")
        .select("*", { count: "exact", head: true })
        .eq("status", "active");

      if (campaignsError) throw campaignsError;

      // Calculate MRR from subscriptions
      const { data: subscriptions } = await supabase
        .from("user_subscriptions")
        .select("subscription_plans(price_monthly)")
        .eq("status", "active");

      const monthlyRevenue = subscriptions?.reduce((sum, sub: any) => {
        return sum + (sub.subscription_plans?.price_monthly || 0);
      }, 0) || 0;

      setStats({
        totalUsers: usersCount || 0,
        activeWebsites: websitesCount || 0,
        activeCampaigns: campaignsCount || 0,
        monthlyRevenue,
      });

      // Calculate trends in parallel
      const [userTrend, websiteTrend, campaignTrend] = await Promise.all([
        calculateTrend("profiles"),
        calculateTrend("websites", "status"),
        calculateTrend("campaigns", "status"),
      ]);

      setTrends({
        users: userTrend,
        websites: websiteTrend,
        campaigns: campaignTrend,
        revenue: monthlyRevenue > 0 ? "Active subscriptions" : "No subscriptions",
      });
    } catch (error: any) {
      console.error("Error fetching stats:", error);
      toast.error("Failed to load dashboard stats");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading || metricsLoading) {
    return <DashboardSkeleton />;
  }

  const statCards = [
    {
      title: "Total Users",
      value: stats.totalUsers,
      icon: Users,
      description: "Registered users",
      trend: trends.users,
    },
    {
      title: "Active Websites",
      value: stats.activeWebsites,
      icon: Globe,
      description: "Verified websites",
      trend: trends.websites,
    },
    {
      title: "Active Campaigns",
      value: stats.activeCampaigns,
      icon: Megaphone,
      description: "Running campaigns",
      trend: trends.campaigns,
    },
    {
      title: "Monthly Revenue",
      value: `$${stats.monthlyRevenue.toLocaleString()}`,
      icon: DollarSign,
      description: "Stripe revenue",
      trend: trends.revenue,
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of your NotiProof platform
          </p>
        </div>
        <DateRangeFilter value={dateRange} onChange={setDateRange} />
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stat.description}
                </p>
                <div className="flex items-center gap-1 mt-2">
                  <TrendingUp className="h-3 w-3 text-success" />
                  <span className="text-xs text-success">{stat.trend}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Platform-Wide Metrics with Date Filter */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.platformWide.totalEvents.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Last {dateRange} days
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.platformWide.totalViews.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Last {dateRange} days
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Clicks</CardTitle>
            <MousePointer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.platformWide.totalClicks.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Last {dateRange} days
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">CTR</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.platformWide.ctr.toFixed(2)}%</div>
            <p className="text-xs text-muted-foreground">
              Click-through rate
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Widgets</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.platformWide.activeWidgets}</div>
            <p className="text-xs text-muted-foreground">
              Running campaigns
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Events Trend Chart */}
      <EventsTrendChart
        data={metrics?.trendData ?? []}
        isLoading={metricsLoading}
      />

      {/* Campaign Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Top Campaigns (Platform-Wide)</CardTitle>
          <CardDescription>Highest performing campaigns in the last {dateRange} days</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campaign</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Website</TableHead>
                <TableHead className="text-right">Views</TableHead>
                <TableHead className="text-right">Clicks</TableHead>
                <TableHead className="text-right">CTR</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {metrics?.topPerformers.campaigns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No campaign data for this period
                  </TableCell>
                </TableRow>
              ) : (
                metrics?.topPerformers.campaigns.map((campaign) => (
                  <TableRow key={campaign.id}>
                    <TableCell className="font-medium">{campaign.name}</TableCell>
                    <TableCell className="text-muted-foreground">{campaign.owner_name}</TableCell>
                    <TableCell className="text-muted-foreground">{campaign.website_name}</TableCell>
                    <TableCell className="text-right">{campaign.views.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{campaign.clicks.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{campaign.ctr.toFixed(1)}%</TableCell>
                    <TableCell>
                      <Badge variant={campaign.status === 'active' ? 'default' : 'secondary'}>
                        {campaign.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Subscription Health Metrics */}
      <SubscriptionMetricsWidget />

      {/* Trial Expirations Widget */}
      <TrialExpirationsWidget />

      {/* Phase 4: Checkout Metrics Widget */}
      <CheckoutMetricsWidget />

      {/* Email Analytics */}
      <EmailAnalyticsWidget />

      {/* Alerts Section */}
      <Card>
        <CardHeader>
          <CardTitle>System Alerts</CardTitle>
          <CardDescription>Recent issues and notifications</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-4 rounded-lg border p-4">
              <AlertTriangle className="h-5 w-5 text-warning mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium">No critical alerts</h4>
                <p className="text-sm text-muted-foreground">
                  All systems are running normally
                </p>
              </div>
              <Badge variant="outline">System</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top Performers */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top Performing Widgets</CardTitle>
            <CardDescription>Highest views in the last {dateRange} days</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Widget</TableHead>
                  <TableHead className="text-right">Views</TableHead>
                  <TableHead className="text-right">Clicks</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics?.topPerformers.widgets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      No widget data for this period
                    </TableCell>
                  </TableRow>
                ) : (
                  metrics?.topPerformers.widgets.map((widget) => (
                    <TableRow key={widget.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{widget.name}</div>
                          <div className="text-xs text-muted-foreground">{widget.website_name}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{widget.views.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{widget.clicks.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{widget.clickRate.toFixed(1)}%</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Users</CardTitle>
            <CardDescription>Most active users in the last {dateRange} days</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead className="text-right">Views</TableHead>
                  <TableHead className="text-right">Widgets</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics?.topPerformers.users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                      No user data for this period
                    </TableCell>
                  </TableRow>
                ) : (
                  metrics?.topPerformers.users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{user.name}</div>
                          <div className="text-xs text-muted-foreground">{user.email}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{user.totalViews.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{user.widgetCount}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Integration Health */}
      <Card>
        <CardHeader>
          <CardTitle>Integration Health</CardTitle>
          <CardDescription>
            {metrics?.integrationHealth.activeConnectors} of {metrics?.integrationHealth.totalConnectors} connectors active
          </CardDescription>
        </CardHeader>
        <CardContent>
          {metrics?.integrationHealth.failedSyncs === 0 ? (
            <div className="flex items-start gap-4 rounded-lg border p-4">
              <AlertTriangle className="h-5 w-5 text-success mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium">All integrations healthy</h4>
                <p className="text-sm text-muted-foreground">
                  No sync errors in the last {dateRange} days
                </p>
              </div>
              <Badge variant="outline">System</Badge>
            </div>
          ) : (
            <div className="space-y-2">
              {metrics?.integrationHealth.lastSyncErrors.map((error, i) => (
                <div key={i} className="flex items-start gap-4 rounded-lg border border-destructive/50 p-4">
                  <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium">{error.connector_id} sync failed</h4>
                    <p className="text-sm text-muted-foreground">{error.error_message}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(error.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <Badge variant="destructive">Error</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
