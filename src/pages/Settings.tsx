import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

export default function Settings() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [websiteId, setWebsiteId] = useState<string | null>(null);
  
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your website settings and preferences
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Website Information</CardTitle>
          <CardDescription>
            Update your website details
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
              Contact support to change your domain
            </p>
          </div>
          <Button onClick={handleSaveWebsiteInfo} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notification Settings</CardTitle>
          <CardDescription>
            Configure how notifications appear on your site
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Display Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Show social proof notifications to visitors
              </p>
            </div>
            <Switch 
              checked={displayNotifications}
              onCheckedChange={setDisplayNotifications}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Sound Effects</Label>
              <p className="text-sm text-muted-foreground">
                Play sound when notifications appear
              </p>
            </div>
            <Switch 
              checked={soundEffects}
              onCheckedChange={setSoundEffects}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Mobile Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Display notifications on mobile devices
              </p>
            </div>
            <Switch 
              checked={mobileNotifications}
              onCheckedChange={setMobileNotifications}
            />
          </div>
          <Button onClick={handleSaveNotifications} disabled={saving} className="mt-4">
            {saving ? "Saving..." : "Save Notification Settings"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Branding</CardTitle>
          <CardDescription>
            Customize the appearance of notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="brand-color">Brand Color</Label>
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
          <Button onClick={handleSaveBranding} disabled={saving}>
            {saving ? "Saving..." : "Save Branding"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
