import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import TimeRangePicker from '@/components/TimeRangePicker';
import HeatmapViewer from '@/components/HeatmapViewer';
import ABTestManager from '@/components/ABTestManager';
import { EventAnalytics } from '@/components/EventAnalytics';
import { UnifiedAnalyticsDashboard } from '@/components/UnifiedAnalyticsDashboard';
import { WebsiteAnalyticsFilter } from '@/components/WebsiteAnalyticsFilter';
import { startOfDay, endOfDay, subDays } from 'date-fns';

interface EventRow {
  id: string;
  event_type: string;
  event_data: any;
  created_at: string;
  views: number | null;
  clicks: number | null;
  flagged?: boolean;
  source: string; // Required field for unified analytics
}


const COLORS = ['#2563eb', '#16a34a', '#f59e0b', '#ef4444', '#8b5cf6'];

const WidgetAnalytics = () => {
  const { id } = useParams<{ id: string }>();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [goals, setGoals] = useState<any[]>([]);
  const [dateRange, setDateRange] = useState({
    from: startOfDay(subDays(new Date(), 6)),
    to: endOfDay(new Date())
  });
  const [selectedWebsiteId, setSelectedWebsiteId] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [summary, setSummary] = useState<any>(null);
  const pageSize = 50; // Optimized page size

  // Fetch summary analytics from new endpoint
  useEffect(() => {
    const fetchSummary = async () => {
      if (!id) return;
      
      try {
        const range = `${Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24))}d`;
        const response = await supabase.functions.invoke('analytics-api', {
          body: { 
            path: `/api/analytics/widgets/${id}/summary?range=${range}`
          }
        });
        
        if (response.data) {
          setSummary(response.data);
        }
      } catch (error) {
        console.error('Error fetching analytics summary:', error);
      }
    };

    fetchSummary();
  }, [id, dateRange, selectedWebsiteId]);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      
      let eventsQuery = supabase
        .from('events')
        .select('id, event_type, event_data, created_at, views, clicks, flagged, source, website_id')
        .eq('widget_id', id)
        .gte('created_at', dateRange.from.toISOString())
        .lte('created_at', dateRange.to.toISOString())
        .order('created_at', { ascending: false })
        .limit(2000);

      if (selectedWebsiteId) {
        eventsQuery = eventsQuery.eq('website_id', selectedWebsiteId);
      }

      const { data } = await eventsQuery;
      
      console.log('Events loaded for analytics:', { count: data?.length, widgetId: id, dateRange });
      setEvents(data || []);
      const { data: goalData } = await (supabase.from('goals').select('id, name, type, pattern, active').eq('widget_id', id) as any);
      setGoals(goalData || []);
    };
    load();

    // Set up real-time subscription for events
    if (!id) return;
    
    const channel = supabase
      .channel('widget-events')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'events',
          filter: `widget_id=eq.${id}`
        },
        () => {
          // Reload data when events change
          load();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, dateRange, selectedWebsiteId]);

  // Time of day distribution (0-23 hours)
  const byHour = useMemo(() => {
    const buckets = Array.from({ length: 24 }, (_, h) => ({ hour: `${h}:00`, views: 0, clicks: 0 }));
    events.forEach((e) => {
      const d = new Date(e.created_at);
      const h = d.getHours();
      buckets[h].views += e.views || 0;
      buckets[h].clicks += e.clicks || 0;
    });
    return buckets;
  }, [events]);

  // Device breakdown from event_data.device (mobile/desktop)
  const byDevice = useMemo(() => {
    const counts: Record<string, number> = {};
    events.forEach((e) => {
      const device = (e.event_data?.device || 'unknown').toLowerCase();
      counts[device] = (counts[device] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [events]);

  // Country breakdown from event_data.geo.country
  const byCountry = useMemo(() => {
    const counts: Record<string, number> = {};
    events.forEach((e) => {
      const country = e.event_data?.geo?.country || 'Unknown';
      counts[country] = (counts[country] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [events]);

  const totals = useMemo(() => {
    // Count ALL events with proper views/clicks, regardless of source
    const allEvents = events || [];
    const totalViews = allEvents.reduce((s, e) => s + (e.views || 0), 0);
    const totalClicks = allEvents.reduce((s, e) => s + (e.clicks || 0), 0);
    const conversions = allEvents.filter((e) => e.event_type === 'conversion').length;
    const ctr = totalViews > 0 ? (totalClicks / totalViews) * 100 : 0;
    
    // Separate demo vs real tracking events for analytics
    const demoEvents = allEvents.filter((e) => e.source === 'demo');
    const realEvents = allEvents.filter((e) => e.source !== 'demo');
    const connectorEvents = allEvents.filter((e) => e.source === 'connector');
    
    console.log('Analytics Debug (Updated):', { 
      totalEvents: allEvents.length,
      demoEvents: demoEvents.length, 
      realEvents: realEvents.length,
      connectorEvents: connectorEvents.length,
      totalViews, 
      totalClicks,
      ctr: ctr.toFixed(2)
    });
    
    return { 
      totalViews, 
      totalClicks, 
      conversions, 
      ctr,
      demoCount: demoEvents.length,
      realCount: realEvents.length
    };
  }, [events]);

  const flaggedStats = useMemo(() => {
    const count = events.filter((e) => e.flagged).length;
    const ratio = events.length > 0 ? (count / events.length) * 100 : 0;
    return { count, ratio };
  }, [events]);

  // A/B variant comparison by event_data.variant
  const variantPerf = useMemo(() => {
    const map: Record<string, { views: number; clicks: number }> = {};
    events.forEach((e) => {
      const v = e.event_data?.variant || 'A';
      if (!map[v]) map[v] = { views: 0, clicks: 0 };
      map[v].views += e.views || 0;
      map[v].clicks += e.clicks || 0;
    });
    return Object.entries(map).map(([variant, data]) => ({
      variant,
      ctr: data.views > 0 ? +(100 * (data.clicks / data.views)).toFixed(2) : 0,
      views: data.views,
      clicks: data.clicks,
    }));
  }, [events]);

  const goalsPerf = useMemo(() => {
    return (goals || []).filter((g: any) => g.active !== false).map((g: any) => {
      let conversions = 0;
      let denomViews = 0;
      
      events.forEach((e) => {
        // Count views for denominator
        denomViews += e.views || 0;
        
        // Check goal matching for conversions
        const url = e.event_data?.url || '';
        const label = e.event_data?.label || '';
        const evName = e.event_data?.event_name || '';
        
        let matches = false;
        if (g.type === 'url_match' && typeof g.pattern === 'string' && url.includes(g.pattern)) matches = true;
        if (g.type === 'custom_event' && typeof g.pattern === 'string' && (e.event_type === g.pattern || evName === g.pattern)) matches = true;
        if (g.type === 'label' && typeof g.pattern === 'string' && label === g.pattern) matches = true;
        
        if (matches) {
          conversions += e.views || 0; // Count views that match as conversions
        }
      });
      
      const rate = denomViews > 0 ? +(100 * (conversions / denomViews)).toFixed(2) : 0;
      return { name: g.name, type: g.type, pattern: g.pattern, conversions, denomViews, rate };
    });
  }, [goals, events]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Widget Analytics</h1>
          <p className="text-muted-foreground">Insights for your widget</p>
        </div>
        <TimeRangePicker
          value={dateRange}
          onChange={setDateRange}
          className="w-80"
        />
      </div>

      {/* Website Filter for Analytics */}
      <WebsiteAnalyticsFilter
        selectedWebsiteId={selectedWebsiteId}
        onWebsiteChange={setSelectedWebsiteId}
        showVerificationStatus={true}
      />

      <div className="grid md:grid-cols-8 gap-4">
        <Card><CardHeader><CardTitle>Views</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{totals.totalViews}</CardContent></Card>
        <Card><CardHeader><CardTitle>Clicks</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{totals.totalClicks}</CardContent></Card>
        <Card><CardHeader><CardTitle>CTR</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{totals.ctr.toFixed(2)}%</CardContent></Card>
        <Card><CardHeader><CardTitle>Conversions</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{totals.conversions}</CardContent></Card>
        <Card>
          <CardHeader><CardTitle>Real Events</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{totals.realCount}</div>
            <Badge variant="outline" className="text-xs mt-1">
              <div className="w-2 h-2 bg-green-600 rounded-full mr-1" />
              Authentic
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Demo Events</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{totals.demoCount}</div>
            <Badge variant="outline" className="text-xs mt-1">
              <div className="w-2 h-2 bg-blue-600 rounded-full mr-1" />
              Test Data
            </Badge>
          </CardContent>
        </Card>
        <Card><CardHeader><CardTitle>Flagged</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{flaggedStats.count}</CardContent></Card>
        <Card><CardHeader><CardTitle>Flagged Rate</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{flaggedStats.ratio.toFixed(1)}%</CardContent></Card>
      </div>

      {/* Phase 6: Unified Analytics with Source Split */}
      <UnifiedAnalyticsDashboard events={events} widgetId={id!} />

      {/* Event Analytics - Demo vs Real Data Insights */}
      <EventAnalytics />

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Time of Day</CardTitle>
            <CardDescription>Views and clicks by hour</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{ views: { label: 'Views', color: 'hsl(var(--primary))' }, clicks: { label: 'Clicks', color: 'hsl(var(--secondary))' } }}>
              <BarChart data={byHour}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" interval={2} />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="views" fill="var(--color-views)" />
                <Bar dataKey="clicks" fill="var(--color-clicks)" />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Device Breakdown</CardTitle>
            <CardDescription>Based on user agent</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{ mobile: { label: 'Mobile', color: 'hsl(var(--primary))' }, desktop: { label: 'Desktop', color: 'hsl(var(--secondary))' }, unknown: { label: 'Unknown', color: '#94a3b8' } }}>
              <PieChart>
                <Pie data={byDevice} dataKey="value" nameKey="name" outerRadius={90} label>
                  {byDevice.map((_, i) => (
                    <Cell key={`c-${i}`} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Top Countries</CardTitle>
            <CardDescription>Most events by country</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Country</TableHead>
                  <TableHead>Events</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {byCountry.map((row) => (
                  <tr key={row.name}>
                    <TableCell>{row.name}</TableCell>
                    <TableCell>{row.value}</TableCell>
                  </tr>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>A/B Variant Performance</CardTitle>
            <CardDescription>CTR by variant</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Variant</TableHead>
                  <TableHead>Views</TableHead>
                  <TableHead>Clicks</TableHead>
                  <TableHead>CTR</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {variantPerf.map((v) => (
                  <tr key={v.variant}>
                    <TableCell><Badge>{v.variant}</Badge></TableCell>
                    <TableCell>{v.views}</TableCell>
                    <TableCell>{v.clicks}</TableCell>
                    <TableCell>{v.ctr}%</TableCell>
                  </tr>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Goals Performance</CardTitle>
            <CardDescription>Matches and rates by goal</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Goal</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Pattern</TableHead>
                  <TableHead>Conversions</TableHead>
                  <TableHead>Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {goalsPerf.length > 0 ? goalsPerf.map((g) => (
                  <tr key={g.name + g.pattern}>
                    <TableCell>{g.name}</TableCell>
                    <TableCell><Badge>{g.type}</Badge></TableCell>
                    <TableCell>{g.pattern}</TableCell>
                    <TableCell>{g.conversions}</TableCell>
                    <TableCell>{g.rate}%</TableCell>
                  </tr>
                )) : (
                  <tr><TableCell colSpan={5} className="text-muted-foreground">No goals configured</TableCell></tr>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Summary Analytics from New Endpoint */}
      {summary && (
        <Card>
          <CardHeader>
            <CardTitle>Performance Summary (Cached)</CardTitle>
            <CardDescription>
              Analytics for the past {summary.period} - cached for optimal performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{summary.metrics.impressions}</div>
                <div className="text-sm text-muted-foreground">Impressions</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{summary.metrics.clicks}</div>
                <div className="text-sm text-muted-foreground">Clicks</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{summary.metrics.total_events}</div>
                <div className="text-sm text-muted-foreground">Events</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{summary.metrics.ctr}%</div>
                <div className="text-sm text-muted-foreground">CTR</div>
              </div>
            </div>
            
            {/* Event Source Breakdown */}
            {Object.keys(summary.breakdown.by_source).length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Events by Source:</h4>
                <div className="flex gap-2 flex-wrap">
                  {Object.entries(summary.breakdown.by_source).map(([source, count]) => (
                    <Badge key={source} variant="outline">
                      {source}: {String(count)}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Phase 3 Enhancements */}
      <div className="space-y-6">
        <ABTestManager widgetId={id!} />
        <HeatmapViewer widgetId={id!} />
      </div>
    </div>
  );
};

export default WidgetAnalytics;
