import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useWebsites } from '@/hooks/useWebsites';
import { QuickStartWizard } from '@/components/QuickStartWizard';

import { IntegrationStatusDashboard } from '@/components/IntegrationStatusDashboard';
import { Activity, MousePointer, Eye, Plus, Wand2, ShoppingCart, Mail, Plug } from 'lucide-react';
import { Link } from 'react-router-dom';
import { GenuineAnalyticsDashboard } from '@/components/GenuineAnalyticsDashboard';

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
  const { selectedWebsite } = useWebsites();
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
        // Fetch user's widgets filtered by selected website
        let widgetsQuery = supabase
          .from('widgets')
          .select('id')
          .eq('user_id', profile.id);
        
        if (selectedWebsite) {
          widgetsQuery = widgetsQuery.eq('website_id', selectedWebsite.id);
        }
        
        const { data: widgets } = await widgetsQuery;

        const widgetIds = widgets?.map(w => w.id) || [];
        setHasWidgets(widgetIds.length > 0);

        if (widgetIds.length > 0) {
          // Fetch events for stats (exclude tracking data like pageviews)
          const { data: events } = await supabase
            .from('events')
            .select('views, clicks, source, event_type')
            .in('widget_id', widgetIds)
            .not('source', 'eq', 'tracking');

          // Calculate stats - only count actual social proof notifications
          const socialProofEvents = events?.filter(event => 
            event.source !== 'tracking' && event.event_type !== 'pageview'
          ) || [];
          const totalEvents = socialProofEvents.length;
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
              widget_id,
              widgets!events_widget_id_fkey(name)
            `)
            .in('widget_id', widgetIds)
            .order('created_at', { ascending: false })
            .limit(5);

          setRecentEvents(recentEventsData?.map(event => ({
            ...event,
            widget: { name: event.widgets?.name || 'Unknown Widget' }
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
  }, [profile, selectedWebsite]);

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
        
        <Button onClick={() => setShowWizard(true)} className="gap-2" data-tour="quick-actions">
          <Wand2 className="h-4 w-4" />
          Quick Start Wizard
        </Button>
      </div>


      {/* Enhanced Onboarding Section */}
      {!hasWidgets && !loading && (
        <div className="grid lg:grid-cols-2 gap-6">
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                  <Wand2 className="h-8 w-8 text-muted-foreground" />
                </div>
                <h2 className="text-xl font-semibold">Welcome to NotiProof!</h2>
                <p className="text-muted-foreground max-w-md">
                  Get started with our guided setup to create your first social proof widget.
                </p>
                <div className="flex gap-3">
                  <Button onClick={() => setShowWizard(true)} className="gap-2" data-tour="quick-actions">
                    <Wand2 className="h-4 w-4" />
                    Quick Start Wizard
                  </Button>
                  <Button variant="outline" asChild data-tour="quick-actions">
                    <Link to="/dashboard/widgets/create">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Widget
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          
          
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6" data-tour="dashboard-stats">
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

      </div>

      {/* Real-Time Analytics Dashboard */}
      {hasWidgets && (
        <GenuineAnalyticsDashboard />
      )}

      {/* Graduation Progress */}
      {hasWidgets && (
        <Card>
          <CardHeader>
            <CardTitle>Event System Status</CardTitle>
            <CardDescription>
              Track your progress from quick-wins to natural events
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Monitor your widget's graduation progress in the widget analytics section.
            </p>
          </CardContent>
        </Card>
      )}


      {/* Integration Status Dashboard */}
      <IntegrationStatusDashboard />

      {/* Recent Activity */}
      {hasWidgets && (
        <Card data-tour="recent-activity">
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
      )}

    </div>
  );
};

export default Dashboard;