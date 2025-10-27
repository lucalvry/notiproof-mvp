import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface ReviewActivateProps {
  campaignData: any;
  onComplete: () => void;
}

export function ReviewActivate({ campaignData, onComplete }: ReviewActivateProps) {
  const [campaignName, setCampaignName] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSaveDraft = async () => {
    if (!campaignName) {
      toast.error("Please enter a campaign name");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from("campaigns").insert({
        name: campaignName,
        type: campaignData.type,
        data_source: campaignData.data_source,
        status: "draft",
        settings: campaignData.settings,
        rules: campaignData.rules,
        field_map: campaignData.field_map,
        website_id: "00000000-0000-0000-0000-000000000000", // TODO: Replace with actual website_id
      });

      if (error) throw error;
      toast.success("Campaign saved as draft");
      onComplete();
    } catch (error) {
      console.error("Error saving campaign:", error);
      toast.error("Failed to save campaign");
    } finally {
      setSaving(false);
    }
  };

  const handleActivate = async () => {
    if (!campaignName) {
      toast.error("Please enter a campaign name");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from("campaigns").insert({
        name: campaignName,
        type: campaignData.type,
        data_source: campaignData.data_source,
        status: "active",
        settings: campaignData.settings,
        rules: campaignData.rules,
        field_map: campaignData.field_map,
        website_id: "00000000-0000-0000-0000-000000000000", // TODO: Replace with actual website_id
      });

      if (error) throw error;
      toast.success("Campaign activated successfully!");
      onComplete();
    } catch (error) {
      console.error("Error activating campaign:", error);
      toast.error("Failed to activate campaign");
    } finally {
      setSaving(false);
    }
  };

  const handleSendTest = () => {
    toast.success("Test proof notification sent!");
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Campaign Name</CardTitle>
          <CardDescription>Give your campaign a memorable name</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="campaign-name">Name</Label>
            <Input
              id="campaign-name"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              placeholder="e.g., Holiday Sales Proof"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Campaign Summary</CardTitle>
          <CardDescription>Review your configuration</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Campaign Type</p>
              <p className="font-medium capitalize">{campaignData.type?.replace("-", " ")}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Data Source</p>
              <p className="font-medium capitalize">{campaignData.data_source}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Layout</p>
              <p className="font-medium capitalize">
                {campaignData.settings?.layout?.replace("-", " ")}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Frequency</p>
              <p className="font-medium">Every {campaignData.rules?.frequency || "10"}s</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Design Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-muted rounded-lg p-6 flex items-center justify-center">
            <div
              className="max-w-sm bg-card border shadow-lg p-4 rounded-lg"
              style={{
                borderRadius: `${campaignData.settings?.borderRadius || 12}px`,
              }}
            >
              <div className="flex gap-3">
                {campaignData.settings?.showImage && (
                  <div className="w-12 h-12 rounded bg-primary/10 flex items-center justify-center text-primary text-xs">
                    IMG
                  </div>
                )}
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    {campaignData.settings?.headline || "Your notification preview"}
                  </p>
                  {campaignData.settings?.subtext && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {campaignData.settings.subtext}
                    </p>
                  )}
                  {campaignData.settings?.ctaEnabled && (
                    <Button size="sm" className="mt-2">
                      {campaignData.settings.ctaLabel || "Learn More"}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rules Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <span className="text-sm">
                Show every {campaignData.rules?.frequency || "10"} seconds
              </span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <span className="text-sm">
                Max {campaignData.rules?.sessionLimit || "5"} per session
              </span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <span className="text-sm capitalize">
                Target: {campaignData.rules?.pageTargeting?.replace("-", " ") || "All pages"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <span className="text-sm capitalize">
                Devices: {campaignData.rules?.deviceTargeting || "Both"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button variant="outline" onClick={handleSaveDraft} disabled={saving} className="flex-1">
          Save as Draft
        </Button>
        <Button variant="outline" onClick={handleSendTest} disabled={saving}>
          <Send className="h-4 w-4 mr-2" />
          Send Test
        </Button>
        <Button onClick={handleActivate} disabled={saving} className="flex-1">
          Activate Campaign
        </Button>
      </div>
    </div>
  );
}
