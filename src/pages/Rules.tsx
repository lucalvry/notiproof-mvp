import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useWebsiteContext } from "@/contexts/WebsiteContext";
import { Target, Globe, Monitor, Clock, Navigation, Info } from "lucide-react";
import { URLRulesCard } from "@/components/campaigns/targeting/URLRulesCard";
import { GeoTargetingCard } from "@/components/campaigns/targeting/GeoTargetingCard";
import { DeviceTargetingCard } from "@/components/campaigns/targeting/DeviceTargetingCard";
import { ScheduleTargetingCard } from "@/components/campaigns/targeting/ScheduleTargetingCard";
import { BehaviorTargetingCard } from "@/components/campaigns/targeting/BehaviorTargetingCard";
import { TargetingRules, DEFAULT_TARGETING_RULES } from "@/types/targeting";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function Rules() {
  const navigate = useNavigate();
  const { currentWebsite } = useWebsiteContext();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rules, setRules] = useState<TargetingRules>(DEFAULT_TARGETING_RULES);

  useEffect(() => {
    loadRules();
  }, [currentWebsite]);

  const loadRules = async () => {
    if (!currentWebsite) {
      toast.error("Please select a website first");
      navigate("/websites");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }

      // Get default rules from website_settings or create them
      const { data: settings, error } = await supabase
        .from("website_settings")
        .select("*")
        .eq("website_id", currentWebsite.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      // If settings exist and have default_rules, use them
      if (settings?.default_rules) {
        const savedRules = settings.default_rules as any;
        setRules({
          ...DEFAULT_TARGETING_RULES,
          ...savedRules
        });
      }
    } catch (error: any) {
      console.error("Error loading rules:", error);
      toast.error("Failed to load targeting rules");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRules = async () => {
    if (!currentWebsite) return;

    setSaving(true);
    try {
      // Check if settings exist
      const { data: existing } = await supabase
        .from("website_settings")
        .select("id")
        .eq("website_id", currentWebsite.id)
        .single();

      if (existing) {
        // Update existing settings
        const { error } = await supabase
          .from("website_settings")
          .update({ default_rules: rules as any })
          .eq("website_id", currentWebsite.id);

        if (error) throw error;
      } else {
        // Create new settings with rules
        const { error } = await supabase
          .from("website_settings")
          .insert({
            website_id: currentWebsite.id,
            default_rules: rules as any,
          });

        if (error) throw error;
      }

      toast.success("Global targeting rules saved! These will apply to all new campaigns by default.");
    } catch (error: any) {
      console.error("Error saving rules:", error);
      toast.error("Failed to save targeting rules");
    } finally {
      setSaving(false);
    }
  };

  const updateRules = (updates: Partial<TargetingRules>) => {
    setRules((prev) => ({ ...prev, ...updates }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Loading rules...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold">Global Targeting Rules</h1>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-5 w-5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-sm">
                  Define default targeting settings that apply to all new campaigns. 
                  You can override these on a per-campaign basis.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          <p className="text-muted-foreground">
            Set default targeting rules for {currentWebsite?.domain || "your website"}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            These rules will be applied to all new campaigns automatically
          </p>
        </div>
        <Button onClick={handleSaveRules} disabled={saving}>
          {saving ? "Saving..." : "Save Rules"}
        </Button>
      </div>

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Target className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <h3 className="font-semibold">What are Global Rules?</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Global rules define default targeting settings for your entire website. When you create a new campaign, 
                these rules will be automatically applied, but you can override them on a per-campaign basis.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="pages" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="pages" className="gap-2">
            <Navigation className="h-4 w-4" />
            <span>Pages</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3 w-3 text-muted-foreground ml-1" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-sm">Control which URLs show notifications</p>
              </TooltipContent>
            </Tooltip>
          </TabsTrigger>
          <TabsTrigger value="geo" className="gap-2">
            <Globe className="h-4 w-4" />
            <span>Geography</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3 w-3 text-muted-foreground ml-1" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-sm">Target specific countries or regions</p>
              </TooltipContent>
            </Tooltip>
          </TabsTrigger>
          <TabsTrigger value="devices" className="gap-2">
            <Monitor className="h-4 w-4" />
            <span>Devices</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3 w-3 text-muted-foreground ml-1" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-sm">Show on desktop, mobile, or both</p>
              </TooltipContent>
            </Tooltip>
          </TabsTrigger>
          <TabsTrigger value="behavior" className="gap-2">
            <Target className="h-4 w-4" />
            <span>Behavior</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3 w-3 text-muted-foreground ml-1" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-sm">Trigger based on user actions</p>
              </TooltipContent>
            </Tooltip>
          </TabsTrigger>
          <TabsTrigger value="schedule" className="gap-2">
            <Clock className="h-4 w-4" />
            <span>Schedule</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3 w-3 text-muted-foreground ml-1" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-sm">Show during specific times or days</p>
              </TooltipContent>
            </Tooltip>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pages" className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-sm">
              <strong>URL Targeting:</strong> Use wildcards (* and **) to match multiple pages. 
              Example: <code className="bg-muted px-1 py-0.5 rounded">/product/*</code> matches all product pages.
            </AlertDescription>
          </Alert>
          <URLRulesCard
            includeUrls={rules.url_rules.include_urls}
            excludeUrls={rules.url_rules.exclude_urls}
            onChange={(include_urls, exclude_urls) =>
              updateRules({
                url_rules: { include_urls, exclude_urls },
              })
            }
          />
        </TabsContent>

        <TabsContent value="geo" className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-sm">
              <strong>Geo-Targeting:</strong> Show notifications only in specific countries or exclude certain regions. 
              Great for localized campaigns or GDPR compliance.
            </AlertDescription>
          </Alert>
          <GeoTargetingCard
            includeCountries={rules.countries.include}
            excludeCountries={rules.countries.exclude}
            onChange={(include, exclude) =>
              updateRules({
                countries: { include, exclude },
              })
            }
          />
        </TabsContent>

        <TabsContent value="devices" className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-sm">
              <strong>Device Targeting:</strong> Optimize notification display for different screen sizes. 
              Mobile users may prefer fewer, faster notifications.
            </AlertDescription>
          </Alert>
          <DeviceTargetingCard
            devices={rules.devices}
            onChange={(devices) => updateRules({ devices })}
          />
        </TabsContent>

        <TabsContent value="behavior" className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-sm">
              <strong>Behavioral Triggers:</strong> Show notifications based on visitor actions like scrolling, 
              time on page, or exit intent. Increases engagement by 40%+.
            </AlertDescription>
          </Alert>
          <BehaviorTargetingCard
            behavior={rules.behavior}
            onChange={(behavior) => updateRules({ behavior })}
          />
        </TabsContent>

        <TabsContent value="schedule" className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-sm">
              <strong>Time Scheduling:</strong> Show notifications only during business hours or specific days. 
              Respects visitor timezones automatically.
            </AlertDescription>
          </Alert>
          <ScheduleTargetingCard
            schedule={rules.schedule}
            onChange={(schedule) => updateRules({ schedule })}
          />
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>Frequency Settings</CardTitle>
          <CardDescription>
            Control how often notifications appear to visitors
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Initial Delay (ms)</label>
              <input
                type="number"
                className="w-full rounded-md border bg-background px-3 py-2"
                value={rules.display.initial_delay_ms || 0}
                onChange={(e) =>
                  updateRules({
                    display: {
                      ...rules.display,
                      initial_delay_ms: parseInt(e.target.value) || 0,
                    },
                  })
                }
                min="0"
                max="60000"
              />
              <p className="text-xs text-muted-foreground">
                Delay before first notification (0 = immediate)
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Display Duration (ms)</label>
              <input
                type="number"
                className="w-full rounded-md border bg-background px-3 py-2"
                value={rules.display.display_duration_ms || 5000}
                onChange={(e) =>
                  updateRules({
                    display: {
                      ...rules.display,
                      display_duration_ms: parseInt(e.target.value) || 5000,
                    },
                  })
                }
                min="1000"
                max="30000"
              />
              <p className="text-xs text-muted-foreground">
                How long each notification stays visible
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Interval (ms)</label>
              <input
                type="number"
                className="w-full rounded-md border bg-background px-3 py-2"
                value={rules.display.interval_ms || 8000}
                onChange={(e) =>
                  updateRules({
                    display: {
                      ...rules.display,
                      interval_ms: parseInt(e.target.value) || 8000,
                    },
                  })
                }
                min="1000"
                max="120000"
              />
              <p className="text-xs text-muted-foreground">
                Time between notifications
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Max Per Page</label>
              <input
                type="number"
                className="w-full rounded-md border bg-background px-3 py-2"
                value={rules.display.max_per_page || 5}
                onChange={(e) =>
                  updateRules({
                    display: {
                      ...rules.display,
                      max_per_page: parseInt(e.target.value) || 5,
                    },
                  })
                }
                min="1"
                max="20"
              />
              <p className="text-xs text-muted-foreground">
                Maximum notifications per page view
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSaveRules} disabled={saving} size="lg">
          {saving ? "Saving..." : "Save All Rules"}
        </Button>
      </div>
    </div>
  );
}
