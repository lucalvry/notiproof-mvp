import { supabase } from '@/integrations/supabase/client';

export interface VisitorSession {
  id: string;
  session_id: string;
  widget_id: string;
  page_url: string;
  user_agent?: string;
  ip_address?: string;
  is_active: boolean;
  started_at: string;
  last_seen_at: string;
  created_at: string;
}

export interface VisitorStats {
  currentVisitors: number;
  todayVisitors: number;
  peakToday: number;
  lastUpdated: Date;
}

class VisitorTrackingService {
  private sessionId: string;
  private heartbeatInterval?: NodeJS.Timeout;
  private readonly HEARTBEAT_INTERVAL = 30000; // 30 seconds
  private readonly SESSION_TIMEOUT = 300000; // 5 minutes

  constructor() {
    this.sessionId = this.generateSessionId();
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${performance.now()}`;
  }

  async startTracking(widgetId: string, pageUrl: string): Promise<void> {
    try {
      // Try to create new visitor session with upsert behavior
      const { error } = await supabase
        .from('visitor_sessions')
        .upsert({
          session_id: this.sessionId,
          widget_id: widgetId,
          page_url: pageUrl,
          user_agent: navigator.userAgent,
          is_active: true,
          started_at: new Date().toISOString(),
          last_seen_at: new Date().toISOString()
        }, {
          onConflict: 'session_id',
          ignoreDuplicates: false
        });

      if (error) {
        console.error('Error creating visitor session:', error);
        return;
      }

      // Start heartbeat to keep session alive
      this.startHeartbeat(widgetId);

      // Listen for page visibility changes
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.pauseSession(widgetId);
        } else {
          this.resumeSession(widgetId);
        }
      });

      // Clean up on page unload
      window.addEventListener('beforeunload', () => {
        this.endSession(widgetId);
      });

    } catch (error) {
      console.error('Error starting visitor tracking:', error);
    }
  }

  private startHeartbeat(widgetId: string): void {
    this.heartbeatInterval = setInterval(() => {
      this.updateLastSeen(widgetId);
    }, this.HEARTBEAT_INTERVAL);
  }

  private async updateLastSeen(widgetId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('visitor_sessions')
        .update({
          last_seen_at: new Date().toISOString(),
          is_active: true
        })
        .eq('session_id', this.sessionId)
        .eq('widget_id', widgetId);

      if (error) {
        console.error('Error updating last seen:', error);
      }
    } catch (error) {
      console.error('Error in updateLastSeen:', error);
    }
  }

  private async pauseSession(widgetId: string): Promise<void> {
    try {
      await supabase
        .from('visitor_sessions')
        .update({ is_active: false })
        .eq('session_id', this.sessionId)
        .eq('widget_id', widgetId);
    } catch (error) {
      console.error('Error pausing session:', error);
    }
  }

  private async resumeSession(widgetId: string): Promise<void> {
    try {
      await supabase
        .from('visitor_sessions')
        .update({
          is_active: true,
          last_seen_at: new Date().toISOString()
        })
        .eq('session_id', this.sessionId)
        .eq('widget_id', widgetId);
    } catch (error) {
      console.error('Error resuming session:', error);
    }
  }

  async endSession(widgetId: string): Promise<void> {
    try {
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = undefined;
      }

      await supabase
        .from('visitor_sessions')
        .update({ is_active: false })
        .eq('session_id', this.sessionId)
        .eq('widget_id', widgetId);
    } catch (error) {
      console.error('Error ending session:', error);
    }
  }

  async getVisitorStats(widgetId: string): Promise<VisitorStats> {
    try {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const fiveMinutesAgo = new Date(now.getTime() - this.SESSION_TIMEOUT);

      // Get current active visitors (last seen within 5 minutes)
      const { data: currentSessions, error: currentError } = await supabase
        .from('visitor_sessions')
        .select('id')
        .eq('widget_id', widgetId)
        .eq('is_active', true)
        .gte('last_seen_at', fiveMinutesAgo.toISOString());

      if (currentError) {
        console.error('Error fetching current visitors:', currentError);
      }

      // Get today's total visitors
      const { data: todaySessions, error: todayError } = await supabase
        .from('visitor_sessions')
        .select('id')
        .eq('widget_id', widgetId)
        .gte('started_at', todayStart.toISOString());

      if (todayError) {
        console.error('Error fetching today visitors:', todayError);
      }

      // For peak calculation, we'd need to implement hourly aggregation
      // For now, use a simple estimate
      const peakToday = Math.ceil((todaySessions?.length || 0) * 0.3);

      return {
        currentVisitors: currentSessions?.length || 0,
        todayVisitors: todaySessions?.length || 0,
        peakToday,
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error('Error getting visitor stats:', error);
      return {
        currentVisitors: 0,
        todayVisitors: 0,
        peakToday: 0,
        lastUpdated: new Date()
      };
    }
  }

  async cleanupOldSessions(): Promise<void> {
    try {
      const cutoffTime = new Date(Date.now() - this.SESSION_TIMEOUT);
      
      await supabase
        .from('visitor_sessions')
        .update({ is_active: false })
        .eq('is_active', true)
        .lt('last_seen_at', cutoffTime.toISOString());
    } catch (error) {
      console.error('Error cleaning up old sessions:', error);
    }
  }
}

export const visitorTrackingService = new VisitorTrackingService();
