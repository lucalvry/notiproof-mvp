import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/layouts/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Users, TrendingUp, AlertCircle, CheckCircle2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface OnboardingAnalytics {
  users_not_started: number;
  users_in_progress: number;
  users_completed: number;
  stuck_at_website: number;
  stuck_at_campaign: number;
  stuck_at_installation: number;
  stuck_at_conversion: number;
  average_completion: number;
}

export default function AdminOnboarding() {
  const [analytics, setAnalytics] = useState<OnboardingAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const { data, error } = await supabase
        .from('onboarding_analytics')
        .select('*')
        .single();

      if (error) throw error;
      setAnalytics(data);
    } catch (error) {
      console.error('Error fetching onboarding analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const totalUsers = (analytics?.users_not_started || 0) + 
                     (analytics?.users_in_progress || 0) + 
                     (analytics?.users_completed || 0);

  return (
    <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Onboarding Analytics</h1>
          <p className="text-muted-foreground mt-2">
            Track user onboarding progress and identify bottlenecks
          </p>
        </div>

        {/* Overview Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalUsers}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics?.users_completed || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {totalUsers > 0 ? Math.round(((analytics?.users_completed || 0) / totalUsers) * 100) : 0}% completion rate
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Progress</CardTitle>
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics?.users_in_progress || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {totalUsers > 0 ? Math.round(((analytics?.users_in_progress || 0) / totalUsers) * 100) : 0}% of users
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Progress</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Math.round(analytics?.average_completion || 0)}%</div>
              <Progress value={analytics?.average_completion || 0} className="mt-2 h-2" />
            </CardContent>
          </Card>
        </div>

        {/* Bottleneck Analysis */}
        <Card>
          <CardHeader>
            <CardTitle>Onboarding Bottlenecks</CardTitle>
            <CardDescription>Where users are getting stuck in the onboarding process</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-destructive" />
                    <span>Stuck at Website Setup</span>
                  </div>
                  <span className="font-bold">{analytics?.stuck_at_website || 0} users</span>
                </div>
                <Progress 
                  value={totalUsers > 0 ? ((analytics?.stuck_at_website || 0) / totalUsers) * 100 : 0} 
                  className="h-2"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-orange-500" />
                    <span>Stuck at Campaign Creation</span>
                  </div>
                  <span className="font-bold">{analytics?.stuck_at_campaign || 0} users</span>
                </div>
                <Progress 
                  value={totalUsers > 0 ? ((analytics?.stuck_at_campaign || 0) / totalUsers) * 100 : 0} 
                  className="h-2"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-yellow-500" />
                    <span>Stuck at Widget Installation</span>
                  </div>
                  <span className="font-bold">{analytics?.stuck_at_installation || 0} users</span>
                </div>
                <Progress 
                  value={totalUsers > 0 ? ((analytics?.stuck_at_installation || 0) / totalUsers) * 100 : 0} 
                  className="h-2"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-blue-500" />
                    <span>Stuck at First Conversion</span>
                  </div>
                  <span className="font-bold">{analytics?.stuck_at_conversion || 0} users</span>
                </div>
                <Progress 
                  value={totalUsers > 0 ? ((analytics?.stuck_at_conversion || 0) / totalUsers) * 100 : 0} 
                  className="h-2"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
  );
}
