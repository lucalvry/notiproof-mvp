import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface CampaignMetrics {
  totalViews: number;
  totalClicks: number;
  ctr: number;
  widgetCount: number;
  loading: boolean;
}

export function useCampaignMetrics(campaignId: string | undefined) {
  const [metrics, setMetrics] = useState<CampaignMetrics>({
    totalViews: 0,
    totalClicks: 0,
    ctr: 0,
    widgetCount: 0,
    loading: true,
  });

  useEffect(() => {
    if (!campaignId) return;

    const fetchMetrics = async () => {
      try {
        // Fetch widgets for this campaign
        const { data: widgets, error: widgetsError } = await supabase
          .from("widgets")
          .select("id")
          .eq("campaign_id", campaignId);

        if (widgetsError) throw widgetsError;

        const widgetIds = widgets?.map(w => w.id) || [];
        
        if (widgetIds.length === 0) {
          setMetrics({
            totalViews: 0,
            totalClicks: 0,
            ctr: 0,
            widgetCount: 0,
            loading: false,
          });
          return;
        }

        // Fetch events for these widgets
        const { data: events, error: eventsError } = await supabase
          .from("events")
          .select("views, clicks")
          .in("widget_id", widgetIds);

        if (eventsError) throw eventsError;

        const totalViews = events?.reduce((sum, e) => sum + (e.views || 0), 0) || 0;
        const totalClicks = events?.reduce((sum, e) => sum + (e.clicks || 0), 0) || 0;
        const ctr = totalViews > 0 ? (totalClicks / totalViews) * 100 : 0;

        setMetrics({
          totalViews,
          totalClicks,
          ctr,
          widgetCount: widgets?.length || 0,
          loading: false,
        });
      } catch (error) {
        console.error("Error fetching campaign metrics:", error);
        setMetrics(prev => ({ ...prev, loading: false }));
      }
    };

    fetchMetrics();

    // Subscribe to real-time updates
    const subscription = supabase
      .channel(`campaign_metrics_${campaignId}`)
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

    return () => {
      subscription.unsubscribe();
    };
  }, [campaignId]);

  return metrics;
}
