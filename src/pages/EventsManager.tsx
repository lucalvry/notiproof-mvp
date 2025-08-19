import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Filter, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { CreateEventForm } from '@/components/CreateEventForm';
import { DemoEventsManager } from '@/components/DemoEventsManager';
import { EventStatusBadge } from '@/components/EventStatusBadge';

interface Event {
  id: string;
  event_type: string;
  event_data: any;
  widget_id: string;
  created_at: string;
  flagged: boolean;
  views: number | null;
  clicks: number | null;
  user_name: string | null;
  user_location: string | null;
  page_url: string | null;
  message_template: string | null;
  business_type: string | null;
  source: string | null;
  status: string | null;
  expires_at: string | null;
  variant_id: string | null;
  ip: string | null;
  user_agent: string | null;
}

interface Widget {
  id: string;
  name: string;
  status: string;
}

export default function EventsManager() {
  const [events, setEvents] = useState<Event[]>([]);
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWidget, setSelectedWidget] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load widgets
      const { data: widgetsData, error: widgetsError } = await supabase
        .from('widgets')
        .select('id, name, status')
        .eq('status', 'active');

      if (widgetsError) throw widgetsError;
      setWidgets(widgetsData || []);

      // Load events
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (eventsError) throw eventsError;
      setEvents(eventsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load events and widgets',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const createTestEvent = async () => {
    try {
      if (widgets.length === 0) {
        toast({
          title: 'No widgets available',
          description: 'Please create a widget first',
          variant: 'destructive'
        });
        return;
      }

      const randomWidget = widgets[Math.floor(Math.random() * widgets.length)];
      const eventTypes = ['purchase', 'signup', 'review', 'download'];
      const randomType = eventTypes[Math.floor(Math.random() * eventTypes.length)];

      const testEvents = {
        purchase: {
          customer_name: 'John Doe',
          product_name: 'Pro Plan',
          amount: '$29.99',
          location: 'New York, USA',
          timestamp: new Date().toISOString()
        },
        signup: {
          user_name: 'Jane Smith',
          plan: 'Free Trial',
          location: 'London, UK',
          timestamp: new Date().toISOString()
        },
        review: {
          reviewer_name: 'Mike Wilson',
          rating: 5,
          comment: 'Amazing product!',
          product: 'Widget Pro',
          timestamp: new Date().toISOString()
        },
        download: {
          user_name: 'Sarah Johnson',
          file_name: 'User Guide.pdf',
          location: 'Toronto, Canada',
          timestamp: new Date().toISOString()
        }
      };

      const eventData = testEvents[randomType as keyof typeof testEvents];
      
      // Extract user name based on event type
      let userName = 'Anonymous';
      let userLocation = 'Unknown';
      
      if (randomType === 'purchase' && 'customer_name' in eventData) {
        userName = eventData.customer_name;
        userLocation = eventData.location;
      } else if (randomType === 'signup' && 'user_name' in eventData) {
        userName = eventData.user_name;
        userLocation = eventData.location;
      } else if (randomType === 'review' && 'reviewer_name' in eventData) {
        userName = eventData.reviewer_name;
        userLocation = 'Unknown'; // Review doesn't have location
      } else if (randomType === 'download' && 'user_name' in eventData) {
        userName = eventData.user_name;
        userLocation = eventData.location;
      }
      
      const { error } = await supabase
        .from('events')
        .insert({
          widget_id: randomWidget.id,
          event_type: randomType,
          event_data: eventData,
          user_name: userName,
          user_location: userLocation,
          source: 'manual',
          status: 'approved'
        });

      if (error) throw error;

      toast({
        title: 'Test event created',
        description: `Created a ${randomType} event for ${randomWidget.name}`,
      });

      loadData(); // Refresh the list
    } catch (error) {
      console.error('Error creating test event:', error);
      toast({
        title: 'Error',
        description: 'Failed to create test event',
        variant: 'destructive'
      });
    }
  };

  const deleteEvent = async (eventId: string) => {
    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId);

      if (error) throw error;

      toast({
        title: 'Event deleted',
        description: 'Event has been successfully deleted',
      });

      loadData(); // Refresh the list
    } catch (error) {
      console.error('Error deleting event:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete event',
        variant: 'destructive'
      });
    }
  };

  const filteredEvents = events.filter(event => {
    const matchesSearch = searchTerm === '' || 
      event.event_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      JSON.stringify(event.event_data).toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesWidget = selectedWidget === 'all' || event.widget_id === selectedWidget;
    const matchesType = selectedType === 'all' || event.event_type === selectedType;
    
    return matchesSearch && matchesWidget && matchesType;
  });

  const eventTypes = [...new Set(events.map(e => e.event_type))];

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading events...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Events Manager</h1>
          <p className="text-muted-foreground">Manage and monitor all notification events</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={createTestEvent} variant="outline" className="gap-2">
            <Plus className="h-4 w-4" />
            Add Test Event
          </Button>
          <Button onClick={() => setShowCreateForm(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Create Event
          </Button>
        </div>
      </div>

      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Event</CardTitle>
            <CardDescription>Add a custom event to your notifications</CardDescription>
          </CardHeader>
          <CardContent>
            <CreateEventForm 
              widgetId={widgets[0]?.id || ''} 
              onEventCreated={() => {
                setShowCreateForm(false);
                loadData();
              }}
              onCancel={() => setShowCreateForm(false)}
            />
            <Button 
              variant="outline" 
              onClick={() => setShowCreateForm(false)}
              className="mt-4"
            >
              Cancel
            </Button>
          </CardContent>
        </Card>
      )}

      <DemoEventsManager />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Filter Events
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="search">Search</Label>
              <Input
                id="search"
                placeholder="Search events..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="widget">Widget</Label>
              <Select value={selectedWidget} onValueChange={setSelectedWidget}>
                <SelectTrigger>
                  <SelectValue placeholder="All widgets" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All widgets</SelectItem>
                  {widgets.map(widget => (
                    <SelectItem key={widget.id} value={widget.id}>
                      {widget.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="type">Event Type</Label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  {eventTypes.map(type => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button 
                variant="outline" 
                onClick={loadData}
                className="w-full"
              >
                Refresh
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Events ({filteredEvents.length})</CardTitle>
          <CardDescription>All notification events across your widgets</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredEvents.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No events found matching your filters</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Widget</TableHead>
                  <TableHead>Event Data</TableHead>
                  <TableHead>Stats</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEvents.map((event) => {
                  const widget = widgets.find(w => w.id === event.widget_id);
                  return (
                    <TableRow key={event.id}>
                      <TableCell>
                        {new Date(event.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{event.event_type}</Badge>
                      </TableCell>
                      <TableCell>
                        {widget?.name || 'Unknown Widget'}
                      </TableCell>
                       <TableCell className="max-w-xs">
                         <div className="space-y-1">
                           {event.user_name && (
                             <div className="text-sm font-medium">{event.user_name}</div>
                           )}
                           {event.user_location && (
                             <div className="text-xs text-muted-foreground">{event.user_location}</div>
                           )}
                           {event.message_template && (
                             <div className="text-xs">{event.message_template}</div>
                           )}
                           <EventStatusBadge status={event.status} source={event.source} />
                         </div>
                       </TableCell>
                       <TableCell>
                         <div className="text-sm">
                           <div>Views: {event.views || 0}</div>
                           <div>Clicks: {event.clicks || 0}</div>
                         </div>
                       </TableCell>
                      <TableCell>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteEvent(event.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}