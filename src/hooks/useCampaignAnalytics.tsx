import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface DailyStats {
  date: string;
  views: number;
  clicks: number;
}

export function useCampaignAnalytics(campaignId: string | undefined, dateRange: number = 30) {
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!campaignId) return;

    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - dateRange);
        const startDateStr = startDate.toISOString().split("T")[0];

        // Fetch campaign_stats directly (Visitors Pulse stores data here)
        const { data: campaignStats, error: campaignStatsError } = await supabase
          .from("campaign_stats")
          .select("date, views, clicks")
          .eq("campaign_id", campaignId)
          .gte("date", startDateStr)
          .order("date", { ascending: true });

        if (campaignStatsError) throw campaignStatsError;

        // Get all widgets for this campaign (for events table)
        const { data: widgets, error: widgetsError } = await supabase
          .from("widgets")
          .select("id")
          .eq("campaign_id", campaignId);

        if (widgetsError) throw widgetsError;

        // Aggregate campaign_stats by date
        const statsMap = new Map<string, { views: number; clicks: number }>();
        
        campaignStats?.forEach((stat) => {
          const existing = statsMap.get(stat.date) || { views: 0, clicks: 0 };
          statsMap.set(stat.date, {
            views: existing.views + (stat.views || 0),
            clicks: existing.clicks + (stat.clicks || 0),
          });
        });

        // If there are widgets, also fetch events
        if (widgets && widgets.length > 0) {
          const widgetIds = widgets.map((w) => w.id);

          const { data: events, error: eventsError } = await supabase
            .from("events")
            .select("created_at, views, clicks")
            .in("widget_id", widgetIds)
            .gte("created_at", startDate.toISOString());

          if (eventsError) throw eventsError;

          // Add events data to stats map
          events?.forEach((event) => {
            const date = new Date(event.created_at).toISOString().split("T")[0];
            const existing = statsMap.get(date) || { views: 0, clicks: 0 };
            statsMap.set(date, {
              views: existing.views + (event.views || 0),
              clicks: existing.clicks + (event.clicks || 0),
            });
          });
        }

        // Convert to array and sort
        const stats = Array.from(statsMap.entries())
          .map(([date, data]) => ({
            date,
            views: data.views,
            clicks: data.clicks,
          }))
          .sort((a, b) => a.date.localeCompare(b.date));

        setDailyStats(stats);
      } catch (error) {
        console.error("Error fetching campaign analytics:", error);
        setDailyStats([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [campaignId, dateRange]);

  return { dailyStats, loading };
}
