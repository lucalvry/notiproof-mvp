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

export const useDashboardStats = (userId: string | undefined, days: number = 7, websiteId?: string) => {
  return useQuery({
    queryKey: ['dashboard-stats', userId, days, websiteId],
    queryFn: async (): Promise<DashboardStats> => {
      if (!userId) {
        return getEmptyStats();
      }

      const startDate = subDays(new Date(), days);
      const startDateStr = format(startDate, 'yyyy-MM-dd');

      // Run independent queries in parallel - filter by websiteId if provided
      let websitesQuery = supabase.from('websites').select('id, is_verified').eq('user_id', userId);
      let campaignsQuery = supabase.from('campaigns').select('id, name, campaign_type, status, website_id, data_sources').eq('user_id', userId);
      
      if (websiteId) {
        websitesQuery = websitesQuery.eq('id', websiteId);
        campaignsQuery = campaignsQuery.eq('website_id', websiteId);
      }

      const [websitesResult, campaignsResult] = await Promise.all([
        websitesQuery,
        campaignsQuery,
      ]);

      const websites = websitesResult.data;
      const campaigns = campaignsResult.data;

      if (!websites || websites.length === 0) {
        return getEmptyStats();
      }

      const websiteIds = websites.map(w => w.id);
      const widgetInstalled = websites.some(w => w.is_verified);
      const campaignIds = campaigns?.map(c => c.id) || [];

      // Get widgets for user's websites WITH campaign_id
      const { data: widgets } = await supabase
        .from('widgets')
        .select('id, website_id, campaign_id')
        .in('website_id', websiteIds);

      const widgetIds = widgets?.map(w => w.id) || [];

      // Fetch events and campaign_stats in parallel
      const [eventsResult, campaignStatsResult] = await Promise.all([
        supabase
          .from('events')
          .select('id, views, clicks, created_at, widget_id')
          .in('widget_id', widgetIds)
          .gte('created_at', startDate.toISOString()),
        supabase
          .from('campaign_stats')
          .select('campaign_id, date, views, clicks')
          .in('campaign_id', campaignIds)
          .gte('date', startDateStr),
      ]);

      const events = eventsResult.data;
      const campaignStats = campaignStatsResult.data || [];

      // Calculate totals from events
      const eventsViews = events?.reduce((sum, e) => sum + (e.views || 0), 0) || 0;
      const eventsClicks = events?.reduce((sum, e) => sum + (e.clicks || 0), 0) || 0;

      // Calculate totals from campaign_stats
      const statsViews = campaignStats.reduce((sum, s) => sum + (s.views || 0), 0);
      const statsClicks = campaignStats.reduce((sum, s) => sum + (s.clicks || 0), 0);

      // Combined totals
      const totalViews = eventsViews + statsViews;
      const totalClicks = eventsClicks + statsClicks;
      const ctr = totalViews > 0 ? (totalClicks / totalViews) * 100 : 0;

      // Build trend data (last N days) - merge events and campaign_stats
      const trendData: Array<{ date: string; views: number; clicks: number }> = [];
      for (let i = days - 1; i >= 0; i--) {
        const date = subDays(new Date(), i);
        const dateStr = format(date, 'yyyy-MM-dd');
        const dayStart = startOfDay(date);
        const dayEnd = startOfDay(subDays(date, -1));
        
        // Events for this day
        const dayEvents = events?.filter(e => {
          const eventDate = new Date(e.created_at || '');
          return eventDate >= dayStart && eventDate < dayEnd;
        }) || [];

        const eventViews = dayEvents.reduce((sum, e) => sum + (e.views || 0), 0);
        const eventClicks = dayEvents.reduce((sum, e) => sum + (e.clicks || 0), 0);

        // Campaign stats for this day
        const dayStats = campaignStats.filter(s => s.date === dateStr);
        const statViews = dayStats.reduce((sum, s) => sum + (s.views || 0), 0);
        const statClicks = dayStats.reduce((sum, s) => sum + (s.clicks || 0), 0);

        trendData.push({
          date: format(date, 'MMM d'),
          views: eventViews + statViews,
          clicks: eventClicks + statClicks,
        });
      }

      // Build widget to campaign mapping
      const widgetToCampaign = new Map(widgets?.map(w => [w.id, w.campaign_id]) || []);

      // Group events by CAMPAIGN
      const eventsByCampaign = new Map<string, typeof events>();
      events?.forEach(e => {
        const campaignId = widgetToCampaign.get(e.widget_id);
        if (campaignId) {
          const existing = eventsByCampaign.get(campaignId) || [];
          eventsByCampaign.set(campaignId, [...existing, e]);
        }
      });

      // Group campaign_stats by campaign
      const statsByCampaign = new Map<string, typeof campaignStats>();
      campaignStats.forEach(s => {
        const existing = statsByCampaign.get(s.campaign_id) || [];
        statsByCampaign.set(s.campaign_id, [...existing, s]);
      });

      // Map campaigns to their specific events + campaign_stats
      const campaignPerformance = (campaigns || []).map(c => {
        const campaignEvents = eventsByCampaign.get(c.id) || [];
        const campaignStatsData = statsByCampaign.get(c.id) || [];
        
        const eventViews = campaignEvents.reduce((sum, e) => sum + (e.views || 0), 0);
        const eventClicks = campaignEvents.reduce((sum, e) => sum + (e.clicks || 0), 0);
        const statViews = campaignStatsData.reduce((sum, s) => sum + (s.views || 0), 0);
        const statClicks = campaignStatsData.reduce((sum, s) => sum + (s.clicks || 0), 0);

        const views = eventViews + statViews;
        const clicks = eventClicks + statClicks;
        
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
