import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SubscriptionStatus {
  isLTD: boolean;
  status: string | null;
  planId: string | null;
  isLoading: boolean;
}

export function useSubscriptionStatus(userId: string | undefined): SubscriptionStatus {
  const { data, isLoading } = useQuery({
    queryKey: ['subscription-status', userId],
    queryFn: async () => {
      if (!userId) return null;
      
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('status, plan_id')
        .eq('user_id', userId)
        .single();
      
      if (error) {
        // No subscription found is not an error state
        if (error.code === 'PGRST116') return null;
        throw error;
      }
      
      return data;
    },
    enabled: !!userId,
  });

  return {
    isLTD: data?.status === 'lifetime',
    status: data?.status ?? null,
    planId: data?.plan_id ?? null,
    isLoading,
  };
}
