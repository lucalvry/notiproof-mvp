import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { ChevronDown, Star, Image, Clock, MapPin, User, Zap } from "lucide-react";
import { IntegrationDesignConfig, getIntegrationDesignConfig } from "@/lib/integrationDesignConfig";
import { IntegrationTemplatePreview } from "./IntegrationTemplatePreview";

interface TailoredDesignEditorProps {
  settings: any;
  onChange: (settings: any) => void;
  provider: string;
  templates?: any[];
}

const PRESET_THEMES = [
  { 
    name: "🚀 High-Converting (Blue)", 
    performanceBoost: "+23% CTR",
    primaryColor: "#2563EB", 
    backgroundColor: "#ffffff", 
    textColor: "#1a1a1a" 
  },
  { 
    name: "🌙 Premium Dark", 
    performanceBoost: "+18% engagement",
    primaryColor: "#818cf8", 
    backgroundColor: "#1f2937", 
    textColor: "#f9fafb" 
  },
  { 
    name: "✅ Trust Builder (Green)", 
    performanceBoost: "+31% conversions",
    primaryColor: "#10b981", 
    backgroundColor: "#f9fafb", 
    textColor: "#111827" 
  },
  { 
    name: "🔥 Urgency Red", 
    performanceBoost: "+42% click-through",
    primaryColor: "#ef4444", 
    backgroundColor: "#000000", 
    textColor: "#ffffff" 
  },
];

const FONT_FAMILIES = [
  { name: "System Default", value: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" },
  { name: "Inter", value: "'Inter', sans-serif" },
  { name: "Roboto", value: "'Roboto', sans-serif" },
  { name: "Poppins", value: "'Poppins', sans-serif" },
  { name: "Montserrat", value: "'Montserrat', sans-serif" },
];

const HOVER_EFFECTS = [
  { name: "None", value: "none" },
  { name: "Subtle Scale", value: "subtle" },
  { name: "Lift", value: "lift" },
  { name: "Glow", value: "glow" },
];

const POSITIONS = [
  { name: "Bottom Left", value: "bottom-left" },
  { name: "Bottom Right", value: "bottom-right" },
  { name: "Top Left", value: "top-left" },
  { name: "Top Right", value: "top-right" },
];

const ANIMATIONS = [
  { name: "Slide In", value: "slide" },
  { name: "Fade In", value: "fade" },
  { name: "Bounce", value: "bounce" },
  { name: "Scale", value: "scale" },
];

export function TailoredDesignEditor({ 
  settings, 
  onChange, 
  provider,
  templates = []
}: TailoredDesignEditorProps) {
  const config = getIntegrationDesignConfig(provider);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    templates.length > 0 ? templates[0].id : null
  );
  
  const baseDefaults = {
    position: "bottom-left",
    animation: "slide",
    headline: config.defaultHeadline,
    subtext: config.defaultSubtext,
    showTimestamp: true,
    showLocation: true,
    showAvatar: true,
    showNames: true,
    showLocations: true,
    showProductImages: true,
    showRating: true,
    ctaEnabled: false,
    ctaLabel: "Learn More",
    ctaUrl: "",
    primaryColor: "#2563EB",
    backgroundColor: "#ffffff",
    textColor: "#1a1a1a",
    borderRadius: "12",
    shadow: "md",
    fontSize: "14",
    fontFamily: FONT_FAMILIES[0].value,
    borderColor: "transparent",
    borderWidth: "0",
    hoverEffect: "subtle",
    notificationPadding: "16",
    displayDuration: "5",
    interval: "8",
    maxPerPage: "5",
  };
  
  const [design, setDesign] = useState({
    ...baseDefaults,
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

  const selectedTemplate = templates.find(t => t.id === selectedTemplateId);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left: Design Controls */}
      <div className="space-y-4">
        {/* Integration Context */}
        <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="secondary">{config.displayName}</Badge>
              <span className="text-xs text-muted-foreground">{config.description}</span>
            </div>
          </CardContent>
        </Card>

        {/* Quick Themes */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Quick Themes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {PRESET_THEMES.map((theme) => (
              <Button
                key={theme.name}
                variant="outline"
                onClick={() => applyPresetTheme(theme)}
                className="w-full justify-between h-auto py-2"
              >
                <span className="text-sm">{theme.name}</span>
                <Badge variant="secondary" className="text-[10px]">
                  {theme.performanceBoost}
                </Badge>
              </Button>
            ))}
          </CardContent>
        </Card>

        <Tabs defaultValue="content" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="style">Style</TabsTrigger>
            <TabsTrigger value="timing">Timing</TabsTrigger>
          </TabsList>

          <TabsContent value="content" className="space-y-4 mt-4">
            {/* Content Section - Only if enabled */}
            {config.sections.content && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Content</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Headline Template</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                            Insert Variable <ChevronDown className="h-3 w-3" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-72" align="end">
                          <div className="space-y-2">
                            <p className="text-xs font-medium">Available Variables</p>
                            {config.placeholders.map((item, idx) => (
                              <button
                                key={idx}
                                onClick={() => {
                                  updateDesign({ 
                                    headline: design.headline + item.placeholder 
                                  });
                                }}
                                className="w-full text-left p-2 rounded hover:bg-muted text-sm"
                              >
                                <span className="font-mono text-xs">{item.placeholder}</span>
                                <span className="text-muted-foreground ml-2 text-xs">({item.example})</span>
                              </button>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <Input
                      value={design.headline}
                      onChange={(e) => updateDesign({ headline: e.target.value })}
                      placeholder={config.defaultHeadline}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Subtext</Label>
                    <Textarea
                      value={design.subtext}
                      onChange={(e) => updateDesign({ subtext: e.target.value })}
                      placeholder={config.defaultSubtext}
                      rows={2}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Privacy Controls - Only for relevant integrations */}
            {config.sections.privacy && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Privacy Controls
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Show Customer Names</Label>
                    <Switch
                      checked={design.showNames !== false}
                      onCheckedChange={(checked) => updateDesign({ showNames: checked })}
                    />
                  </div>
                  {config.sections.location && (
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Show Locations</Label>
                      <Switch
                        checked={design.showLocations !== false}
                        onCheckedChange={(checked) => updateDesign({ showLocations: checked })}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Avatar Controls - Only for testimonials, form capture */}
            {config.sections.avatar && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Avatar Display
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Show Avatar</Label>
                    <Switch
                      checked={design.showAvatar}
                      onCheckedChange={(checked) => updateDesign({ showAvatar: checked })}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Ratings - Only for testimonials */}
            {config.sections.ratings && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Star className="h-4 w-4" />
                    Rating Display
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Show Star Rating</Label>
                    <Switch
                      checked={design.showRating !== false}
                      onCheckedChange={(checked) => updateDesign({ showRating: checked })}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Product Images - Only for e-commerce */}
            {config.sections.productImages && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Image className="h-4 w-4" />
                    Product Images
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Show Product Images</Label>
                    <Switch
                      checked={design.showProductImages !== false}
                      onCheckedChange={(checked) => updateDesign({ showProductImages: checked })}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* CTA Button - Only for relevant integrations */}
            {config.sections.cta && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Call-to-Action</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Enable CTA Button</Label>
                    <Switch
                      checked={design.ctaEnabled}
                      onCheckedChange={(checked) => updateDesign({ ctaEnabled: checked })}
                    />
                  </div>
                  {design.ctaEnabled && (
                    <>
                      <div className="space-y-2">
                        <Label className="text-xs">Button Text</Label>
                        <Input
                          value={design.ctaLabel}
                          onChange={(e) => updateDesign({ ctaLabel: e.target.value })}
                          placeholder="Learn More"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Button URL</Label>
                        <Input
                          value={design.ctaUrl}
                          onChange={(e) => updateDesign({ ctaUrl: e.target.value })}
                          placeholder="https://..."
                        />
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Timestamp - Only if enabled */}
            {config.sections.timestamp && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Timestamp
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Show "X minutes ago"</Label>
                    <Switch
                      checked={design.showTimestamp}
                      onCheckedChange={(checked) => updateDesign({ showTimestamp: checked })}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Urgency - Only for e-commerce */}
            {config.sections.urgency && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    Urgency Elements
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Use urgency placeholders in your message template like "Only {'{{stock_count}}'} left!" 
                    or "{'{{visitor_count}}'} people viewing"
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="style" className="space-y-4 mt-4">
            {/* Colors */}
            {config.sections.colors && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Colors</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs">Background</Label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={design.backgroundColor}
                          onChange={(e) => updateDesign({ backgroundColor: e.target.value })}
                          className="w-10 h-10 rounded cursor-pointer"
                        />
                        <Input
                          value={design.backgroundColor}
                          onChange={(e) => updateDesign({ backgroundColor: e.target.value })}
                          className="flex-1 h-10 font-mono text-xs"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Text</Label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={design.textColor}
                          onChange={(e) => updateDesign({ textColor: e.target.value })}
                          className="w-10 h-10 rounded cursor-pointer"
                        />
                        <Input
                          value={design.textColor}
                          onChange={(e) => updateDesign({ textColor: e.target.value })}
                          className="flex-1 h-10 font-mono text-xs"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Accent</Label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={design.primaryColor}
                          onChange={(e) => updateDesign({ primaryColor: e.target.value })}
                          className="w-10 h-10 rounded cursor-pointer"
                        />
                        <Input
                          value={design.primaryColor}
                          onChange={(e) => updateDesign({ primaryColor: e.target.value })}
                          className="flex-1 h-10 font-mono text-xs"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Typography */}
            {config.sections.typography && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Typography</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Font Family</Label>
                    <Select
                      value={design.fontFamily}
                      onValueChange={(value) => updateDesign({ fontFamily: value })}
                    >
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
                  <div className="space-y-2">
                    <Label className="text-xs">Font Size: {design.fontSize}px</Label>
                    <Slider
                      value={[parseInt(design.fontSize) || 14]}
                      onValueChange={([value]) => updateDesign({ fontSize: String(value) })}
                      min={12}
                      max={18}
                      step={1}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Positioning */}
            {config.sections.positioning && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Position</CardTitle>
                </CardHeader>
                <CardContent>
                  <Select
                    value={design.position}
                    onValueChange={(value) => updateDesign({ position: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {POSITIONS.map((pos) => (
                        <SelectItem key={pos.value} value={pos.value}>
                          {pos.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
            )}

            {/* Animations */}
            {config.sections.animations && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Animation</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Entry Animation</Label>
                    <Select
                      value={design.animation}
                      onValueChange={(value) => updateDesign({ animation: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ANIMATIONS.map((anim) => (
                          <SelectItem key={anim.value} value={anim.value}>
                            {anim.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Hover Effect</Label>
                    <Select
                      value={design.hoverEffect}
                      onValueChange={(value) => updateDesign({ hoverEffect: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {HOVER_EFFECTS.map((effect) => (
                          <SelectItem key={effect.value} value={effect.value}>
                            {effect.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Border & Shadow */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Border & Shadow</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs">Border Radius: {design.borderRadius}px</Label>
                  <Slider
                    value={[parseInt(design.borderRadius) || 12]}
                    onValueChange={([value]) => updateDesign({ borderRadius: String(value) })}
                    min={0}
                    max={24}
                    step={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Shadow</Label>
                  <Select
                    value={design.shadow}
                    onValueChange={(value) => updateDesign({ shadow: value })}
                  >
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
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="timing" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Display Timing</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs">Display Duration: {design.displayDuration}s</Label>
                  <Slider
                    value={[parseInt(design.displayDuration) || 5]}
                    onValueChange={([value]) => updateDesign({ displayDuration: String(value) })}
                    min={3}
                    max={15}
                    step={1}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Interval Between Notifications: {design.interval}s</Label>
                  <Slider
                    value={[parseInt(design.interval) || 8]}
                    onValueChange={([value]) => updateDesign({ interval: String(value) })}
                    min={5}
                    max={30}
                    step={1}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Max Per Page: {design.maxPerPage}</Label>
                  <Slider
                    value={[parseInt(design.maxPerPage) || 5]}
                    onValueChange={([value]) => updateDesign({ maxPerPage: String(value) })}
                    min={1}
                    max={10}
                    step={1}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Right: Live Preview */}
      <div className="space-y-4">
        {/* Template Selector for Preview */}
        {templates.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Preview Template</CardTitle>
              <CardDescription className="text-xs">
                See how your defaults look with different templates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Select
                value={selectedTemplateId || ''}
                onValueChange={setSelectedTemplateId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        )}

        {/* Live Preview */}
        <Card className="sticky top-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Live Preview</CardTitle>
            <CardDescription className="text-xs">
              How notifications will appear on your site
            </CardDescription>
          </CardHeader>
          <CardContent>
            <IntegrationTemplatePreview
              config={config}
              design={design}
              template={selectedTemplate}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
