import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X, Star, Calendar, User } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface SocialItem {
  id: string;
  type: string;
  content: string;
  author_name: string | null;
  author_avatar: string | null;
  rating: number | null;
  source_url: string | null;
  posted_at: string | null;
  moderation_status: string;
  created_at: string;
  connector: {
    name: string;
    type: string;
  };
}

const ModerationQueue: React.FC = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<SocialItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');

  useEffect(() => {
    if (profile?.id) {
      loadItems();
    }
  }, [profile, filter]);

  const loadItems = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('social_items')
        .select(`
          *,
          connector:social_connectors(name, type)
        `)
        .eq('moderation_status', filter)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setItems(data as any || []);
    } catch (error) {
      console.error('Error loading items:', error);
      toast({
        title: "Error",
        description: "Failed to load social items",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const moderateItem = async (itemId: string, status: 'approved' | 'rejected') => {
    try {
      const { error } = await (supabase as any)
        .from('social_items')
        .update({
          moderation_status: status,
          moderated_by: profile?.id,
          moderated_at: new Date().toISOString()
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

  if (loading) {
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
                      {getItemTypeIcon(item.type)}
                      <div>
                        <CardTitle className="text-lg capitalize">{item.type}</CardTitle>
                        <CardDescription>
                          from {item.connector?.name} • {item.connector?.type}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge variant={
                      item.moderation_status === 'approved' ? 'default' :
                      item.moderation_status === 'rejected' ? 'destructive' : 'secondary'
                    }>
                      {item.moderation_status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Author info */}
                    {item.author_name && (
                      <div className="flex items-center space-x-2">
                        {item.author_avatar && (
                          <img
                            src={item.author_avatar}
                            alt={item.author_name}
                            className="h-8 w-8 rounded-full"
                          />
                        )}
                        <span className="font-medium">{item.author_name}</span>
                        {item.rating && renderStars(item.rating)}
                      </div>
                    )}

                    {/* Content */}
                    <div className="bg-muted p-4 rounded-lg">
                      <p className="text-sm">{item.content}</p>
                    </div>

                    {/* Metadata */}
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <div>
                        {item.posted_at && (
                          <span>Posted: {new Date(item.posted_at).toLocaleDateString()}</span>
                        )}
                      </div>
                      {item.source_url && (
                        <a
                          href={item.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          View Original
                        </a>
                      )}
                    </div>

                    {/* Actions */}
                    {item.moderation_status === 'pending' && (
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