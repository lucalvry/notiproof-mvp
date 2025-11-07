import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";
import { 
  TrendingUp, 
  Users, 
  Activity, 
  AlertTriangle,
  CheckCircle 
} from "lucide-react";

interface UserConsumption {
  user_id: string;
  user_email: string;
  user_name: string;
  plan_name: string;
  events_used: number;
  quota_limit: number;
  usage_percentage: number;
  status: string;
}

export function EventConsumptionAnalytics() {
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month'>('month');

  // Fetch all user consumption data
  const { data: consumptionData, isLoading } = useQuery({
    queryKey: ['admin-event-consumption'],
    queryFn: async () => {
      const { data: usage, error } = await supabase
        .from('event_usage_tracking')
        .select(`
          user_id,
          events_used,
          events_quota,
          month_year,
          profiles!inner(
            id,
            name
          ),
          user_subscriptions!inner(
            plan:subscription_plans(
              name,
              max_events_per_month
            )
          )
        `)
        .eq('month_year', new Date().toISOString().slice(0, 7))
        .order('events_used', { ascending: false });

      if (error) throw error;

      const { data: authUsers } = await supabase.auth.admin.listUsers();

      return ((usage as any[]) || []).map((u) => {
        const authUser = authUsers?.users.find((au: any) => au.id === u.user_id);
        const quota = u.user_subscriptions?.plan?.max_events_per_month || u.events_quota;
        const usagePercentage = quota > 0 ? (u.events_used / quota) * 100 : 0;

        return {
          user_id: u.user_id,
          user_email: authUser?.email || 'Unknown',
          user_name: u.profiles?.name || 'Unknown',
          plan_name: u.user_subscriptions?.plan?.name || 'Free',
          events_used: u.events_used,
          quota_limit: quota,
          usage_percentage: usagePercentage,
          status: usagePercentage >= 100 ? 'exceeded' : usagePercentage >= 80 ? 'warning' : 'normal'
        } as UserConsumption;
      });
    },
    refetchInterval: 60000, // Refresh every minute
  });

  // Calculate summary stats
  const summaryStats = {
    totalUsers: consumptionData?.length || 0,
    totalEvents: consumptionData?.reduce((sum, u) => sum + u.events_used, 0) || 0,
    usersOverLimit: consumptionData?.filter(u => u.usage_percentage >= 100).length || 0,
    usersAtRisk: consumptionData?.filter(u => u.usage_percentage >= 80 && u.usage_percentage < 100).length || 0,
  };

  // Group by plan
  const planDistribution = consumptionData?.reduce((acc: any, user) => {
    const plan = user.plan_name;
    if (!acc[plan]) {
      acc[plan] = { plan, count: 0, totalEvents: 0 };
    }
    acc[plan].count++;
    acc[plan].totalEvents += user.events_used;
    return acc;
  }, {});

  const planChartData = Object.values(planDistribution || {});

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

  if (isLoading) {
    return <div>Loading analytics...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Active Users</CardDescription>
            <CardTitle className="flex items-center gap-2 text-3xl">
              <Users className="h-6 w-6 text-primary" />
              {summaryStats.totalUsers}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Events This Month</CardDescription>
            <CardTitle className="flex items-center gap-2 text-3xl">
              <Activity className="h-6 w-6 text-primary" />
              {summaryStats.totalEvents.toLocaleString()}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Users Over Limit</CardDescription>
            <CardTitle className="flex items-center gap-2 text-3xl text-destructive">
              <AlertTriangle className="h-6 w-6" />
              {summaryStats.usersOverLimit}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Users At Risk (80%+)</CardDescription>
            <CardTitle className="flex items-center gap-2 text-3xl text-warning">
              <TrendingUp className="h-6 w-6" />
              {summaryStats.usersAtRisk}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">User Consumption</TabsTrigger>
          <TabsTrigger value="plans">Plan Distribution</TabsTrigger>
          <TabsTrigger value="table">Detailed Table</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Event Consumers</CardTitle>
              <CardDescription>Users sorted by event usage this month</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={consumptionData?.slice(0, 20)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="user_email" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="events_used" fill="hsl(var(--primary))" />
                  <Bar dataKey="quota_limit" fill="hsl(var(--muted))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="plans" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Events by Plan Type</CardTitle>
              <CardDescription>Distribution of event consumption across subscription plans</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={planChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry: any) => `${entry.plan}: ${entry.totalEvents.toLocaleString()}`}
                    outerRadius={120}
                    fill="hsl(var(--primary))"
                    dataKey="totalEvents"
                  >
                    {planChartData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="table" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Users - Event Consumption</CardTitle>
              <CardDescription>Complete list of user event usage</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">User</th>
                      <th className="text-left p-2">Plan</th>
                      <th className="text-right p-2">Events Used</th>
                      <th className="text-right p-2">Quota</th>
                      <th className="text-right p-2">Usage %</th>
                      <th className="text-left p-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {consumptionData?.map((user) => (
                      <tr key={user.user_id} className="border-b hover:bg-muted/50">
                        <td className="p-2">
                          <div>
                            <p className="font-medium">{user.user_name}</p>
                            <p className="text-xs text-muted-foreground">{user.user_email}</p>
                          </div>
                        </td>
                        <td className="p-2">
                          <Badge variant="outline">{user.plan_name}</Badge>
                        </td>
                        <td className="p-2 text-right font-mono">{user.events_used.toLocaleString()}</td>
                        <td className="p-2 text-right font-mono">{user.quota_limit.toLocaleString()}</td>
                        <td className="p-2 text-right font-mono">{user.usage_percentage.toFixed(1)}%</td>
                        <td className="p-2">
                          {user.status === 'exceeded' && (
                            <Badge variant="destructive">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Exceeded
                            </Badge>
                          )}
                          {user.status === 'warning' && (
                            <Badge variant="secondary">
                              <TrendingUp className="h-3 w-3 mr-1" />
                              Warning
                            </Badge>
                          )}
                          {user.status === 'normal' && (
                            <Badge variant="outline">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Normal
                            </Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
