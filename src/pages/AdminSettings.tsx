import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  Settings, 
  Server, 
  Mail, 
  Shield, 
  Database, 
  Globe,
  AlertTriangle
} from 'lucide-react';

const AdminSettings = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Platform Settings</h1>
        <p className="text-muted-foreground">Configure global platform settings and preferences</p>
      </div>

      <div className="grid gap-6">
        {/* General Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              General Settings
            </CardTitle>
            <CardDescription>
              Basic platform configuration and branding.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="platform-name">Platform Name</Label>
              <Input
                id="platform-name"
                defaultValue="NotiProof"
                placeholder="Platform name"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="platform-description">Platform Description</Label>
              <Textarea
                id="platform-description"
                defaultValue="Create and manage social proof notifications that boost conversions"
                placeholder="Platform description"
                rows={3}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="support-email">Support Email</Label>
              <Input
                id="support-email"
                type="email"
                defaultValue="support@notiproof.com"
                placeholder="support@example.com"
              />
            </div>
            
            <Button>Save General Settings</Button>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security Settings
            </CardTitle>
            <CardDescription>
              Configure security policies and authentication settings.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Require Email Verification</Label>
                <p className="text-sm text-muted-foreground">
                  Users must verify their email before accessing the platform
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable Two-Factor Authentication</Label>
                <p className="text-sm text-muted-foreground">
                  Allow users to enable 2FA for their accounts
                </p>
              </div>
              <Switch />
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Admin Approval Required</Label>
                <p className="text-sm text-muted-foreground">
                  New user accounts require admin approval
                </p>
              </div>
              <Switch />
            </div>
            
            <Button>Save Security Settings</Button>
          </CardContent>
        </Card>

        {/* API Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              API Configuration
            </CardTitle>
            <CardDescription>
              Configure API settings and rate limiting.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="api-rate-limit">Rate Limit (requests per minute)</Label>
              <Input
                id="api-rate-limit"
                type="number"
                defaultValue="1000"
                placeholder="1000"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable CORS</Label>
                <p className="text-sm text-muted-foreground">
                  Allow cross-origin requests to the API
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="allowed-origins">Allowed Origins</Label>
              <Textarea
                id="allowed-origins"
                defaultValue="https://example.com&#10;https://app.example.com"
                placeholder="Enter allowed origins, one per line"
                rows={3}
              />
            </div>
            
            <Button>Save API Settings</Button>
          </CardContent>
        </Card>

        {/* Email Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Email Configuration
            </CardTitle>
            <CardDescription>
              Configure email delivery settings and templates.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="smtp-host">SMTP Host</Label>
              <Input
                id="smtp-host"
                defaultValue="smtp.sendgrid.net"
                placeholder="smtp.example.com"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="smtp-port">SMTP Port</Label>
                <Input
                  id="smtp-port"
                  type="number"
                  defaultValue="587"
                  placeholder="587"
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="smtp-username">SMTP Username</Label>
                <Input
                  id="smtp-username"
                  defaultValue="apikey"
                  placeholder="Username"
                />
              </div>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="from-email">From Email</Label>
              <Input
                id="from-email"
                type="email"
                defaultValue="noreply@notiproof.com"
                placeholder="noreply@example.com"
              />
            </div>
            
            <Button>Save Email Settings</Button>
          </CardContent>
        </Card>

        {/* System Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              System Status
            </CardTitle>
            <CardDescription>
              Monitor system health and performance.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Database</h4>
                  <p className="text-sm text-muted-foreground">Connection status</p>
                </div>
                <Badge className="bg-green-100 text-green-800">Healthy</Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">API Server</h4>
                  <p className="text-sm text-muted-foreground">Response time: 45ms</p>
                </div>
                <Badge className="bg-green-100 text-green-800">Healthy</Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Email Service</h4>
                  <p className="text-sm text-muted-foreground">Delivery rate: 99.9%</p>
                </div>
                <Badge className="bg-green-100 text-green-800">Healthy</Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Storage</h4>
                  <p className="text-sm text-muted-foreground">Used: 2.4GB / 100GB</p>
                </div>
                <Badge className="bg-green-100 text-green-800">Healthy</Badge>
              </div>
            </div>
            
            <Button variant="outline">View Full System Report</Button>
          </CardContent>
        </Card>

        {/* Maintenance Mode */}
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Maintenance Mode
            </CardTitle>
            <CardDescription>
              Enable maintenance mode to temporarily disable access to the platform.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Maintenance Mode</h4>
                <p className="text-sm text-muted-foreground">
                  Platform is currently accessible to all users
                </p>
              </div>
              <Switch />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="maintenance-message">Maintenance Message</Label>
              <Textarea
                id="maintenance-message"
                defaultValue="We're currently performing scheduled maintenance. Please check back soon."
                placeholder="Message to display during maintenance"
                rows={3}
              />
            </div>
            
            <Button variant="destructive">Enable Maintenance Mode</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminSettings;