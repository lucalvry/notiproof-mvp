import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X, Star, Calendar, User } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useWebsiteContext } from '@/contexts/WebsiteContext';

interface EventItem {
  id: string;
  event_type: string;
  event_data: {
    message: string;
    author_name?: string;
    author_avatar?: string;
    rating?: number;
    source?: string;
    place_name?: string;
    posted_at?: string;
    connector_id?: string;
  };
  status: string;
  created_at: string;
  connector?: {
    name: string;
    type: string;
  };
}

const ModerationQueue: React.FC = () => {
  const { profile } = useAuth();
  const { selectedWebsite, isSwitching } = useWebsiteContext();
  const { toast } = useToast();
  const [items, setItems] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');

  useEffect(() => {
    if (profile?.id) {
      loadItems();
    }
  }, [profile, filter, selectedWebsite]);

  const loadItems = async () => {
    try {
      // Get user's widgets to filter events, optionally by website
      let widgetsQuery = supabase
        .from('widgets')
        .select('id')
        .eq('user_id', profile?.id);
      
      if (selectedWebsite?.id) {
        widgetsQuery = widgetsQuery.eq('website_id', selectedWebsite.id);
      }
      
      const { data: widgets, error: widgetsError } = await widgetsQuery;

      if (widgetsError) throw widgetsError;
      
      const widgetIds = widgets?.map(w => w.id) || [];
      
      if (widgetIds.length === 0) {
        setItems([]);
        return;
      }

      // Load events from connectors with proper joins
      const { data, error } = await supabase
        .from('events')
        .select(`
          id,
          event_type,
          event_data,
          status,
          created_at
        `)
        .eq('source', 'connector')
        .eq('status', filter as 'pending' | 'approved' | 'rejected')
        .in('widget_id', widgetIds)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Enhance events with connector info
      const enhancedItems = [];
      for (const event of data || []) {
        const eventData = event.event_data as any;
        const connectorId = eventData?.connector_id;
        let connector = null;
        
        if (connectorId) {
          const { data: connectorData } = await supabase
            .from('social_connectors')
            .select('name, type')
            .eq('id', connectorId)
            .single();
          connector = connectorData;
        }

        enhancedItems.push({
          ...event,
          connector
        });
      }
      
      setItems(enhancedItems);
    } catch (error) {
      console.error('Error loading items:', error);
      toast({
        title: "Error",
        description: "Failed to load moderation items",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const moderateItem = async (itemId: string, status: 'approved' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('events')
        .update({
          status: status
        })
        .eq('id', itemId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Item ${status} successfully`,
      });

      loadItems();
    } catch (error) {
      console.error('Error moderating item:', error);
      toast({
        title: "Error",
        description: "Failed to moderate item",
        variant: "destructive",
      });
    }
  };

  const getItemTypeIcon = (type: string) => {
    switch (type) {
      case 'review': return <Star className="h-4 w-4" />;
      case 'tweet': return <User className="h-4 w-4" />;
      case 'post': return <Calendar className="h-4 w-4" />;
      default: return <User className="h-4 w-4" />;
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  if (loading || isSwitching) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-muted rounded animate-pulse" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader className="space-y-3">
                <div className="h-6 bg-muted rounded animate-pulse" />
                <div className="h-4 bg-muted rounded animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="h-20 bg-muted rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Moderation Queue</h1>
        <p className="text-muted-foreground">
          Review and approve social proof content before it goes live
        </p>
      </div>

      <Tabs value={filter} onValueChange={setFilter} className="w-full">
        <TabsList>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
        </TabsList>

        <TabsContent value={filter} className="space-y-4">
          {items.length === 0 ? (
            <Card>
              <CardHeader className="text-center">
                <CardTitle>No items to moderate</CardTitle>
                <CardDescription>
                  {filter === 'pending' 
                    ? 'All caught up! No pending items to review.'
                    : `No ${filter} items found.`
                  }
                </CardDescription>
              </CardHeader>
            </Card>
          ) : (
            items.map((item) => (
              <Card key={item.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {getItemTypeIcon(item.event_type)}
                      <div>
                        <CardTitle className="text-lg capitalize">{item.event_type}</CardTitle>
                        <CardDescription>
                          from {item.connector?.name} • {item.connector?.type}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge variant={
                      item.status === 'approved' ? 'default' :
                      item.status === 'rejected' ? 'destructive' : 'secondary'
                    }>
                      {item.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Author info */}
                    {item.event_data.author_name && (
                      <div className="flex items-center space-x-2">
                        {item.event_data.author_avatar && (
                          <img
                            src={item.event_data.author_avatar}
                            alt={item.event_data.author_name}
                            className="h-8 w-8 rounded-full"
                          />
                        )}
                        <span className="font-medium">{item.event_data.author_name}</span>
                        {item.event_data.rating && renderStars(item.event_data.rating)}
                      </div>
                    )}

                    {/* Content */}
                    <div className="bg-muted p-4 rounded-lg">
                      <p className="text-sm">{item.event_data.message}</p>
                    </div>

                    {/* Metadata */}
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <div>
                        {item.event_data.posted_at && (
                          <span>Posted: {new Date(item.event_data.posted_at).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    {item.status === 'pending' && (
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          onClick={() => moderateItem(item.id, 'approved')}
                          className="flex-1"
                        >
                          <Check className="h-4 w-4 mr-2" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => moderateItem(item.id, 'rejected')}
                          className="flex-1"
                        >
                          <X className="h-4 w-4 mr-2" />
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ModerationQueue;