import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

interface DesignEditorProps {
  settings: any;
  onChange: (settings: any) => void;
}

const PRESET_THEMES = [
  { name: "Modern Blue", primaryColor: "#2563EB", backgroundColor: "#ffffff", textColor: "#1a1a1a" },
  { name: "Dark Mode", primaryColor: "#818cf8", backgroundColor: "#1f2937", textColor: "#f9fafb" },
  { name: "Minimal Green", primaryColor: "#10b981", backgroundColor: "#f9fafb", textColor: "#111827" },
  { name: "Bold Red", primaryColor: "#ef4444", backgroundColor: "#000000", textColor: "#ffffff" },
  { name: "Elegant Purple", primaryColor: "#8b5cf6", backgroundColor: "#faf5ff", textColor: "#1f2937" },
];

const FONT_FAMILIES = [
  { name: "System Default", value: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" },
  { name: "Inter", value: "'Inter', sans-serif" },
  { name: "Roboto", value: "'Roboto', sans-serif" },
  { name: "Open Sans", value: "'Open Sans', sans-serif" },
  { name: "Poppins", value: "'Poppins', sans-serif" },
];

export function DesignEditor({ settings, onChange }: DesignEditorProps) {
  const [design, setDesign] = useState({
    // Position & Animation
    position: "bottom-left",
    animation: "slide",
    animationSpeed: "normal",
    
    // Content
    headline: "{{name}} from {{city}} just {{action}}",
    subtext: "Join {{name}} and thousands of others",
    showAvatar: true,
    showTimestamp: true,
    showLocation: true,
    clickable: true,
    
    // CTA
    ctaEnabled: false,
    ctaLabel: "Learn More",
    ctaUrl: "",
    
    // Styling
    primaryColor: "#2563EB",
    backgroundColor: "#ffffff",
    textColor: "#1a1a1a",
    borderRadius: "12",
    shadow: "md",
    fontSize: "14",
    fontFamily: FONT_FAMILIES[0].value,
    
    // Timing
    initialDelay: "0",
    displayDuration: "5",
    interval: "8",
    maxPerPage: "5",
    maxPerSession: "20",
    
    ...settings,
  });

  const updateDesign = (updates: Partial<typeof design>) => {
    const newDesign = { ...design, ...updates };
    setDesign(newDesign);
    onChange(newDesign);
  };

  const applyPresetTheme = (theme: typeof PRESET_THEMES[0]) => {
    updateDesign({
      primaryColor: theme.primaryColor,
      backgroundColor: theme.backgroundColor,
      textColor: theme.textColor,
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Editor Panel */}
      <div className="space-y-6">
        {/* Preset Themes Quick Access */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Quick Themes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 flex-wrap">
              {PRESET_THEMES.map((theme) => (
                <Button
                  key={theme.name}
                  variant="outline"
                  size="sm"
                  onClick={() => applyPresetTheme(theme)}
                  className="text-xs"
                >
                  {theme.name}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="content" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="style">Style</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>

          <TabsContent value="content" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Notification Content</CardTitle>
                <CardDescription>Use placeholders like {`{{name}}`}, {`{{city}}`}, {`{{product}}`}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Headline</Label>
                  <Input
                    value={design.headline}
                    onChange={(e) => updateDesign({ headline: e.target.value })}
                    placeholder="{{name}} from {{city}} just {{action}}"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Subtext (optional)</Label>
                  <Textarea
                    value={design.subtext}
                    onChange={(e) => updateDesign({ subtext: e.target.value })}
                    placeholder="Additional context or call to action"
                    rows={3}
                  />
                </div>
                
                <div className="space-y-3 pt-2 border-t">
                  <p className="text-sm font-medium">Show/Hide Elements</p>
                  <div className="flex items-center justify-between">
                    <Label>Show avatar</Label>
                    <Switch
                      checked={design.showAvatar}
                      onCheckedChange={(checked) => updateDesign({ showAvatar: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Show timestamp</Label>
                    <Switch
                      checked={design.showTimestamp}
                      onCheckedChange={(checked) => updateDesign({ showTimestamp: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Show location</Label>
                    <Switch
                      checked={design.showLocation}
                      onCheckedChange={(checked) => updateDesign({ showLocation: checked })}
                    />
                  </div>
                </div>
                
                <div className="space-y-3 pt-2 border-t">
                  <div className="flex items-center justify-between">
                    <Label>Enable CTA Button</Label>
                    <Switch
                      checked={design.ctaEnabled}
                      onCheckedChange={(checked) => updateDesign({ ctaEnabled: checked })}
                    />
                  </div>
                  {design.ctaEnabled && (
                    <>
                      <div className="space-y-2">
                        <Label>CTA Label</Label>
                        <Input
                          value={design.ctaLabel}
                          onChange={(e) => updateDesign({ ctaLabel: e.target.value })}
                          placeholder="Learn More"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>CTA URL</Label>
                        <Input
                          value={design.ctaUrl}
                          onChange={(e) => updateDesign({ ctaUrl: e.target.value })}
                          placeholder="https://your-site.com/product"
                        />
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="style" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Layout & Styling</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Position</Label>
                  <Select value={design.position} onValueChange={(value) => updateDesign({ position: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bottom-left">Bottom Left</SelectItem>
                      <SelectItem value="bottom-right">Bottom Right</SelectItem>
                      <SelectItem value="bottom-center">Bottom Center (Mobile-Optimized)</SelectItem>
                      <SelectItem value="top-left">Top Left</SelectItem>
                      <SelectItem value="top-right">Top Right</SelectItem>
                      <SelectItem value="top-center">Top Center</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Animation</Label>
                  <Select value={design.animation} onValueChange={(value) => updateDesign({ animation: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="slide">Slide In</SelectItem>
                      <SelectItem value="fade">Fade In</SelectItem>
                      <SelectItem value="bounce">Bounce</SelectItem>
                      <SelectItem value="none">None</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Animation Speed</Label>
                  <Select value={design.animationSpeed} onValueChange={(value) => updateDesign({ animationSpeed: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="slow">Slow (800ms)</SelectItem>
                      <SelectItem value="normal">Normal (500ms)</SelectItem>
                      <SelectItem value="fast">Fast (300ms)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Font Family</Label>
                  <Select value={design.fontFamily} onValueChange={(value) => updateDesign({ fontFamily: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FONT_FAMILIES.map((font) => (
                        <SelectItem key={font.value} value={font.value}>
                          {font.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Primary Color</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={design.primaryColor}
                        onChange={(e) => updateDesign({ primaryColor: e.target.value })}
                        className="w-12 h-10 p-1"
                      />
                      <Input
                        value={design.primaryColor}
                        onChange={(e) => updateDesign({ primaryColor: e.target.value })}
                        placeholder="#2563EB"
                        className="flex-1"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Background</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={design.backgroundColor}
                        onChange={(e) => updateDesign({ backgroundColor: e.target.value })}
                        className="w-12 h-10 p-1"
                      />
                      <Input
                        value={design.backgroundColor}
                        onChange={(e) => updateDesign({ backgroundColor: e.target.value })}
                        placeholder="#ffffff"
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Text Color</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={design.textColor}
                      onChange={(e) => updateDesign({ textColor: e.target.value })}
                      className="w-12 h-10 p-1"
                    />
                    <Input
                      value={design.textColor}
                      onChange={(e) => updateDesign({ textColor: e.target.value })}
                      placeholder="#1a1a1a"
                      className="flex-1"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Shadow</Label>
                  <Select value={design.shadow} onValueChange={(value) => updateDesign({ shadow: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="sm">Small</SelectItem>
                      <SelectItem value="md">Medium</SelectItem>
                      <SelectItem value="lg">Large</SelectItem>
                      <SelectItem value="xl">Extra Large</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Border Radius: {design.borderRadius}px</Label>
                  <Input
                    type="range"
                    min="0"
                    max="24"
                    value={design.borderRadius}
                    onChange={(e) => updateDesign({ borderRadius: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Font Size: {design.fontSize}px</Label>
                  <Input
                    type="range"
                    min="12"
                    max="18"
                    value={design.fontSize}
                    onChange={(e) => updateDesign({ fontSize: e.target.value })}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Timing & Display Rules</CardTitle>
                <CardDescription>Control when and how often notifications appear</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Initial Delay: {design.initialDelay}s</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Wait before showing first notification
                  </p>
                  <Input
                    type="range"
                    min="0"
                    max="30"
                    value={design.initialDelay}
                    onChange={(e) => updateDesign({ initialDelay: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Display Duration: {design.displayDuration}s</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    How long each notification stays visible
                  </p>
                  <Input
                    type="range"
                    min="3"
                    max="10"
                    value={design.displayDuration}
                    onChange={(e) => updateDesign({ displayDuration: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Interval: {design.interval}s</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Time between notifications
                  </p>
                  <Input
                    type="range"
                    min="5"
                    max="60"
                    value={design.interval}
                    onChange={(e) => updateDesign({ interval: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Max Per Page Load</Label>
                  <Input
                    type="number"
                    min="1"
                    max="10"
                    value={design.maxPerPage}
                    onChange={(e) => updateDesign({ maxPerPage: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum notifications shown per page load
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label>Max Per Session</Label>
                  <Input
                    type="number"
                    min="1"
                    max="100"
                    value={design.maxPerSession}
                    onChange={(e) => updateDesign({ maxPerSession: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum notifications shown per user session
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Live Preview Panel */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Live Preview</CardTitle>
                <CardDescription>Real-time preview of your notification</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const preview = document.getElementById('notification-preview');
                    if (preview) {
                      preview.classList.remove('animate-in');
                      setTimeout(() => preview.classList.add('animate-in'), 10);
                    }
                  }}
                >
                  Replay
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="relative bg-gradient-to-br from-muted/30 to-muted/50 rounded-lg h-[500px] overflow-hidden border">
              {/* Simulated website background */}
              <div className="absolute inset-0 p-8 opacity-20">
                <div className="h-6 w-48 bg-foreground rounded mb-6" />
                <div className="h-3 w-full bg-foreground rounded mb-2" />
                <div className="h-3 w-3/4 bg-foreground rounded mb-2" />
                <div className="h-3 w-5/6 bg-foreground rounded" />
              </div>

              {/* Notification Preview */}
              <div
                id="notification-preview"
                className={`absolute ${
                  design.position === "bottom-left"
                    ? "bottom-4 left-4"
                    : design.position === "bottom-right"
                    ? "bottom-4 right-4"
                    : design.position === "bottom-center"
                    ? "bottom-4 left-1/2 -translate-x-1/2"
                    : design.position === "top-left"
                    ? "top-4 left-4"
                    : design.position === "top-right"
                    ? "top-4 right-4"
                    : design.position === "top-center"
                    ? "top-4 left-1/2 -translate-x-1/2"
                    : "bottom-4 left-4"
                } max-w-sm animate-in ${
                  design.animation === "slide"
                    ? "slide-in-from-bottom-5"
                    : design.animation === "fade"
                    ? "fade-in"
                    : design.animation === "bounce"
                    ? "slide-in-from-bottom-5 duration-500"
                    : ""
                } ${
                  design.animationSpeed === "slow"
                    ? "duration-800"
                    : design.animationSpeed === "fast"
                    ? "duration-300"
                    : "duration-500"
                }`}
                style={{
                  backgroundColor: design.backgroundColor,
                  color: design.textColor,
                  borderRadius: `${design.borderRadius}px`,
                  boxShadow: {
                    none: 'none',
                    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
                  }[design.shadow],
                  fontSize: `${design.fontSize}px`,
                  fontFamily: design.fontFamily
                }}
              >
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    {design.showAvatar && (
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0"
                        style={{ background: `linear-gradient(135deg, ${design.primaryColor}, ${design.primaryColor}dd)` }}
                      >
                        JD
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold mb-1 leading-tight" style={{ color: design.textColor }}>
                        {design.headline || "Your headline here"}
                      </p>
                      {design.subtext && (
                        <p className="text-sm opacity-75 mb-2" style={{ color: design.textColor }}>
                          {design.subtext}
                        </p>
                      )}
                      <div className="flex items-center gap-2 text-xs opacity-60" style={{ color: design.textColor }}>
                        {design.showTimestamp && <span>2m ago</span>}
                        {design.showTimestamp && design.showLocation && <span>•</span>}
                        {design.showLocation && <span>New York, US</span>}
                      </div>
                      {design.ctaEnabled && design.ctaLabel && (
                        <Button
                          size="sm"
                          className="mt-2"
                          style={{ 
                            backgroundColor: design.primaryColor,
                            color: '#ffffff',
                            fontSize: `${Math.max(12, parseInt(design.fontSize) - 2)}px`
                          }}
                        >
                          {design.ctaLabel}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">
                💡 <strong>Tip:</strong> This preview updates in real-time as you adjust settings. 
                On mobile devices, notifications automatically center at the bottom for better UX.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
