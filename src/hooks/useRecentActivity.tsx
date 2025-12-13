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

export const useRecentActivity = (userId: string | undefined, limit: number = 10) => {
  return useQuery({
    queryKey: ['recent-activity', userId, limit],
    queryFn: async (): Promise<ActivityItem[]> => {
      if (!userId) return [];

      // Get user's websites
      const { data: websites } = await supabase
        .from('websites')
        .select('id')
        .eq('user_id', userId);

      if (!websites || websites.length === 0) return [];

      const websiteIds = websites.map(w => w.id);

      // Run independent queries in parallel
      const [widgetsResult, campaignsResult] = await Promise.all([
        supabase.from('widgets').select('id, name, website_id').in('website_id', websiteIds),
        supabase.from('campaigns').select('id, name, website_id').in('website_id', websiteIds),
      ]);

      const widgets = widgetsResult.data;
      const campaigns = campaignsResult.data;

      if (!widgets || widgets.length === 0) return [];

      const widgetIds = widgets.map(w => w.id);

      // Get recent events (depends on widgetIds)
      const { data: events } = await supabase
        .from('events')
        .select('id, event_type, message_template, views, clicks, created_at, widget_id')
        .in('widget_id', widgetIds)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (!events) return [];

      const widgetToWebsite = new Map(widgets.map(w => [w.id, w.website_id]));
      const websiteToCampaign = new Map(campaigns?.map(c => [c.website_id, c.name]) || []);

      return events.map(e => {
        const websiteId = widgetToWebsite.get(e.widget_id);
        const campaignName = websiteId ? websiteToCampaign.get(websiteId) : undefined;

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
