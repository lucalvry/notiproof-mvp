import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useDemoEvents } from '@/hooks/useDemoEvents';
import { useToast } from '@/hooks/use-toast';

interface EventStats {
  totalEvents: number;
  realEvents: number;
  demoEvents: number;
  reachedThreshold: boolean;
}

export const useSmartDemoManager = (threshold: number = 20) => {
  const { profile } = useAuth();
  const { clearAllDemoEvents } = useDemoEvents();
  const { toast } = useToast();
  const [eventStats, setEventStats] = useState<EventStats>({
    totalEvents: 0,
    realEvents: 0,
    demoEvents: 0,
    reachedThreshold: false
  });
  const [loading, setLoading] = useState(false);
  const [shouldShowClearPrompt, setShouldShowClearPrompt] = useState(false);

  const fetchEventStats = async () => {
    if (!profile?.id) return;

    try {
      // Get user's widgets
      const { data: widgets } = await supabase
        .from('widgets')
        .select('id')
        .eq('user_id', profile.id);

      if (!widgets || widgets.length === 0) return;

      const widgetIds = widgets.map(w => w.id);

      // Get events with source information
      const { data: events } = await supabase
        .from('events')
        .select('source, created_at')
        .in('widget_id', widgetIds);

      if (!events) return;

      const realEvents = events.filter(e => e.source !== 'demo').length;
      const demoEvents = events.filter(e => e.source === 'demo').length;
      const totalEvents = events.length;
      const reachedThreshold = realEvents >= threshold;

      const newStats = {
        totalEvents,
        realEvents,
        demoEvents,
        reachedThreshold
      };

      setEventStats(newStats);

      // Show clear prompt if threshold reached and we have demo events
      if (reachedThreshold && demoEvents > 0 && !shouldShowClearPrompt) {
        setShouldShowClearPrompt(true);
      }
    } catch (error) {
      console.error('Error fetching event stats:', error);
    }
  };

  const handleSmartClear = async () => {
    if (!profile?.id) return;

    setLoading(true);
    try {
      const success = await clearAllDemoEvents(profile.id);
      if (success) {
        setShouldShowClearPrompt(false);
        await fetchEventStats();
        
        toast({
          title: 'Demo events cleared',
          description: `Cleared ${eventStats.demoEvents} demo events. Your analytics now show only real data.`,
        });
      }
    } catch (error) {
      console.error('Error in smart clear:', error);
    } finally {
      setLoading(false);
    }
  };

  const dismissClearPrompt = () => {
    setShouldShowClearPrompt(false);
  };

  useEffect(() => {
    fetchEventStats();
  }, [profile?.id]);

  return {
    eventStats,
    shouldShowClearPrompt,
    handleSmartClear,
    dismissClearPrompt,
    refreshStats: fetchEventStats,
    loading,
    threshold
  };
};