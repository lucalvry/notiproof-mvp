import { RotateCcw, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { useRecentActivity } from "@/hooks/useRecentActivity";
import { DashboardSummary } from "@/components/dashboard/DashboardSummary";
import { RecentActivityFeed } from "@/components/dashboard/RecentActivityFeed";
import { EventsTrendChart } from "@/components/dashboard/EventsTrendChart";
import { CampaignPerformanceTable } from "@/components/dashboard/CampaignPerformanceTable";
import { DashboardQuickActions } from "@/components/dashboard/DashboardQuickActions";
import { OnboardingProgress } from "@/components/dashboard/OnboardingProgress";
import { DateRangeFilter } from "@/components/dashboard/DateRangeFilter";
import { useWebsiteContext } from "@/contexts/WebsiteContext";
import { useOnboarding } from "@/hooks/useOnboarding";

export default function Dashboard() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string>();
  const [verifying, setVerifying] = useState(false);
  const [dateRange, setDateRange] = useState(14);
  const { currentWebsite } = useWebsiteContext();
  const { restartOnboarding, isOpen: onboardingOpen } = useOnboarding();
  
  // Real data hooks - filter by current website
  const { data: stats, isLoading: statsLoading } = useDashboardStats(userId, dateRange, currentWebsite?.id);
  const { data: activities, isLoading: activitiesLoading } = useRecentActivity(userId, 10, currentWebsite?.id);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id);
    });

    // Check for payment success redirect
    const params = new URLSearchParams(window.location.search);
    const paymentSuccess = params.get('payment_success');
    const ltdSuccess = params.get('ltd_success');
    const sessionId = params.get('session_id');

    if ((paymentSuccess === 'true' || ltdSuccess === 'true') && sessionId) {
      setVerifying(true);
      
      const isLtd = ltdSuccess === 'true';
      const functionName = isLtd ? 'verify-ltd-session' : 'verify-stripe-session';
      const loadingMessage = isLtd ? "Verifying your lifetime purchase..." : "Verifying payment...";
      
      toast.loading(loadingMessage);
      
      supabase.functions.invoke(functionName, {
        body: { sessionId }
      }).then(({ data, error }) => {
        setVerifying(false);
        toast.dismiss();
        
        if (error || !data?.verified) {
          console.error('Failed to verify session:', error || data);
          toast.error('Failed to verify payment. Please try again or contact support.');
          setTimeout(() => {
            navigate(isLtd ? '/ltd?verification_failed=true' : '/select-plan?verification_failed=true');
          }, 2000);
        } else {
          if (isLtd) {
            toast.success("🎉 Welcome to NotiProof! Your lifetime access is now active.");
          } else {
            toast.success(`Your ${data.planName} trial has started! Welcome to NotiProof.`);
          }
        }
        window.history.replaceState({}, '', '/dashboard');
      });
    }
  }, [navigate]);

  const handleRestartOnboarding = async () => {
    await restartOnboarding();
    toast.success("Onboarding wizard reopened!");
  };

  // Show loading UI while verifying payment
  if (verifying) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
        <h3 className="text-lg font-semibold">Verifying your payment...</h3>
        <p className="text-sm text-muted-foreground mt-2">This will only take a moment</p>
      </div>
    );
  }

  // Derive onboarding state from real data
  const websiteAdded = (stats?.campaignPerformance?.length ?? 0) > 0 || (stats?.activeCampaigns ?? 0) > 0;
  const notificationCreated = (stats?.activeCampaigns ?? 0) > 0;
  const widgetInstalled = stats?.widgetInstalled ?? false;
  const hasEvents = (stats?.totalViews ?? 0) > 0;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of your notifications
          </p>
          {currentWebsite && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
              <Globe className="h-4 w-4" />
              <span>Showing data for: <strong className="text-foreground">{currentWebsite.domain}</strong></span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <DateRangeFilter value={dateRange} onChange={setDateRange} />
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleRestartOnboarding}
            className="gap-2 hidden sm:flex"
          >
            <RotateCcw className="h-4 w-4" />
            <span className="hidden md:inline">Restart Onboarding</span>
          </Button>
        </div>
      </div>

      {/* Onboarding Progress (if incomplete) */}
      <OnboardingProgress
        websiteAdded={websiteAdded}
        notificationCreated={notificationCreated}
        widgetInstalled={widgetInstalled}
        hasEvents={hasEvents}
      />

      {/* Summary Metrics */}
      <DashboardSummary
        totalViews={stats?.totalViews ?? 0}
        totalClicks={stats?.totalClicks ?? 0}
        ctr={stats?.ctr ?? 0}
        activeNotifications={stats?.activeCampaigns ?? 0}
        widgetInstalled={stats?.widgetInstalled ?? false}
        isLoading={statsLoading}
        days={dateRange}
      />

      {/* Activity Feed + Trend Chart */}
      <div className="grid gap-6 lg:grid-cols-2">
        <RecentActivityFeed
          activities={activities ?? []}
          isLoading={activitiesLoading}
        />
        <EventsTrendChart
          data={stats?.trendData ?? []}
          isLoading={statsLoading}
        />
      </div>

      {/* Notification Performance */}
      <CampaignPerformanceTable
        campaigns={stats?.campaignPerformance ?? []}
        isLoading={statsLoading}
      />

      {/* Quick Actions */}
      <DashboardQuickActions widgetInstalled={stats?.widgetInstalled ?? false} />

      {/* Onboarding Flow for first-time users */}
      {userId && onboardingOpen && (
        <OnboardingFlow userId={userId} />
      )}
    </div>
  );
}
