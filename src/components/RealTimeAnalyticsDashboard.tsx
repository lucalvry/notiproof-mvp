import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Users, MousePointer, Eye, Calendar, Download, ExternalLink } from 'lucide-react';
import { useWidgetImpression } from '@/hooks/useWidgetImpression';
import { useRealTimePresence } from '@/hooks/useRealTimePresence';

interface RealTimeAnalyticsProps {
  widgetId?: string;
  timeRange?: '24h' | '7d' | '30d';
}

interface AnalyticsMetrics {
  totalImpressions: number;
  totalClicks: number;
  clickThroughRate: number;
  averageSessionDuration: number;
  topPages: Array<{ page: string; impressions: number; clicks: number }>;
  hourlyData: Array<{ hour: string; impressions: number; clicks: number }>;
  deviceTypes: Array<{ name: string; value: number }>;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

export const RealTimeAnalyticsDashboard = ({ 
  widgetId, 
  timeRange = '7d' 
}: RealTimeAnalyticsProps) => {
  const { profile } = useAuth();
  const [metrics, setMetrics] = useState<AnalyticsMetrics>({
    totalImpressions: 0,
    totalClicks: 0,
    clickThroughRate: 0,
    averageSessionDuration: 0,
    topPages: [],
    hourlyData: [],
    deviceTypes: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedWidget, setSelectedWidget] = useState<string | null>(widgetId || null);
  const [userWidgets, setUserWidgets] = useState<any[]>([]);

  const { onlineCount } = useRealTimePresence({
    widgetId: selectedWidget || '',
    pageUrl: window.location.href,
    userId: profile?.id
  });

  useEffect(() => {
    if (profile?.id) {
      fetchUserWidgets();
      fetchRealTimeMetrics();
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
      
      if (!selectedWidget && widgets && widgets.length > 0) {
        setSelectedWidget(widgets[0].id);
      }
    } catch (error) {
      console.error('Error fetching user widgets:', error);
    }
  };

  const fetchRealTimeMetrics = async () => {
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

      // Fetch widget impressions
      let impressionsQuery = supabase
        .from('widget_impressions')
        .select(`
          id,
          created_at,
          page_url,
          user_agent,
          viewport_width,
          event_id,
          widgets!inner(user_id, name)
        `)
        .eq('widgets.user_id', profile?.id)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      if (selectedWidget) {
        impressionsQuery = impressionsQuery.eq('widget_id', selectedWidget);
      }

      const { data: impressions, error: impressionsError } = await impressionsQuery;

      if (impressionsError) {
        console.error('Error fetching impressions:', impressionsError);
        return;
      }

      // Fetch heatmap clicks
      let clicksQuery = supabase
        .from('heatmap_clicks')
        .select(`
          id,
          created_at,
          page_url,
          element_selector,
          widgets!inner(user_id)
        `)
        .eq('widgets.user_id', profile?.id)
        .gte('created_at', startDate.toISOString());

      if (selectedWidget) {
        clicksQuery = clicksQuery.eq('widget_id', selectedWidget);
      }

      const { data: clicks, error: clicksError } = await clicksQuery;

      if (clicksError) {
        console.error('Error fetching clicks:', clicksError);
      }

      // Calculate metrics
      const totalImpressions = impressions?.length || 0;
      const totalClicks = clicks?.length || 0;
      const clickThroughRate = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

      // Generate hourly data
      const hourlyData = generateHourlyData(impressions || [], clicks || [], startDate, now);
      
      // Top pages analysis
      const pageStats = generatePageStats(impressions || [], clicks || []);
      
      // Device type analysis
      const deviceTypes = generateDeviceStats(impressions || []);

      setMetrics({
        totalImpressions,
        totalClicks,
        clickThroughRate,
        averageSessionDuration: 0, // TODO: Calculate from session data
        topPages: pageStats,
        hourlyData,
        deviceTypes
      });

    } catch (error) {
      console.error('Error fetching real-time metrics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateHourlyData = (impressions: any[], clicks: any[], startDate: Date, endDate: Date) => {
    const hours = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60));
    const hourlyData = [];

    for (let i = 0; i < Math.min(hours, 24); i++) {
      const hour = new Date(endDate.getTime() - i * 60 * 60 * 1000);
      const hourStart = new Date(hour.getFullYear(), hour.getMonth(), hour.getDate(), hour.getHours());
      const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000);

      const hourImpressions = impressions.filter(imp => {
        const impDate = new Date(imp.created_at);
        return impDate >= hourStart && impDate < hourEnd;
      }).length;

      const hourClicks = clicks.filter(click => {
        const clickDate = new Date(click.created_at);
        return clickDate >= hourStart && clickDate < hourEnd;
      }).length;

      hourlyData.unshift({
        hour: hourStart.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true }),
        impressions: hourImpressions,
        clicks: hourClicks
      });
    }

    return hourlyData;
  };

  const generatePageStats = (impressions: any[], clicks: any[]) => {
    const pageMap = new Map();
    
    impressions.forEach(imp => {
      const page = new URL(imp.page_url).pathname;
      if (!pageMap.has(page)) {
        pageMap.set(page, { page, impressions: 0, clicks: 0 });
      }
      pageMap.get(page).impressions++;
    });

    clicks.forEach(click => {
      const page = new URL(click.page_url).pathname;
      if (pageMap.has(page)) {
        pageMap.get(page).clicks++;
      }
    });

    return Array.from(pageMap.values())
      .sort((a, b) => b.impressions - a.impressions)
      .slice(0, 5);
  };

  const generateDeviceStats = (impressions: any[]) => {
    const deviceMap = new Map();
    
    impressions.forEach(imp => {
      const userAgent = imp.user_agent || '';
      let deviceType = 'Unknown';
      
      if (/Mobile|Android|iPhone/.test(userAgent)) {
        deviceType = 'Mobile';
      } else if (/Tablet|iPad/.test(userAgent)) {
        deviceType = 'Tablet';
      } else if (/Desktop|Windows|Mac|Linux/.test(userAgent)) {
        deviceType = 'Desktop';
      }
      
      deviceMap.set(deviceType, (deviceMap.get(deviceType) || 0) + 1);
    });

    return Array.from(deviceMap.entries()).map(([name, value]) => ({ name, value }));
  };

  const exportData = async () => {
    try {
      const csvData = [
        ['Metric', 'Value'],
        ['Total Impressions', metrics.totalImpressions],
        ['Total Clicks', metrics.totalClicks],
        ['Click Through Rate', `${metrics.clickThroughRate.toFixed(2)}%`],
        ['Current Online Users', onlineCount],
        [''],
        ['Top Pages', '', ''],
        ['Page', 'Impressions', 'Clicks'],
        ...metrics.topPages.map(page => [page.page, page.impressions, page.clicks])
      ];

      const csvContent = csvData.map(row => row.join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `widget-analytics-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting data:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-muted rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Widget Selector */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Real-Time Analytics Dashboard</h2>
          <p className="text-muted-foreground">Live widget performance and visitor insights</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportData}>
            <Download className="w-4 h-4 mr-2" />
            Export Data
          </Button>
          <Badge variant="secondary" className="animate-pulse">
            <span className="w-2 h-2 bg-green-500 rounded-full mr-1" />
            Live
          </Badge>
        </div>
      </div>

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

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Real-Time Visitors</p>
                <p className="text-2xl font-bold text-green-600">{onlineCount}</p>
              </div>
              <Users className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Impressions</p>
                <p className="text-2xl font-bold">{metrics.totalImpressions.toLocaleString()}</p>
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
                <p className="text-2xl font-bold">{metrics.totalClicks.toLocaleString()}</p>
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
                <p className="text-2xl font-bold">{metrics.clickThroughRate.toFixed(1)}%</p>
              </div>
              <TrendingUp className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Real-Time Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={metrics.hourlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="impressions" stroke="hsl(var(--primary))" strokeWidth={2} />
                <Line type="monotone" dataKey="clicks" stroke="hsl(var(--secondary))" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Device Types</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={metrics.deviceTypes}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {metrics.deviceTypes.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Pages */}
      <Card>
        <CardHeader>
          <CardTitle>Top Performing Pages</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {metrics.topPages.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No page data available yet. Data will appear as impressions are tracked.
              </p>
            ) : (
              metrics.topPages.map((page, index) => (
                <div key={page.page} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">{index + 1}</Badge>
                    <div>
                      <p className="text-sm font-medium">{page.page}</p>
                      <p className="text-xs text-muted-foreground">
                        CTR: {page.impressions > 0 ? ((page.clicks / page.impressions) * 100).toFixed(1) : 0}%
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="text-center">
                      <p className="font-medium">{page.impressions}</p>
                      <p className="text-xs text-muted-foreground">Impressions</p>
                    </div>
                    <div className="text-center">
                      <p className="font-medium">{page.clicks}</p>
                      <p className="text-xs text-muted-foreground">Clicks</p>
                    </div>
                    <Button variant="ghost" size="sm">
                      <ExternalLink className="w-3 h-3" />
                    </Button>
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