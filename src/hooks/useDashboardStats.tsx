import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { subDays, format, startOfDay } from "date-fns";

export interface DashboardStats {
  totalViews: number;
  totalClicks: number;
  ctr: number;
  activeCampaigns: number;
  widgetInstalled: boolean;
  trendData: Array<{ date: string; views: number; clicks: number }>;
  campaignPerformance: Array<{
    id: string;
    name: string;
    type: string;
    status: string;
    views: number;
    clicks: number;
    ctr: number;
  }>;
}

export const useDashboardStats = (userId: string | undefined, days: number = 7) => {
  return useQuery({
    queryKey: ['dashboard-stats', userId, days],
    queryFn: async (): Promise<DashboardStats> => {
      if (!userId) {
        return getEmptyStats();
      }

      const startDate = subDays(new Date(), days);

      // Run independent queries in parallel
      const [websitesResult, campaignsResult] = await Promise.all([
        supabase.from('websites').select('id, is_verified').eq('user_id', userId),
        supabase.from('campaigns').select('id, name, campaign_type, status, website_id').eq('user_id', userId),
      ]);

      const websites = websitesResult.data;
      const campaigns = campaignsResult.data;

      if (!websites || websites.length === 0) {
        return getEmptyStats();
      }

      const websiteIds = websites.map(w => w.id);
      const widgetInstalled = websites.some(w => w.is_verified);

      // Get widgets for user's websites WITH campaign_id
      const { data: widgets } = await supabase
        .from('widgets')
        .select('id, website_id, campaign_id')
        .in('website_id', websiteIds);

      const widgetIds = widgets?.map(w => w.id) || [];

      // Get events for the date range (depends on widgetIds)
      const { data: events } = await supabase
        .from('events')
        .select('id, views, clicks, created_at, widget_id')
        .in('widget_id', widgetIds)
        .gte('created_at', startDate.toISOString());

      // Calculate totals
      const totalViews = events?.reduce((sum, e) => sum + (e.views || 0), 0) || 0;
      const totalClicks = events?.reduce((sum, e) => sum + (e.clicks || 0), 0) || 0;
      const ctr = totalViews > 0 ? (totalClicks / totalViews) * 100 : 0;

      // Build trend data (last N days)
      const trendData: Array<{ date: string; views: number; clicks: number }> = [];
      for (let i = days - 1; i >= 0; i--) {
        const date = subDays(new Date(), i);
        const dateStr = format(date, 'yyyy-MM-dd');
        const dayStart = startOfDay(date);
        const dayEnd = startOfDay(subDays(date, -1));
        
        const dayEvents = events?.filter(e => {
          const eventDate = new Date(e.created_at || '');
          return eventDate >= dayStart && eventDate < dayEnd;
        }) || [];

        trendData.push({
          date: format(date, 'MMM d'),
          views: dayEvents.reduce((sum, e) => sum + (e.views || 0), 0),
          clicks: dayEvents.reduce((sum, e) => sum + (e.clicks || 0), 0),
        });
      }

      // Build widget to campaign mapping
      const widgetToCampaign = new Map(widgets?.map(w => [w.id, w.campaign_id]) || []);

      // Group events by CAMPAIGN, not website
      const eventsByCampaign = new Map<string, typeof events>();
      events?.forEach(e => {
        const campaignId = widgetToCampaign.get(e.widget_id);
        if (campaignId) {
          const existing = eventsByCampaign.get(campaignId) || [];
          eventsByCampaign.set(campaignId, [...existing, e]);
        }
      });

      // Map campaigns to their specific events
      const campaignPerformance = (campaigns || []).map(c => {
        const campaignEvents = eventsByCampaign.get(c.id) || [];
        const views = campaignEvents.reduce((sum, e) => sum + (e.views || 0), 0);
        const clicks = campaignEvents.reduce((sum, e) => sum + (e.clicks || 0), 0);
        
        return {
          id: c.id,
          name: c.name,
          type: c.campaign_type || 'notification',
          status: c.status,
          views,
          clicks,
          ctr: views > 0 ? (clicks / views) * 100 : 0,
        };
      }).sort((a, b) => b.views - a.views);

      const activeCampaigns = campaigns?.filter(c => c.status === 'active').length || 0;

      return {
        totalViews,
        totalClicks,
        ctr,
        activeCampaigns,
        widgetInstalled,
        trendData,
        campaignPerformance,
      };
    },
    enabled: !!userId,
    refetchInterval: 60000, // Refresh every minute
  });
};

function getEmptyStats(): DashboardStats {
  return {
    totalViews: 0,
    totalClicks: 0,
    ctr: 0,
    activeCampaigns: 0,
    widgetInstalled: false,
    trendData: [],
    campaignPerformance: [],
  };
}
