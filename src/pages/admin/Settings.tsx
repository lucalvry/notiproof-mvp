import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { z } from "zod";
import { TableSkeleton } from "@/components/ui/loading-skeletons";
import {
  Shield,
  Bell,
  Palette,
  Users,
  Flag,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { logSettingsChange } from "@/lib/auditLog";

// Input validation schemas
const bannerSchema = z.object({
  message: z.string().max(500, "Banner message must be less than 500 characters"),
  enabled: z.boolean(),
});

const brandingSchema = z.object({
  appName: z.string().trim().min(1, "App name is required").max(100, "App name must be less than 100 characters"),
  supportEmail: z.string().trim().email("Invalid email address"),
});

interface SystemSetting {
  key: string;
  value: any;
  category: string;
  description?: string;
}

interface AdminUser {
  id: string;
  user_id: string;
  role: "admin" | "superadmin";
  granted_at: string;
}

export default function AdminSettings() {
  const { loading: authLoading, isSuperAdmin } = useAdminAuth();
  const [loading, setLoading] = useState(true);
  const [systemSettings, setSystemSettings] = useState<SystemSetting[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [bannerMessage, setBannerMessage] = useState("");
  const [bannerEnabled, setBannerEnabled] = useState(false);
  const [appName, setAppName] = useState("NotiProof");
  const [supportEmail, setSupportEmail] = useState("support@notiproof.com");

  useEffect(() => {
    if (!authLoading && isSuperAdmin) {
      fetchSettings();
    }
  }, [authLoading, isSuperAdmin]);

  const fetchSettings = async () => {
    try {
      setLoading(true);

      // Fetch system settings
      const { data: settingsData, error: settingsError } = await supabase
        .from("system_settings")
        .select("*")
        .order("category", { ascending: true });

      if (settingsError) throw settingsError;
      setSystemSettings(settingsData || []);

      // Parse specific settings
      const bannerSetting = settingsData?.find(s => s.key === "site_banner");
      if (bannerSetting && typeof bannerSetting.value === 'object' && bannerSetting.value !== null) {
        const bannerValue = bannerSetting.value as any;
        setBannerMessage(bannerValue.message || "");
        setBannerEnabled(bannerValue.enabled || false);
      }

      const brandingSetting = settingsData?.find(s => s.key === "branding");
      if (brandingSetting && typeof brandingSetting.value === 'object' && brandingSetting.value !== null) {
        const brandingValue = brandingSetting.value as any;
        setAppName(brandingValue.app_name || "NotiProof");
        setSupportEmail(brandingValue.support_email || "support@notiproof.com");
      }

      // Fetch admin users
      const { data: adminData, error: adminError } = await supabase
        .from("user_roles")
        .select("*")
        .in("role", ["admin", "superadmin"])
        .order("granted_at", { ascending: false });

      if (adminError) throw adminError;
      setAdminUsers((adminData || []).filter(user => 
        user.role === "admin" || user.role === "superadmin"
      ) as AdminUser[]);
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBanner = async () => {
    try {
      // Validate input
      const validated = bannerSchema.parse({
        message: bannerMessage,
        enabled: bannerEnabled,
      });

      const { error } = await supabase
        .from("system_settings")
        .upsert({
          key: "site_banner",
          category: "general",
          value: {
            enabled: validated.enabled,
            message: validated.message,
            type: "info",
            dismissible: true,
          },
          updated_by: (await supabase.auth.getUser()).data.user?.id,
        }, { onConflict: "key" });

      if (error) throw error;

      await logSettingsChange("banner_updated", "site_banner", {
        enabled: validated.enabled,
        messageLength: validated.message.length,
      });

      toast.success("Banner settings saved");
    } catch (error: any) {
      console.error("Error saving banner:", error);
      if (error instanceof z.ZodError) {
        toast.error(error.issues[0].message);
      } else {
        toast.error("Failed to save banner settings");
      }
    }
  };

  const handleSaveBranding = async () => {
    try {
      // Validate input
      const validated = brandingSchema.parse({
        appName,
        supportEmail,
      });

      const { error } = await supabase
        .from("system_settings")
        .upsert({
          key: "branding",
          category: "general",
          value: {
            app_name: validated.appName,
            support_email: validated.supportEmail,
            logo_url: "",
          },
          updated_by: (await supabase.auth.getUser()).data.user?.id,
        }, { onConflict: "key" });

      if (error) throw error;

      await logSettingsChange("settings_updated", "branding", {
        app_name: validated.appName,
      });

      toast.success("Branding settings saved");
    } catch (error: any) {
      console.error("Error saving branding:", error);
      if (error instanceof z.ZodError) {
        toast.error(error.issues[0].message);
      } else {
        toast.error("Failed to save branding settings");
      }
    }
  };

  if (authLoading) {
    return <div className="flex items-center justify-center h-full">Loading...</div>;
  }

  if (!isSuperAdmin) {
    return (
      <div className="mx-auto max-w-7xl">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <Shield className="h-5 w-5" />
              Access Denied
            </CardTitle>
            <CardDescription>
              Only superadmins can access system settings
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const featureFlags = systemSettings.find(s => s.key === "feature_flags");

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">System Settings</h1>
        <p className="text-muted-foreground">Configure global platform settings (Superadmin only)</p>
      </div>

      <Tabs defaultValue="features" className="space-y-4">
        <TabsList>
          <TabsTrigger value="features">
            <Flag className="mr-2 h-4 w-4" />
            Feature Flags
          </TabsTrigger>
          <TabsTrigger value="admins">
            <Users className="mr-2 h-4 w-4" />
            Admin Users
          </TabsTrigger>
          <TabsTrigger value="announcements">
            <Bell className="mr-2 h-4 w-4" />
            Announcements
          </TabsTrigger>
          <TabsTrigger value="branding">
            <Palette className="mr-2 h-4 w-4" />
            Branding
          </TabsTrigger>
        </TabsList>

        {/* Feature Flags Tab */}
        <TabsContent value="features" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Feature Flags</CardTitle>
              <CardDescription>
                Control beta features and experiments across the platform
              </CardDescription>
            </CardHeader>
            <CardContent>
              {featureFlags ? (
                <div className="space-y-4">
                  {Object.entries(featureFlags.value as Record<string, boolean>).map(([key, enabled]) => (
                    <div key={key} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">{key.replace(/_/g, " ")}</p>
                        <p className="text-sm text-muted-foreground">Feature toggle</p>
                      </div>
                      <Switch checked={enabled} disabled />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No feature flags configured</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Admin Users Tab */}
        <TabsContent value="admins" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Admin Users</CardTitle>
              <CardDescription>Manage admin and superadmin access</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <TableSkeleton rows={3} />
              ) : adminUsers.length === 0 ? (
                <div className="flex h-[200px] items-center justify-center text-muted-foreground">
                  <p>No admin users found</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User ID</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Granted</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {adminUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-mono text-sm">{user.user_id}</TableCell>
                        <TableCell>
                          <Badge variant={user.role === "superadmin" ? "default" : "secondary"}>
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(user.granted_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Announcements Tab */}
        <TabsContent value="announcements" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Announcements</CardTitle>
              <CardDescription>
                Display banner messages to all users
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="banner-message">Banner Message</Label>
                <Textarea
                  id="banner-message"
                  placeholder="Enter announcement message..."
                  value={bannerMessage}
                  onChange={(e) => setBannerMessage(e.target.value)}
                  rows={3}
                />
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Banner</Label>
                  <p className="text-sm text-muted-foreground">
                    Show banner message across all user dashboards
                  </p>
                </div>
                <Switch
                  checked={bannerEnabled}
                  onCheckedChange={setBannerEnabled}
                />
              </div>

              <Button onClick={handleSaveBanner}>Save Announcement</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Branding Tab */}
        <TabsContent value="branding" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Platform Branding</CardTitle>
              <CardDescription>Customize global branding and appearance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="platform-name">Platform Name</Label>
                <Input
                  id="platform-name"
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="support-email">Support Email</Label>
                <Input
                  id="support-email"
                  type="email"
                  value={supportEmail}
                  onChange={(e) => setSupportEmail(e.target.value)}
                />
              </div>

              <Button onClick={handleSaveBranding}>Save Branding</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}