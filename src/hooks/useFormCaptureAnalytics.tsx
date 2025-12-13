import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface FormCaptureAnalytics {
  totalCaptures: number;
  approvedCaptures: number;
  pendingCaptures: number;
  rejectedCaptures: number;
  approvalRate: number;
  totalViews: number;
  totalClicks: number;
  clickRate: number;
}

export function useFormCaptureAnalytics(websiteId: string) {
  return useQuery({
    queryKey: ["form-capture-analytics", websiteId],
    queryFn: async (): Promise<FormCaptureAnalytics> => {
      if (!websiteId) {
        return {
          totalCaptures: 0,
          approvedCaptures: 0,
          pendingCaptures: 0,
          rejectedCaptures: 0,
          approvalRate: 0,
          totalViews: 0,
          totalClicks: 0,
          clickRate: 0,
        };
      }

      // Fetch all form capture events
      const { data: events, error } = await supabase
        .from("events")
        .select("moderation_status, views, clicks")
        .eq("website_id", websiteId)
        .eq("event_type", "form_capture");

      if (error) throw error;

      const totalCaptures = events?.length || 0;
      const approvedCaptures = events?.filter(e => e.moderation_status === "approved").length || 0;
      const pendingCaptures = events?.filter(e => e.moderation_status === "pending" || !e.moderation_status).length || 0;
      const rejectedCaptures = events?.filter(e => e.moderation_status === "rejected").length || 0;
      const approvalRate = totalCaptures > 0 ? (approvedCaptures / totalCaptures) * 100 : 0;

      const totalViews = events?.reduce((sum, e) => sum + (e.views || 0), 0) || 0;
      const totalClicks = events?.reduce((sum, e) => sum + (e.clicks || 0), 0) || 0;
      const clickRate = totalViews > 0 ? (totalClicks / totalViews) * 100 : 0;

      return {
        totalCaptures,
        approvedCaptures,
        pendingCaptures,
        rejectedCaptures,
        approvalRate,
        totalViews,
        totalClicks,
        clickRate,
      };
    },
    enabled: !!websiteId,
  });
}
