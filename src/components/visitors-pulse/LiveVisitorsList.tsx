import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { 
  Monitor, 
  Smartphone, 
  Tablet, 
  Globe, 
  Clock, 
  RefreshCw,
  Search,
  Users,
  Activity
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface LiveVisitorsListProps {
  websiteId: string;
}

interface Visitor {
  id: string;
  visitor_id: string;
  session_id: string;
  device_type: string;
  country: string;
  first_seen_at: string;
  last_seen_at: string;
  utm_source: string;
  utm_medium: string;
  converted: boolean;
}

export function LiveVisitorsList({ websiteId }: LiveVisitorsListProps) {
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [deviceFilter, setDeviceFilter] = useState<"all" | "desktop" | "mobile" | "tablet">("all");
  const [countryFilter, setCountryFilter] = useState("all");

  useEffect(() => {
    fetchVisitors();
    
    // Set up real-time subscription
    const channel = supabase
      .channel('live-visitors-' + websiteId)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'visitor_journeys',
          filter: `website_id=eq.${websiteId}`,
        },
        () => {
          fetchVisitors();
        }
      )
      .subscribe();

    // Refresh every 30 seconds
    const interval = setInterval(fetchVisitors, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [websiteId]);

  const fetchVisitors = async () => {
    try {
      // Fetch visitors active in last 5 minutes
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      
      const { data, error } = await supabase
        .from("visitor_journeys")
        .select("*")
        .eq("website_id", websiteId)
        .gte("last_seen_at", fiveMinutesAgo)
        .order("last_seen_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      setVisitors((data as Visitor[]) || []);
    } catch (error) {
      console.error("Error fetching visitors:", error);
    } finally {
      setLoading(false);
    }
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType?.toLowerCase()) {
      case "mobile":
        return <Smartphone className="h-4 w-4" />;
      case "tablet":
        return <Tablet className="h-4 w-4" />;
      default:
        return <Monitor className="h-4 w-4" />;
    }
  };

  const getSessionDuration = (firstSeenAt: string) => {
    const start = new Date(firstSeenAt);
    const now = new Date();
    const diffMs = now.getTime() - start.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return "Just arrived";
    if (diffMins < 60) return `${diffMins}m`;
    return `${Math.floor(diffMins / 60)}h ${diffMins % 60}m`;
  };

  const uniqueCountries = [...new Set(visitors.map(v => v.country).filter(Boolean))];

  const filteredVisitors = visitors.filter(visitor => {
    if (searchQuery && !visitor.visitor_id?.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (deviceFilter !== "all" && visitor.device_type?.toLowerCase() !== deviceFilter) {
      return false;
    }
    if (countryFilter !== "all" && visitor.country !== countryFilter) {
      return false;
    }
    return true;
  });

  // Stats
  const stats = {
    total: visitors.length,
    desktop: visitors.filter(v => v.device_type?.toLowerCase() === "desktop").length,
    mobile: visitors.filter(v => v.device_type?.toLowerCase() === "mobile").length,
    countries: uniqueCountries.length,
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
      {/* Live Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-muted/50 rounded-lg p-4 text-center">
          <div className="flex items-center justify-center gap-2 text-2xl font-bold text-primary">
            <Activity className="h-5 w-5" />
            {stats.total}
          </div>
          <p className="text-sm text-muted-foreground">Active Now</p>
        </div>
        <div className="bg-muted/50 rounded-lg p-4 text-center">
          <div className="flex items-center justify-center gap-2 text-2xl font-bold">
            <Monitor className="h-5 w-5" />
            {stats.desktop}
          </div>
          <p className="text-sm text-muted-foreground">Desktop</p>
        </div>
        <div className="bg-muted/50 rounded-lg p-4 text-center">
          <div className="flex items-center justify-center gap-2 text-2xl font-bold">
            <Smartphone className="h-5 w-5" />
            {stats.mobile}
          </div>
          <p className="text-sm text-muted-foreground">Mobile</p>
        </div>
        <div className="bg-muted/50 rounded-lg p-4 text-center">
          <div className="flex items-center justify-center gap-2 text-2xl font-bold">
            <Globe className="h-5 w-5" />
            {stats.countries}
          </div>
          <p className="text-sm text-muted-foreground">Countries</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by page..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={deviceFilter} onValueChange={(v: any) => setDeviceFilter(v)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Device" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Devices</SelectItem>
            <SelectItem value="desktop">Desktop</SelectItem>
            <SelectItem value="mobile">Mobile</SelectItem>
            <SelectItem value="tablet">Tablet</SelectItem>
          </SelectContent>
        </Select>
        <Select value={countryFilter} onValueChange={setCountryFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Country" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Countries</SelectItem>
            {uniqueCountries.map(country => (
              <SelectItem key={country} value={country}>{country}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={fetchVisitors}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Visitors List */}
      {filteredVisitors.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">No active visitors</p>
          <p className="text-sm">Visitors will appear here when they're active on your site</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredVisitors.map((visitor) => (
            <div
              key={visitor.id}
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  {getDeviceIcon(visitor.device_type)}
                </div>
                <div>
                  <p className="font-medium truncate max-w-[300px]">
                    Visitor {visitor.visitor_id?.slice(0, 8)}...
                  </p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{visitor.country || "Unknown"}</span>
                    {visitor.utm_source && <span>• via {visitor.utm_source}</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="flex items-center gap-1 text-sm">
                    <Clock className="h-3 w-3" />
                    {getSessionDuration(visitor.first_seen_at)}
                  </div>
                  {visitor.converted && (
                    <p className="text-xs text-green-600 font-medium">Converted</p>
                  )}
                </div>
                <Badge variant="outline" className="gap-1">
                  {getDeviceIcon(visitor.device_type)}
                  {visitor.device_type || "Desktop"}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Auto-refresh indicator */}
      <p className="text-xs text-muted-foreground text-center">
        Auto-refreshing every 30 seconds • Showing visitors active in last 5 minutes
      </p>
    </div>
  );
}
