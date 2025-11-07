import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface EventUsage {
  events_used: number;
  quota_limit: number;
  quota_remaining: number;
  usage_percentage: number;
}

export function useEventUsage(userId: string | undefined) {
  return useQuery({
    queryKey: ['event-usage', userId],
    queryFn: async (): Promise<EventUsage> => {
      if (!userId) {
        return {
          events_used: 0,
          quota_limit: 0,
          quota_remaining: 0,
          usage_percentage: 0,
        };
      }

      const { data, error } = await supabase
        .rpc('get_user_event_usage', { _user_id: userId });

      if (error) {
        console.error('Error fetching event usage:', error);
        throw error;
      }

      return data as unknown as EventUsage;
    },
    enabled: !!userId,
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}
