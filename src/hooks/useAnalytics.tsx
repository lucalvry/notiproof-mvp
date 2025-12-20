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
        campaignStatsResult,
        previousCampaignStatsResult,
      ] = await Promise.all([
        // Get widgets for user's websites
        supabase
          .from('widgets')
          .select('id, name, status, campaign_id')
          .in('website_id', websiteIds),
        // Get campaigns
        supabase
          .from('campaigns')
          .select('id, name, campaign_type, status, updated_at, data_sources')
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
        // Get current period campaign stats (for Visitors Pulse etc)
        supabase
          .from('campaign_stats')
          .select('campaign_id, date, views, clicks')
          .gte('date', startDate.split('T')[0])
          .order('date', { ascending: true }),
        // Get previous period campaign stats
        supabase
          .from('campaign_stats')
          .select('campaign_id, views, clicks')
          .gte('date', prevStart.split('T')[0])
          .lt('date', prevEnd.split('T')[0]),
      ]);

      const widgets = widgetsResult.data || [];
      const campaigns = campaignsResult.data || [];
      const events = eventsResult.data || [];
      const previousEvents = previousEventsResult.data || [];
      const campaignStats = campaignStatsResult.data || [];
      const previousCampaignStats = previousCampaignStatsResult.data || [];

      // Get campaign IDs for this user's websites
      const userCampaignIds = campaigns.map(c => c.id);
      
      // Filter campaign stats to only include user's campaigns
      const userCampaignStats = campaignStats.filter(cs => userCampaignIds.includes(cs.campaign_id));
      const userPreviousCampaignStats = previousCampaignStats.filter(cs => userCampaignIds.includes(cs.campaign_id));

      // Calculate campaign stats totals
      const campaignStatsViews = userCampaignStats.reduce((sum, cs) => sum + (cs.views || 0), 0);
      const campaignStatsClicks = userCampaignStats.reduce((sum, cs) => sum + (cs.clicks || 0), 0);
      const prevCampaignStatsViews = userPreviousCampaignStats.reduce((sum, cs) => sum + (cs.views || 0), 0);
      const prevCampaignStatsClicks = userPreviousCampaignStats.reduce((sum, cs) => sum + (cs.clicks || 0), 0);

      // Calculate current period metrics (events + campaign stats)
      const totalViews = events.reduce((sum, e) => sum + (e.views || 0), 0) + campaignStatsViews;
      const totalClicks = events.reduce((sum, e) => sum + (e.clicks || 0), 0) + campaignStatsClicks;
      const ctr = totalViews > 0 ? (totalClicks / totalViews) * 100 : 0;
      const activeCampaigns = campaigns.filter(c => c.status === 'active').length;
      const totalEvents = events.length;

      // Calculate previous period metrics
      const previousViews = previousEvents.reduce((sum, e) => sum + (e.views || 0), 0) + prevCampaignStatsViews;
      const previousClicks = previousEvents.reduce((sum, e) => sum + (e.clicks || 0), 0) + prevCampaignStatsClicks;
      const previousCtr = previousViews > 0 ? (previousClicks / previousViews) * 100 : 0;
      const previousTotalEvents = previousEvents.length;

      // Campaign breakdown with real data
      const campaignData = campaigns.map(campaign => {
        // Check if this is a live_visitors (Visitors Pulse) campaign
        const isVisitorsPulse = (campaign.data_sources as any[])?.some(
          (s: any) => s.provider === 'live_visitors'
        );
        
        let views = 0;
        let clicks = 0;
        let lastActive: string | null = campaign.updated_at;
        
        if (isVisitorsPulse) {
          // Get stats from campaign_stats table
          const stats = userCampaignStats.filter(cs => cs.campaign_id === campaign.id);
          views = stats.reduce((sum, cs) => sum + (cs.views || 0), 0);
          clicks = stats.reduce((sum, cs) => sum + (cs.clicks || 0), 0);
          
          // Get last active from most recent stat
          const lastStat = stats.sort((a, b) => 
            new Date(b.date).getTime() - new Date(a.date).getTime()
          )[0];
          if (lastStat) {
            lastActive = lastStat.date;
          }
        } else {
          // Find widgets associated with this campaign
          const campaignWidgets = widgets.filter(w => w.campaign_id === campaign.id);
          const campaignWidgetIds = campaignWidgets.map(w => w.id);
          
          // Get events for this campaign's widgets
          const campaignEvents = events.filter(e => campaignWidgetIds.includes(e.widget_id));
          views = campaignEvents.reduce((sum, e) => sum + (e.views || 0), 0);
          clicks = campaignEvents.reduce((sum, e) => sum + (e.clicks || 0), 0);
          
          // Get last active date from events
          const lastEvent = campaignEvents.sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )[0];
          if (lastEvent) {
            lastActive = lastEvent.created_at;
          }
        }

        return {
          id: campaign.id,
          name: campaign.name,
          type: campaign.campaign_type || 'notification',
          views,
          clicks,
          ctr: views > 0 ? (clicks / views) * 100 : 0,
          status: campaign.status,
          lastActive,
        };
      }).sort((a, b) => b.views - a.views);

      // Daily stats for trend chart - combine events and campaign_stats
      const dailyMap: Record<string, { date: string; views: number; clicks: number }> = {};
      
      // Add events to daily map
      events.forEach(event => {
        const date = new Date(event.created_at).toISOString().split('T')[0];
        if (!dailyMap[date]) {
          dailyMap[date] = { date, views: 0, clicks: 0 };
        }
        dailyMap[date].views += event.views || 0;
        dailyMap[date].clicks += event.clicks || 0;
      });
      
      // Add campaign stats to daily map
      userCampaignStats.forEach(stat => {
        const date = stat.date;
        if (!dailyMap[date]) {
          dailyMap[date] = { date, views: 0, clicks: 0 };
        }
        dailyMap[date].views += stat.views || 0;
        dailyMap[date].clicks += stat.clicks || 0;
      });

      const dailyStats = Object.values(dailyMap).sort((a, b) => 
        a.date.localeCompare(b.date)
      );

      // Event insights - group by event_type (include visitors_pulse as a type)
      const eventTypeMap: Record<string, number> = {};
      
      events.forEach(event => {
        const type = event.event_type || 'unknown';
        eventTypeMap[type] = (eventTypeMap[type] || 0) + 1;
      });
      
      // Add Visitors Pulse as a category if there are stats
      if (campaignStatsViews > 0) {
        eventTypeMap['visitors_pulse'] = userCampaignStats.length;
      }

      const totalEventTypes = Object.values(eventTypeMap).reduce((a, b) => a + b, 0);
      const eventInsights = Object.entries(eventTypeMap)
        .map(([eventType, count]) => ({
          eventType,
          count,
          percentage: totalEventTypes > 0 ? (count / totalEventTypes) * 100 : 0,
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
