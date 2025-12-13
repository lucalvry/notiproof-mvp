import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Check, Loader2, Info, Zap } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface VisitorsPulseSetupProps {
  websiteId: string;
}

interface VisitorsPulseConfig {
  enabled: boolean;
  trackingScope: "all" | "specific";
  specificPages: string[];
  minVisitors: number;
  maxVisitors: number;
  updateFrequency: number;
  showLocation: boolean;
  locationLevel: "country" | "region" | "city";
}

export function VisitorsPulseSetup({ websiteId }: VisitorsPulseSetupProps) {
  const [config, setConfig] = useState<VisitorsPulseConfig>({
    enabled: false,
    trackingScope: "all",
    specificPages: [],
    minVisitors: 1,
    maxVisitors: 100,
    updateFrequency: 30,
    showLocation: true,
    locationLevel: "country",
  });
  const [saving, setSaving] = useState(false);
  const [existingConfig, setExistingConfig] = useState<any>(null);
  const [newPage, setNewPage] = useState("");

  useEffect(() => {
    fetchConfig();
  }, [websiteId]);

  const fetchConfig = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("integrations")
        .select("*")
        .eq("website_id", websiteId)
        .eq("provider", "live_visitors")
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;

      if (data) {
        setExistingConfig(data);
        const credentials = data.credentials as any;
        setConfig({
          enabled: data.is_active || false,
          trackingScope: credentials?.trackingScope || "all",
          specificPages: credentials?.specificPages || [],
          minVisitors: credentials?.minVisitors || 1,
          maxVisitors: credentials?.maxVisitors || 100,
          updateFrequency: credentials?.updateFrequency || 30,
          showLocation: credentials?.showLocation ?? true,
          locationLevel: credentials?.locationLevel || "country",
        });
      }
    } catch (error) {
      console.error("Error fetching config:", error);
      toast.error("Failed to load configuration");
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const integrationData = {
        website_id: websiteId,
        user_id: user.id,
        provider: "live_visitors",
        name: "Visitors Pulse",
        is_active: config.enabled,
        credentials: {
          trackingScope: config.trackingScope,
          specificPages: config.specificPages,
          minVisitors: config.minVisitors,
          maxVisitors: config.maxVisitors,
          updateFrequency: config.updateFrequency,
          showLocation: config.showLocation,
          locationLevel: config.locationLevel,
        },
      };

      if (existingConfig) {
        const { error } = await supabase
          .from("integrations")
          .update(integrationData)
          .eq("id", existingConfig.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("integrations")
          .insert(integrationData)
          .select()
          .single();
        if (error) throw error;
        setExistingConfig(data);
      }

      toast.success("Configuration saved successfully");
    } catch (error) {
      console.error("Error saving config:", error);
      toast.error("Failed to save configuration");
    } finally {
      setSaving(false);
    }
  };

  const addPage = () => {
    if (newPage && !config.specificPages.includes(newPage)) {
      setConfig(prev => ({
        ...prev,
        specificPages: [...prev.specificPages, newPage],
      }));
      setNewPage("");
    }
  };

  const removePage = (page: string) => {
    setConfig(prev => ({
      ...prev,
      specificPages: prev.specificPages.filter(p => p !== page),
    }));
  };

  return (
    <div className="space-y-6">
      {/* Enable Toggle */}
      <div className="flex items-center justify-between p-4 border rounded-lg">
        <div className="space-y-0.5">
          <Label className="text-base font-medium">Enable Visitors Pulse</Label>
          <p className="text-sm text-muted-foreground">
            Track and display real-time visitor counts on your website
          </p>
        </div>
        <Switch
          checked={config.enabled}
          onCheckedChange={(checked) => setConfig(prev => ({ ...prev, enabled: checked }))}
        />
      </div>

      {config.enabled && (
        <>
          {/* Save Prompt for new configs */}
          {!existingConfig && (
            <Card className="border-primary bg-primary/5">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Check className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">Almost ready!</p>
                      <p className="text-sm text-muted-foreground">
                        Save your configuration to start tracking visitors
                      </p>
                    </div>
                  </div>
                  <Button onClick={handleSave} disabled={saving}>
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save & Continue"
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tracking Scope */}
          <div className="space-y-3">
            <Label>Tracking Scope</Label>
            <Select
              value={config.trackingScope}
              onValueChange={(value: "all" | "specific") => 
                setConfig(prev => ({ ...prev, trackingScope: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Pages</SelectItem>
                <SelectItem value="specific">Specific Pages Only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {config.trackingScope === "specific" && (
            <div className="space-y-3">
              <Label>Pages to Track</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="/pricing, /checkout, etc."
                  value={newPage}
                  onChange={(e) => setNewPage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addPage()}
                />
                <Button onClick={addPage} variant="secondary">Add</Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {config.specificPages.map((page) => (
                  <Badge
                    key={page}
                    variant="secondary"
                    className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                    onClick={() => removePage(page)}
                  >
                    {page} ×
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Visitor Count Range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Minimum Visitors to Show</Label>
              <Input
                type="number"
                min={1}
                value={config.minVisitors}
                onChange={(e) => setConfig(prev => ({ 
                  ...prev, 
                  minVisitors: parseInt(e.target.value) || 1 
                }))}
              />
              <p className="text-xs text-muted-foreground">
                Only show notification when at least this many visitors
              </p>
            </div>
            <div className="space-y-2">
              <Label>Maximum Display Count</Label>
              <Input
                type="number"
                min={1}
                value={config.maxVisitors}
                onChange={(e) => setConfig(prev => ({ 
                  ...prev, 
                  maxVisitors: parseInt(e.target.value) || 100 
                }))}
              />
              <p className="text-xs text-muted-foreground">
                Cap displayed count at this number
              </p>
            </div>
          </div>

          {/* Update Frequency */}
          <div className="space-y-2">
            <Label>Update Frequency (seconds)</Label>
            <Select
              value={config.updateFrequency.toString()}
              onValueChange={(value) => 
                setConfig(prev => ({ ...prev, updateFrequency: parseInt(value) }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">Every 10 seconds</SelectItem>
                <SelectItem value="30">Every 30 seconds</SelectItem>
                <SelectItem value="60">Every minute</SelectItem>
                <SelectItem value="120">Every 2 minutes</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Location Settings */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Show Visitor Location</Label>
                <p className="text-sm text-muted-foreground">
                  Display geographic information in notifications
                </p>
              </div>
              <Switch
                checked={config.showLocation}
                onCheckedChange={(checked) => 
                  setConfig(prev => ({ ...prev, showLocation: checked }))
                }
              />
            </div>

            {config.showLocation && (
              <div className="space-y-2">
                <Label>Location Detail Level</Label>
                <Select
                  value={config.locationLevel}
                  onValueChange={(value: "country" | "region" | "city") => 
                    setConfig(prev => ({ ...prev, locationLevel: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="country">Country only</SelectItem>
                    <SelectItem value="region">Country & Region</SelectItem>
                    <SelectItem value="city">City level</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Preview Section */}
          <Card className={`border-dashed border-2 ${!existingConfig ? "opacity-50" : ""}`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="h-4 w-4 text-primary" />
                <span className="font-medium">Preview</span>
                {!existingConfig && <Badge variant="secondary">Save first</Badge>}
              </div>
              {existingConfig ? (
                <div className="bg-muted/50 rounded-lg p-4 text-center">
                  <p className="text-lg font-semibold">
                    🔥 {Math.min(23, config.maxVisitors)} people are viewing this page
                  </p>
                  {config.showLocation && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Visitors from United States, Canada, and more
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Save your configuration above to see a preview
                </p>
              )}
            </CardContent>
          </Card>

          {/* How it works */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>How it works:</strong> Our tracking script monitors active sessions on your site. 
              When the visitor count meets your threshold, notifications automatically display to other visitors, 
              creating social proof and urgency.
            </AlertDescription>
          </Alert>
        </>
      )}

      {/* Save Button */}
      {existingConfig && (
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
