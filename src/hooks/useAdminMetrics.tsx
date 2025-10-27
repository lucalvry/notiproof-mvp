import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface AdminMetrics {
  platformWide: {
    totalEvents: number;
    totalViews: number;
    totalClicks: number;
    activeWidgets: number;
    eventsToday: number;
    eventsThisWeek: number;
    eventsThisMonth: number;
  };
  topPerformers: {
    widgets: Array<{
      id: string;
      name: string;
      website_name: string;
      views: number;
      clicks: number;
      clickRate: number;
    }>;
    users: Array<{
      id: string;
      name: string;
      email: string;
      totalViews: number;
      totalClicks: number;
      widgetCount: number;
    }>;
  };
  integrationHealth: {
    totalConnectors: number;
    activeConnectors: number;
    failedSyncs: number;
    lastSyncErrors: Array<{
      connector_id: string;
      error_message: string;
      timestamp: string;
    }>;
  };
}

export function useAdminMetrics() {
  return useQuery({
    queryKey: ["admin-metrics"],
    queryFn: async (): Promise<AdminMetrics> => {
      // Fetch all events for platform-wide metrics
      const { data: allEvents, error: eventsError } = await supabase
        .from("events")
        .select("views, clicks, created_at");

      if (eventsError) throw eventsError;

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const totalViews = allEvents?.reduce((sum, e) => sum + (e.views || 0), 0) || 0;
      const totalClicks = allEvents?.reduce((sum, e) => sum + (e.clicks || 0), 0) || 0;
      const totalEvents = allEvents?.length || 0;
      
      const eventsToday = allEvents?.filter(e => new Date(e.created_at) >= today).length || 0;
      const eventsThisWeek = allEvents?.filter(e => new Date(e.created_at) >= weekAgo).length || 0;
      const eventsThisMonth = allEvents?.filter(e => new Date(e.created_at) >= monthAgo).length || 0;

      // Fetch active widgets count
      const { count: activeWidgetsCount } = await supabase
        .from("widgets")
        .select("*", { count: "exact", head: true })
        .eq("status", "active");

      // Fetch top performing widgets
      const { data: widgets } = await supabase
        .from("widgets")
        .select("id, name, websites!inner(name)")
        .limit(10);

      const widgetMetrics = await Promise.all(
        (widgets || []).map(async (widget: any) => {
          const { data: events } = await supabase
            .from("events")
            .select("views, clicks")
            .eq("widget_id", widget.id);

          const views = events?.reduce((sum, e) => sum + (e.views || 0), 0) || 0;
          const clicks = events?.reduce((sum, e) => sum + (e.clicks || 0), 0) || 0;

          return {
            id: widget.id,
            name: widget.name,
            website_name: widget.websites?.name || "Unknown",
            views,
            clicks,
            clickRate: views > 0 ? (clicks / views) * 100 : 0,
          };
        })
      );

      const topWidgets = widgetMetrics
        .sort((a, b) => b.views - a.views)
        .slice(0, 5);

      // Fetch top performing users
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name");

      const { data: authUsers } = await supabase.auth.admin.listUsers();

      const userMetrics = await Promise.all(
        (profiles || []).slice(0, 20).map(async (profile: any) => {
          const authUser = authUsers?.users.find((u: any) => u.id === profile.id);
          
          const { data: userWidgets } = await supabase
            .from("widgets")
            .select("id")
            .eq("user_id", profile.id);

          const widgetIds = userWidgets?.map(w => w.id) || [];
          
          if (widgetIds.length === 0) {
            return null;
          }

          const { data: userEvents } = await supabase
            .from("events")
            .select("views, clicks")
            .in("widget_id", widgetIds);

          const totalViews = userEvents?.reduce((sum, e) => sum + (e.views || 0), 0) || 0;
          const totalClicks = userEvents?.reduce((sum, e) => sum + (e.clicks || 0), 0) || 0;

          return {
            id: profile.id,
            name: profile.name || "Unknown",
            email: authUser?.email || "Unknown",
            totalViews,
            totalClicks,
            widgetCount: widgetIds.length,
          };
        })
      );

      const topUsers = (userMetrics
        .filter((u): u is NonNullable<typeof u> => u !== null)
        .sort((a, b) => b.totalViews - a.totalViews)
        .slice(0, 5));

      // Fetch integration health
      const { count: totalConnectors } = await supabase
        .from("integration_connectors")
        .select("*", { count: "exact", head: true });

      const { count: activeConnectors } = await supabase
        .from("integration_connectors")
        .select("*", { count: "exact", head: true })
        .eq("status", "active");

      const { data: integrationLogs } = await supabase
        .from("integration_logs")
        .select("*")
        .eq("status", "error")
        .order("created_at", { ascending: false })
        .limit(5);

      return {
        platformWide: {
          totalEvents,
          totalViews,
          totalClicks,
          activeWidgets: activeWidgetsCount || 0,
          eventsToday,
          eventsThisWeek,
          eventsThisMonth,
        },
        topPerformers: {
          widgets: topWidgets,
          users: topUsers,
        },
        integrationHealth: {
          totalConnectors: totalConnectors || 0,
          activeConnectors: activeConnectors || 0,
          failedSyncs: integrationLogs?.length || 0,
          lastSyncErrors: integrationLogs?.map(log => ({
            connector_id: log.integration_type,
            error_message: log.error_message || "Unknown error",
            timestamp: log.created_at,
          })) || [],
        },
      };
    },
    refetchInterval: 60000, // Refetch every minute
  });
}
