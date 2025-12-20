import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { subDays, format, eachDayOfInterval, startOfDay } from "date-fns";

interface AdminMetrics {
  platformWide: {
    totalEvents: number;
    totalViews: number;
    totalClicks: number;
    ctr: number;
    activeWidgets: number;
    eventsToday: number;
    eventsThisWeek: number;
    eventsThisMonth: number;
  };
  trendData: Array<{ date: string; views: number; clicks: number }>;
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
    campaigns: Array<{
      id: string;
      name: string;
      owner_name: string;
      website_name: string;
      views: number;
      clicks: number;
      ctr: number;
      status: string;
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

export function useAdminMetrics(days: number = 14) {
  return useQuery({
    queryKey: ["admin-metrics", days],
    queryFn: async (): Promise<AdminMetrics> => {
      const now = new Date();
      const startDate = subDays(now, days);
      const startDateISO = startDate.toISOString();

      // Fetch events within date range for platform-wide metrics
      const { data: filteredEvents, error: eventsError } = await supabase
        .from("events")
        .select("views, clicks, created_at, widget_id")
        .gte("created_at", startDateISO);

      if (eventsError) throw eventsError;

      const today = startOfDay(now);
      const weekAgo = subDays(now, 7);
      const monthAgo = subDays(now, 30);

      const totalViews = filteredEvents?.reduce((sum, e) => sum + (e.views || 0), 0) || 0;
      const totalClicks = filteredEvents?.reduce((sum, e) => sum + (e.clicks || 0), 0) || 0;
      const totalEvents = filteredEvents?.length || 0;
      const ctr = totalViews > 0 ? (totalClicks / totalViews) * 100 : 0;
      
      const eventsToday = filteredEvents?.filter(e => new Date(e.created_at) >= today).length || 0;
      const eventsThisWeek = filteredEvents?.filter(e => new Date(e.created_at) >= weekAgo).length || 0;
      const eventsThisMonth = filteredEvents?.filter(e => new Date(e.created_at) >= monthAgo).length || 0;

      // Generate trend data for chart
      const dateRange = eachDayOfInterval({ start: startDate, end: now });
      const trendData = dateRange.map(date => {
        const dateStr = format(date, "MMM d");
        const dayStart = startOfDay(date);
        const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000 - 1);
        
        const dayEvents = filteredEvents?.filter(e => {
          const eventDate = new Date(e.created_at);
          return eventDate >= dayStart && eventDate <= dayEnd;
        }) || [];

        return {
          date: dateStr,
          views: dayEvents.reduce((sum, e) => sum + (e.views || 0), 0),
          clicks: dayEvents.reduce((sum, e) => sum + (e.clicks || 0), 0),
        };
      });

      // Fetch active widgets count
      const { count: activeWidgetsCount } = await supabase
        .from("widgets")
        .select("*", { count: "exact", head: true })
        .eq("status", "active");

      // Fetch top performing widgets with date filter
      const { data: widgets } = await supabase
        .from("widgets")
        .select("id, name, websites!inner(name)")
        .limit(10);

      const widgetMetrics = await Promise.all(
        (widgets || []).map(async (widget: any) => {
          const { data: events } = await supabase
            .from("events")
            .select("views, clicks")
            .eq("widget_id", widget.id)
            .gte("created_at", startDateISO);

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

      // Fetch top performing campaigns with owner info
      const { data: campaigns } = await supabase
        .from("campaigns")
        .select(`
          id, 
          name, 
          status,
          user_id,
          websites!inner(name),
          profiles:user_id(name)
        `)
        .limit(20);

      const campaignMetrics = await Promise.all(
        (campaigns || []).map(async (campaign: any) => {
          // Get campaign stats
          const { data: campaignStats } = await supabase
            .from("campaign_stats")
            .select("views, clicks")
            .eq("campaign_id", campaign.id)
            .gte("date", format(startDate, "yyyy-MM-dd"));

          const views = campaignStats?.reduce((sum, s) => sum + (s.views || 0), 0) || 0;
          const clicks = campaignStats?.reduce((sum, s) => sum + (s.clicks || 0), 0) || 0;

          return {
            id: campaign.id,
            name: campaign.name,
            owner_name: campaign.profiles?.name || "Unknown",
            website_name: campaign.websites?.name || "Unknown",
            views,
            clicks,
            ctr: views > 0 ? (clicks / views) * 100 : 0,
            status: campaign.status,
          };
        })
      );

      const topCampaigns = campaignMetrics
        .sort((a, b) => b.views - a.views)
        .slice(0, 10);

      // Fetch top performing users
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name");

      let authUsers: any = { users: [] };
      try {
        const result = await supabase.auth.admin.listUsers();
        authUsers = result.data || { users: [] };
      } catch (e) {
        // Admin API may not be available
        console.log("Admin API not available, skipping user emails");
      }

      const userMetrics = await Promise.all(
        (profiles || []).slice(0, 20).map(async (profile: any) => {
          const authUser = authUsers?.users?.find((u: any) => u.id === profile.id);
          
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
            .in("widget_id", widgetIds)
            .gte("created_at", startDateISO);

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
        .gte("created_at", startDateISO)
        .order("created_at", { ascending: false })
        .limit(5);

      return {
        platformWide: {
          totalEvents,
          totalViews,
          totalClicks,
          ctr,
          activeWidgets: activeWidgetsCount || 0,
          eventsToday,
          eventsThisWeek,
          eventsThisMonth,
        },
        trendData,
        topPerformers: {
          widgets: topWidgets,
          users: topUsers,
          campaigns: topCampaigns,
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
