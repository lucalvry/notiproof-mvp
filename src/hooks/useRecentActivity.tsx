import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ActivityItem {
  id: string;
  type: string;
  message: string;
  views: number;
  clicks: number;
  createdAt: string;
  campaignName?: string;
}

export const useRecentActivity = (userId: string | undefined, limit: number = 10, websiteId?: string) => {
  return useQuery({
    queryKey: ['recent-activity', userId, limit, websiteId],
    queryFn: async (): Promise<ActivityItem[]> => {
      if (!userId) return [];

      // Get user's websites - filter by websiteId if provided
      let websitesQuery = supabase.from('websites').select('id').eq('user_id', userId);
      if (websiteId) {
        websitesQuery = websitesQuery.eq('id', websiteId);
      }
      
      const { data: websites } = await websitesQuery;

      if (!websites || websites.length === 0) return [];

      const websiteIds = websites.map(w => w.id);

      // Run independent queries in parallel
      const [widgetsResult, campaignsResult] = await Promise.all([
        supabase.from('widgets').select('id, name, website_id').in('website_id', websiteIds),
        supabase.from('campaigns').select('id, name, website_id, data_sources').in('website_id', websiteIds),
      ]);

      const widgets = widgetsResult.data;
      const campaigns = campaignsResult.data;
      const campaignIds = campaigns?.map(c => c.id) || [];

      const widgetIds = widgets?.map(w => w.id) || [];

      // Get recent events and campaign_stats in parallel
      const [eventsResult, campaignStatsResult] = await Promise.all([
        widgetIds.length > 0 
          ? supabase
              .from('events')
              .select('id, event_type, message_template, views, clicks, created_at, widget_id')
              .in('widget_id', widgetIds)
              .order('created_at', { ascending: false })
              .limit(limit)
          : Promise.resolve({ data: [] }),
        campaignIds.length > 0
          ? supabase
              .from('campaign_stats')
              .select('id, campaign_id, date, views, clicks')
              .in('campaign_id', campaignIds)
              .order('date', { ascending: false })
              .limit(limit)
          : Promise.resolve({ data: [] }),
      ]);

      const events = eventsResult.data || [];
      const campaignStats = campaignStatsResult.data || [];

      const widgetToWebsite = new Map(widgets?.map(w => [w.id, w.website_id]) || []);
      const websiteToCampaign = new Map(campaigns?.map(c => [c.website_id, c.name]) || []);
      const campaignIdToName = new Map(campaigns?.map(c => [c.id, c.name]) || []);
      const campaignIdToType = new Map(campaigns?.map(c => {
        const dataSources = c.data_sources as any[];
        const isLiveVisitors = dataSources?.some((ds: any) => ds.provider === 'live_visitors');
        return [c.id, isLiveVisitors ? 'live_visitors' : 'notification'];
      }) || []);

      // Map events to activity items
      const eventActivities: ActivityItem[] = events.map(e => {
        const eventWebsiteId = widgetToWebsite.get(e.widget_id);
        const campaignName = eventWebsiteId ? websiteToCampaign.get(eventWebsiteId) : undefined;

        return {
          id: e.id,
          type: e.event_type,
          message: e.message_template || getEventDescription(e.event_type),
          views: e.views || 0,
          clicks: e.clicks || 0,
          createdAt: e.created_at || new Date().toISOString(),
          campaignName,
        };
      });

      // Map campaign_stats to activity items (for Visitors Pulse campaigns)
      const statsActivities: ActivityItem[] = campaignStats.map(s => {
        const campaignName = campaignIdToName.get(s.campaign_id);
        const campaignType = campaignIdToType.get(s.campaign_id);

        return {
          id: s.id,
          type: campaignType || 'live_visitors',
          message: campaignType === 'live_visitors' 
            ? `Visitors Pulse shown ${s.views || 0} times` 
            : `Campaign notification shown`,
          views: s.views || 0,
          clicks: s.clicks || 0,
          createdAt: s.date ? new Date(s.date).toISOString() : new Date().toISOString(),
          campaignName,
        };
      });

      // Combine and sort by date, return top N
      const allActivities = [...eventActivities, ...statsActivities]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, limit);

      return allActivities;
    },
    enabled: !!userId,
    refetchInterval: 30000, // Refresh every 30 seconds
  });
};

function getEventDescription(eventType: string): string {
  const descriptions: Record<string, string> = {
    'purchase': 'Purchase notification shown',
    'signup': 'Signup notification displayed',
    'testimonial': 'Testimonial displayed',
    'announcement': 'Announcement shown',
    'form_submission': 'Form submitted',
    'live_visitors': 'Visitors pulse updated',
    'conversion': 'Conversion tracked',
    'visitor': 'Visitor activity recorded',
  };
  return descriptions[eventType] || 'Activity recorded';
}
