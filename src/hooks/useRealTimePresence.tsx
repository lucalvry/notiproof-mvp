import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

interface PresenceState {
  user_id?: string;
  widget_id: string;
  page_url: string;
  online_at: string;
  user_agent?: string;
}

interface UseRealTimePresenceProps {
  widgetId: string;
  pageUrl: string;
  userId?: string;
}

export const useRealTimePresence = ({ widgetId, pageUrl, userId }: UseRealTimePresenceProps) => {
  const [presenceState, setPresenceState] = useState<Record<string, PresenceState[]>>({});
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  const [onlineCount, setOnlineCount] = useState(0);

  const updatePresence = useCallback(async () => {
    if (!channel) return;

    const presenceData: PresenceState = {
      user_id: userId,
      widget_id: widgetId,
      page_url: pageUrl,
      online_at: new Date().toISOString(),
      user_agent: navigator.userAgent
    };

    await channel.track(presenceData);
  }, [channel, widgetId, pageUrl, userId]);

  useEffect(() => {
    const channelName = `widget_presence_${widgetId}`;
    const newChannel = supabase.channel(channelName, {
      config: {
        presence: {
          key: userId || `anonymous_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        }
      }
    });

    newChannel
      .on('presence', { event: 'sync' }, () => {
        const state = newChannel.presenceState();
        
        // Count unique users online from presence state
        const uniqueUsers = new Set();
        Object.values(state).forEach((presenceArray) => {
          presenceArray.forEach((presence: any) => {
            const key = presence.user_id || presence.user_agent || 'anonymous';
            uniqueUsers.add(key);
          });
        });
        setOnlineCount(uniqueUsers.size);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('User joined:', key, newPresences);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('User left:', key, leftPresences);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await updatePresence();
        }
      });

    setChannel(newChannel);

    // Update presence every 30 seconds
    const interval = setInterval(updatePresence, 30000);

    // Update presence on page visibility change
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        updatePresence();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      supabase.removeChannel(newChannel);
    };
  }, [widgetId, pageUrl, userId, updatePresence]);

  return {
    presenceState,
    onlineCount,
    updatePresence
  };
};