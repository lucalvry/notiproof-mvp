import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Clock, MapPin, Smartphone, Sliders, MousePointer, 
  Palette, Globe, Code, Info 
} from "lucide-react";

interface SettingsSectionsProps {
  settings: any;
  onChange: (settings: any) => void;
}

export function SettingsSections({ settings, onChange }: SettingsSectionsProps) {
  const updateSettings = (updates: Partial<typeof settings>) => {
    onChange({ ...settings, ...updates });
  };

  return (
    <Tabs defaultValue="timing" className="w-full">
      <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 gap-2">
        <TabsTrigger value="timing" className="gap-2">
          <Clock className="h-4 w-4" />
          Timing
        </TabsTrigger>
        <TabsTrigger value="position" className="gap-2">
          <MapPin className="h-4 w-4" />
          Position
        </TabsTrigger>
        <TabsTrigger value="limits" className="gap-2">
          <Sliders className="h-4 w-4" />
          Limits
        </TabsTrigger>
        <TabsTrigger value="actions" className="gap-2">
          <MousePointer className="h-4 w-4" />
          Actions
        </TabsTrigger>
      </TabsList>

      {/* TIMING SECTION */}
      <TabsContent value="timing" className="space-y-4 mt-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Display Timing Controls
            </CardTitle>
            <CardDescription>
              Control when and how long notifications appear on your website
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="initial-delay">Initial Delay (seconds)</Label>
              <Input
                id="initial-delay"
                type="number"
                min="0"
                max="60"
                value={parseInt(settings.initialDelay || '0')}
                onChange={(e) => updateSettings({ initialDelay: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
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
                value={parseInt(settings.displayDuration || '5')}
                onChange={(e) => updateSettings({ displayDuration: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                How long each notification stays visible before auto-hiding
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="interval">Interval Between Notifications (seconds)</Label>
              <Input
                id="interval"
                type="number"
                min="1"
                max="120"
                value={parseInt(settings.interval || '8')}
                onChange={(e) => updateSettings({ interval: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Time between consecutive notifications
              </p>
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-xs">
                <strong>Pro Tip:</strong> Shorter intervals (3-5s) work well for high-traffic e-commerce sites. 
                Longer intervals (10-15s) are better for B2B or SaaS products.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </TabsContent>

      {/* POSITION SECTION */}
      <TabsContent value="position" className="space-y-4 mt-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Widget Position & Animation
            </CardTitle>
            <CardDescription>
              Choose where notifications appear and how they animate
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label>Desktop Position</Label>
              <div className="grid grid-cols-3 gap-3">
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
                    onClick={() => updateSettings({ position: pos.value })}
                    className={`p-3 text-sm border rounded-lg transition-all ${
                      settings.position === pos.value
                        ? 'border-primary bg-primary/10 font-medium'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    {pos.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mobile-position">Mobile Position Override</Label>
              <Select
                value={settings.mobilePosition || settings.position}
                onValueChange={(value) => updateSettings({ mobilePosition: value })}
              >
                <SelectTrigger id="mobile-position">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="top-center">Top Center</SelectItem>
                  <SelectItem value="bottom-center">Bottom Center</SelectItem>
                  <SelectItem value="bottom-left">Bottom Left</SelectItem>
                  <SelectItem value="bottom-right">Bottom Right</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                <Smartphone className="h-3 w-3 inline mr-1" />
                Override position on mobile devices (recommended: bottom-center)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="animation">Entry Animation</Label>
              <Select
                value={settings.animation || 'slide'}
                onValueChange={(value) => updateSettings({ animation: value })}
              >
                <SelectTrigger id="animation">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="slide">Slide In</SelectItem>
                  <SelectItem value="fade">Fade In</SelectItem>
                  <SelectItem value="bounce">Bounce</SelectItem>
                  <SelectItem value="none">No Animation</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="animation-speed">Animation Speed</Label>
              <Select
                value={settings.animationSpeed || 'normal'}
                onValueChange={(value) => updateSettings({ animationSpeed: value })}
              >
                <SelectTrigger id="animation-speed">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="slow">Slow (0.5s)</SelectItem>
                  <SelectItem value="normal">Normal (0.3s)</SelectItem>
                  <SelectItem value="fast">Fast (0.15s)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* LIMITS SECTION */}
      <TabsContent value="limits" className="space-y-4 mt-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sliders className="h-5 w-5" />
              Frequency Limits
            </CardTitle>
            <CardDescription>
              Prevent notification fatigue by limiting how often they appear
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="max-per-page">Maximum Per Page View</Label>
              <Input
                id="max-per-page"
                type="number"
                min="1"
                max="20"
                value={parseInt(settings.maxPerPage || '5')}
                onChange={(e) => updateSettings({ maxPerPage: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Maximum number of notifications to show on a single page
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="max-per-session">Maximum Per Session</Label>
              <Input
                id="max-per-session"
                type="number"
                min="1"
                max="100"
                value={parseInt(settings.maxPerSession || '20')}
                onChange={(e) => updateSettings({ maxPerSession: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Maximum total notifications during a user's entire session
              </p>
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-xs">
                <strong>Recommended:</strong> 3-5 per page, 10-20 per session to avoid overwhelming users
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </TabsContent>

      {/* DEBUG & ADVANCED SECTION */}
      <TabsContent value="actions" className="space-y-4 mt-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MousePointer className="h-5 w-5" />
              User Interaction Behavior
            </CardTitle>
            <CardDescription>
              Control what happens when users interact with notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="pause-after-click">Pause After Click</Label>
                <p className="text-xs text-muted-foreground">
                  Stop showing new notifications after user clicks one
                </p>
              </div>
              <Switch
                id="pause-after-click"
                checked={settings.pauseAfterClick || false}
                onCheckedChange={(checked) => updateSettings({ pauseAfterClick: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="pause-after-close">Pause After Close</Label>
                <p className="text-xs text-muted-foreground">
                  Stop showing notifications if user manually closes one
                </p>
              </div>
              <Switch
                id="pause-after-close"
                checked={settings.pauseAfterClose || false}
                onCheckedChange={(checked) => updateSettings({ pauseAfterClose: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="clickable">Make Clickable</Label>
                <p className="text-xs text-muted-foreground">
                  Allow users to click notifications to view details
                </p>
              </div>
              <Switch
                id="clickable"
                checked={settings.clickable !== false}
                onCheckedChange={(checked) => updateSettings({ clickable: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="hide-on-mobile">Auto-Hide on Mobile</Label>
                <p className="text-xs text-muted-foreground">
                  Automatically hide faster on mobile devices (3s instead of 5s)
                </p>
              </div>
              <Switch
                id="hide-on-mobile"
                checked={settings.hideOnMobileFaster || false}
                onCheckedChange={(checked) => updateSettings({ hideOnMobileFaster: checked })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Debug Mode */}
        <Card className="border-orange-200 bg-orange-50/50 dark:border-orange-800 dark:bg-orange-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-700 dark:text-orange-400">
              <Code className="h-5 w-5" />
              Debug Mode
            </CardTitle>
            <CardDescription>
              Developer tools for troubleshooting (only for testing)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="debug-mode" className="text-orange-700 dark:text-orange-400">
                  Enable Debug Mode
                </Label>
                <p className="text-xs text-muted-foreground">
                  Shows console logs, highlights widget boundary, displays timing info
                </p>
              </div>
              <Switch
                id="debug-mode"
                checked={settings.debugMode || false}
                onCheckedChange={(checked) => updateSettings({ debugMode: checked })}
              />
            </div>

            {settings.debugMode && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  <strong>Debug mode active:</strong>
                  <ul className="list-disc list-inside space-y-1 mt-2">
                    <li>Widget events logged to browser console</li>
                    <li>Red dashed border around widget</li>
                    <li>Timing and performance metrics displayed</li>
                    <li><strong className="text-orange-600">Remember to disable before going live!</strong></li>
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
