import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";
import { useBunnyUpload } from "@/hooks/useBunnyUpload";
import { Upload, Palette, Globe, Sparkles, Crown } from "lucide-react";

interface WhiteLabelSettingsProps {
  userId: string;
  isPro: boolean;
}

interface WhiteLabelConfig {
  enabled: boolean;
  hide_branding: boolean;
  custom_logo_url: string;
  custom_colors: {
    primary: string;
    secondary: string;
  };
  custom_domain: string;
  custom_brand_name: string;
}

export default function WhiteLabelSettings({ userId, isPro }: WhiteLabelSettingsProps) {
  const { isSuperAdmin } = useSuperAdmin(userId);
  const { uploadToBunny } = useBunnyUpload();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [config, setConfig] = useState<WhiteLabelConfig>({
    enabled: false,
    hide_branding: false,
    custom_logo_url: "",
    custom_colors: {
      primary: "#667eea",
      secondary: "#764ba2",
    },
    custom_domain: "",
    custom_brand_name: "",
  });

  useEffect(() => {
    fetchSettings();
  }, [userId]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("white_label_settings")
        .eq("id", userId)
        .single();

      if (error) throw error;

      if (data?.white_label_settings && typeof data.white_label_settings === 'object') {
        const settings = data.white_label_settings as Record<string, any>;
        setConfig({
          enabled: settings.enabled ?? false,
          hide_branding: settings.hide_branding ?? false,
          custom_logo_url: settings.custom_logo_url ?? "",
          custom_colors: {
            primary: settings.custom_colors?.primary ?? "#667eea",
            secondary: settings.custom_colors?.secondary ?? "#764ba2",
          },
          custom_domain: settings.custom_domain ?? "",
          custom_brand_name: settings.custom_brand_name ?? "",
        });
      }
    } catch (error) {
      console.error("Error fetching white-label settings:", error);
      toast.error("Failed to load white-label settings");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!isPro && !isSuperAdmin) {
      toast.error("White-label features require a Pro+ plan");
      return;
    }

    try {
      setSaving(true);

      const { error } = await supabase
        .from("profiles")
        .update({ white_label_settings: config as any })
        .eq("id", userId);

      if (error) throw error;

      toast.success("White-label settings saved successfully");
    } catch (error) {
      console.error("Error saving white-label settings:", error);
      toast.error("Failed to save white-label settings");
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo must be less than 2MB");
      return;
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    try {
      setUploading(true);
      const result = await uploadToBunny(file, 'white-label-logos');
      
      if (result.success && result.url) {
        setConfig({ ...config, custom_logo_url: result.url });
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (error) {
      console.error("Error uploading logo:", error);
      toast.error("Failed to upload logo");
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasAccess = isPro || isSuperAdmin;

  return (
    <div className="space-y-6">
      {!hasAccess && (
        <Alert>
          <Crown className="h-4 w-4" />
          <AlertDescription>
            White-label features are available on Pro+ plans.{" "}
            <a href="/billing" className="underline font-medium">
              Upgrade now
            </a>
          </AlertDescription>
        </Alert>
      )}

      {/* Enable White-Label */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Enable White-Label
              </CardTitle>
              <CardDescription>
                Remove NotiProof branding and customize the widget appearance
              </CardDescription>
            </div>
            {hasAccess && <Badge variant="default">{isSuperAdmin ? "Enterprise" : "Pro+"}</Badge>}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable White-Label Mode</Label>
              <p className="text-sm text-muted-foreground">
                Activate custom branding for your widgets
              </p>
            </div>
            <Switch
              checked={config.enabled}
              onCheckedChange={(checked) =>
                setConfig({ ...config, enabled: checked })
              }
              disabled={!hasAccess}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Hide "Powered by NotiProof"</Label>
              <p className="text-sm text-muted-foreground">
                Remove NotiProof branding from widgets
              </p>
            </div>
            <Switch
              checked={config.hide_branding}
              onCheckedChange={(checked) =>
                setConfig({ ...config, hide_branding: checked })
              }
              disabled={!hasAccess || !config.enabled}
            />
          </div>
        </CardContent>
      </Card>

      {/* Custom Branding */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Custom Logo
          </CardTitle>
          <CardDescription>Upload your brand logo for widgets</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="logo-upload">Logo Image</Label>
            <div className="flex items-center gap-4">
              {config.custom_logo_url && (
                <img
                  src={config.custom_logo_url}
                  alt="Custom logo"
                  className="h-12 w-12 object-contain rounded border"
                />
              )}
              <Input
                id="logo-upload"
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                disabled={!hasAccess || !config.enabled || uploading}
              />
              {uploading && (
                <p className="text-xs text-muted-foreground">Uploading to CDN...</p>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Recommended: PNG or SVG, max 2MB, transparent background
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="brand-name">Brand Name</Label>
            <Input
              id="brand-name"
              placeholder="Your Brand Name"
              value={config.custom_brand_name}
              onChange={(e) =>
                setConfig({ ...config, custom_brand_name: e.target.value })
              }
              disabled={!hasAccess || !config.enabled}
            />
          </div>
        </CardContent>
      </Card>

      {/* Custom Colors */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Custom Colors
          </CardTitle>
          <CardDescription>
            Customize widget colors to match your brand
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="primary-color">Primary Color</Label>
              <div className="flex gap-2">
                <Input
                  id="primary-color"
                  type="color"
                  value={config.custom_colors.primary}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      custom_colors: {
                        ...config.custom_colors,
                        primary: e.target.value,
                      },
                    })
                  }
                  disabled={!hasAccess || !config.enabled}
                  className="w-16 h-10"
                />
                <Input
                  value={config.custom_colors.primary}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      custom_colors: {
                        ...config.custom_colors,
                        primary: e.target.value,
                      },
                    })
                  }
                  disabled={!hasAccess || !config.enabled}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="secondary-color">Secondary Color</Label>
              <div className="flex gap-2">
                <Input
                  id="secondary-color"
                  type="color"
                  value={config.custom_colors.secondary}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      custom_colors: {
                        ...config.custom_colors,
                        secondary: e.target.value,
                      },
                    })
                  }
                  disabled={!hasAccess || !config.enabled}
                  className="w-16 h-10"
                />
                <Input
                  value={config.custom_colors.secondary}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      custom_colors: {
                        ...config.custom_colors,
                        secondary: e.target.value,
                      },
                    })
                  }
                  disabled={!hasAccess || !config.enabled}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Custom Domain */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Custom Widget Domain
          </CardTitle>
          <CardDescription>
            Use your own domain for widget delivery (CNAME setup required)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="custom-domain">Custom Domain</Label>
            <Input
              id="custom-domain"
              placeholder="widget.yourbrand.com"
              value={config.custom_domain}
              onChange={(e) =>
                setConfig({ ...config, custom_domain: e.target.value })
              }
              disabled={!hasAccess || !config.enabled}
            />
            <p className="text-xs text-muted-foreground">
              Contact support to set up CNAME records for your custom domain
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={!hasAccess || saving}>
          {saving ? "Saving..." : "Save White-Label Settings"}
        </Button>
      </div>
    </div>
  );
}
