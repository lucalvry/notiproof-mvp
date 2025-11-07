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
        // Get all widgets for this campaign
        const { data: widgets, error: widgetsError } = await supabase
          .from("widgets")
          .select("id")
          .eq("campaign_id", campaignId);

        if (widgetsError) throw widgetsError;
        if (!widgets || widgets.length === 0) {
          setDailyStats([]);
          return;
        }

        const widgetIds = widgets.map((w) => w.id);

        // Get events for these widgets within date range
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - dateRange);

        const { data: events, error: eventsError } = await supabase
          .from("events")
          .select("created_at, views, clicks")
          .in("widget_id", widgetIds)
          .gte("created_at", startDate.toISOString());

        if (eventsError) throw eventsError;

        // Aggregate by date
        const statsMap = new Map<string, { views: number; clicks: number }>();
        
        events?.forEach((event) => {
          const date = new Date(event.created_at).toISOString().split("T")[0];
          const existing = statsMap.get(date) || { views: 0, clicks: 0 };
          statsMap.set(date, {
            views: existing.views + (event.views || 0),
            clicks: existing.clicks + (event.clicks || 0),
          });
        });

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
