import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Download, TrendingUp, Eye, MousePointer, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, subDays } from "date-fns";

export default function WidgetAnalytics() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [widget, setWidget] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("7");
  const [eventTypeFilter, setEventTypeFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");

  useEffect(() => {
    fetchData();
  }, [id, dateRange, eventTypeFilter, sourceFilter]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch widget
      const { data: widgetData, error: widgetError } = await supabase
        .from("widgets")
        .select("*")
        .eq("id", id)
        .single();

      if (widgetError) throw widgetError;
      setWidget(widgetData);

      // Calculate date range
      const startDate = subDays(new Date(), parseInt(dateRange));

      // Build query
      let query = supabase
        .from("events")
        .select("*")
        .eq("widget_id", id)
        .gte("created_at", startDate.toISOString())
        .order("created_at", { ascending: false });

      if (eventTypeFilter !== "all") {
        query = query.eq("event_type", eventTypeFilter);
      }

      if (sourceFilter !== "all") {
        query = query.eq("source", sourceFilter as any);
      }

      const { data: eventsData, error: eventsError } = await query;

      if (eventsError) throw eventsError;
      setEvents(eventsData || []);
    } catch (error) {
      console.error("Error fetching analytics:", error);
      toast.error("Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    const csv = [
      ["Event ID", "Type", "Source", "Message", "Views", "Clicks", "CTR", "Created At"].join(","),
      ...events.map(e => [
        e.id,
        e.event_type,
        e.source,
        `"${e.message_template || ''}"`,
        e.views || 0,
        e.clicks || 0,
        e.views > 0 ? ((e.clicks / e.views) * 100).toFixed(2) + "%" : "0%",
        format(new Date(e.created_at), "yyyy-MM-dd HH:mm:ss")
      ].join(","))
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `widget-analytics-${id}-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Analytics exported successfully");
  };

  const totalViews = events.reduce((sum, e) => sum + (e.views || 0), 0);
  const totalClicks = events.reduce((sum, e) => sum + (e.clicks || 0), 0);
  const avgCTR = totalViews > 0 ? (totalClicks / totalViews) * 100 : 0;

  // Group by event type
  const eventTypeBreakdown = events.reduce((acc: Record<string, number>, e: any) => {
    acc[e.event_type] = (acc[e.event_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Group by source
  const sourceBreakdown = events.reduce((acc: Record<string, number>, e: any) => {
    acc[e.source] = (acc[e.source] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Group by page URL
  const pageBreakdown = events.reduce((acc: Record<string, { views: number; clicks: number }>, e: any) => {
    if (e.page_url) {
      if (!acc[e.page_url]) {
        acc[e.page_url] = { views: 0, clicks: 0 };
      }
      acc[e.page_url].views += e.views || 0;
      acc[e.page_url].clicks += e.clicks || 0;
    }
    return acc;
  }, {} as Record<string, { views: number; clicks: number }>);

  if (loading) {
    return <div className="flex items-center justify-center h-full">Loading analytics...</div>;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Widget Analytics</h1>
            <p className="text-muted-foreground">{widget?.name}</p>
          </div>
        </div>
        <Button onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <div className="flex gap-4">
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-[180px]">
            <Calendar className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Last 24 hours</SelectItem>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>

        <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Event Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="purchase">Purchase</SelectItem>
            <SelectItem value="conversion">Conversion</SelectItem>
            <SelectItem value="visitor">Visitor</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            <SelectItem value="natural">Natural</SelectItem>
            <SelectItem value="integration">Integration</SelectItem>
            <SelectItem value="manual">Manual</SelectItem>
            <SelectItem value="quick-win">Quick Win</SelectItem>
            <SelectItem value="demo">Demo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalViews.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{events.length} events</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clicks</CardTitle>
            <MousePointer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalClicks.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">User interactions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average CTR</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgCTR.toFixed(2)}%</div>
            <p className="text-xs text-muted-foreground">Click-through rate</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Event Type Breakdown</CardTitle>
            <CardDescription>Distribution by event type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(eventTypeBreakdown).map(([type, count]: [string, number]) => (
                <div key={type} className="flex items-center justify-between">
                  <span className="capitalize">{type}</span>
                  <Badge variant="secondary">{count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Source Breakdown</CardTitle>
            <CardDescription>Distribution by source</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(sourceBreakdown).map(([source, count]: [string, number]) => (
                <div key={source} className="flex items-center justify-between">
                  <span className="capitalize">{source}</span>
                  <Badge variant="secondary">{count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top Pages</CardTitle>
          <CardDescription>Performance by page URL</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Page URL</TableHead>
                <TableHead className="text-right">Views</TableHead>
                <TableHead className="text-right">Clicks</TableHead>
                <TableHead className="text-right">CTR</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(Object.entries(pageBreakdown) as [string, { views: number; clicks: number }][])
                .sort((a, b) => b[1].views - a[1].views)
                .slice(0, 10)
                .map(([url, stats]) => (
                  <TableRow key={url}>
                    <TableCell className="font-mono text-xs truncate max-w-md">{url}</TableCell>
                    <TableCell className="text-right">{stats.views}</TableCell>
                    <TableCell className="text-right">{stats.clicks}</TableCell>
                    <TableCell className="text-right">
                      {stats.views > 0 ? ((stats.clicks / stats.views) * 100).toFixed(2) : 0}%
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Events</CardTitle>
          <CardDescription>Latest tracked events with performance metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Message</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Source</TableHead>
                <TableHead className="text-right">Views</TableHead>
                <TableHead className="text-right">Clicks</TableHead>
                <TableHead className="text-right">CTR</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.slice(0, 20).map((event) => (
                <TableRow key={event.id}>
                  <TableCell className="max-w-xs truncate">{event.message_template}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {event.event_type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="capitalize">
                      {event.source}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{event.views || 0}</TableCell>
                  <TableCell className="text-right">{event.clicks || 0}</TableCell>
                  <TableCell className="text-right">
                    {event.views > 0 ? ((event.clicks / event.views) * 100).toFixed(1) : 0}%
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {format(new Date(event.created_at), "MMM d, HH:mm")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
