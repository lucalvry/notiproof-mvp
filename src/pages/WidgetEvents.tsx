import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, ArrowLeft } from 'lucide-react';
import { CreateEventForm } from '@/components/CreateEventForm';
import { SourceAwareEventsList } from '@/components/SourceAwareEventsList';
import { UnifiedAnalyticsDashboard } from '@/components/UnifiedAnalyticsDashboard';

interface EventRow {
  id: string;
  event_type: string;
  event_data: any;
  created_at: string;
  views: number | null;
  clicks: number | null;
  source: string; // Allow all source types from database
}

const WidgetEvents = () => {
  const { id } = useParams<{ id: string }>();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'view' | 'click' | 'custom'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    const { data } = await supabase
      .from('events')
      .select('id, event_type, event_data, created_at, views, clicks, source')
      .eq('widget_id', id)
      .order('created_at', { ascending: false })
      .limit(200);
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
    const q = query.toLowerCase();
    return events.filter((e) => {
      if (filterType !== 'all' && e.event_type !== filterType) return false;
      if (startDate && new Date(e.created_at) < new Date(startDate)) return false;
      if (endDate && new Date(e.created_at) > new Date(endDate + 'T23:59:59')) return false;
      if (!query) return true;
      return (e.event_data?.message || '').toLowerCase().includes(q) || e.event_type.toLowerCase().includes(q);
    });
  }, [events, query, filterType, startDate, endDate]);

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
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" asChild>
            <Link to="/dashboard/widgets">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Widget Events</h1>
            <p className="text-muted-foreground">Live activity for your widget</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={addTestEvent}>
            <Plus className="h-4 w-4 mr-2" />
            Quick Test Event
          </Button>
          <Button onClick={() => setShowCreateForm(!showCreateForm)}>
            <Plus className="h-4 w-4 mr-2" />
            {showCreateForm ? 'Cancel' : 'Create Event'}
          </Button>
        </div>
      </div>

      {/* Create Event Form */}
      {showCreateForm && (
        <CreateEventForm
          widgetId={id!}
          onEventCreated={() => {
            setShowCreateForm(false);
            load();
          }}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      {/* Phase 6: Unified Analytics Dashboard */}
      <UnifiedAnalyticsDashboard events={events} widgetId={id!} />

      {/* Phase 6: Source-Aware Events Management */}
      <SourceAwareEventsList widgetId={id!} />
    </div>
  );
};

export default WidgetEvents;
