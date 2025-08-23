import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { EventStatusBadge } from '@/components/EventStatusBadge';
import { 
  Filter, 
  TrendingUp, 
  Shield, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  BarChart3,
  Users,
  Eye,
  MousePointer
} from 'lucide-react';

interface Event {
  id: string;
  event_type: string;
  user_name: string | null;
  user_location: string | null;
  integration_type: string;
  moderation_status: string;
  quality_score: number;
  views: number;
  clicks: number;
  created_at: string;
  source: string;
  event_data: any;
}

interface EventStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  flagged: number;
  avgQualityScore: number;
  totalViews: number;
  totalClicks: number;
}

export default function EventLifecycleManager() {
  const [events, setEvents] = useState<Event[]>([]);
  const [stats, setStats] = useState<EventStats>({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    flagged: 0,
    avgQualityScore: 0,
    totalViews: 0,
    totalClicks: 0
  });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    status: 'all',
    source: 'all',
    minQuality: 0,
    search: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    loadEvents();
    loadStats();
  }, [filter]);

  const loadEvents = async () => {
    try {
      let query = supabase
        .from('events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      // Apply filters
      if (filter.status !== 'all') {
        query = query.eq('moderation_status', filter.status as any);
      }
      
      if (filter.source !== 'all') {
        query = query.eq('source', filter.source as any);
      }

      if (filter.minQuality > 0) {
        query = query.gte('quality_score', filter.minQuality);
      }

      if (filter.search) {
        query = query.or(`user_name.ilike.%${filter.search}%,user_location.ilike.%${filter.search}%,event_type.ilike.%${filter.search}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error loading events:', error);
      toast({
        title: 'Error',
        description: 'Failed to load events',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('moderation_status, quality_score, views, clicks');

      if (error) throw error;

      const stats = data.reduce((acc, event) => {
        acc.total++;
        acc[event.moderation_status]++;
        acc.avgQualityScore += event.quality_score;
        acc.totalViews += event.views || 0;
        acc.totalClicks += event.clicks || 0;
        return acc;
      }, {
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
        flagged: 0,
        avgQualityScore: 0,
        totalViews: 0,
        totalClicks: 0
      });

      stats.avgQualityScore = stats.total > 0 ? Math.round(stats.avgQualityScore / stats.total) : 0;
      setStats(stats);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleModerationAction = async (eventId: string, action: 'approve' | 'reject' | 'flag') => {
    try {
      const status = action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'flagged';
      
      const { error } = await supabase
        .from('events')
        .update({ moderation_status: status })
        .eq('id', eventId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Event ${action}d successfully`
      });

      loadEvents();
      loadStats();
    } catch (error) {
      console.error('Error updating event status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update event status',
        variant: 'destructive'
      });
    }
  };

  const handleBulkAction = async (action: 'approve' | 'reject' | 'delete', eventIds: string[]) => {
    try {
      if (action === 'delete') {
        const { error } = await supabase
          .from('events')
          .delete()
          .in('id', eventIds);
        
        if (error) throw error;
      } else {
        const status = action === 'approve' ? 'approved' : 'rejected';
        const { error } = await supabase
          .from('events')
          .update({ moderation_status: status })
          .in('id', eventIds);
        
        if (error) throw error;
      }

      toast({
        title: 'Success',
        description: `Bulk ${action} completed successfully`
      });

      loadEvents();
      loadStats();
    } catch (error) {
      console.error('Error performing bulk action:', error);
      toast({
        title: 'Error',
        description: 'Failed to perform bulk action',
        variant: 'destructive'
      });
    }
  };

  const getQualityColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'natural':
        return '🌱';
      case 'demo':
        return '🎭';
      case 'manual':
        return '✏️';
      default:
        return '📊';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Event Lifecycle Manager</h1>
        <p className="text-muted-foreground">
          Monitor, moderate, and optimize your natural proof events
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-xs text-muted-foreground mt-2">
              <div className="flex justify-between">
                <span>Approved: {stats.approved}</span>
                <span>Pending: {stats.pending}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quality Score</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgQualityScore}%</div>
            <Progress value={stats.avgQualityScore} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalViews.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Across all events
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clicks</CardTitle>
            <MousePointer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalClicks.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.totalViews > 0 ? `${((stats.totalClicks / stats.totalViews) * 100).toFixed(1)}% CTR` : '0% CTR'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Filters</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select value={filter.status} onValueChange={(value) => setFilter({ ...filter, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="flagged">Flagged</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Source</label>
              <Select value={filter.source} onValueChange={(value) => setFilter({ ...filter, source: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="natural">Natural</SelectItem>
                  <SelectItem value="demo">Demo</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Min Quality</label>
              <Select value={filter.minQuality.toString()} onValueChange={(value) => setFilter({ ...filter, minQuality: parseInt(value) })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Any Quality</SelectItem>
                  <SelectItem value="50">50+ Quality</SelectItem>
                  <SelectItem value="70">70+ Quality</SelectItem>
                  <SelectItem value="80">80+ Quality</SelectItem>
                  <SelectItem value="90">90+ Quality</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Search</label>
              <Input
                placeholder="Search events..."
                value={filter.search}
                onChange={(e) => setFilter({ ...filter, search: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Events List */}
      <Card>
        <CardHeader>
          <CardTitle>Events</CardTitle>
          <CardDescription>
            Manage and moderate your social proof events
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No events found</h3>
              <p className="text-muted-foreground">Try adjusting your filters or create some events</p>
            </div>
          ) : (
            <div className="space-y-4">
              {events.map((event) => (
                <Card key={event.id} className="border">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-lg">{getSourceIcon(event.source)}</span>
                          <Badge variant="outline">{event.event_type}</Badge>
                          <EventStatusBadge status={event.moderation_status} source={event.source} />
                          <Badge variant="outline" className={getQualityColor(event.quality_score)}>
                            {event.quality_score}% Quality
                          </Badge>
                        </div>
                        
                        <div>
                          <p className="font-medium">
                            {event.user_name || 'Anonymous'} 
                            {event.user_location && ` from ${event.user_location}`}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {event.integration_type} • {new Date(event.created_at).toLocaleString()}
                          </p>
                        </div>

                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <span className="flex items-center space-x-1">
                            <Eye className="h-3 w-3" />
                            <span>{event.views} views</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <MousePointer className="h-3 w-3" />
                            <span>{event.clicks} clicks</span>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        {event.moderation_status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleModerationAction(event.id, 'approve')}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleModerationAction(event.id, 'reject')}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </>
                        )}
                        
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleModerationAction(event.id, 'flag')}
                        >
                          <AlertTriangle className="h-4 w-4 mr-1" />
                          Flag
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}