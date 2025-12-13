import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { subDays } from "date-fns";

export interface AnalyticsData {
  totalViews: number;
  totalClicks: number;
  ctr: number;
  activeCampaigns: number;
  totalEvents: number;
  previousViews: number;
  previousClicks: number;
  previousCtr: number;
  previousActiveCampaigns: number;
  previousTotalEvents: number;
  campaigns: Array<{
    id: string;
    name: string;
    type: string;
    views: number;
    clicks: number;
    ctr: number;
    status: string;
    lastActive: string | null;
  }>;
  dailyStats: Array<{
    date: string;
    views: number;
    clicks: number;
  }>;
  eventInsights: Array<{
    eventType: string;
    count: number;
    percentage: number;
  }>;
}

export const useAnalytics = (userId: string | undefined, days: number = 30, websiteId?: string) => {
  return useQuery({
    queryKey: ['analytics', userId, days, websiteId],
    queryFn: async (): Promise<AnalyticsData> => {
      const emptyResult: AnalyticsData = {
        totalViews: 0,
        totalClicks: 0,
        ctr: 0,
        activeCampaigns: 0,
        totalEvents: 0,
        previousViews: 0,
        previousClicks: 0,
        previousCtr: 0,
        previousActiveCampaigns: 0,
        previousTotalEvents: 0,
        campaigns: [],
        dailyStats: [],
        eventInsights: [],
      };

      if (!userId) {
        return emptyResult;
      }

      const startDate = subDays(new Date(), days).toISOString();
      const prevStart = subDays(new Date(), days * 2).toISOString();
      const prevEnd = subDays(new Date(), days).toISOString();

      // Get user's websites with optional filter
      let websitesQuery = supabase
        .from('websites')
        .select('id')
        .eq('user_id', userId);
      
      if (websiteId) {
        websitesQuery = websitesQuery.eq('id', websiteId);
      }
      
      const { data: websites } = await websitesQuery;

      if (!websites || websites.length === 0) {
        return emptyResult;
      }

      const websiteIds = websites.map(w => w.id);

      // Run all independent queries in parallel
      const [
        widgetsResult,
        campaignsResult,
        eventsResult,
        previousEventsResult,
      ] = await Promise.all([
        // Get widgets for user's websites
        supabase
          .from('widgets')
          .select('id, name, status, campaign_id')
          .in('website_id', websiteIds),
        // Get campaigns
        supabase
          .from('campaigns')
          .select('id, name, campaign_type, status, updated_at')
          .in('website_id', websiteIds),
        // Get current period events
        supabase
          .from('events')
          .select('id, widget_id, views, clicks, created_at, event_type')
          .in('website_id', websiteIds)
          .gte('created_at', startDate)
          .order('created_at', { ascending: true }),
        // Get previous period events for comparison
        supabase
          .from('events')
          .select('id, views, clicks')
          .in('website_id', websiteIds)
          .gte('created_at', prevStart)
          .lt('created_at', prevEnd),
      ]);

      const widgets = widgetsResult.data || [];
      const campaigns = campaignsResult.data || [];
      const events = eventsResult.data || [];
      const previousEvents = previousEventsResult.data || [];

      // Calculate current period metrics
      const totalViews = events.reduce((sum, e) => sum + (e.views || 0), 0);
      const totalClicks = events.reduce((sum, e) => sum + (e.clicks || 0), 0);
      const ctr = totalViews > 0 ? (totalClicks / totalViews) * 100 : 0;
      const activeCampaigns = campaigns.filter(c => c.status === 'active').length;
      const totalEvents = events.length;

      // Calculate previous period metrics
      const previousViews = previousEvents.reduce((sum, e) => sum + (e.views || 0), 0);
      const previousClicks = previousEvents.reduce((sum, e) => sum + (e.clicks || 0), 0);
      const previousCtr = previousViews > 0 ? (previousClicks / previousViews) * 100 : 0;
      const previousTotalEvents = previousEvents.length;

      // Campaign breakdown with real data
      const campaignData = campaigns.map(campaign => {
        // Find widgets associated with this campaign
        const campaignWidgets = widgets.filter(w => w.campaign_id === campaign.id);
        const campaignWidgetIds = campaignWidgets.map(w => w.id);
        
        // Get events for this campaign's widgets
        const campaignEvents = events.filter(e => campaignWidgetIds.includes(e.widget_id));
        const views = campaignEvents.reduce((sum, e) => sum + (e.views || 0), 0);
        const clicks = campaignEvents.reduce((sum, e) => sum + (e.clicks || 0), 0);
        
        // Get last active date from events
        const lastEvent = campaignEvents.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )[0];

        return {
          id: campaign.id,
          name: campaign.name,
          type: campaign.campaign_type || 'notification',
          views,
          clicks,
          ctr: views > 0 ? (clicks / views) * 100 : 0,
          status: campaign.status,
          lastActive: lastEvent?.created_at || campaign.updated_at,
        };
      }).sort((a, b) => b.views - a.views);

      // Daily stats for trend chart
      const dailyMap = events.reduce((acc, event) => {
        const date = new Date(event.created_at).toISOString().split('T')[0];
        if (!acc[date]) {
          acc[date] = { date, views: 0, clicks: 0 };
        }
        acc[date].views += event.views || 0;
        acc[date].clicks += event.clicks || 0;
        return acc;
      }, {} as Record<string, { date: string; views: number; clicks: number }>);

      const dailyStats = Object.values(dailyMap).sort((a, b) => 
        a.date.localeCompare(b.date)
      );

      // Event insights - group by event_type
      const eventTypeMap = events.reduce((acc, event) => {
        const type = event.event_type || 'unknown';
        if (!acc[type]) {
          acc[type] = 0;
        }
        acc[type]++;
        return acc;
      }, {} as Record<string, number>);

      const eventInsights = Object.entries(eventTypeMap)
        .map(([eventType, count]) => ({
          eventType,
          count,
          percentage: totalEvents > 0 ? (count / totalEvents) * 100 : 0,
        }))
        .sort((a, b) => b.count - a.count);

      return {
        totalViews,
        totalClicks,
        ctr,
        activeCampaigns,
        totalEvents,
        previousViews,
        previousClicks,
        previousCtr,
        previousActiveCampaigns: activeCampaigns, // No historical data for this
        previousTotalEvents,
        campaigns: campaignData,
        dailyStats,
        eventInsights,
      };
    },
    enabled: !!userId,
    staleTime: 30000,
  });
};
