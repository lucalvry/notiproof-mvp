import { TrendingUp, Eye, MousePointer, Zap, AlertCircle, RotateCcw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useWidgetStats } from "@/hooks/useWidgetStats";
import { useWebsiteContext } from "@/contexts/WebsiteContext";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSubscription } from "@/hooks/useSubscription";
import { toast } from "sonner";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import { OnboardingPrompts } from "@/components/dashboard/OnboardingPrompts";
import { UsageDashboard } from "@/components/billing/UsageDashboard";
import { DashboardCharts } from "@/components/dashboard/DashboardCharts";

export default function Dashboard() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string>();
  const [verifying, setVerifying] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [planName, setPlanName] = useState<string>("");
  const { currentWebsite } = useWebsiteContext();
  const { data: stats, isLoading } = useWidgetStats(userId);
  const { subscription, isLoading: subscriptionLoading } = useSubscription(userId);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id);
    });

    // Check for payment success redirect
    const params = new URLSearchParams(window.location.search);
    const paymentSuccess = params.get('payment_success');
    const sessionId = params.get('session_id');

    if (paymentSuccess === 'true' && sessionId) {
      setVerifying(true);
      toast.loading("Verifying payment...");
      
      // Verify the Stripe session and update subscription
      supabase.functions.invoke('verify-stripe-session', {
        body: { sessionId }
      }).then(({ data, error }) => {
        setVerifying(false);
        toast.dismiss();
        
        if (error || !data?.verified) {
          console.error('Failed to verify session:', error || data);
          toast.error('Failed to verify payment. Please try again or contact support.');
          
          // Redirect back to plan selection after 2 seconds
          setTimeout(() => {
            navigate('/select-plan?verification_failed=true');
          }, 2000);
        } else {
          console.log('Session verified:', data);
          toast.success(`🎉 Your ${data.planName} trial has started! Welcome to NotiProof.`);
          setPlanName(data.planName);
          
          // Show onboarding wizard for first-time users
          const isFirstLogin = !localStorage.getItem('notiproof_onboarded');
          if (isFirstLogin) {
            setShowWelcome(true);
          }
        }
        
        // Clean up URL
        window.history.replaceState({}, '', '/dashboard');
      });
    }
  }, []);

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

  // Check subscription status
  const hasActiveSubscription = subscription && ['active', 'trialing'].includes(subscription.status || '');
  const showAccessWarning = !subscriptionLoading && !hasActiveSubscription;

  const handleRestartOnboarding = () => {
    localStorage.removeItem('notiproof_onboarded');
    setShowWelcome(true);
    toast.success("Onboarding wizard reopened!");
  };

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
      {/* Onboarding Prompts */}
      {userId && <OnboardingPrompts userId={userId} />}
      
      {/* Usage Dashboard */}
      {userId && <UsageDashboard userId={userId} showUpgradePrompts={true} />}
      
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            {currentWebsite ? `Overview for ${currentWebsite.domain}` : "Overview of your proof campaigns"}
          </p>
        </div>
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

      {/* Stats Grid - Mobile Optimized */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
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

      {/* Charts with Real Data */}
      <DashboardCharts />

      {/* Onboarding Wizard for first-time users */}
      {userId && (
        <OnboardingWizard 
          open={showWelcome}
          onComplete={() => setShowWelcome(false)}
          planName={planName}
          userId={userId}
        />
      )}
    </div>
  );
}
