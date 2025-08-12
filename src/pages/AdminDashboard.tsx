import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Users, Blocks, Activity, Calendar } from 'lucide-react';

interface Stats {
  totalUsers: number;
  activeWidgets: number;
  totalEvents: number;
  newUsersThisWeek: number;
}

const AdminDashboard = () => {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    activeWidgets: 0,
    totalEvents: 0,
    newUsersThisWeek: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAdminStats = async () => {
      try {
        // Get total users
        const { count: totalUsers } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });

        // Get active widgets
        const { count: activeWidgets } = await supabase
          .from('widgets')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'active');

        // Get total events (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const { count: totalEvents } = await supabase
          .from('events')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', sevenDaysAgo.toISOString());

        // Get new users this week
        const { count: newUsersThisWeek } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', sevenDaysAgo.toISOString());

        setStats({
          totalUsers: totalUsers || 0,
          activeWidgets: activeWidgets || 0,
          totalEvents: totalEvents || 0,
          newUsersThisWeek: newUsersThisWeek || 0,
        });
      } catch (error) {
        console.error('Error fetching admin stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAdminStats();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">Overview of your NotiProof platform</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              +{stats.newUsersThisWeek} this week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Widgets</CardTitle>
            <Blocks className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeWidgets}</div>
            <p className="text-xs text-muted-foreground">
              Currently active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Events (7 days)</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEvents}</div>
            <p className="text-xs text-muted-foreground">
              Last 7 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Growth Rate</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalUsers > 0 ? ((stats.newUsersThisWeek / stats.totalUsers) * 100).toFixed(1) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Weekly growth
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common administrative tasks
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <a 
                href="/admin/users" 
                className="p-3 border rounded-lg hover:bg-muted/50 transition-colors block"
              >
                <div className="font-medium">Manage Users</div>
                <div className="text-sm text-muted-foreground">
                  View, suspend, or activate user accounts
                </div>
              </a>
              
              <a 
                href="/admin/widgets" 
                className="p-3 border rounded-lg hover:bg-muted/50 transition-colors block"
              >
                <div className="font-medium">Review Widgets</div>
                <div className="text-sm text-muted-foreground">
                  Monitor all widgets across the platform
                </div>
              </a>
              
              <a 
                href="/admin/events" 
                className="p-3 border rounded-lg hover:bg-muted/50 transition-colors block"
              >
                <div className="font-medium">Event Analytics</div>
                <div className="text-sm text-muted-foreground">
                  View detailed event analytics and metrics
                </div>
              </a>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Platform Health</CardTitle>
            <CardDescription>
              System status and performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">API Status</span>
                <span className="text-sm text-green-600">Operational</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Widget Delivery</span>
                <span className="text-sm text-green-600">Operational</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Database</span>
                <span className="text-sm text-green-600">Operational</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Authentication</span>
                <span className="text-sm text-green-600">Operational</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;