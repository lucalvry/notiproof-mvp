import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { EventSourceIndicator } from '@/components/EventSourceIndicator';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, TrendingDown, Users, Eye, MousePointer, Target } from 'lucide-react';

interface Event {
  id: string;
  event_type: string;
  source: string; // Allow all source types from database
  views: number | null;
  clicks: number | null;
  created_at: string;
}

interface UnifiedAnalyticsDashboardProps {
  events: Event[];
  widgetId: string;
}

const COLORS = ['#2563eb', '#16a34a', '#f59e0b', '#ef4444'];

export const UnifiedAnalyticsDashboard = ({ events, widgetId }: UnifiedAnalyticsDashboardProps) => {
  
  // Phase 6: Analytics Split - Separate performance metrics
  const analytics = useMemo(() => {
    const naturalEvents = events.filter(e => e.source !== 'quick_win' && e.source !== 'demo');
    const quickWinEvents = events.filter(e => e.source === 'quick_win');
    
    const naturalViews = naturalEvents.reduce((sum, e) => sum + (e.views || 0), 0);
    const naturalClicks = naturalEvents.reduce((sum, e) => sum + (e.clicks || 0), 0);
    const naturalCTR = naturalViews > 0 ? (naturalClicks / naturalViews) * 100 : 0;
    
    const quickWinViews = quickWinEvents.reduce((sum, e) => sum + (e.views || 0), 0);
    const quickWinClicks = quickWinEvents.reduce((sum, e) => sum + (e.clicks || 0), 0);
    const quickWinCTR = quickWinViews > 0 ? (quickWinClicks / quickWinViews) * 100 : 0;
    
    const totalViews = naturalViews + quickWinViews;
    const totalClicks = naturalClicks + quickWinClicks;
    const overallCTR = totalViews > 0 ? (totalClicks / totalViews) * 100 : 0;
    
    // Graduation metrics
    const graduationThreshold = 10;
    const graduationProgress = Math.min((naturalEvents.length / graduationThreshold) * 100, 100);
    const readyToGraduate = naturalEvents.length >= graduationThreshold;
    
    return {
      natural: {
        count: naturalEvents.length,
        views: naturalViews,
        clicks: naturalClicks,
        ctr: naturalCTR
      },
      quickWin: {
        count: quickWinEvents.length,
        views: quickWinViews,
        clicks: quickWinClicks,
        ctr: quickWinCTR
      },
      overall: {
        views: totalViews,
        clicks: totalClicks,
        ctr: overallCTR
      },
      graduation: {
        progress: graduationProgress,
        ready: readyToGraduate,
        threshold: graduationThreshold
      }
    };
  }, [events]);

  // Source distribution for pie chart
  const sourceDistribution = useMemo(() => {
    const distribution = events.reduce((acc, event) => {
      const source = event.source === 'manual' || event.source === 'connector' ? 'natural' : event.source;
      acc[source] = (acc[source] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(distribution).map(([source, count]) => ({
      name: source === 'natural' ? 'Natural' : source === 'quick_win' ? 'Quick-Win' : source,
      value: count,
      color: source === 'natural' ? '#16a34a' : source === 'quick_win' ? '#f59e0b' : '#6b7280'
    }));
  }, [events]);

  // Performance comparison over time
  const performanceComparison = useMemo(() => {
    const last30Days = events.filter(e => {
      const eventDate = new Date(e.created_at);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return eventDate >= thirtyDaysAgo;
    });

    // Group by week for comparison
    const weeklyData = last30Days.reduce((acc, event) => {
      const week = Math.floor((Date.now() - new Date(event.created_at).getTime()) / (7 * 24 * 60 * 60 * 1000));
      const weekKey = `Week ${4 - week}`;
      
      if (!acc[weekKey]) {
        acc[weekKey] = { week: weekKey, natural: 0, quickWin: 0 };
      }
      
      if (event.source === 'quick_win') {
        acc[weekKey].quickWin += (event.views || 0);
      } else if (event.source !== 'demo') {
        acc[weekKey].natural += (event.views || 0);
      }
      
      return acc;
    }, {} as Record<string, any>);

    return Object.values(weeklyData);
  }, [events]);

  return (
    <div className="space-y-6">
      {/* Phase 6: Split Analytics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Natural Events</CardTitle>
            <Users className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{analytics.natural.count}</div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
              <Eye className="h-3 w-3" />
              {analytics.natural.views} views
              <MousePointer className="h-3 w-3 ml-2" />
              {analytics.natural.clicks} clicks
            </div>
            <div className="text-xs text-muted-foreground">
              CTR: {analytics.natural.ctr.toFixed(1)}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quick-Win Events</CardTitle>
            <Target className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{analytics.quickWin.count}</div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
              <Eye className="h-3 w-3" />
              {analytics.quickWin.views} views
              <MousePointer className="h-3 w-3 ml-2" />
              {analytics.quickWin.clicks} clicks
            </div>
            <div className="text-xs text-muted-foreground">
              CTR: {analytics.quickWin.ctr.toFixed(1)}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Performance</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.overall.ctr.toFixed(1)}%</div>
            <div className="text-xs text-muted-foreground">
              {analytics.overall.views} total views
            </div>
            <div className="text-xs text-muted-foreground">
              {analytics.overall.clicks} total clicks  
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Graduation Status</CardTitle>
            {analytics.graduation.ready ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-yellow-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Progress</span>
                <span className="text-sm font-medium">
                  {analytics.natural.count}/{analytics.graduation.threshold}
                </span>
              </div>
              <Progress value={analytics.graduation.progress} className="h-2" />
              <Badge 
                variant={analytics.graduation.ready ? "default" : "secondary"}
                className="text-xs"
              >
                {analytics.graduation.ready ? "Ready to Graduate" : "Building Credibility"}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Comparison Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Source Distribution</CardTitle>
            <CardDescription>Event breakdown by source type</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{
              natural: { label: 'Natural', color: '#16a34a' },
              quickWin: { label: 'Quick-Win', color: '#f59e0b' }
            }}>
              <PieChart>
                <Pie 
                  data={sourceDistribution} 
                  dataKey="value" 
                  nameKey="name" 
                  outerRadius={90}
                  label
                >
                  {sourceDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Performance Trend</CardTitle>
            <CardDescription>Natural vs Quick-Win views over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{
              natural: { label: 'Natural Views', color: '#16a34a' },
              quickWin: { label: 'Quick-Win Views', color: '#f59e0b' }
            }}>
              <BarChart data={performanceComparison}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="natural" fill="#16a34a" />
                <Bar dataKey="quickWin" fill="#f59e0b" />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Insights and Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Smart Insights</CardTitle>
          <CardDescription>AI-powered recommendations for your event strategy</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics.graduation.ready ? (
              <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2 text-green-800 dark:text-green-200 font-medium">
                  <TrendingUp className="h-4 w-4" />
                  Ready to Graduate!
                </div>
                <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                  You have {analytics.natural.count} natural events. Consider reducing quick-win ratio to 20% 
                  and letting natural events take priority for maximum credibility.
                </p>
              </div>
            ) : (
              <div className="p-4 bg-yellow-50 dark:bg-yellow-950 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200 font-medium">
                  <Target className="h-4 w-4" />
                  Building Credibility
                </div>
                <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                  You need {analytics.graduation.threshold - analytics.natural.count} more natural events to graduate. 
                  Consider setting up more integrations or encouraging customer interactions.
                </p>
              </div>
            )}

            {analytics.natural.ctr > analytics.quickWin.ctr && analytics.natural.count > 5 && (
              <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2 text-blue-800 dark:text-blue-200 font-medium">
                  <Users className="h-4 w-4" />
                  Natural Events Performing Better
                </div>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  Your natural events have a {analytics.natural.ctr.toFixed(1)}% CTR vs {analytics.quickWin.ctr.toFixed(1)}% for quick-wins. 
                  Consider increasing natural event priority in your display settings.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};