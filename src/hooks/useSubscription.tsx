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

export type BlockReason = 
  | 'no_subscription' 
  | 'trial_expired' 
  | 'payment_failed' 
  | 'subscription_cancelled';

export const useSubscription = (userId: string | undefined) => {
  const { isSuperAdmin } = useSuperAdmin(userId);
  
  const { data: subscription, isLoading } = useQuery({
    queryKey: ['subscription', userId],
    queryFn: async (): Promise<UserSubscription | null> => {
      if (!userId) return null;

      // Fetch all subscriptions (not just active) to determine block reason
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select(`
          *,
          plan:subscription_plans(*)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        // User doesn't have any subscription
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
      // Access control
      isBlocked: false,
      hasNoSubscription: false,
      isExpired: false,
      isPaymentFailed: false,
      blockReason: null as BlockReason | null,
      isLoading,
    };
  }

  const plan = subscription?.plan;
  const status = subscription?.status;
  
  // Determine if user is blocked
  const hasNoSubscription = !subscription;
  
  // Check trial expiration
  const trialEndsAt = subscription?.trial_end;
  const isTrialExpired = status === 'trialing' && trialEndsAt && new Date(trialEndsAt) < new Date();
  
  // Check subscription status
  const isPaymentFailed = status === 'past_due';
  const isCancelled = status === 'cancelled';
  const isExpired = isTrialExpired || isCancelled;
  
  // User is blocked if no subscription, expired, or payment failed
  const isBlocked = hasNoSubscription || isExpired || isPaymentFailed;
  
  // Determine block reason
  let blockReason: BlockReason | null = null;
  if (hasNoSubscription) {
    blockReason = 'no_subscription';
  } else if (isTrialExpired) {
    blockReason = 'trial_expired';
  } else if (isPaymentFailed) {
    blockReason = 'payment_failed';
  } else if (isCancelled) {
    blockReason = 'subscription_cancelled';
  }

  // If blocked, return with zero access
  if (isBlocked) {
    return {
      subscription,
      plan,
      sitesAllowed: 0,
      eventsAllowed: 0,
      planName: hasNoSubscription ? "No Subscription" : plan?.name ?? "Expired",
      isBusinessPlan: false,
      isProPlan: false,
      isStandard: false,
      isStarter: false,
      isFree: false,
      // All features blocked
      maxIntegrations: 0,
      maxCampaignTemplates: 0,
      testimonialLimit: 0,
      formLimit: 0,
      storageLimitBytes: 0,
      videoMaxDurationSeconds: 0,
      canRemoveBranding: false,
      customDomainEnabled: false,
      analyticsLevel: 'none',
      hasWhiteLabel: false,
      hasApi: false,
      isTrialing: false,
      trialEndsAt,
      trialDaysLeft: null,
      // Access control flags
      isBlocked: true,
      hasNoSubscription,
      isExpired,
      isPaymentFailed,
      blockReason,
      isLoading,
    };
  }

  // User has valid subscription
  const sitesAllowed = plan?.max_websites ?? 0;
  const eventsAllowed = plan?.max_events_per_month ?? 0;
  const planName = plan?.name ?? "Unknown";
  const isBusinessPlan = planName === "Business";
  const isProPlan = planName === "Pro";
  const isStandard = planName === "Standard";
  const isStarter = planName === "Starter";
  
  // Trial information
  const isTrialing = status === 'trialing';
  const trialDaysLeft = trialEndsAt 
    ? Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
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
    isFree: false, // No more free plan
    // Global features (ALL PLANS get these - no limits!)
    maxIntegrations: 999,  // All 38+ integrations for all plans
    maxCampaignTemplates: 999,  // All templates for all plans
    testimonialLimit: null,  // Unlimited testimonials for all plans
    formLimit: null,  // Unlimited forms for all plans
    // Plan-specific differentiators (THE ONLY THINGS THAT CHANGE)
    storageLimitBytes: plan?.storage_limit_bytes ?? 0,
    videoMaxDurationSeconds: plan?.video_max_duration_seconds ?? 0,
    canRemoveBranding: plan?.can_remove_branding ?? false,
    customDomainEnabled: plan?.custom_domain_enabled ?? false,
    analyticsLevel: plan?.analytics_level ?? 'basic',
    hasWhiteLabel: plan?.has_white_label ?? false,
    hasApi: plan?.has_api ?? false,
    isTrialing,
    trialEndsAt,
    trialDaysLeft,
    // Access control flags
    isBlocked: false,
    hasNoSubscription: false,
    isExpired: false,
    isPaymentFailed: false,
    blockReason: null as BlockReason | null,
    isLoading,
  };
};
