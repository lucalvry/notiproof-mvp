import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface CampaignMetrics {
  totalViews: number;
  totalClicks: number;
  ctr: number;
  widgetCount: number;
  activeVisitors: number;
  totalSessions: number;
  loading: boolean;
}

export function useCampaignMetrics(campaignId: string | undefined) {
  const [metrics, setMetrics] = useState<CampaignMetrics>({
    totalViews: 0,
    totalClicks: 0,
    ctr: 0,
    widgetCount: 0,
    activeVisitors: 0,
    totalSessions: 0,
    loading: true,
  });

  useEffect(() => {
    if (!campaignId) return;

    const fetchMetrics = async () => {
      try {
        // Fetch campaign to check if it's a Visitors Pulse campaign
        const { data: campaign } = await supabase
          .from("campaigns")
          .select("data_sources, website_id")
          .eq("id", campaignId)
          .single();
        
        const dataSources = Array.isArray(campaign?.data_sources) ? campaign.data_sources : [];
        const isVisitorsPulse = dataSources.some((ds: any) => ds.provider === 'live_visitors');

        // Fetch widgets for this campaign
        const { data: widgets, error: widgetsError } = await supabase
          .from("widgets")
          .select("id")
          .eq("campaign_id", campaignId);

        if (widgetsError) throw widgetsError;

        const widgetIds = widgets?.map(w => w.id) || [];
        
        // Fetch campaign_stats for Visitors Pulse (stored directly by campaign_id)
        const { data: campaignStats, error: campaignStatsError } = await supabase
          .from("campaign_stats")
          .select("views, clicks")
          .eq("campaign_id", campaignId);

        if (campaignStatsError) throw campaignStatsError;

        // Sum campaign_stats (Visitors Pulse data)
        let statsViews = campaignStats?.reduce((sum, s) => sum + (s.views || 0), 0) || 0;
        let statsClicks = campaignStats?.reduce((sum, s) => sum + (s.clicks || 0), 0) || 0;

        // For Visitors Pulse, also fetch visitor_sessions as a fallback/supplementary data
        let activeVisitors = 0;
        let totalSessions = 0;
        
        if (isVisitorsPulse && campaign?.website_id) {
          // Get active visitor count (sessions active in last 5 minutes)
          const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
          
          const { count: activeCount } = await supabase
            .from("visitor_sessions")
            .select("*", { count: "exact", head: true })
            .eq("is_active", true)
            .gte("last_seen_at", fiveMinutesAgo);
          
          activeVisitors = activeCount || 0;
          
          // Get total session count for the website
          const { count: sessionCount } = await supabase
            .from("visitor_sessions")
            .select("*", { count: "exact", head: true });
          
          totalSessions = sessionCount || 0;
          
          // If campaign_stats is empty but we have sessions, use session count as view proxy
          if (statsViews === 0 && totalSessions > 0) {
            statsViews = totalSessions;
          }
        }

        // If no widgets, just use campaign_stats
        if (widgetIds.length === 0) {
          const ctr = statsViews > 0 ? (statsClicks / statsViews) * 100 : 0;
          setMetrics({
            totalViews: statsViews,
            totalClicks: statsClicks,
            ctr,
            widgetCount: 0,
            activeVisitors,
            totalSessions,
            loading: false,
          });
          return;
        }

        // Fetch events for these widgets (other campaign types)
        const { data: events, error: eventsError } = await supabase
          .from("events")
          .select("views, clicks")
          .in("widget_id", widgetIds);

        if (eventsError) throw eventsError;

        const eventsViews = events?.reduce((sum, e) => sum + (e.views || 0), 0) || 0;
        const eventsClicks = events?.reduce((sum, e) => sum + (e.clicks || 0), 0) || 0;
        
        // Combine both sources
        const totalViews = eventsViews + statsViews;
        const totalClicks = eventsClicks + statsClicks;
        const ctr = totalViews > 0 ? (totalClicks / totalViews) * 100 : 0;

        setMetrics({
          totalViews,
          totalClicks,
          ctr,
          widgetCount: widgets?.length || 0,
          activeVisitors,
          totalSessions,
          loading: false,
        });
      } catch (error) {
        console.error("Error fetching campaign metrics:", error);
        setMetrics(prev => ({ ...prev, loading: false }));
      }
    };

    fetchMetrics();

    // Subscribe to real-time updates for events, campaign_stats, and visitor_sessions
    const eventsChannel = supabase
      .channel(`campaign_metrics_events_${campaignId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "events",
        },
        () => {
          fetchMetrics();
        }
      )
      .subscribe();

    const statsChannel = supabase
      .channel(`campaign_metrics_stats_${campaignId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "campaign_stats",
          filter: `campaign_id=eq.${campaignId}`,
        },
        () => {
          fetchMetrics();
        }
      )
      .subscribe();

    const sessionsChannel = supabase
      .channel(`campaign_metrics_sessions_${campaignId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "visitor_sessions",
        },
        () => {
          fetchMetrics();
        }
      )
      .subscribe();

    return () => {
      eventsChannel.unsubscribe();
      statsChannel.unsubscribe();
      sessionsChannel.unsubscribe();
    };
  }, [campaignId]);

  return metrics;
}
