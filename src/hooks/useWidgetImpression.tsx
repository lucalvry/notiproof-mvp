import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ImpressionData {
  widgetId: string;
  eventId?: string;
  pageUrl: string;
  userAgent?: string;
  viewportWidth?: number;
  viewportHeight?: number;
}

export const useWidgetImpression = () => {
  const trackImpression = useCallback(async (data: ImpressionData) => {
    try {
      const impressionData = {
        widget_id: data.widgetId,
        event_id: data.eventId,
        page_url: data.pageUrl,
        user_agent: data.userAgent || navigator.userAgent,
        viewport_width: data.viewportWidth || window.innerWidth,
        viewport_height: data.viewportHeight || window.innerHeight,
        session_id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        created_at: new Date().toISOString()
      };

      // Track widget impression
      const { error } = await supabase
        .from('widget_impressions')
        .insert(impressionData);

      if (error) {
        console.error('Error tracking widget impression:', error);
        return;
      }

      // Update event views if eventId provided
      if (data.eventId) {
        await supabase
          .from('events')
          .update({ views: 1 })
          .eq('id', data.eventId);
      }
    } catch (error) {
      console.error('Error in impression tracking:', error);
    }
  }, []);

  const trackClick = useCallback(async (data: ImpressionData & { clickX?: number; clickY?: number; elementSelector?: string }) => {
    try {
      // Track heatmap click
      const clickData = {
        widget_id: data.widgetId,
        event_id: data.eventId,
        page_url: data.pageUrl,
        click_x: data.clickX || 0,
        click_y: data.clickY || 0,
        viewport_width: data.viewportWidth || window.innerWidth,
        viewport_height: data.viewportHeight || window.innerHeight,
        element_selector: data.elementSelector,
        session_id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      };

      const { error } = await supabase
        .from('heatmap_clicks')
        .insert(clickData);

      if (error) {
        console.error('Error tracking click:', error);
        return;
      }

      // Update event clicks if eventId provided
      if (data.eventId) {
        await supabase
          .from('events')
          .update({ clicks: 1 })
          .eq('id', data.eventId);
      }
    } catch (error) {
      console.error('Error in click tracking:', error);
    }
  }, []);

  return { trackImpression, trackClick };
};