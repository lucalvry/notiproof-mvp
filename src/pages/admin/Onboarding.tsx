import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Users, TrendingUp, AlertCircle, CheckCircle2, Target, Sparkles } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface OnboardingStats {
  total_users: number;
  users_not_started: number;
  users_in_progress: number;
  users_completed: number;
  stuck_at_website: number;
  stuck_at_campaign: number;
  stuck_at_installation: number;
  stuck_at_conversion: number;
  average_completion: number;
  path_testimonials: number;
  path_social_proof: number;
  path_announcements: number;
  path_integrations: number;
}

export default function AdminOnboarding() {
  const [stats, setStats] = useState<OnboardingStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      // Fetch all user onboarding data from profiles
      const { data, error } = await supabase
        .from('profiles')
        .select('onboarding_progress, created_at');

      if (error) throw error;

      // Calculate stats from the data
      const calculatedStats: OnboardingStats = {
        total_users: data?.length || 0,
        users_not_started: 0,
        users_in_progress: 0,
        users_completed: 0,
        stuck_at_website: 0,
        stuck_at_campaign: 0,
        stuck_at_installation: 0,
        stuck_at_conversion: 0,
        average_completion: 0,
        path_testimonials: 0,
        path_social_proof: 0,
        path_announcements: 0,
        path_integrations: 0,
      };

      let totalCompletion = 0;

      data?.forEach((user) => {
        const progress = user.onboarding_progress as Record<string, unknown> | null;
        
        if (!progress) {
          calculatedStats.users_not_started++;
          return;
        }

        const completion = (progress.completion_percentage as number) || 0;
        totalCompletion += completion;

        // Track selected paths
        const selectedPath = progress.selected_path as string | null;
        if (selectedPath === 'testimonials') calculatedStats.path_testimonials++;
        else if (selectedPath === 'social_proof') calculatedStats.path_social_proof++;
        else if (selectedPath === 'announcements') calculatedStats.path_announcements++;
        else if (selectedPath === 'integrations') calculatedStats.path_integrations++;

        // Determine user status
        if (completion >= 100 || progress.onboarding_completed_at) {
          calculatedStats.users_completed++;
        } else if (completion > 0 || progress.selected_path) {
          calculatedStats.users_in_progress++;

          // Determine where they're stuck
          const websiteAdded = progress.website_added as boolean;
          const campaignCreated = progress.campaign_created as boolean;
          const widgetInstalled = progress.widget_installed as boolean;
          const firstConversion = progress.first_conversion as boolean;

          if (!websiteAdded) {
            calculatedStats.stuck_at_website++;
          } else if (!campaignCreated) {
            calculatedStats.stuck_at_campaign++;
          } else if (!widgetInstalled) {
            calculatedStats.stuck_at_installation++;
          } else if (!firstConversion) {
            calculatedStats.stuck_at_conversion++;
          }
        } else {
          calculatedStats.users_not_started++;
        }
      });

      calculatedStats.average_completion = data?.length 
        ? Math.round(totalCompletion / data.length) 
        : 0;

      setStats(calculatedStats);
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

  const totalUsers = stats?.total_users || 0;

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
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.users_completed || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalUsers > 0 ? Math.round(((stats?.users_completed || 0) / totalUsers) * 100) : 0}% completion rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.users_in_progress || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalUsers > 0 ? Math.round(((stats?.users_in_progress || 0) / totalUsers) * 100) : 0}% of users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Progress</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.average_completion || 0}%</div>
            <Progress value={stats?.average_completion || 0} className="mt-2 h-2" />
          </CardContent>
        </Card>
      </div>

      {/* Path Selection Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Onboarding Path Selection
          </CardTitle>
          <CardDescription>Which paths users are choosing during onboarding</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Sparkles className="h-8 w-8 text-amber-500" />
              <div>
                <p className="text-sm font-medium">Testimonials</p>
                <p className="text-2xl font-bold">{stats?.path_testimonials || 0}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Users className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-sm font-medium">Social Proof</p>
                <p className="text-2xl font-bold">{stats?.path_social_proof || 0}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <AlertCircle className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-sm font-medium">Announcements</p>
                <p className="text-2xl font-bold">{stats?.path_announcements || 0}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <TrendingUp className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-sm font-medium">Integrations</p>
                <p className="text-2xl font-bold">{stats?.path_integrations || 0}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

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
                <span className="font-bold">{stats?.stuck_at_website || 0} users</span>
              </div>
              <Progress 
                value={totalUsers > 0 ? ((stats?.stuck_at_website || 0) / totalUsers) * 100 : 0} 
                className="h-2"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-orange-500" />
                  <span>Stuck at Campaign Creation</span>
                </div>
                <span className="font-bold">{stats?.stuck_at_campaign || 0} users</span>
              </div>
              <Progress 
                value={totalUsers > 0 ? ((stats?.stuck_at_campaign || 0) / totalUsers) * 100 : 0} 
                className="h-2"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-yellow-500" />
                  <span>Stuck at Widget Installation</span>
                </div>
                <span className="font-bold">{stats?.stuck_at_installation || 0} users</span>
              </div>
              <Progress 
                value={totalUsers > 0 ? ((stats?.stuck_at_installation || 0) / totalUsers) * 100 : 0} 
                className="h-2"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-blue-500" />
                  <span>Stuck at First Conversion</span>
                </div>
                <span className="font-bold">{stats?.stuck_at_conversion || 0} users</span>
              </div>
              <Progress 
                value={totalUsers > 0 ? ((stats?.stuck_at_conversion || 0) / totalUsers) * 100 : 0} 
                className="h-2"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}