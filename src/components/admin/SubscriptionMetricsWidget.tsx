import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Users, AlertTriangle, Clock, CreditCard, TrendingUp, DollarSign } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface SubscriptionStats {
  active: number;
  trialing: number;
  trialingExpiringSoon: number;
  pastDue: number;
  cancelled: number;
  noSubscription: number;
  totalUsers: number;
  mrr: number;
  mrrAtRisk: number;
  trialConversionRate: number;
}

export function SubscriptionMetricsWidget() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-subscription-metrics'],
    queryFn: async (): Promise<SubscriptionStats> => {
      // Get total users
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Get all subscriptions
      const { data: subscriptions } = await supabase
        .from('user_subscriptions')
        .select(`
          id,
          user_id,
          status,
          trial_end,
          subscription_plans(price_monthly)
        `);

      // Get users with subscriptions
      const usersWithSubs = new Set(subscriptions?.map(s => s.user_id) || []);
      const noSubscription = (totalUsers || 0) - usersWithSubs.size;

      // Calculate stats
      const now = new Date();
      const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      let active = 0;
      let trialing = 0;
      let trialingExpiringSoon = 0;
      let pastDue = 0;
      let cancelled = 0;
      let mrr = 0;
      let mrrAtRisk = 0;

      subscriptions?.forEach((sub: any) => {
        const price = sub.subscription_plans?.price_monthly || 0;
        
        switch (sub.status) {
          case 'active':
            active++;
            mrr += price;
            break;
          case 'trialing':
            trialing++;
            if (sub.trial_end && new Date(sub.trial_end) <= sevenDaysFromNow) {
              trialingExpiringSoon++;
              mrrAtRisk += price;
            }
            break;
          case 'past_due':
            pastDue++;
            mrrAtRisk += price;
            break;
          case 'cancelled':
            cancelled++;
            break;
        }
      });

      // Calculate trial conversion rate (trials that became active / total trials that ended)
      const { count: convertedTrials } = await supabase
        .from('user_subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')
        .not('trial_end', 'is', null);

      const { count: totalEndedTrials } = await supabase
        .from('user_subscriptions')
        .select('*', { count: 'exact', head: true })
        .in('status', ['active', 'cancelled', 'past_due'])
        .not('trial_end', 'is', null);

      const trialConversionRate = totalEndedTrials && totalEndedTrials > 0 
        ? ((convertedTrials || 0) / totalEndedTrials) * 100 
        : 0;

      return {
        active,
        trialing,
        trialingExpiringSoon,
        pastDue,
        cancelled,
        noSubscription,
        totalUsers: totalUsers || 0,
        mrr,
        mrrAtRisk,
        trialConversionRate,
      };
    },
    refetchInterval: 60000, // Refresh every minute
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Subscription Health</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const activePercentage = stats ? (stats.active / stats.totalUsers) * 100 : 0;
  const trialingPercentage = stats ? (stats.trialing / stats.totalUsers) * 100 : 0;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Subscription Status Breakdown */}
      <Card className="col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Subscription Status
          </CardTitle>
          <CardDescription>Distribution of user subscriptions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-success"></div>
                  Active
                </span>
                <span className="font-bold">{stats?.active || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-warning"></div>
                  Trialing
                </span>
                <span className="font-bold">{stats?.trialing || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-destructive"></div>
                  Past Due
                </span>
                <span className="font-bold">{stats?.pastDue || 0}</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-muted-foreground"></div>
                  Cancelled
                </span>
                <span className="font-bold">{stats?.cancelled || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-border"></div>
                  No Subscription
                </span>
                <span className="font-bold">{stats?.noSubscription || 0}</span>
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Active Users</span>
              <span>{activePercentage.toFixed(1)}%</span>
            </div>
            <Progress value={activePercentage} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Revenue at Risk */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning" />
            Revenue at Risk
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-destructive">
            ${stats?.mrrAtRisk?.toLocaleString() || 0}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {stats?.pastDue || 0} past due + {stats?.trialingExpiringSoon || 0} trials expiring soon
          </p>
          {(stats?.pastDue || 0) > 0 && (
            <Badge variant="destructive" className="mt-2">
              Action Required
            </Badge>
          )}
        </CardContent>
      </Card>

      {/* Trial Conversion */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-success" />
            Trial Conversion
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {stats?.trialConversionRate?.toFixed(1) || 0}%
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Trials converting to paid
          </p>
          <div className="mt-2">
            <Badge variant="outline" className="text-xs">
              <Clock className="h-3 w-3 mr-1" />
              {stats?.trialingExpiringSoon || 0} expiring in 7 days
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
