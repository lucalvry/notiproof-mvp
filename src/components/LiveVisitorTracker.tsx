import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface VisitorSession {
  id: string;
  widget_id: string;
  session_id: string;
  page_url: string;
  user_agent: string;
  ip_address: string;
  started_at: string;
  last_seen_at: string;
  is_active: boolean;
}

interface LiveVisitorTrackerProps {
  widgetId: string;
  onVisitorCountChange?: (count: number) => void;
}

export const LiveVisitorTracker = ({ widgetId, onVisitorCountChange }: LiveVisitorTrackerProps) => {
  const [visitors, setVisitors] = useState<VisitorSession[]>([]);
  const [currentSessionId] = useState(() => 
    `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  );

  useEffect(() => {
    // Start tracking this session
    trackCurrentSession();
    
    // Set up periodic heartbeat
    const heartbeatInterval = setInterval(sendHeartbeat, 30000); // 30 seconds
    
    // Set up real-time listener for visitor updates
    const channel = supabase
      .channel('visitor_sessions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'visitor_sessions',
          filter: `widget_id=eq.${widgetId}`
        },
        (payload) => {
          console.log('Visitor session update:', payload);
          loadActiveVisitors();
        }
      )
      .subscribe();

    // Load initial visitor count
    loadActiveVisitors();

    // Cleanup function
    return () => {
      clearInterval(heartbeatInterval);
      supabase.removeChannel(channel);
      endSession();
    };
  }, [widgetId]);

  const trackCurrentSession = async () => {
    try {
      const sessionData = {
        widget_id: widgetId,
        session_id: currentSessionId,
        page_url: window.location.href,
        user_agent: navigator.userAgent,
        ip_address: await getClientIP(),
        started_at: new Date().toISOString(),
        last_seen_at: new Date().toISOString(),
        is_active: true
      };

      // Insert or update the session
      const { error } = await supabase
        .from('visitor_sessions')
        .upsert(sessionData, {
          onConflict: 'session_id'
        });

      if (error) {
        console.error('Error tracking session:', error);
      }
    } catch (error) {
      console.error('Error in trackCurrentSession:', error);
    }
  };

  const sendHeartbeat = async () => {
    try {
      const { error } = await supabase
        .from('visitor_sessions')
        .update({
          last_seen_at: new Date().toISOString(),
          is_active: true,
          page_url: window.location.href
        })
        .eq('session_id', currentSessionId);

      if (error) {
        console.error('Error sending heartbeat:', error);
      }
    } catch (error) {
      console.error('Error in sendHeartbeat:', error);
    }
  };

  const endSession = async () => {
    try {
      const { error } = await supabase
        .from('visitor_sessions')
        .update({
          is_active: false,
          last_seen_at: new Date().toISOString()
        })
        .eq('session_id', currentSessionId);

      if (error) {
        console.error('Error ending session:', error);
      }
    } catch (error) {
      console.error('Error in endSession:', error);
    }
  };

  const loadActiveVisitors = async () => {
    try {
      // Consider sessions active if last_seen_at is within 2 minutes
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
      
      const { data, error } = await supabase
        .from('visitor_sessions')
        .select('*')
        .eq('widget_id', widgetId)
        .eq('is_active', true)
        .gte('last_seen_at', twoMinutesAgo);

      if (error) {
        console.error('Error loading visitors:', error);
        return;
      }

      setVisitors(data || []);
      onVisitorCountChange?.(data?.length || 0);
    } catch (error) {
      console.error('Error in loadActiveVisitors:', error);
    }
  };

  const getClientIP = async (): Promise<string> => {
    try {
      // In a real implementation, you'd get this from your server
      // For now, return a placeholder
      return 'unknown';
    } catch {
      return 'unknown';
    }
  };

  // Clean up inactive sessions periodically
  useEffect(() => {
    const cleanupInterval = setInterval(async () => {
      try {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        
        await supabase
          .from('visitor_sessions')
          .update({ is_active: false })
          .lt('last_seen_at', fiveMinutesAgo)
          .eq('is_active', true);
      } catch (error) {
        console.error('Error cleaning up sessions:', error);
      }
    }, 60000); // Clean up every minute

    return () => clearInterval(cleanupInterval);
  }, []);

  return null; // This is a headless component
};