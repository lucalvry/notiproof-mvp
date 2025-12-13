import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Link, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface AnalyticsAttributionSettingsProps {
  websiteId: string;
}

export function AnalyticsAttributionSettings({ websiteId }: AnalyticsAttributionSettingsProps) {
  const [saving, setSaving] = useState(false);
  const [utmEnabled, setUtmEnabled] = useState(false);
  const [utmSource, setUtmSource] = useState("notiproof");
  const [utmMedium, setUtmMedium] = useState("notification");
  const [utmCampaignTemplate, setUtmCampaignTemplate] = useState("{{campaign_name}}");
  const [utmContentTemplate, setUtmContentTemplate] = useState("{{notification_type}}");
  const [utmOverrideExisting, setUtmOverrideExisting] = useState(false);

  useEffect(() => {
    loadSettings();
  }, [websiteId]);

  const loadSettings = async () => {
    if (!websiteId) return;

    try {
      const { data: settings, error } = await supabase
        .from("website_settings")
        .select("utm_enabled, utm_source, utm_medium, utm_campaign_template, utm_content_template, utm_override_existing")
        .eq("website_id", websiteId)
        .single();

      if (error && error.code !== "PGRST116") throw error;

      if (settings) {
        setUtmEnabled(settings.utm_enabled ?? false);
        setUtmSource(settings.utm_source ?? "notiproof");
        setUtmMedium(settings.utm_medium ?? "notification");
        setUtmCampaignTemplate(settings.utm_campaign_template ?? "{{campaign_name}}");
        setUtmContentTemplate(settings.utm_content_template ?? "{{notification_type}}");
        setUtmOverrideExisting(settings.utm_override_existing ?? false);
      }
    } catch (error) {
      console.error("Error loading UTM settings:", error);
    }
  };

  const handleSave = async () => {
    if (!websiteId) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("website_settings")
        .upsert({
          website_id: websiteId,
          utm_enabled: utmEnabled,
          utm_source: utmSource,
          utm_medium: utmMedium,
          utm_campaign_template: utmCampaignTemplate,
          utm_content_template: utmContentTemplate,
          utm_override_existing: utmOverrideExisting,
        }, { onConflict: "website_id" });

      if (error) throw error;
      toast.success("Analytics attribution settings saved!");
    } catch (error: any) {
      console.error("Error saving UTM settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  // Preview URL with UTM parameters
  const previewUrl = utmEnabled
    ? `https://example.com/page?utm_source=${encodeURIComponent(utmSource)}&utm_medium=${encodeURIComponent(utmMedium)}&utm_campaign=${encodeURIComponent(utmCampaignTemplate)}${utmContentTemplate ? `&utm_content=${encodeURIComponent(utmContentTemplate)}` : ""}`
    : "UTM tracking disabled";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link className="h-5 w-5" />
          Analytics Attribution (UTM)
        </CardTitle>
        <CardDescription>
          Track NotiProof-driven traffic in Google Analytics or any UTM-based analytics tool
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Enable UTM Tracking</Label>
            <p className="text-sm text-muted-foreground">
              Append UTM parameters to notification click URLs
            </p>
          </div>
          <Switch checked={utmEnabled} onCheckedChange={setUtmEnabled} />
        </div>

        {utmEnabled && (
          <>
            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="utm-source">UTM Source</Label>
                <Input
                  id="utm-source"
                  value={utmSource}
                  onChange={(e) => setUtmSource(e.target.value)}
                  placeholder="notiproof"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="utm-medium">UTM Medium</Label>
                <Input
                  id="utm-medium"
                  value={utmMedium}
                  onChange={(e) => setUtmMedium(e.target.value)}
                  placeholder="notification"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="utm-campaign">UTM Campaign Template</Label>
              <Input
                id="utm-campaign"
                value={utmCampaignTemplate}
                onChange={(e) => setUtmCampaignTemplate(e.target.value)}
                placeholder="{{campaign_name}}"
              />
              <p className="text-xs text-muted-foreground">
                Use <code className="bg-muted px-1 rounded">{"{{campaign_name}}"}</code> for dynamic replacement
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="utm-content">UTM Content Template (Optional)</Label>
              <Input
                id="utm-content"
                value={utmContentTemplate}
                onChange={(e) => setUtmContentTemplate(e.target.value)}
                placeholder="{{notification_type}}"
              />
              <p className="text-xs text-muted-foreground">
                Use <code className="bg-muted px-1 rounded">{"{{notification_type}}"}</code> for dynamic replacement
              </p>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Override Existing UTMs</Label>
                <p className="text-sm text-muted-foreground">
                  Replace any existing UTM parameters on destination URLs
                </p>
              </div>
              <Switch checked={utmOverrideExisting} onCheckedChange={setUtmOverrideExisting} />
            </div>

            {utmOverrideExisting && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Enabling this may interfere with existing marketing attribution. Only use if you want all notification clicks to be attributed to NotiProof.
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label>URL Preview</Label>
              <div className="bg-muted p-3 rounded-md font-mono text-xs overflow-x-auto break-all">
                {previewUrl}
              </div>
            </div>
          </>
        )}

        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Analytics Settings"}
        </Button>
      </CardContent>
    </Card>
  );
}
