import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { subDays } from "date-fns";

export interface AnalyticsData {
  totalViews: number;
  totalClicks: number;
  conversionRate: number;
  topCampaigns: Array<{
    name: string;
    views: number;
    clicks: number;
    conversionRate: number;
  }>;
  topPages: Array<{
    url: string;
    views: number;
  }>;
  dailyStats: Array<{
    date: string;
    views: number;
    clicks: number;
  }>;
}

export const useAnalytics = (userId: string | undefined, days: number = 30) => {
  return useQuery({
    queryKey: ['analytics', userId, days],
    queryFn: async (): Promise<AnalyticsData> => {
      if (!userId) {
        return {
          totalViews: 0,
          totalClicks: 0,
          conversionRate: 0,
          topCampaigns: [],
          topPages: [],
          dailyStats: [],
        };
      }

      const startDate = subDays(new Date(), days).toISOString();

      // Get user's websites
      const { data: websites } = await supabase
        .from('websites')
        .select('id')
        .eq('user_id', userId);

      if (!websites || websites.length === 0) {
        return {
          totalViews: 0,
          totalClicks: 0,
          conversionRate: 0,
          topCampaigns: [],
          topPages: [],
          dailyStats: [],
        };
      }

      const websiteIds = websites.map(w => w.id);

      // Get widgets for user's websites
      const { data: widgets } = await supabase
        .from('widgets')
        .select('id, name')
        .in('website_id', websiteIds);

      const widgetIds = widgets?.map(w => w.id) || [];

      if (widgetIds.length === 0) {
        return {
          totalViews: 0,
          totalClicks: 0,
          conversionRate: 0,
          topCampaigns: [],
          topPages: [],
          dailyStats: [],
        };
      }

      // Get events for the date range
      const { data: events } = await supabase
        .from('events')
        .select('widget_id, views, clicks, page_url, created_at')
        .in('widget_id', widgetIds)
        .gte('created_at', startDate)
        .order('created_at', { ascending: true });

      const totalViews = events?.reduce((sum, e) => sum + (e.views || 0), 0) || 0;
      const totalClicks = events?.reduce((sum, e) => sum + (e.clicks || 0), 0) || 0;
      const conversionRate = totalViews > 0 ? (totalClicks / totalViews) * 100 : 0;

      // Top campaigns
      const campaignStats = widgets?.map(widget => {
        const widgetEvents = events?.filter(e => e.widget_id === widget.id) || [];
        const views = widgetEvents.reduce((sum, e) => sum + (e.views || 0), 0);
        const clicks = widgetEvents.reduce((sum, e) => sum + (e.clicks || 0), 0);
        return {
          name: widget.name,
          views,
          clicks,
          conversionRate: views > 0 ? (clicks / views) * 100 : 0,
        };
      }).sort((a, b) => b.views - a.views).slice(0, 5) || [];

      // Top pages
      const pageStats = events?.reduce((acc, event) => {
        if (!event.page_url) return acc;
        const existing = acc.find(p => p.url === event.page_url);
        if (existing) {
          existing.views += event.views || 0;
        } else {
          acc.push({ url: event.page_url, views: event.views || 0 });
        }
        return acc;
      }, [] as Array<{ url: string; views: number }>)
        .sort((a, b) => b.views - a.views)
        .slice(0, 5) || [];

      // Daily stats (simplified - group by date)
      const dailyMap = events?.reduce((acc, event) => {
        const date = new Date(event.created_at).toISOString().split('T')[0];
        if (!acc[date]) {
          acc[date] = { date, views: 0, clicks: 0 };
        }
        acc[date].views += event.views || 0;
        acc[date].clicks += event.clicks || 0;
        return acc;
      }, {} as Record<string, { date: string; views: number; clicks: number }>);

      const dailyStats = Object.values(dailyMap || {}).sort((a, b) => 
        a.date.localeCompare(b.date)
      );

      return {
        totalViews,
        totalClicks,
        conversionRate,
        topCampaigns: campaignStats,
        topPages: pageStats,
        dailyStats,
      };
    },
    enabled: !!userId,
  });
};
