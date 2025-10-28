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
        .eq('status', 'active')
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

  // Default to free tier limits if no subscription
  const plan = subscription?.plan;
  const sitesAllowed = plan?.max_websites ?? 1; // Free tier: 1 website
  const eventsAllowed = plan?.max_events_per_month ?? 1000; // Free tier: 1K events
  const planName = plan?.name ?? "Free";
  const isBusinessPlan = planName === "Business";

  return {
    subscription,
    plan,
    sitesAllowed,
    eventsAllowed,
    planName,
    isBusinessPlan,
    isLoading,
  };
};
