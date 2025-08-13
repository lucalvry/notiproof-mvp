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
import { startOfDay, endOfDay, subDays } from 'date-fns';

interface EventRow {
  id: string;
  event_type: string;
  event_data: any;
  created_at: string;
  views: number | null;
  clicks: number | null;
  flagged?: boolean;
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

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      const { data } = await supabase
        .from('events')
        .select('id, event_type, event_data, created_at, views, clicks, flagged')
        .eq('widget_id', id)
        .gte('created_at', dateRange.from.toISOString())
        .lte('created_at', dateRange.to.toISOString())
        .order('created_at', { ascending: false })
        .limit(2000);
      setEvents(data || []);
      const { data: goalData } = await (supabase.from('goals').select('id, name, type, pattern, active').eq('widget_id', id) as any);
      setGoals(goalData || []);
    };
    load();
  }, [id, dateRange]);

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
    const totalViews = events.reduce((s, e) => s + (e.views || 0), 0);
    const totalClicks = events.reduce((s, e) => s + (e.clicks || 0), 0);
    const conversions = events.filter((e) => e.event_type === 'conversion').length;
    const ctr = totalViews > 0 ? (totalClicks / totalViews) * 100 : 0;
    return { totalViews, totalClicks, conversions, ctr };
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

      <div className="grid md:grid-cols-6 gap-4">
        <Card><CardHeader><CardTitle>Views</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{totals.totalViews}</CardContent></Card>
        <Card><CardHeader><CardTitle>Clicks</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{totals.totalClicks}</CardContent></Card>
        <Card><CardHeader><CardTitle>CTR</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{totals.ctr.toFixed(2)}%</CardContent></Card>
        <Card><CardHeader><CardTitle>Conversions</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{totals.conversions}</CardContent></Card>
        <Card><CardHeader><CardTitle>Flagged</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{flaggedStats.count}</CardContent></Card>
        <Card><CardHeader><CardTitle>Flagged Rate</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{flaggedStats.ratio.toFixed(1)}%</CardContent></Card>
      </div>

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

      {/* Phase 3 Enhancements */}
      <div className="space-y-6">
        <ABTestManager widgetId={id!} />
        <HeatmapViewer widgetId={id!} />
      </div>
    </div>
  );
};

export default WidgetAnalytics;
