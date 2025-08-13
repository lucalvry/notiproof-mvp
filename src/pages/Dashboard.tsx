import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { LiveVisitorCount } from '@/components/LiveVisitorCount';
import { QuickStartWizard } from '@/components/QuickStartWizard';
import { Activity, MousePointer, Eye, Plus, Wand2, ShoppingCart, Mail, Plug } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Stats {
  totalNotifications: number;
  totalClicks: number;
  totalViews: number;
}

interface RecentEvent {
  id: string;
  event_type: string;
  event_data: any;
  created_at: string;
  widget: {
    name: string;
  };
}

interface IntegrationStatus {
  ecommerce: number;
  email: number;
  total: number;
}

const Dashboard = () => {
  const { profile } = useAuth();
  const [stats, setStats] = useState<Stats>({
    totalNotifications: 0,
    totalClicks: 0,
    totalViews: 0,
  });
  const [recentEvents, setRecentEvents] = useState<RecentEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [hasWidgets, setHasWidgets] = useState(false);
  const [integrations, setIntegrations] = useState<IntegrationStatus>({
    ecommerce: 0,
    email: 0,
    total: 0
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!profile) return;

      try {
        // Fetch user's widgets
        const { data: widgets } = await supabase
          .from('widgets')
          .select('id')
          .eq('user_id', profile.id);

        const widgetIds = widgets?.map(w => w.id) || [];
        setHasWidgets(widgetIds.length > 0);

        if (widgetIds.length > 0) {
          // Fetch events for stats
          const { data: events } = await supabase
            .from('events')
            .select('views, clicks')
            .in('widget_id', widgetIds);

          // Calculate stats
          const totalEvents = events?.length || 0;
          const totalClicks = events?.reduce((sum, event) => sum + (event.clicks || 0), 0) || 0;
          const totalViews = events?.reduce((sum, event) => sum + (event.views || 0), 0) || 0;

          setStats({
            totalNotifications: totalEvents,
            totalClicks,
            totalViews,
          });

          // Fetch recent events
          const { data: recentEventsData } = await supabase
            .from('events')
            .select(`
              id,
              event_type,
              event_data,
              created_at,
              widgets!inner(name)
            `)
            .in('widget_id', widgetIds)
            .order('created_at', { ascending: false })
            .limit(5);

          setRecentEvents(recentEventsData?.map(event => ({
            ...event,
            widget: event.widgets
          })) || []);
        }

        // Set integration status to show available integrations
        setIntegrations({
          ecommerce: 0, // Will show "Setup" buttons for Shopify & WooCommerce
          email: 0,     // Will show "Setup" buttons for email providers
          total: 0      // Will show "Manage All" button
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [profile]);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-muted rounded w-1/2 mb-2"></div>
                  <div className="h-8 bg-muted rounded w-1/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (showWizard) {
    return (
      <div className="space-y-6">
        <QuickStartWizard 
          onComplete={(widgetId) => {
            setShowWizard(false);
            window.location.reload(); // Refresh to show new widget data
          }}
          onSkip={() => setShowWizard(false)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {profile?.name}</p>
        </div>
        
        {!hasWidgets && (
          <Button onClick={() => setShowWizard(true)} className="gap-2">
            <Wand2 className="h-4 w-4" />
            Quick Start
          </Button>
        )}
      </div>

      {/* Empty State for New Users */}
      {!hasWidgets && !loading && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                <Wand2 className="h-8 w-8 text-muted-foreground" />
              </div>
              <h2 className="text-xl font-semibold">Welcome to NotiProof!</h2>
              <p className="text-muted-foreground max-w-md">
                You haven't created any widgets yet. Get started with our quick setup wizard 
                or create your first widget manually.
              </p>
              <div className="flex gap-3">
                <Button onClick={() => setShowWizard(true)} className="gap-2">
                  <Wand2 className="h-4 w-4" />
                  Quick Start Wizard
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/dashboard/widgets/create">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Widget
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Notifications</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalNotifications}</div>
            <p className="text-xs text-muted-foreground">
              Last 7 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clicks</CardTitle>
            <MousePointer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalClicks}</div>
            <p className="text-xs text-muted-foreground">
              All time
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalViews}</div>
            <p className="text-xs text-muted-foreground">
              All time
            </p>
          </CardContent>
        </Card>

        {/* Live Visitor Count Card */}
        <LiveVisitorCount showDetails={false} />
      </div>

      {/* Integration Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">E-commerce Integrations</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{integrations.ecommerce}</div>
            <p className="text-xs text-muted-foreground mb-2">
              Shopify & WooCommerce connected
            </p>
            <Button size="sm" variant="outline" asChild>
              <Link to="/dashboard/integrations">Setup</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Email Integrations</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{integrations.email}</div>
            <p className="text-xs text-muted-foreground mb-2">
              Mailchimp, ConvertKit, Klaviyo
            </p>
            <Button size="sm" variant="outline" asChild>
              <Link to="/dashboard/integrations">Setup</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Integrations</CardTitle>
            <Plug className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{integrations.total}</div>
            <p className="text-xs text-muted-foreground mb-2">
              All connected services
            </p>
            <Button size="sm" variant="outline" asChild>
              <Link to="/dashboard/integrations">Manage All</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Live Visitor Count Details */}
      {hasWidgets && (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>
                  Latest events from your widgets
                </CardDescription>
              </CardHeader>
              <CardContent>
                {recentEvents.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No recent activity. Create a widget to start tracking events.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {recentEvents.map((event) => (
                      <div key={event.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <p className="font-medium">{event.event_type}</p>
                          <p className="text-sm text-muted-foreground">
                            Widget: {event.widget?.name}
                          </p>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(event.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
          <div>
            <LiveVisitorCount showDetails={true} />
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;