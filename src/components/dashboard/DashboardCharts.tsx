import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Activity } from "lucide-react";

interface DashboardChartsProps {
  data?: {
    recentActivity: Array<{ date: string; views: number; clicks: number; }>;
    topCampaigns: Array<{ name: string; views: number; clicks: number; ctr: number; }>;
  };
}

// Mock data for demonstration
const mockRecentActivity = [
  { date: 'Mon', views: 1200, clicks: 89 },
  { date: 'Tue', views: 1890, clicks: 142 },
  { date: 'Wed', views: 2390, clicks: 201 },
  { date: 'Thu', views: 1980, clicks: 156 },
  { date: 'Fri', views: 2780, clicks: 234 },
  { date: 'Sat', views: 3190, clicks: 287 },
  { date: 'Sun', views: 2890, clicks: 245 },
];

const mockTopCampaigns = [
  { name: 'Recent Purchase', views: 4520, clicks: 387, ctr: 8.6 },
  { name: 'Live Visitors', views: 3820, clicks: 312, ctr: 8.2 },
  { name: 'New Signup', views: 3120, clicks: 245, ctr: 7.9 },
  { name: 'Reviews', views: 2340, clicks: 178, ctr: 7.6 },
  { name: 'Trial Starts', views: 1890, clicks: 132, ctr: 7.0 },
];

export function DashboardCharts({ data }: DashboardChartsProps) {
  const recentActivity = data?.recentActivity || mockRecentActivity;
  const topCampaigns = data?.topCampaigns || mockTopCampaigns;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Recent Activity Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Recent Activity
              </CardTitle>
              <CardDescription>
                Your proof notifications in the last 7 days
              </CardDescription>
            </div>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={recentActivity}>
              <defs>
                <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="date" 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="views"
                stroke="hsl(var(--primary))"
                fillOpacity={1}
                fill="url(#colorViews)"
                name="Views"
              />
              <Area
                type="monotone"
                dataKey="clicks"
                stroke="hsl(var(--chart-2))"
                fillOpacity={1}
                fill="url(#colorClicks)"
                name="Clicks"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Top Campaigns Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Top Campaigns</CardTitle>
          <CardDescription>
            Best performing campaigns this month
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={topCampaigns} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                type="number" 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <YAxis 
                type="category" 
                dataKey="name" 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                width={120}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                formatter={(value: any, name: string) => {
                  if (name === 'ctr') return `${value}%`;
                  return value;
                }}
              />
              <Legend />
              <Bar 
                dataKey="views" 
                fill="hsl(var(--primary))" 
                name="Views"
                radius={[0, 4, 4, 0]}
              />
              <Bar 
                dataKey="clicks" 
                fill="hsl(var(--chart-2))" 
                name="Clicks"
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
