import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2 } from 'lucide-react';

interface EventRow {
  id: string;
  event_type: string;
  event_data: any;
  created_at: string;
}

const WidgetEvents = () => {
  const { id } = useParams<{ id: string }>();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  const load = async () => {
    if (!id) return;
    setLoading(true);
    const { data } = await supabase
      .from('events')
      .select('id, event_type, event_data, created_at')
      .eq('widget_id', id)
      .order('created_at', { ascending: false })
      .limit(100);
    setEvents(data || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    if (!id) return;
    const channel = supabase
      .channel(`widget-events-${id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'events', filter: `widget_id=eq.${id}` }, (payload) => {
        setEvents((prev) => [payload.new as any, ...prev].slice(0, 100));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id]);

  const filtered = useMemo(() => {
    if (!query) return events;
    const q = query.toLowerCase();
    return events.filter((e) => (e.event_data?.message || '').toLowerCase().includes(q) || e.event_type.toLowerCase().includes(q));
  }, [events, query]);

  const addTestEvent = async () => {
    if (!id) return;
    await supabase.from('events').insert({
      widget_id: id,
      event_type: 'custom',
      event_data: { message: 'Test event', source: 'dashboard' },
      views: 0,
      clicks: 0,
    });
  };

  const deleteEvent = async (eventId: string) => {
    if (!confirm('Delete this event?')) return;
    await supabase.from('events').delete().eq('id', eventId);
    setEvents((prev) => prev.filter((e) => e.id !== eventId));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Widget Events</h1>
          <p className="text-muted-foreground">Live activity for your widget</p>
        </div>
        <Button onClick={addTestEvent}><Plus className="h-4 w-4 mr-2" />Add Test Event</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Events</CardTitle>
          <CardDescription>Newest first</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-3"><Input placeholder="Search" value={query} onChange={(e) => setQuery(e.target.value)} /></div>
          {loading ? (
            <div className="text-muted-foreground">Loading...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell>{new Date(e.created_at).toLocaleString()}</TableCell>
                    <TableCell>{e.event_type}</TableCell>
                    <TableCell className="max-w-[380px] truncate">{e.event_data?.message || '-'}</TableCell>
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

export default WidgetEvents;
