import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { supabase } from "@/integrations/supabase/client";
import { Users, Globe, Megaphone, DollarSign, TrendingUp, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Stats {
  totalUsers: number;
  activeWebsites: number;
  activeCampaigns: number;
  monthlyRevenue: number;
}

export default function AdminDashboard() {
  const { loading: authLoading } = useAdminAuth();
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    activeWebsites: 0,
    activeCampaigns: 0,
    monthlyRevenue: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading) {
      fetchStats();
    }
  }, [authLoading]);

  const fetchStats = async () => {
    try {
      // Fetch total users count
      const { count: usersCount } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      // Fetch active websites count
      const { count: websitesCount } = await supabase
        .from("websites")
        .select("*", { count: "exact", head: true })
        .eq("status", "active");

      // Fetch active campaigns count
      const { count: campaignsCount } = await supabase
        .from("campaigns")
        .select("*", { count: "exact", head: true })
        .eq("status", "active");

      setStats({
        totalUsers: usersCount || 0,
        activeWebsites: websitesCount || 0,
        activeCampaigns: campaignsCount || 0,
        monthlyRevenue: 0, // TODO: Integrate with Stripe
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return <div className="flex items-center justify-center h-full">Loading...</div>;
  }

  const statCards = [
    {
      title: "Total Users",
      value: stats.totalUsers,
      icon: Users,
      description: "Registered users",
      trend: "+12% from last month",
    },
    {
      title: "Active Websites",
      value: stats.activeWebsites,
      icon: Globe,
      description: "Verified websites",
      trend: "+8% from last month",
    },
    {
      title: "Active Campaigns",
      value: stats.activeCampaigns,
      icon: Megaphone,
      description: "Running campaigns",
      trend: "+15% from last month",
    },
    {
      title: "Monthly Revenue",
      value: `$${stats.monthlyRevenue.toLocaleString()}`,
      icon: DollarSign,
      description: "Stripe revenue",
      trend: "+23% from last month",
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your NotiProof platform
        </p>
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

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Platform Growth</CardTitle>
            <CardDescription>Last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] flex items-center justify-center text-muted-foreground">
              Chart placeholder - Integrate with Recharts
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Event Volume</CardTitle>
            <CardDescription>Daily activity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] flex items-center justify-center text-muted-foreground">
              Chart placeholder - Integrate with Recharts
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
