import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { visitorTrackingService, VisitorStats } from '@/services/visitorTrackingService';
import { useRealTimePresence } from '@/hooks/useRealTimePresence';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, TrendingUp, Eye, Clock, Wifi } from 'lucide-react';

interface RealTimeVisitorPresenceProps {
  widgetId: string;
  showDetails?: boolean;
  onStatsUpdate?: (stats: VisitorStats) => void;
}

export const RealTimeVisitorPresence = ({ 
  widgetId, 
  showDetails = true,
  onStatsUpdate 
}: RealTimeVisitorPresenceProps) => {
  const [stats, setStats] = useState<VisitorStats>({
    currentVisitors: 0,
    todayVisitors: 0,
    peakToday: 0,
    lastUpdated: new Date()
  });
  const [isLoading, setIsLoading] = useState(true);
  const channelRef = useRef<any>(null);
  const refreshIntervalRef = useRef<NodeJS.Timeout>();
  
  // Use real-time presence hook
  const { onlineCount, presenceState } = useRealTimePresence({
    widgetId,
    pageUrl: window.location.href
  });

  useEffect(() => {
    if (!widgetId) return;

    const initializeTracking = async () => {
      try {
        // Start visitor tracking for this widget
        await visitorTrackingService.startTracking(widgetId, window.location.href);
        
        // Get initial stats
        await refreshStats();
        
        // Set up real-time subscription
        setupRealtimeSubscription();
        
        // Set up periodic refresh
        refreshIntervalRef.current = setInterval(refreshStats, 30000); // Refresh every 30 seconds
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error initializing visitor tracking:', error);
        setIsLoading(false);
      }
    };

    const refreshStats = async () => {
      try {
        const newStats = await visitorTrackingService.getVisitorStats(widgetId);
        setStats(newStats);
        onStatsUpdate?.(newStats);
      } catch (error) {
        console.error('Error refreshing stats:', error);
      }
    };

    const setupRealtimeSubscription = () => {
      // Clean up existing channel
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }

      // Create new channel for real-time updates
      channelRef.current = supabase
        .channel(`visitor_sessions_${widgetId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'visitor_sessions',
            filter: `widget_id=eq.${widgetId}`
          },
          (payload) => {
            console.log('Visitor session change:', payload);
            // Refresh stats when visitor sessions change
            refreshStats();
          }
        )
        .subscribe((status) => {
          console.log(`Realtime subscription status: ${status}`);
        });
    };

    initializeTracking();

    // Cleanup function
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
      visitorTrackingService.endSession(widgetId);
    };
  }, [widgetId, onStatsUpdate]);

  // Clean up old sessions periodically
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      visitorTrackingService.cleanupOldSessions();
    }, 60000); // Clean up every minute

    return () => clearInterval(cleanupInterval);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" />
        Loading visitor data...
      </div>
    );
  }

  if (!showDetails) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        <Wifi className="w-3 h-3 text-green-500" />
        <span className="font-medium">{Math.max(stats.currentVisitors, onlineCount)}</span>
        <span className="text-muted-foreground">online now</span>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Users className="w-5 h-5" />
          Real-Time Visitors
          <Badge variant="outline" className="ml-auto">
            Live
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm text-muted-foreground">Online Now</span>
            </div>
            <div className="text-2xl font-bold">{Math.max(stats.currentVisitors, onlineCount)}</div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-orange-500" />
              <span className="text-sm text-muted-foreground">Peak Today</span>
            </div>
            <div className="text-2xl font-bold">{stats.peakToday}</div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-blue-500" />
              <span className="text-sm text-muted-foreground">Total Today</span>
            </div>
            <div className="text-2xl font-bold">{stats.todayVisitors}</div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-muted-foreground">Last Updated</span>
            </div>
            <div className="text-sm">
              {stats.lastUpdated.toLocaleTimeString()}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};