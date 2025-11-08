import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface RevenueStats {
  total_revenue: number;
  direct_revenue: number;
  assisted_revenue: number;
  influenced_revenue: number;
  total_conversions: number;
  direct_conversions: number;
  assisted_conversions: number;
  avg_conversion_value: number;
  avg_time_to_conversion: string | null;
  currency: string;
}

interface ConversionData {
  id: string;
  conversion_type: string;
  conversion_value: number;
  attribution_type: string;
  time_to_conversion: string | null;
  created_at: string;
  campaign: {
    name: string;
  };
}

export const useRevenueAttribution = (
  userId: string | undefined,
  campaignId?: string,
  periodType: 'daily' | 'weekly' | 'monthly' = 'monthly'
) => {
  // Fetch aggregated revenue stats
  const { data: revenueStats, isLoading: statsLoading } = useQuery({
    queryKey: ['revenue-stats', userId, campaignId, periodType],
    queryFn: async (): Promise<RevenueStats | null> => {
      if (!userId) return null;

      let query = supabase
        .from('campaign_revenue_stats')
        .select('*')
        .eq('user_id', userId)
        .eq('period_type', periodType)
        .order('period_start', { ascending: false });

      if (campaignId) {
        query = query.eq('campaign_id', campaignId);
      }

      const { data, error } = await query.limit(1).single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return data as RevenueStats | null;
    },
    enabled: !!userId,
  });

  // Fetch recent conversions
  const { data: recentConversions, isLoading: conversionsLoading } = useQuery({
    queryKey: ['recent-conversions', userId, campaignId],
    queryFn: async (): Promise<ConversionData[]> => {
      if (!userId) return [];

      let query = supabase
        .from('notification_conversions')
        .select(`
          id,
          conversion_type,
          conversion_value,
          attribution_type,
          time_to_conversion,
          created_at,
          campaign:campaigns(name)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (campaignId) {
        query = query.eq('campaign_id', campaignId);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data as unknown as ConversionData[];
    },
    enabled: !!userId,
  });

  // Calculate ROI and other metrics
  const calculateROI = (adSpend: number) => {
    if (!revenueStats || adSpend === 0) return 0;
    return ((revenueStats.total_revenue - adSpend) / adSpend) * 100;
  };

  const conversionRate = revenueStats?.total_conversions 
    ? (revenueStats.total_conversions / 100) * 100 // Placeholder: needs impression data
    : 0;

  const averageOrderValue = revenueStats?.avg_conversion_value || 0;

  const attributionBreakdown = revenueStats ? {
    direct: {
      revenue: revenueStats.direct_revenue,
      percentage: (revenueStats.direct_revenue / revenueStats.total_revenue) * 100,
    },
    assisted: {
      revenue: revenueStats.assisted_revenue,
      percentage: (revenueStats.assisted_revenue / revenueStats.total_revenue) * 100,
    },
    influenced: {
      revenue: revenueStats.influenced_revenue,
      percentage: (revenueStats.influenced_revenue / revenueStats.total_revenue) * 100,
    },
  } : null;

  return {
    revenueStats,
    recentConversions,
    isLoading: statsLoading || conversionsLoading,
    calculateROI,
    conversionRate,
    averageOrderValue,
    attributionBreakdown,
  };
};
