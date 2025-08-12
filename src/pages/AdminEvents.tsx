import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, Flag, FlagOff, RefreshCw } from 'lucide-react';

interface EventRow {
  id: string;
  widget_id: string;
  event_type: string;
  event_data: any;
  created_at: string;
  flagged: boolean;
  ip: string | null;
  user_agent: string | null;
}

const AdminEvents = () => {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<'all' | 'view' | 'click' | 'custom'>('all');
  const [showFlaggedOnly, setShowFlaggedOnly] = useState(false);
  const [query, setQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [widgetFilter, setWidgetFilter] = useState<string>('all');
  const [userFilter, setUserFilter] = useState<string>('all');
  const [widgetsMap, setWidgetsMap] = useState<Record<string, { name: string; user_id: string }>>({});
  const [profilesMap, setProfilesMap] = useState<Record<string, string>>({});

  const loadEvents = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('events')
      .select('id, widget_id, event_type, event_data, created_at, flagged, ip, user_agent')
      .order('created_at', { ascending: false })
      .limit(100);
    if (!error) setEvents(data || []);
    setLoading(false);
  };

useEffect(() => {
  const init = async () => {
    await loadEvents();
    // preload widgets and profiles for filters
    const [widgetsRes, profilesRes] = await Promise.all([
      supabase.from('widgets').select('id, name, user_id').limit(1000),
      supabase.from('profiles').select('id, name').limit(1000)
    ]);
    setWidgetsMap(Object.fromEntries((widgetsRes.data || []).map((w) => [w.id, { name: w.name, user_id: w.user_id }])));
    setProfilesMap(Object.fromEntries((profilesRes.data || []).map((p) => [p.id, p.name])));
  };
  init();

  // Realtime feed for inserts/updates
  const channel = supabase
    .channel('admin-events')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'events' }, (payload) => {
      setEvents((prev) => [payload.new as EventRow, ...prev].slice(0, 100));
    })
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'events' }, (payload) => {
      setEvents((prev) => prev.map((e) => (e.id === (payload.new as any).id ? (payload.new as EventRow) : e)));
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, []);

const filtered = useMemo(() => {
  return events.filter((e) => {
    if (filterType !== 'all' && e.event_type !== filterType) return false;
    if (showFlaggedOnly && !e.flagged) return false;
    if (startDate && new Date(e.created_at) < new Date(startDate)) return false;
    if (endDate && new Date(e.created_at) > new Date(endDate + 'T23:59:59')) return false;
    if (widgetFilter !== 'all' && e.widget_id !== widgetFilter) return false;
    if (userFilter !== 'all') {
      const widget = widgetsMap[e.widget_id];
      if (!widget || widget.user_id !== userFilter) return false;
    }
    if (query) {
      const q = query.toLowerCase();
      return (
        e.event_type.toLowerCase().includes(q) ||
        e.widget_id.toLowerCase().includes(q) ||
        (e.event_data?.message || '').toLowerCase().includes(q)
      );
    }
    return true;
  });
}, [events, filterType, showFlaggedOnly, query, startDate, endDate, widgetFilter, userFilter, widgetsMap]);

  const toggleFlag = async (id: string, flagged: boolean) => {
    await supabase.from('events').update({ flagged: !flagged }).eq('id', id);
  };

  const deleteEvent = async (id: string) => {
    if (!confirm('Delete this event?')) return;
    await supabase.from('events').delete().eq('id', id);
    setEvents((prev) => prev.filter((e) => e.id !== id));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Event Monitor</h1>
        <p className="text-muted-foreground">Live feed across all widgets</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Refine the live event feed</CardDescription>
        </CardHeader>
        <CardContent className="grid md:grid-cols-3 lg:grid-cols-6 gap-3 items-center">
          <Input placeholder="Search message, widget id, type" value={query} onChange={(e) => setQuery(e.target.value)} />
          <Select value={filterType} onValueChange={(v) => setFilterType(v as any)}>
            <SelectTrigger className="w-full"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="view">Views</SelectItem>
              <SelectItem value="click">Clicks</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
          <Select value={widgetFilter} onValueChange={(v) => setWidgetFilter(v)}>
            <SelectTrigger className="w-full"><SelectValue placeholder="Widget" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All widgets</SelectItem>
              {Object.entries(widgetsMap).map(([id, w]) => (
                <SelectItem key={id} value={id}>{w.name.slice(0,32)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={userFilter} onValueChange={(v) => setUserFilter(v)}>
            <SelectTrigger className="w-full"><SelectValue placeholder="User" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All users</SelectItem>
              {Object.entries(profilesMap).map(([id, name]) => (
                <SelectItem key={id} value={id}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          <div className="flex gap-2">
            <Button variant={showFlaggedOnly ? 'default' : 'outline'} onClick={() => setShowFlaggedOnly((v) => !v)}>
              {showFlaggedOnly ? <Flag className="h-4 w-4 mr-2" /> : <FlagOff className="h-4 w-4 mr-2" />} Flagged only
            </Button>
            <Button variant="outline" onClick={loadEvents}><RefreshCw className="h-4 w-4 mr-2" />Refresh</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Live Events</CardTitle>
          <CardDescription>Newest first, auto-updating</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-muted-foreground">Loading...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Widget</TableHead>
                  <TableHead>Flag</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell>{new Date(e.created_at).toLocaleString()}</TableCell>
                    <TableCell><Badge variant="secondary">{e.event_type}</Badge></TableCell>
                    <TableCell className="max-w-[380px] truncate">{e.event_data?.message || '-'}</TableCell>
                    <TableCell className="font-mono text-xs">{e.widget_id.slice(0, 8)}</TableCell>
                    <TableCell>
                      <Button size="sm" variant={e.flagged ? 'destructive' : 'outline'} onClick={() => toggleFlag(e.id, e.flagged)}>
                        {e.flagged ? <FlagOff className="h-4 w-4" /> : <Flag className="h-4 w-4" />}
                      </Button>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" className="text-destructive" onClick={() => deleteEvent(e.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminEvents;
