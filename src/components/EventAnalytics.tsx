import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Activity, MousePointer, Eye } from 'lucide-react';
import { useSmartDemoManager } from '@/hooks/useSmartDemoManager';

interface EventAnalyticsProps {
  className?: string;
}

export const EventAnalytics = ({ className }: EventAnalyticsProps) => {
  const { eventStats } = useSmartDemoManager();

  const pieData = [
    { name: 'Real Events', value: eventStats.realEvents, color: '#10b981' },
    { name: 'Demo Events', value: eventStats.demoEvents, color: '#3b82f6' }
  ];

  const barData = [
    {
      name: 'Real Data',
      events: eventStats.realEvents,
      fill: '#10b981'
    },
    {
      name: 'Demo Data', 
      events: eventStats.demoEvents,
      fill: '#3b82f6'
    }
  ];

  const realDataPercentage = eventStats.totalEvents > 0 
    ? Math.round((eventStats.realEvents / eventStats.totalEvents) * 100)
    : 0;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{eventStats.totalEvents}</div>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-xs">
                <div className="w-2 h-2 bg-green-600 rounded-full mr-1" />
                {eventStats.realEvents} Real
              </Badge>
              <Badge variant="outline" className="text-xs">
                <div className="w-2 h-2 bg-blue-600 rounded-full mr-1" />
                {eventStats.demoEvents} Demo
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Real Data Quality</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{realDataPercentage}%</div>
            <Progress value={realDataPercentage} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {realDataPercentage >= 80 ? 'Excellent' : 
               realDataPercentage >= 50 ? 'Good' : 
               realDataPercentage >= 20 ? 'Fair' : 'Needs Improvement'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold">
              {eventStats.reachedThreshold ? (
                <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                  Production Ready
                </Badge>
              ) : (
                <Badge variant="outline">
                  Testing Phase
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {eventStats.reachedThreshold 
                ? 'Sufficient real data collected' 
                : `Need ${20 - eventStats.realEvents} more real events`}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Event Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="events" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Data Composition</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Data Quality Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Data Quality Insights</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {eventStats.realEvents === 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-2 h-2 bg-yellow-500 rounded-full" />
              No real events detected. Set up integrations to capture authentic user activity.
            </div>
          )}
          
          {eventStats.realEvents > 0 && eventStats.realEvents < 20 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-2 h-2 bg-blue-500 rounded-full" />
              Good start! You have {eventStats.realEvents} real events. Aim for 20+ to reach production quality.
            </div>
          )}
          
          {eventStats.reachedThreshold && eventStats.demoEvents > 0 && (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              Excellent! You have enough real data. Consider clearing demo events for pure analytics.
            </div>
          )}
          
          {eventStats.demoEvents === 0 && eventStats.realEvents > 0 && (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              Perfect! Your analytics show 100% authentic user activity.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};