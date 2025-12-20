import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { 
  Eye, 
  MousePointerClick, 
  Clock, 
  RefreshCw,
  Bell,
  TrendingUp,
  Calendar
} from "lucide-react";
import { format, subDays, formatDistanceToNow } from "date-fns";

interface LiveVisitorsListProps {
  websiteId: string;
}

interface NotificationActivity {
  id: string;
  campaignName: string;
  date: string;
  views: number;
  clicks: number;
  ctr: number;
}

export function LiveVisitorsList({ websiteId }: LiveVisitorsListProps) {
  const [activities, setActivities] = useState<NotificationActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<"7" | "14" | "30">("7");

  useEffect(() => {
    fetchActivities();
    
    // Refresh every 60 seconds
    const interval = setInterval(fetchActivities, 60000);

    return () => {
      clearInterval(interval);
    };
  }, [websiteId, dateFilter]);

  const fetchActivities = async () => {
    try {
      const days = parseInt(dateFilter);
      const startDate = subDays(new Date(), days);
      const startDateStr = format(startDate, 'yyyy-MM-dd');

      // Get Visitors Pulse campaigns for this website
      const { data: campaigns, error: campaignsError } = await supabase
        .from("campaigns")
        .select("id, name, data_sources")
        .eq("website_id", websiteId);

      if (campaignsError) throw campaignsError;

      // Filter to only Visitors Pulse campaigns
      const visitorsPulseCampaigns = (campaigns || []).filter(c => {
        const dataSources = c.data_sources as any[];
        return dataSources?.some((ds: any) => ds.provider === 'live_visitors');
      });

      if (visitorsPulseCampaigns.length === 0) {
        setActivities([]);
        setLoading(false);
        return;
      }

      const campaignIds = visitorsPulseCampaigns.map(c => c.id);
      const campaignNames = new Map(visitorsPulseCampaigns.map(c => [c.id, c.name]));

      // Fetch campaign_stats
      const { data: campaignStats, error: statsError } = await supabase
        .from("campaign_stats")
        .select("id, campaign_id, date, views, clicks")
        .in("campaign_id", campaignIds)
        .gte("date", startDateStr)
        .order("date", { ascending: false });

      if (statsError) throw statsError;

      const activityItems: NotificationActivity[] = (campaignStats || []).map(s => ({
        id: s.id,
        campaignName: campaignNames.get(s.campaign_id) || 'Unknown Campaign',
        date: s.date,
        views: s.views || 0,
        clicks: s.clicks || 0,
        ctr: s.views > 0 ? ((s.clicks || 0) / s.views) * 100 : 0,
      }));

      setActivities(activityItems);
    } catch (error) {
      console.error("Error fetching activities:", error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate stats
  const stats = {
    totalViews: activities.reduce((sum, a) => sum + a.views, 0),
    totalClicks: activities.reduce((sum, a) => sum + a.clicks, 0),
    avgCtr: activities.length > 0 
      ? activities.reduce((sum, a) => sum + a.ctr, 0) / activities.length 
      : 0,
    daysWithActivity: new Set(activities.map(a => a.date)).size,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Summary */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-muted/50 rounded-lg p-4 text-center">
          <div className="flex items-center justify-center gap-2 text-2xl font-bold text-primary">
            <Eye className="h-5 w-5" />
            {stats.totalViews.toLocaleString()}
          </div>
          <p className="text-sm text-muted-foreground">Total Views</p>
        </div>
        <div className="bg-muted/50 rounded-lg p-4 text-center">
          <div className="flex items-center justify-center gap-2 text-2xl font-bold">
            <MousePointerClick className="h-5 w-5" />
            {stats.totalClicks.toLocaleString()}
          </div>
          <p className="text-sm text-muted-foreground">Total Clicks</p>
        </div>
        <div className="bg-muted/50 rounded-lg p-4 text-center">
          <div className="flex items-center justify-center gap-2 text-2xl font-bold">
            <TrendingUp className="h-5 w-5" />
            {stats.avgCtr.toFixed(1)}%
          </div>
          <p className="text-sm text-muted-foreground">Avg CTR</p>
        </div>
        <div className="bg-muted/50 rounded-lg p-4 text-center">
          <div className="flex items-center justify-center gap-2 text-2xl font-bold">
            <Calendar className="h-5 w-5" />
            {stats.daysWithActivity}
          </div>
          <p className="text-sm text-muted-foreground">Active Days</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 justify-end">
        <Select value={dateFilter} onValueChange={(v: any) => setDateFilter(v)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="14">Last 14 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={fetchActivities}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Activity List */}
      {activities.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">No notification activity</p>
          <p className="text-sm">Visitors Pulse notifications will appear here when shown on your site</p>
        </div>
      ) : (
        <div className="space-y-2">
          {activities.map((activity) => (
            <div
              key={activity.id}
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bell className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{activity.campaignName}</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{format(new Date(activity.date), 'MMM d, yyyy')}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <div className="flex items-center gap-1 text-sm font-medium">
                    <Eye className="h-3 w-3 text-muted-foreground" />
                    {activity.views.toLocaleString()} views
                  </div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <MousePointerClick className="h-3 w-3" />
                    {activity.clicks.toLocaleString()} clicks
                  </div>
                </div>
                <Badge variant={activity.ctr > 5 ? "default" : "secondary"} className="min-w-[60px] justify-center">
                  {activity.ctr.toFixed(1)}% CTR
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info footer */}
      <p className="text-xs text-muted-foreground text-center">
        Showing notification activity for the last {dateFilter} days • Auto-refreshes every minute
      </p>
    </div>
  );
}