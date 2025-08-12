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

interface EventRow {
  id: string;
  event_type: string;
  event_data: any;
  created_at: string;
  views: number | null;
  clicks: number | null;
}

const COLORS = ['#2563eb', '#16a34a', '#f59e0b', '#ef4444', '#8b5cf6'];

const WidgetAnalytics = () => {
  const { id } = useParams<{ id: string }>();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [range, setRange] = useState<'7d' | '30d'>('7d');

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      const since = new Date(Date.now() - (range === '7d' ? 7 : 30) * 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from('events')
        .select('id, event_type, event_data, created_at, views, clicks')
        .eq('widget_id', id)
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(2000);
      setEvents(data || []);
    };
    load();
  }, [id, range]);

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Widget Analytics</h1>
          <p className="text-muted-foreground">Insights for your widget</p>
        </div>
        <Select value={range} onValueChange={(v) => setRange(v as any)}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <Card><CardHeader><CardTitle>Views</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{totals.totalViews}</CardContent></Card>
        <Card><CardHeader><CardTitle>Clicks</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{totals.totalClicks}</CardContent></Card>
        <Card><CardHeader><CardTitle>CTR</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{totals.ctr.toFixed(2)}%</CardContent></Card>
        <Card><CardHeader><CardTitle>Conversions</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{totals.conversions}</CardContent></Card>
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

      <div className="grid lg:grid-cols-2 gap-6">
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
      </div>
    </div>
  );
};

export default WidgetAnalytics;
