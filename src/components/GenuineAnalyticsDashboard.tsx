import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { RealTimeVisitorPresence } from './RealTimeVisitorPresence';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { TrendingUp, Users, MousePointer, Eye, Calendar, AlertCircle } from 'lucide-react';
import { VisitorStats } from '@/services/visitorTrackingService';

interface AnalyticsData {
  totalViews: number;
  totalClicks: number;
  clickThroughRate: number;
  uniqueVisitors: number;
  activeWidgets: number;
  recentEvents: any[];
  visitorTrend: any[];
  eventTrend: any[];
}

interface GenuineAnalyticsDashboardProps {
  widgetId?: string;
  timeRange?: '24h' | '7d' | '30d';
}

export const GenuineAnalyticsDashboard = ({ 
  widgetId, 
  timeRange = '7d' 
}: GenuineAnalyticsDashboardProps) => {
  const { profile } = useAuth();
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalViews: 0,
    totalClicks: 0,
    clickThroughRate: 0,
    uniqueVisitors: 0,
    activeWidgets: 0,
    recentEvents: [],
    visitorTrend: [],
    eventTrend: []
  });
  const [visitorStats, setVisitorStats] = useState<VisitorStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedWidget, setSelectedWidget] = useState<string | null>(widgetId || null);
  const [userWidgets, setUserWidgets] = useState<any[]>([]);

  useEffect(() => {
    if (profile?.id) {
      fetchUserWidgets();
      fetchAnalytics();
    }
  }, [profile?.id, selectedWidget, timeRange]);

  const fetchUserWidgets = async () => {
    try {
      const { data: widgets, error } = await supabase
        .from('widgets')
        .select('id, name, status')
        .eq('user_id', profile?.id)
        .eq('status', 'active');

      if (error) {
        console.error('Error fetching widgets:', error);
        return;
      }

      setUserWidgets(widgets || []);
      
      // If no specific widget selected, use the first one
      if (!selectedWidget && widgets && widgets.length > 0) {
        setSelectedWidget(widgets[0].id);
      }
    } catch (error) {
      console.error('Error fetching user widgets:', error);
    }
  };

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true);
      
      const now = new Date();
      let startDate: Date;
      
      switch (timeRange) {
        case '24h':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      }

      // Build query filters
      let eventsQuery = supabase
        .from('events')
        .select(`
          id,
          event_type,
          views,
          clicks,
          created_at,
          user_name,
          user_location,
          message_template,
          source,
          widget_id,
          widgets!inner(user_id, name)
        `)
        .eq('widgets.user_id', profile?.id)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      if (selectedWidget) {
        eventsQuery = eventsQuery.eq('widget_id', selectedWidget);
      }

      const { data: events, error: eventsError } = await eventsQuery;

      if (eventsError) {
        console.error('Error fetching events:', eventsError);
        return;
      }

      // Get visitor sessions
      let sessionsQuery = supabase
        .from('visitor_sessions')
        .select(`
          id,
          session_id,
          started_at,
          is_active,
          widget_id,
          widgets!inner(user_id)
        `)
        .eq('widgets.user_id', profile?.id)
        .gte('started_at', startDate.toISOString());

      if (selectedWidget) {
        sessionsQuery = sessionsQuery.eq('widget_id', selectedWidget);
      }

      const { data: sessions, error: sessionsError } = await sessionsQuery;

      if (sessionsError) {
        console.error('Error fetching visitor sessions:', sessionsError);
      }

      // Calculate analytics
      const totalViews = events?.reduce((sum, event) => sum + (event.views || 0), 0) || 0;
      const totalClicks = events?.reduce((sum, event) => sum + (event.clicks || 0), 0) || 0;
      const clickThroughRate = totalViews > 0 ? (totalClicks / totalViews) * 100 : 0;
      const uniqueVisitors = new Set(sessions?.map(s => s.session_id) || []).size;

      // Get active widgets count
      const { data: activeWidgets, error: widgetsError } = await supabase
        .from('widgets')
        .select('id')
        .eq('user_id', profile?.id)
        .eq('status', 'active');

      // Generate trend data
      const visitorTrend = generateTrendData(sessions || [], startDate, now, 'sessions');
      const eventTrend = generateTrendData(events || [], startDate, now, 'events');

      setAnalytics({
        totalViews,
        totalClicks,
        clickThroughRate,
        uniqueVisitors,
        activeWidgets: activeWidgets?.length || 0,
        recentEvents: events?.slice(0, 10) || [],
        visitorTrend,
        eventTrend
      });

    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateTrendData = (data: any[], startDate: Date, endDate: Date, type: 'sessions' | 'events') => {
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const trend = [];

    for (let i = 0; i < days; i++) {
      const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

      const dayData = data.filter(item => {
        const itemDate = new Date(type === 'sessions' ? item.started_at : item.created_at);
        return itemDate >= dayStart && itemDate < dayEnd;
      });

      trend.push({
        date: dayStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        value: type === 'sessions' ? dayData.length : dayData.reduce((sum, event) => sum + (event.views || 0), 0)
      });
    }

    return trend;
  };

  const handleVisitorStatsUpdate = (stats: VisitorStats) => {
    setVisitorStats(stats);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (userWidgets.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center space-y-3">
            <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto" />
            <h3 className="text-lg font-medium">No Active Widgets</h3>
            <p className="text-muted-foreground">
              Create and activate a widget to start tracking visitor analytics.
            </p>
            <Button onClick={() => window.location.href = '/dashboard/widgets/create'}>
              Create Widget
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Widget Selector */}
      {userWidgets.length > 1 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium">Widget:</span>
              {userWidgets.map((widget) => (
                <Button
                  key={widget.id}
                  variant={selectedWidget === widget.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedWidget(widget.id)}
                >
                  {widget.name}
                </Button>
              ))}
              <Button
                variant={selectedWidget === null ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedWidget(null)}
              >
                All Widgets
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Real-Time Visitor Presence */}
      {selectedWidget && (
        <RealTimeVisitorPresence
          widgetId={selectedWidget}
          onStatsUpdate={handleVisitorStatsUpdate}
        />
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Views</p>
                <p className="text-2xl font-bold">{analytics.totalViews.toLocaleString()}</p>
              </div>
              <Eye className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Clicks</p>
                <p className="text-2xl font-bold">{analytics.totalClicks.toLocaleString()}</p>
              </div>
              <MousePointer className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Click Rate</p>
                <p className="text-2xl font-bold">{analytics.clickThroughRate.toFixed(1)}%</p>
              </div>
              <TrendingUp className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Unique Visitors</p>
                <p className="text-2xl font-bold">{analytics.uniqueVisitors.toLocaleString()}</p>
              </div>
              <Users className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Visitor Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analytics.visitorTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="#8884d8" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Views Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.eventTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {analytics.recentEvents.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No recent activity. Events will appear here as they occur.
              </p>
            ) : (
              analytics.recentEvents.map((event) => (
                <div key={event.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{event.message_template}</p>
                    <p className="text-xs text-muted-foreground">
                      {event.user_location} • {new Date(event.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={event.source === 'demo' ? 'secondary' : 'default'}>
                      {event.source}
                    </Badge>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">
                        {event.views} views • {event.clicks} clicks
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};