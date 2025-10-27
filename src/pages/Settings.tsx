import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

export default function Settings() {
  const handleSave = () => {
    toast.success("Settings saved successfully!");
  };

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
            <Input id="site-name" defaultValue="Example Store" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="site-domain">Domain</Label>
            <Input id="site-domain" defaultValue="example.com" disabled />
            <p className="text-sm text-muted-foreground">
              Contact support to change your domain
            </p>
          </div>
          <Button onClick={handleSave}>Save Changes</Button>
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
            <Switch defaultChecked />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Sound Effects</Label>
              <p className="text-sm text-muted-foreground">
                Play sound when notifications appear
              </p>
            </div>
            <Switch />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Mobile Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Display notifications on mobile devices
              </p>
            </div>
            <Switch defaultChecked />
          </div>
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
              <Input id="brand-color" type="color" defaultValue="#2563EB" className="w-20" />
              <Input defaultValue="#2563EB" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="border-radius">Border Radius</Label>
            <Input id="border-radius" type="number" defaultValue="12" />
          </div>
          <Button onClick={handleSave}>Save Branding</Button>
        </CardContent>
      </Card>
    </div>
  );
}
