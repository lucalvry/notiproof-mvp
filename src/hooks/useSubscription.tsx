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
  
  // Free tier defaults (no subscription in database)
  const isFree = !subscription;
  const sitesAllowed = plan?.max_websites ?? (isFree ? 1 : 0);
  const eventsAllowed = plan?.max_events_per_month ?? (isFree ? 1000 : 0);
  const planName = plan?.name ?? (isFree ? "Free" : "No Subscription");
  const isBusinessPlan = planName === "Business";
  const isProPlan = planName === "Pro";
  const isStarter = planName === "Starter";
  
  // Free tier has limited integrations (2: GA4 + 1 more)
  const maxIntegrations = isFree ? 2 : (isStarter ? 5 : (plan?.name === "Standard" ? 15 : 999));
  
  // Free tier has limited campaign templates (3)
  const maxCampaignTemplates = isFree ? 3 : (isStarter ? 10 : (plan?.name === "Standard" ? 20 : 999));
  
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
    isProPlan,
    isFree,
    maxIntegrations,
    maxCampaignTemplates,
    isTrialing,
    trialEndsAt,
    trialDaysLeft,
    isLoading,
  };
};
