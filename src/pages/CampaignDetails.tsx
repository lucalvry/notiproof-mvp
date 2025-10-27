import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Play, Pause, BarChart, Settings, Activity, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCampaignMetrics } from "@/hooks/useCampaignMetrics";
import { Skeleton } from "@/components/ui/skeleton";

export default function CampaignDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const metrics = useCampaignMetrics(id);

  useEffect(() => {
    fetchCampaign();
  }, [id]);

  const fetchCampaign = async () => {
    try {
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      setCampaign(data);
    } catch (error) {
      console.error("Error fetching campaign:", error);
      toast.error("Failed to load campaign");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusToggle = async () => {
    try {
      const newStatus = campaign.status === "active" ? "paused" : "active";
      const { error } = await supabase
        .from("campaigns")
        .update({ status: newStatus })
        .eq("id", id);

      if (error) throw error;
      toast.success(`Campaign ${newStatus}`);
      fetchCampaign();
    } catch (error) {
      console.error("Error updating campaign:", error);
      toast.error("Failed to update campaign");
    }
  };

  if (loading || metrics.loading) {
    return (
      <div className="mx-auto max-w-7xl space-y-6">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!campaign) {
    return <div className="flex items-center justify-center h-full">Campaign not found</div>;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/campaigns")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{campaign.name}</h1>
            <p className="text-muted-foreground capitalize">
              {campaign.type.replace("-", " ")} • {campaign.data_source}
            </p>
          </div>
          <Badge
            variant={campaign.status === "active" ? "default" : "secondary"}
          >
            {campaign.status}
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleStatusToggle}>
            {campaign.status === "active" ? (
              <>
                <Pause className="h-4 w-4 mr-2" />
                Pause
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Activate
              </>
            )}
          </Button>
          <Button variant="outline" onClick={() => navigate(`/campaigns`)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="events">Events Feed</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Impressions</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics.totalViews.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">Total views</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Clicks</CardTitle>
                <BarChart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics.totalClicks.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">CTA interactions</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">CTR</CardTitle>
                <Settings className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics.ctr.toFixed(2)}%
                </div>
                <p className="text-xs text-muted-foreground">Click-through rate</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Campaign Preview</CardTitle>
              <CardDescription>How your notification appears to visitors</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-muted rounded-lg p-6 flex items-center justify-center min-h-64">
                <div
                  className="max-w-sm bg-card border shadow-lg p-4 rounded-lg"
                  style={{
                    borderRadius: `${campaign.settings?.borderRadius || 12}px`,
                  }}
                >
                  <div className="flex gap-3">
                    {campaign.settings?.showImage && (
                      <div className="w-12 h-12 rounded bg-primary/10 flex items-center justify-center text-primary text-xs">
                        IMG
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {campaign.settings?.headline || "Notification preview"}
                      </p>
                      {campaign.settings?.subtext && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {campaign.settings.subtext}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle>Performance Analytics</CardTitle>
              <CardDescription>Detailed metrics coming soon</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                Analytics charts will appear here
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="events">
          <Card>
            <CardHeader>
              <CardTitle>Real-time Events Feed</CardTitle>
              <CardDescription>Live stream of proof notifications</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                Event feed will appear here
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Campaign Settings</CardTitle>
              <CardDescription>Edit campaign configuration</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                Settings editor coming soon
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
