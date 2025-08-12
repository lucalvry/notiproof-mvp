import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface EventRow { created_at: string; views: number | null; clicks: number | null; event_type: string }

const AdminWidgetDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [widget, setWidget] = useState<any>(null);
  const [events, setEvents] = useState<EventRow[]>([]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data: w } = await supabase.from('widgets').select('*').eq('id', id).maybeSingle();
      setWidget(w);
      const thirty = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data: e } = await supabase
        .from('events')
        .select('created_at, views, clicks, event_type')
        .eq('widget_id', id)
        .gte('created_at', thirty)
        .order('created_at', { ascending: true });
      setEvents(e || []);
    })();
  }, [id]);

  const daily = useMemo(() => {
    const map: Record<string, { date: string; views: number; clicks: number }> = {};
    for (const e of events) {
      const d = new Date(e.created_at);
      const key = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
      map[key] = map[key] || { date: key, views: 0, clicks: 0 };
      map[key].views += e.views || (e.event_type === 'view' ? 1 : 0);
      map[key].clicks += e.clicks || (e.event_type === 'click' ? 1 : 0);
    }
    return Object.values(map);
  }, [events]);

  const totals = useMemo(() => {
    const views = events.reduce((s, e) => s + (e.views || (e.event_type === 'view' ? 1 : 0)), 0);
    const clicks = events.reduce((s, e) => s + (e.clicks || (e.event_type === 'click' ? 1 : 0)), 0);
    const ctr = views ? ((clicks / views) * 100).toFixed(1) : '0.0';
    return { views, clicks, ctr };
  }, [events]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Widget Detail</h1>
        <p className="text-muted-foreground">Performance and recent events</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>Total Views</CardTitle><CardDescription>Last 30 days</CardDescription></CardHeader>
          <CardContent><div className="text-2xl font-bold">{totals.views}</div></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Total Clicks</CardTitle><CardDescription>Last 30 days</CardDescription></CardHeader>
          <CardContent><div className="text-2xl font-bold">{totals.clicks}</div></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>CTR</CardTitle><CardDescription>Clicks / Views</CardDescription></CardHeader>
          <CardContent><div className="text-2xl font-bold">{totals.ctr}%</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Daily Trend</CardTitle><CardDescription>Views and Clicks</CardDescription></CardHeader>
        <CardContent style={{ height: 280 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={daily} margin={{ left: 12, right: 12 }}>
              <XAxis dataKey="date" hide />
              <YAxis hide />
              <Tooltip />
              <Area type="monotone" dataKey="views" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.15)" />
              <Area type="monotone" dataKey="clicks" stroke="hsl(var(--secondary))" fill="hsl(var(--secondary) / 0.15)" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Meta</CardTitle><CardDescription>Widget information</CardDescription></CardHeader>
        <CardContent>
          {widget ? (
            <div className="grid md:grid-cols-3 gap-4">
              <div><div className="text-sm text-muted-foreground">Name</div><div className="font-medium">{widget.name}</div></div>
              <div><div className="text-sm text-muted-foreground">Template</div><div className="font-medium">{widget.template_name}</div></div>
              <div><div className="text-sm text-muted-foreground">Status</div><div className="font-medium">{widget.status}</div></div>
            </div>
          ) : (
            <div className="text-muted-foreground">Loading...</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminWidgetDetail;
