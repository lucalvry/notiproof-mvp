import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Play, Pause, BarChart, Settings, Activity, Edit, Copy, Code } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCampaignMetrics } from "@/hooks/useCampaignMetrics";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { CampaignEditor } from "@/components/campaigns/CampaignEditor";

export default function CampaignDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<any>(null);
  const [widgets, setWidgets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
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

      // Fetch widgets for this campaign
      const { data: widgetData } = await supabase
        .from("widgets")
        .select("id, name, website_id")
        .eq("campaign_id", id);
      
      setWidgets(widgetData || []);
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
              {campaign.type?.replace("-", " ") || "Campaign"} {campaign.data_source ? `• ${campaign.data_source}` : ""}
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
          <Button variant="outline" onClick={() => setEditMode(true)}>
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

        <TabsContent value="settings" className="space-y-6">
          {/* Widget Installation Codes */}
          {widgets.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code className="h-5 w-5" />
                  Widget Installation Codes
                </CardTitle>
                <CardDescription>
                  Copy and paste these codes into your website to display notifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {widgets.map((widget) => (
                  <div key={widget.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">{widget.name}</Label>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const code = `<script src="${window.location.origin}/widget.js" data-widget-id="${widget.id}"></script>`;
                          navigator.clipboard.writeText(code);
                          toast.success("Widget code copied!");
                        }}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copy Code
                      </Button>
                    </div>
                    <div className="rounded-lg bg-muted p-4">
                      <code className="text-sm break-all font-mono">
                        {`<script src="${window.location.origin}/widget.js" data-widget-id="${widget.id}"></script>`}
                      </code>
                    </div>
                  </div>
                ))}
                <div className="rounded-lg border bg-card p-4">
                  <h4 className="font-medium text-sm mb-2">Installation Instructions:</h4>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                    <li>Copy the widget code above</li>
                    <li>Paste it into your website's HTML</li>
                    <li>Place it right before the closing {`</body>`} tag</li>
                    <li>Save and publish - notifications will appear automatically!</li>
                  </ol>
                </div>
              </CardContent>
            </Card>
          )}
          
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

      <CampaignEditor
        campaignId={id!}
        open={editMode}
        onClose={() => setEditMode(false)}
        onSave={() => {
          setEditMode(false);
          fetchCampaign();
        }}
      />
    </div>
  );
}
