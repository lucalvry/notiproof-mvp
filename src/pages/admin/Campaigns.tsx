import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Search, Eye, Pause, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Campaign {
  id: string;
  name: string;
  description: string | null;
  status: string;
  created_at: string;
  user_id: string;
  start_date: string | null;
  end_date: string | null;
  profiles?: {
    name: string;
    email: string;
  } | null;
  widgets?: any[];
  metrics?: {
    totalViews: number;
    totalClicks: number;
    widgetCount: number;
  };
}

export default function AdminCampaigns() {
  const { loading: authLoading } = useAdminAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      fetchCampaigns();
    }
  }, [authLoading]);

  const fetchCampaigns = async () => {
    try {
      const { data, error } = await supabase
        .from("campaigns")
        .select(`
          *,
          widgets(
            id,
            name,
            status
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch user profiles and auth data
      const userIds = [...new Set(data?.map((c) => c.user_id) || [])];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name")
        .in("id", userIds) as { data: Array<{ id: string; name: string | null }> | null };

      const { data: authData } = await supabase.auth.admin.listUsers();

      // Fetch event metrics for each campaign's widgets
      const campaignsWithData = await Promise.all(
        (data || []).map(async (campaign) => {
          const profile = profiles?.find((p: any) => p.id === campaign.user_id);
          const authUser = authData?.users.find((u: any) => u.id === campaign.user_id);
          
          // Get metrics for campaign widgets
          const widgetIds = (campaign.widgets || []).map((w: any) => w.id);
          let totalViews = 0;
          let totalClicks = 0;
          
          if (widgetIds.length > 0) {
            const { data: events } = await supabase
              .from("events")
              .select("views, clicks")
              .in("widget_id", widgetIds);
            
            totalViews = events?.reduce((sum, e) => sum + (e.views || 0), 0) || 0;
            totalClicks = events?.reduce((sum, e) => sum + (e.clicks || 0), 0) || 0;
          }
          
          return {
            ...campaign,
            profiles: profile ? {
              name: profile.name || "Unknown",
              email: authUser?.email || "Unknown"
            } : null,
            metrics: {
              totalViews,
              totalClicks,
              widgetCount: widgetIds.length,
            }
          };
        })
      );

      setCampaigns(campaignsWithData || []);
    } catch (error: any) {
      console.error("Error fetching campaigns:", error);
      toast.error("Failed to fetch campaigns");
    } finally {
      setLoading(false);
    }
  };

  const logAdminAction = async (action: string, resourceId: string, details: any) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("audit_logs").insert({
      admin_id: user.id,
      action,
      resource_type: "campaign",
      resource_id: resourceId,
      details,
    });
  };

  const handlePauseCampaign = async (campaignId: string) => {
    try {
      const { error } = await supabase
        .from("campaigns")
        .update({ status: "paused" })
        .eq("id", campaignId);

      if (error) throw error;

      await logAdminAction("pause_campaign", campaignId, { reason: "Admin action" });

      toast.success("Campaign paused successfully");
      fetchCampaigns();
    } catch (error) {
      console.error("Error pausing campaign:", error);
      toast.error("Failed to pause campaign");
    }
  };

  const handleDeleteCampaign = async (campaignId: string) => {
    if (!confirm("Are you sure you want to delete this campaign? This action cannot be undone.")) {
      return;
    }

    try {
      const { error } = await supabase.from("campaigns").delete().eq("id", campaignId);

      if (error) throw error;

      await logAdminAction("delete_campaign", campaignId, { deleted_by: "admin" });

      toast.success("Campaign deleted successfully");
      fetchCampaigns();
      setDialogOpen(false);
    } catch (error) {
      console.error("Error deleting campaign:", error);
      toast.error("Failed to delete campaign");
    }
  };

  const filteredCampaigns = campaigns.filter((campaign) => {
    const matchesSearch =
      campaign.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (campaign.description && campaign.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === "all" || campaign.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: any; label: string }> = {
      active: { variant: "default", label: "Active" },
      draft: { variant: "secondary", label: "Draft" },
      paused: { variant: "outline", label: "Paused" },
      completed: { variant: "outline", label: "Completed" },
    };

    const config = statusConfig[status] || { variant: "outline", label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (authLoading || loading) {
    return <div className="flex items-center justify-center h-full">Loading...</div>;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Campaign Management</h1>
        <p className="text-muted-foreground">Manage all campaigns across the platform</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>All Campaigns</CardTitle>
              <CardDescription>
                {campaigns.length} total campaigns
                {searchQuery || statusFilter !== "all" ? ` (${filteredCampaigns.length} filtered)` : ""}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search campaigns..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-[250px]"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Schedule</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCampaigns.map((campaign) => (
                <TableRow key={campaign.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{campaign.name}</div>
                      {campaign.description && (
                        <div className="text-xs text-muted-foreground line-clamp-1">
                          {campaign.description}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {campaign.profiles ? (
                      <div>
                        <div className="font-medium">{campaign.profiles.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {campaign.profiles.email}
                        </div>
                      </div>
                    ) : (
                      "Unknown"
                    )}
                  </TableCell>
                  <TableCell>{getStatusBadge(campaign.status)}</TableCell>
                  <TableCell>
                    {campaign.start_date ? (
                      <div className="text-sm">
                        {new Date(campaign.start_date).toLocaleDateString()}
                        {campaign.end_date && (
                          <> - {new Date(campaign.end_date).toLocaleDateString()}</>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">No schedule</span>
                    )}
                  </TableCell>
                  <TableCell>{new Date(campaign.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSelectedCampaign(campaign);
                          setDialogOpen(true);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {campaign.status === "active" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handlePauseCampaign(campaign.id)}
                        >
                          <Pause className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          {selectedCampaign && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedCampaign.name}</DialogTitle>
                <DialogDescription>{selectedCampaign.description}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2">Campaign Information</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Campaign ID:</span>
                      <span className="font-mono text-xs">{selectedCampaign.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status:</span>
                      {getStatusBadge(selectedCampaign.status)}
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Created:</span>
                      <span>{new Date(selectedCampaign.created_at).toLocaleDateString()}</span>
                    </div>
                    {selectedCampaign.start_date && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Start Date:</span>
                        <span>{new Date(selectedCampaign.start_date).toLocaleDateString()}</span>
                      </div>
                    )}
                    {selectedCampaign.end_date && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">End Date:</span>
                        <span>{new Date(selectedCampaign.end_date).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <h3 className="font-medium mb-2">Performance Metrics</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Views:</span>
                      <span className="font-bold">{selectedCampaign.metrics?.totalViews.toLocaleString() || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Clicks:</span>
                      <span className="font-bold">{selectedCampaign.metrics?.totalClicks.toLocaleString() || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Click Rate:</span>
                      <span className="font-bold">
                        {selectedCampaign.metrics?.totalViews 
                          ? ((selectedCampaign.metrics.totalClicks / selectedCampaign.metrics.totalViews) * 100).toFixed(2)
                          : 0}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Widgets:</span>
                      <span className="font-bold">{selectedCampaign.metrics?.widgetCount || 0}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  {selectedCampaign.status === "active" && (
                    <Button
                      onClick={() => handlePauseCampaign(selectedCampaign.id)}
                      className="flex-1"
                    >
                      <Pause className="h-4 w-4 mr-2" />
                      Pause Campaign
                    </Button>
                  )}
                  <Button
                    variant="destructive"
                    onClick={() => handleDeleteCampaign(selectedCampaign.id)}
                    className="flex-1"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
