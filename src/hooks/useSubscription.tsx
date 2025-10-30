import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface SubscriptionPlan {
  id: string;
  name: string;
  max_websites: number | null;
  max_events_per_month: number | null;
  price_monthly: number;
  price_yearly: number;
}

interface UserSubscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: string;
  trial_start?: string | null;
  trial_end?: string | null;
  plan: SubscriptionPlan;
}

export const useSubscription = (userId: string | undefined) => {
  const { data: subscription, isLoading } = useQuery({
    queryKey: ['subscription', userId],
    queryFn: async (): Promise<UserSubscription | null> => {
      if (!userId) return null;

      const { data, error } = await supabase
        .from('user_subscriptions')
        .select(`
          *,
          plan:subscription_plans(*)
        `)
        .eq('user_id', userId)
        .in('status', ['active', 'trialing', 'past_due'])
        .single();

      if (error) {
        // User doesn't have an active subscription
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      return data as unknown as UserSubscription;
    },
    enabled: !!userId,
  });

  const plan = subscription?.plan;
  
  // No default access - users MUST have a subscription
  const sitesAllowed = plan?.max_websites ?? 0;
  const eventsAllowed = plan?.max_events_per_month ?? 0;
  const planName = plan?.name ?? "No Plan";
  const isBusinessPlan = planName === "Business";
  
  // Trial information
  const isTrialing = subscription?.status === 'trialing';
  const trialEndsAt = subscription?.trial_end;
  const trialDaysLeft = trialEndsAt 
    ? Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  return {
    subscription,
    plan,
    sitesAllowed,
    eventsAllowed,
    planName,
    isBusinessPlan,
    isTrialing,
    trialEndsAt,
    trialDaysLeft,
    isLoading,
  };
};
