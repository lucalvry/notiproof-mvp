import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar
} from "recharts";
import { TrendingUp, Users, Globe, Monitor, Smartphone, Clock } from "lucide-react";

interface VisitorsPulseAnalyticsProps {
  websiteId: string;
}

export function VisitorsPulseAnalytics({ websiteId }: VisitorsPulseAnalyticsProps) {
  const [dateRange, setDateRange] = useState("7d");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalVisitors: 0,
    avgSessionDuration: 0,
    peakVisitors: 0,
    avgPagesPerSession: 0,
  });
  const [trendData, setTrendData] = useState<any[]>([]);
  const [deviceData, setDeviceData] = useState<any[]>([]);
  const [countryData, setCountryData] = useState<any[]>([]);
  const [hourlyData, setHourlyData] = useState<any[]>([]);

  useEffect(() => {
    fetchAnalytics();
  }, [websiteId, dateRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const days = parseInt(dateRange);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data: journeys, error } = await supabase
        .from("visitor_journeys")
        .select("*")
        .eq("website_id", websiteId)
        .gte("session_start", startDate.toISOString());

      if (error) throw error;

      const visitors = journeys || [];
      
      // Calculate stats
      const totalVisitors = new Set(visitors.map(v => v.visitor_id)).size;
      const conversions = visitors.filter(v => v.converted).length;

      // Calculate avg session duration
      const sessionsWithDuration = visitors.filter(v => v.first_seen_at && v.last_seen_at);
      const avgDuration = sessionsWithDuration.length > 0
        ? sessionsWithDuration.reduce((acc, v) => {
            const start = new Date(v.first_seen_at).getTime();
            const end = new Date(v.last_seen_at).getTime();
            return acc + (end - start);
          }, 0) / sessionsWithDuration.length / 60000 // Convert to minutes
        : 0;

      const trendGrouped = groupByDay(visitors);
      setStats({
        totalVisitors,
        avgSessionDuration: Math.round(avgDuration),
        peakVisitors: trendGrouped.length > 0 ? Math.max(...trendGrouped.map(d => d.count as number)) : 0,
        avgPagesPerSession: conversions, // Repurposed to show conversions
      });

      // Trend data (visitors per day)
      setTrendData(trendGrouped);

      // Device breakdown
      const deviceCounts = visitors.reduce((acc: Record<string, number>, v) => {
        const device = v.device_type || "Desktop";
        acc[device] = (acc[device] || 0) + 1;
        return acc;
      }, {});
      setDeviceData(Object.entries(deviceCounts).map(([name, value]) => ({ name, value })));

      // Country breakdown (top 5)
      const countryCounts = visitors.reduce((acc: Record<string, number>, v) => {
        const country = v.country || "Unknown";
        acc[country] = (acc[country] || 0) + 1;
        return acc;
      }, {});
      const sortedCountries = Object.entries(countryCounts)
        .sort((a, b) => (b[1] as number) - (a[1] as number))
        .slice(0, 5)
        .map(([name, value]) => ({ name, value }));
      setCountryData(sortedCountries);

      // Hourly distribution
      const hourlyCounts = new Array(24).fill(0);
      visitors.forEach(v => {
        if (v.first_seen_at) {
          const hour = new Date(v.first_seen_at).getHours();
          hourlyCounts[hour]++;
        }
      });
      setHourlyData(hourlyCounts.map((count, hour) => ({
        hour: `${hour}:00`,
        visitors: count,
      })));

    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const groupByDay = (visitors: { first_seen_at: string }[]) => {
    const groups: Record<string, number> = {};
    visitors.forEach((v) => {
      if (v.first_seen_at) {
        const date = new Date(v.first_seen_at).toLocaleDateString();
        groups[date] = (groups[date] || 0) + 1;
      }
    });
    return Object.entries(groups)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  const COLORS = ["hsl(var(--primary))", "hsl(var(--secondary))", "hsl(var(--accent))", "#8884d8", "#82ca9d"];

  if (loading) {
    return <div className="flex items-center justify-center py-12">Loading analytics...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Date Range Selector */}
      <div className="flex justify-end">
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="14">Last 14 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalVisitors.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Total Visitors</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.peakVisitors}</p>
                <p className="text-sm text-muted-foreground">Peak Visitors/Day</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.avgSessionDuration}m</p>
                <p className="text-sm text-muted-foreground">Avg Session</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Monitor className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.avgPagesPerSession}</p>
                <p className="text-sm text-muted-foreground">Conversions</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Visitor Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Visitor Trend</CardTitle>
          <CardDescription>Daily visitor count over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Area 
                  type="monotone" 
                  dataKey="count" 
                  stroke="hsl(var(--primary))" 
                  fill="hsl(var(--primary))" 
                  fillOpacity={0.2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-6">
        {/* Device Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="h-5 w-5" />
              Device Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={deviceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {deviceData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top Countries */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Top Countries
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={countryData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={100} />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Peak Hours */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Peak Hours
          </CardTitle>
          <CardDescription>When your visitors are most active</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="visitors" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
