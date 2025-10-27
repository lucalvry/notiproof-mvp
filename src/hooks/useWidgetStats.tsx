import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface WidgetStats {
  totalViews: number;
  totalClicks: number;
  conversionRate: number;
  activeWidgets: number;
  totalEvents: number;
}

export const useWidgetStats = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['widget-stats', userId],
    queryFn: async (): Promise<WidgetStats> => {
      if (!userId) {
        return {
          totalViews: 0,
          totalClicks: 0,
          conversionRate: 0,
          activeWidgets: 0,
          totalEvents: 0,
        };
      }

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
          activeWidgets: 0,
          totalEvents: 0,
        };
      }

      const websiteIds = websites.map(w => w.id);

      // Get widgets for user's websites
      const { data: widgets } = await supabase
        .from('widgets')
        .select('id, status')
        .in('website_id', websiteIds);

      const activeWidgets = widgets?.filter(w => w.status === 'active').length || 0;
      const widgetIds = widgets?.map(w => w.id) || [];

      if (widgetIds.length === 0) {
        return {
          totalViews: 0,
          totalClicks: 0,
          conversionRate: 0,
          activeWidgets,
          totalEvents: 0,
        };
      }

      // Get events for user's widgets
      const { data: events } = await supabase
        .from('events')
        .select('views, clicks')
        .in('widget_id', widgetIds);

      const totalViews = events?.reduce((sum, e) => sum + (e.views || 0), 0) || 0;
      const totalClicks = events?.reduce((sum, e) => sum + (e.clicks || 0), 0) || 0;
      const conversionRate = totalViews > 0 ? (totalClicks / totalViews) * 100 : 0;

      return {
        totalViews,
        totalClicks,
        conversionRate,
        activeWidgets,
        totalEvents: events?.length || 0,
      };
    },
    enabled: !!userId,
  });
};
