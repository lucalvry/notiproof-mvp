import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useSubscription } from "@/hooks/useSubscription";
import WhiteLabelSettings from "@/components/settings/WhiteLabelSettings";
import { 
  Globe, Bell, Palette, User, Code, Clock, 
  MapPin, Sliders, MousePointer, Wrench, Link 
} from "lucide-react";
import { AnalyticsAttributionSettings } from "@/components/settings/AnalyticsAttributionSettings";

export default function Settings() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [websiteId, setWebsiteId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  
  const { planName } = useSubscription(userId || undefined);
  const isPro = planName === "Business" || planName === "Pro" || planName === "Enterprise";
  
  // Website info
  const [siteName, setSiteName] = useState("");
  const [siteDomain, setSiteDomain] = useState("");
  
  // Notification settings
  const [displayNotifications, setDisplayNotifications] = useState(true);
  const [soundEffects, setSoundEffects] = useState(false);
  const [mobileNotifications, setMobileNotifications] = useState(true);
  
  // Branding
  const [brandColor, setBrandColor] = useState("#2563EB");
  const [borderRadius, setBorderRadius] = useState(12);
  
  // Timing settings
  const [initialDelay, setInitialDelay] = useState(0);
  const [displayDuration, setDisplayDuration] = useState(5);
  const [interval, setInterval] = useState(8);
  
  // Position settings
  const [position, setPosition] = useState("bottom-left");
  const [mobilePositionOverride, setMobilePositionOverride] = useState("bottom-center");
  const [animation, setAnimation] = useState("slide");
  
  // Limits settings
  const [maxPerPage, setMaxPerPage] = useState(5);
  const [maxPerSession, setMaxPerSession] = useState(20);
  
  // Actions settings
  const [pauseAfterClick, setPauseAfterClick] = useState(false);
  const [pauseAfterClose, setPauseAfterClose] = useState(false);
  const [makeClickable, setMakeClickable] = useState(true);
  
  // Advanced settings
  const [debugMode, setDebugMode] = useState(false);
  const [excludeTeamIps, setExcludeTeamIps] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }
      
      setUserId(user.id);

      // Get user's primary website
      const { data: websites, error: websitesError } = await supabase
        .from("websites")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
        .limit(1);

      if (websitesError) throw websitesError;

      if (!websites || websites.length === 0) {
        toast.error("No website found. Please add a website first.");
        navigate("/websites");
        return;
      }

      const website = websites[0];
      setWebsiteId(website.id);
      setSiteName(website.name);
      setSiteDomain(website.domain);

      // Get or create website settings
      let { data: settings, error: settingsError } = await supabase
        .from("website_settings")
        .select("*")
        .eq("website_id", website.id)
        .single();

      if (settingsError && settingsError.code !== 'PGRST116') {
        throw settingsError;
      }

      // If no settings exist, create default ones
      if (!settings) {
        const { data: newSettings, error: createError } = await supabase
          .from("website_settings")
          .insert({
            website_id: website.id,
            display_notifications: true,
            sound_effects: false,
            mobile_notifications: true,
            brand_color: "#2563EB",
            border_radius: 12,
          })
          .select()
          .single();

        if (createError) throw createError;
        settings = newSettings;
      }

      if (settings) {
        setDisplayNotifications(settings.display_notifications);
        setSoundEffects(settings.sound_effects);
        setMobileNotifications(settings.mobile_notifications);
        setBrandColor(settings.brand_color);
        setBorderRadius(settings.border_radius);
        
        // Timing settings
        setInitialDelay(settings.initial_delay ?? 0);
        setDisplayDuration(settings.display_duration ?? 5);
        setInterval(settings.interval ?? 8);
        
        // Position settings
        setPosition(settings.position ?? "bottom-left");
        setMobilePositionOverride(settings.mobile_position_override ?? "bottom-center");
        setAnimation(settings.animation ?? "slide");
        
        // Limits settings
        setMaxPerPage(settings.max_per_page ?? 5);
        setMaxPerSession(settings.max_per_session ?? 20);
        
        // Actions settings
        setPauseAfterClick(settings.pause_after_click ?? false);
        setPauseAfterClose(settings.pause_after_close ?? false);
        setMakeClickable(settings.make_clickable ?? true);
        
        // Advanced settings
        setDebugMode(settings.debug_mode ?? false);
        setExcludeTeamIps(settings.exclude_team_ips ?? false);
      }
    } catch (error: any) {
      console.error("Error loading settings:", error);
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveWebsiteInfo = async () => {
    if (!websiteId) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from("websites")
        .update({ name: siteName })
        .eq("id", websiteId);

      if (error) throw error;
      toast.success("Website information saved!");
    } catch (error: any) {
      console.error("Error saving website info:", error);
      toast.error("Failed to save website information");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNotifications = async () => {
    if (!websiteId) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from("website_settings")
        .upsert({
          website_id: websiteId,
          display_notifications: displayNotifications,
          sound_effects: soundEffects,
          mobile_notifications: mobileNotifications,
        }, { onConflict: "website_id" });

      if (error) throw error;
      toast.success("Notification settings saved!");
    } catch (error: any) {
      console.error("Error saving notification settings:", error);
      toast.error("Failed to save notification settings");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBranding = async () => {
    if (!websiteId) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from("website_settings")
        .upsert({
          website_id: websiteId,
          brand_color: brandColor,
          border_radius: borderRadius,
        }, { onConflict: "website_id" });

      if (error) throw error;
      toast.success("Branding settings saved!");
    } catch (error: any) {
      console.error("Error saving branding:", error);
      toast.error("Failed to save branding settings");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTiming = async () => {
    if (!websiteId) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("website_settings")
        .upsert({
          website_id: websiteId,
          initial_delay: initialDelay,
          display_duration: displayDuration,
          interval: interval,
        }, { onConflict: "website_id" });
      if (error) throw error;
      toast.success("Timing settings saved!");
    } catch (error: any) {
      console.error("Error saving timing:", error);
      toast.error("Failed to save timing settings");
    } finally {
      setSaving(false);
    }
  };

  const handleSavePosition = async () => {
    if (!websiteId) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("website_settings")
        .upsert({
          website_id: websiteId,
          position: position,
          mobile_position_override: mobilePositionOverride,
          animation: animation,
        }, { onConflict: "website_id" });
      if (error) throw error;
      toast.success("Position settings saved!");
    } catch (error: any) {
      console.error("Error saving position:", error);
      toast.error("Failed to save position settings");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveLimits = async () => {
    if (!websiteId) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("website_settings")
        .upsert({
          website_id: websiteId,
          max_per_page: maxPerPage,
          max_per_session: maxPerSession,
        }, { onConflict: "website_id" });
      if (error) throw error;
      toast.success("Limit settings saved!");
    } catch (error: any) {
      console.error("Error saving limits:", error);
      toast.error("Failed to save limit settings");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveActions = async () => {
    if (!websiteId) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("website_settings")
        .upsert({
          website_id: websiteId,
          pause_after_click: pauseAfterClick,
          pause_after_close: pauseAfterClose,
          make_clickable: makeClickable,
        }, { onConflict: "website_id" });
      if (error) throw error;
      toast.success("Action settings saved!");
    } catch (error: any) {
      console.error("Error saving actions:", error);
      toast.error("Failed to save action settings");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAdvanced = async () => {
    if (!websiteId) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("website_settings")
        .upsert({
          website_id: websiteId,
          debug_mode: debugMode,
          exclude_team_ips: excludeTeamIps,
        }, { onConflict: "website_id" });
      if (error) throw error;
      toast.success("Advanced settings saved!");
    } catch (error: any) {
      console.error("Error saving advanced settings:", error);
      toast.error("Failed to save advanced settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account, website, and preferences
        </p>
      </div>

      <Tabs defaultValue="installation" className="space-y-4">
        <TabsList className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-1">
          <TabsTrigger value="installation" className="gap-1 text-xs">
            <Code className="h-3 w-3" />
            <span className="hidden sm:inline">Installation</span>
          </TabsTrigger>
          <TabsTrigger value="timing" className="gap-1 text-xs">
            <Clock className="h-3 w-3" />
            <span className="hidden sm:inline">Timing</span>
          </TabsTrigger>
          <TabsTrigger value="position" className="gap-1 text-xs">
            <MapPin className="h-3 w-3" />
            <span className="hidden sm:inline">Position</span>
          </TabsTrigger>
          <TabsTrigger value="limits" className="gap-1 text-xs">
            <Sliders className="h-3 w-3" />
            <span className="hidden sm:inline">Limits</span>
          </TabsTrigger>
          <TabsTrigger value="actions" className="gap-1 text-xs">
            <MousePointer className="h-3 w-3" />
            <span className="hidden sm:inline">Actions</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-1 text-xs">
            <Link className="h-3 w-3" />
            <span className="hidden sm:inline">Analytics</span>
          </TabsTrigger>
          <TabsTrigger value="theme" className="gap-1 text-xs">
            <Palette className="h-3 w-3" />
            <span className="hidden sm:inline">Theme</span>
          </TabsTrigger>
          <TabsTrigger value="advanced" className="gap-1 text-xs">
            <Wrench className="h-3 w-3" />
            <span className="hidden sm:inline">Advanced</span>
          </TabsTrigger>
        </TabsList>

        {/* Installation Tab */}
        <TabsContent value="installation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Widget Installation</CardTitle>
              <CardDescription>
                Add NotiProof to your website
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="site-name">Website Name</Label>
                <Input 
                  id="site-name" 
                  value={siteName}
                  onChange={(e) => setSiteName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="site-domain">Domain</Label>
                <Input id="site-domain" value={siteDomain} disabled />
                <p className="text-sm text-muted-foreground">
                  Your verified domain
                </p>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label>Installation Code</Label>
                <div className="bg-muted p-4 rounded-md font-mono text-xs overflow-x-auto">
                  {`<script src="https://ewymvxhpkswhsirdrjub.supabase.co/functions/v1/widget-script" data-website="${websiteId}"></script>`}
                </div>
                <p className="text-sm text-muted-foreground">
                  Paste this code before the closing &lt;/body&gt; tag on your website
                </p>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(`<script src="https://ewymvxhpkswhsirdrjub.supabase.co/functions/v1/widget-script" data-website="${websiteId}"></script>`);
                    toast.success("Code copied to clipboard!");
                  }}
                >
                  Copy Code
                </Button>
              </div>
              <Button onClick={handleSaveWebsiteInfo} disabled={saving}>
                {saving ? "Saving..." : "Save Website Info"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Timing Tab */}
        <TabsContent value="timing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Display Timing Controls</CardTitle>
              <CardDescription>
                Control when and how long notifications appear
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="initial-delay">Initial Delay (seconds)</Label>
                <Input
                  id="initial-delay"
                  type="number"
                  min="0"
                  max="60"
                  value={initialDelay}
                  onChange={(e) => setInitialDelay(parseInt(e.target.value) || 0)}
                  placeholder="Wait time before first notification"
                />
                <p className="text-sm text-muted-foreground">
                  How long to wait before showing the first notification after page load
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="display-duration">Display Duration (seconds)</Label>
                <Input
                  id="display-duration"
                  type="number"
                  min="1"
                  max="30"
                  value={displayDuration}
                  onChange={(e) => setDisplayDuration(parseInt(e.target.value) || 5)}
                  placeholder="How long notifications stay visible"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="interval">Interval Between Notifications (seconds)</Label>
                <Input
                  id="interval"
                  type="number"
                  min="1"
                  max="120"
                  value={interval}
                  onChange={(e) => setInterval(parseInt(e.target.value) || 8)}
                  placeholder="Time between notifications"
                />
              </div>
              <Button onClick={handleSaveTiming} disabled={saving}>
                {saving ? "Saving..." : "Save Timing Settings"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Position Tab */}
        <TabsContent value="position" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Widget Position & Devices</CardTitle>
              <CardDescription>
                Choose where notifications appear and device-specific overrides
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label>Desktop Position</Label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'top-left', label: 'Top Left' },
                    { value: 'top-center', label: 'Top Center' },
                    { value: 'top-right', label: 'Top Right' },
                    { value: 'center-left', label: 'Center Left' },
                    { value: 'center', label: 'Center' },
                    { value: 'center-right', label: 'Center Right' },
                    { value: 'bottom-left', label: 'Bottom Left' },
                    { value: 'bottom-center', label: 'Bottom Center' },
                    { value: 'bottom-right', label: 'Bottom Right' },
                  ].map((pos) => (
                    <button
                      key={pos.value}
                      onClick={() => setPosition(pos.value)}
                      className={`p-2 text-xs border rounded hover:border-primary transition-colors ${
                        position === pos.value ? 'border-primary bg-primary/10' : ''
                      }`}
                    >
                      {pos.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="mobile-position">Mobile Position Override</Label>
                <Input
                  id="mobile-position"
                  value={mobilePositionOverride}
                  onChange={(e) => setMobilePositionOverride(e.target.value)}
                  placeholder="bottom-center"
                />
                <p className="text-sm text-muted-foreground">
                  Different position for mobile devices (recommended: bottom-center)
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="animation">Animation Style</Label>
                <select
                  id="animation"
                  value={animation}
                  onChange={(e) => setAnimation(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                >
                  <option value="slide">Slide</option>
                  <option value="fade">Fade</option>
                  <option value="bounce">Bounce</option>
                  <option value="none">None</option>
                </select>
              </div>
              <Button onClick={handleSavePosition} disabled={saving}>
                {saving ? "Saving..." : "Save Position Settings"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Limits Tab */}
        <TabsContent value="limits" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Frequency Limits</CardTitle>
              <CardDescription>
                Prevent notification fatigue by limiting display frequency
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="max-per-page">Maximum Per Page View</Label>
                <Input
                  id="max-per-page"
                  type="number"
                  min="1"
                  max="20"
                  value={maxPerPage}
                  onChange={(e) => setMaxPerPage(parseInt(e.target.value) || 5)}
                  placeholder="Max notifications per page"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="max-per-session">Maximum Per Session</Label>
                <Input
                  id="max-per-session"
                  type="number"
                  min="1"
                  max="100"
                  value={maxPerSession}
                  onChange={(e) => setMaxPerSession(parseInt(e.target.value) || 20)}
                  placeholder="Max notifications per user session"
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Recommended: 3-5 per page, 10-20 per session
              </p>
              <Button onClick={handleSaveLimits} disabled={saving}>
                {saving ? "Saving..." : "Save Limit Settings"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Actions Tab */}
        <TabsContent value="actions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Interaction Behavior</CardTitle>
              <CardDescription>
                Control what happens when users interact with notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Pause After Click</Label>
                  <p className="text-sm text-muted-foreground">
                    Stop showing new notifications after user clicks one
                  </p>
                </div>
                <Switch checked={pauseAfterClick} onCheckedChange={setPauseAfterClick} />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Pause After Close</Label>
                  <p className="text-sm text-muted-foreground">
                    Stop showing notifications if user manually closes one
                  </p>
                </div>
                <Switch checked={pauseAfterClose} onCheckedChange={setPauseAfterClose} />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Make Clickable</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow users to click notifications to view details
                  </p>
                </div>
                <Switch checked={makeClickable} onCheckedChange={setMakeClickable} />
              </div>
              <Button onClick={handleSaveActions} disabled={saving}>
                {saving ? "Saving..." : "Save Action Settings"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          {websiteId && <AnalyticsAttributionSettings websiteId={websiteId} />}
        </TabsContent>

        {/* Theme Tab */}
        <TabsContent value="theme" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Theme & Styling</CardTitle>
              <CardDescription>
                Customize the visual appearance of notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="brand-color">Primary Brand Color</Label>
                <div className="flex gap-2">
                  <Input 
                    id="brand-color" 
                    type="color" 
                    value={brandColor}
                    onChange={(e) => setBrandColor(e.target.value)}
                    className="w-20" 
                  />
                  <Input 
                    value={brandColor}
                    onChange={(e) => setBrandColor(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="border-radius">Border Radius (px)</Label>
                <Input 
                  id="border-radius" 
                  type="number" 
                  value={borderRadius}
                  onChange={(e) => setBorderRadius(Number(e.target.value))}
                  min="0"
                  max="50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="font-family">Font Family</Label>
                <Input 
                  id="font-family" 
                  placeholder="Inter, system-ui, sans-serif"
                  defaultValue="Inter"
                  disabled
                />
                <p className="text-sm text-muted-foreground">
                  Custom fonts coming soon
                </p>
              </div>
              <Button onClick={handleSaveBranding} disabled={saving}>
                {saving ? "Saving..." : "Save Theme"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Advanced Tab */}
        <TabsContent value="advanced" className="space-y-4">
          <Card className="border-orange-200 bg-orange-50/50 dark:border-orange-800 dark:bg-orange-950/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-700 dark:text-orange-400">
                <Code className="h-5 w-5" />
                Debug Mode & Advanced Settings
              </CardTitle>
              <CardDescription>
                Developer tools and advanced configuration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-orange-700 dark:text-orange-400">Enable Debug Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    Shows console logs, highlights widget boundary, displays timing info
                  </p>
                </div>
                <Switch checked={debugMode} onCheckedChange={setDebugMode} />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Exclude Team IPs from Analytics</Label>
                  <p className="text-sm text-muted-foreground">
                    Prevent internal traffic from skewing metrics
                  </p>
                </div>
                <Switch checked={excludeTeamIps} onCheckedChange={setExcludeTeamIps} />
              </div>
              <Separator />
              <Button onClick={handleSaveAdvanced} disabled={saving}>
                {saving ? "Saving..." : "Save Advanced Settings"}
              </Button>
              <Separator />
              <div className="space-y-2">
                <Label>White-Label Settings</Label>
                <p className="text-sm text-muted-foreground mb-2">
                  Remove NotiProof branding and customize the powered-by text
                </p>
                {userId && <WhiteLabelSettings userId={userId} isPro={isPro} />}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
