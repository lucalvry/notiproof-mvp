import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSuperAdmin } from "./useSuperAdmin";

interface SubscriptionPlan {
  id: string;
  name: string;
  max_websites: number | null;
  max_events_per_month: number | null;
  price_monthly: number;
  price_yearly: number;
  storage_limit_bytes: number | null;
  video_max_duration_seconds: number | null;
  testimonial_limit: number | null;
  form_limit: number | null;
  analytics_level: string | null;
  has_white_label: boolean | null;
  has_api: boolean | null;
  can_remove_branding: boolean | null;
  custom_domain_enabled: boolean | null;
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
  const { isSuperAdmin } = useSuperAdmin(userId);
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

  // Super admin bypass: unlimited access
  if (isSuperAdmin) {
    return {
      subscription,
      plan: subscription?.plan,
      sitesAllowed: 999999,
      eventsAllowed: 999999999,
      planName: "Enterprise (Unlimited)",
      isBusinessPlan: true,
      isProPlan: true,
      isStarter: false,
      isStandard: false,
      isFree: false,
      // Global features (all plans)
      maxIntegrations: 999999,
      maxCampaignTemplates: 999999,
      testimonialLimit: null,
      formLimit: null,
      // Plan-specific limits
      storageLimitBytes: 999999999999,
      videoMaxDurationSeconds: 999999,
      canRemoveBranding: true,
      customDomainEnabled: true,
      analyticsLevel: 'enterprise',
      hasWhiteLabel: true,
      hasApi: true,
      isTrialing: false,
      trialEndsAt: null,
      trialDaysLeft: null,
      isLoading,
    };
  }

  const plan = subscription?.plan;
  
  // Free tier defaults (no subscription in database)
  const isFree = !subscription;
  const sitesAllowed = plan?.max_websites ?? (isFree ? 1 : 0);
  const eventsAllowed = plan?.max_events_per_month ?? (isFree ? 1000 : 0);
  const planName = plan?.name ?? (isFree ? "Free" : "No Subscription");
  const isBusinessPlan = planName === "Business";
  const isProPlan = planName === "Pro";
  const isStandard = planName === "Standard";
  const isStarter = planName === "Starter";
  
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
    isStandard,
    isStarter,
    isFree,
    // Global features (ALL PLANS get these - no limits!)
    maxIntegrations: 999,  // All 38+ integrations for all plans
    maxCampaignTemplates: 999,  // All templates for all plans
    testimonialLimit: null,  // Unlimited testimonials for all plans
    formLimit: null,  // Unlimited forms for all plans
    // Plan-specific differentiators (THE ONLY THINGS THAT CHANGE)
    storageLimitBytes: plan?.storage_limit_bytes ?? (isFree ? 104857600 : 0), // 100MB for free
    videoMaxDurationSeconds: plan?.video_max_duration_seconds ?? (isFree ? 30 : 0), // 30s for free
    canRemoveBranding: plan?.can_remove_branding ?? false,
    customDomainEnabled: plan?.custom_domain_enabled ?? false,
    analyticsLevel: plan?.analytics_level ?? 'basic',
    hasWhiteLabel: plan?.has_white_label ?? false,
    hasApi: plan?.has_api ?? false,
    isTrialing,
    trialEndsAt,
    trialDaysLeft,
    isLoading,
  };
};
