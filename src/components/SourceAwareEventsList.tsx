import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { EventSourceIndicator } from '@/components/EventSourceIndicator';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Edit, Trash2, Eye, MousePointer } from 'lucide-react';

interface Event {
  id: string;
  event_type: string;
  event_data: any;
  created_at: string;
  views: number | null;
  clicks: number | null;
  source: string; // Allow all source types from database
  status: string;
  expires_at?: string;
  flagged?: boolean;
}

interface SourceAwareEventsListProps {
  widgetId: string;
}

export const SourceAwareEventsList = ({ widgetId }: SourceAwareEventsListProps) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'natural' | 'quick_win'>('natural');
  const { toast } = useToast();

  useEffect(() => {
    fetchEvents();
    
    // Real-time subscription
    const channel = supabase
      .channel(`events-${widgetId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public', 
        table: 'events',
        filter: `widget_id=eq.${widgetId}`
      }, () => {
        fetchEvents();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [widgetId]);

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('widget_id', widgetId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
      toast({
        title: 'Error',
        description: 'Failed to load events',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleEventStatus = async (eventId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'approved' ? 'pending' : 'approved';
    
    try {
      const { error } = await supabase
        .from('events')
        .update({ status: newStatus })
        .eq('id', eventId);

      if (error) throw error;

      setEvents(events.map(event => 
        event.id === eventId ? { ...event, status: newStatus } : event
      ));

      toast({
        title: 'Success',
        description: `Event ${newStatus === 'approved' ? 'enabled' : 'disabled'} successfully`
      });
    } catch (error) {
      console.error('Error updating event:', error);
      toast({
        title: 'Error',
        description: 'Failed to update event',
        variant: 'destructive'
      });
    }
  };

  const deleteEvent = async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return;

    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId);

      if (error) throw error;

      setEvents(events.filter(event => event.id !== eventId));
      toast({
        title: 'Success',
        description: 'Event deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting event:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete event',
        variant: 'destructive'
      });
    }
  };

  // Phase 6: Separate natural and quick-win events
  const naturalEvents = events.filter(e => 
    e.source !== 'quick_win' && e.source !== 'demo'
  );
  
  const quickWinEvents = events.filter(e => 
    e.source === 'quick_win'
  );

  const renderEventsTable = (eventsList: Event[], type: 'natural' | 'quick_win') => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Type</TableHead>
          <TableHead>Message</TableHead>
          <TableHead>Source</TableHead>
          <TableHead>Analytics</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {eventsList.map((event) => (
          <TableRow key={event.id}>
            <TableCell>
              <Badge variant="outline">{event.event_type}</Badge>
            </TableCell>
            <TableCell className="max-w-[300px] truncate">
              {event.event_data?.message || 'No message'}
            </TableCell>
            <TableCell>
              <EventSourceIndicator source={event.source} />
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  {event.views || 0}
                </div>
                <div className="flex items-center gap-1">
                  <MousePointer className="h-3 w-3" />
                  {event.clicks || 0}
                </div>
              </div>
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <Switch
                  checked={event.status === 'approved'}
                  onCheckedChange={() => toggleEventStatus(event.id, event.status)}
                  disabled={type === 'natural'} // Natural events are read-only
                />
                <Badge variant={event.status === 'approved' ? 'default' : 'secondary'}>
                  {event.status}
                </Badge>
              </div>
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                {type === 'quick_win' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Navigate to edit quick-win (implement later)
                      toast({
                        title: 'Feature Coming Soon',
                        description: 'Quick-win editing will be available soon'
                      });
                    }}
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => deleteEvent(event.id)}
                  className="text-destructive hover:text-destructive"
                  disabled={type === 'natural'} // Natural events cannot be deleted
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
        {eventsList.length === 0 && (
          <TableRow>
            <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
              {type === 'natural' 
                ? 'No natural events yet. Set up integrations to start collecting authentic events.'
                : 'No quick-win events configured. Create promotional notifications to fill engagement gaps.'
              }
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading events...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-12 bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Event Management</CardTitle>
        <CardDescription>
          Phase 6: Natural events are auto-collected and read-only. Quick-wins are business-defined and fully editable.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="natural" className="gap-2">
              Natural Events
              <Badge variant="secondary">{naturalEvents.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="quick_win" className="gap-2">
              Quick-Win Events  
              <Badge variant="secondary">{quickWinEvents.length}</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="natural" className="mt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium">Natural Events</h3>
                  <p className="text-sm text-muted-foreground">
                    Authentic customer interactions collected automatically. Read-only for credibility.
                  </p>
                </div>
                <Button variant="outline" asChild>
                  <a href="/dashboard/integrations">
                    Setup Integrations
                  </a>
                </Button>
              </div>
              {renderEventsTable(naturalEvents, 'natural')}
            </div>
          </TabsContent>

          <TabsContent value="quick_win" className="mt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium">Quick-Win Events</h3>
                  <p className="text-sm text-muted-foreground">
                    Business-defined promotional notifications. Fully editable and manageable.
                  </p>
                </div>
                <Button variant="outline" asChild>
                  <a href={`/dashboard/widgets/${widgetId}/quick-wins`}>
                    Manage Quick-Wins
                  </a>
                </Button>
              </div>
              {renderEventsTable(quickWinEvents, 'quick_win')}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};