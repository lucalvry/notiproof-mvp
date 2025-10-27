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

export function DesignEditor({ settings, onChange }: DesignEditorProps) {
  const [design, setDesign] = useState({
    layout: "bottom-left",
    headline: "{{name}} from {{city}} just {{action}}",
    subtext: "Join {{name}} and thousands of others",
    showImage: true,
    clickable: true,
    ctaEnabled: false,
    ctaLabel: "Learn More",
    ctaUrl: "",
    primaryColor: "#2563EB",
    animation: "slide",
    borderRadius: "12",
    opacity: "95",
    ...settings,
  });

  const updateDesign = (updates: Partial<typeof design>) => {
    const newDesign = { ...design, ...updates };
    setDesign(newDesign);
    onChange(newDesign);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Editor Panel */}
      <div className="space-y-6">
        <Tabs defaultValue="template" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="template">Template</TabsTrigger>
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="media">Media</TabsTrigger>
            <TabsTrigger value="cta">CTA</TabsTrigger>
            <TabsTrigger value="style">Style</TabsTrigger>
          </TabsList>

          <TabsContent value="template" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Layout Selection</CardTitle>
                <CardDescription>Choose where the notification appears</CardDescription>
              </CardHeader>
              <CardContent>
                <Select value={design.layout} onValueChange={(value) => updateDesign({ layout: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bottom-left">Bottom Left Popup</SelectItem>
                    <SelectItem value="bottom-right">Bottom Right Popup</SelectItem>
                    <SelectItem value="top-left">Top Left Popup</SelectItem>
                    <SelectItem value="top-right">Top Right Popup</SelectItem>
                    <SelectItem value="inline-bar">Inline Bar</SelectItem>
                    <SelectItem value="floating-badge">Floating Badge</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          </TabsContent>

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
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="media" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Media Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Show product image (if available)</Label>
                  <Switch
                    checked={design.showImage}
                    onCheckedChange={(checked) => updateDesign({ showImage: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Make notification clickable</Label>
                  <Switch
                    checked={design.clickable}
                    onCheckedChange={(checked) => updateDesign({ clickable: checked })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Fallback Logo</Label>
                  <Button variant="outline" className="w-full">
                    Upload Logo
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cta" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Call to Action</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
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
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="style" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Styling</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Primary Color</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={design.primaryColor}
                      onChange={(e) => updateDesign({ primaryColor: e.target.value })}
                      className="w-20 h-10"
                    />
                    <Input
                      value={design.primaryColor}
                      onChange={(e) => updateDesign({ primaryColor: e.target.value })}
                      placeholder="#2563EB"
                    />
                  </div>
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
                  <Label>Opacity: {design.opacity}%</Label>
                  <Input
                    type="range"
                    min="50"
                    max="100"
                    value={design.opacity}
                    onChange={(e) => updateDesign({ opacity: e.target.value })}
                  />
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
            <CardTitle>Live Preview</CardTitle>
            <CardDescription>See how your notification will appear</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative bg-muted rounded-lg h-96 overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                <span className="text-sm">Website Preview</span>
              </div>
              
              {/* Notification Preview */}
              <div
                className={`absolute ${
                  design.layout === "bottom-left"
                    ? "bottom-4 left-4"
                    : design.layout === "bottom-right"
                    ? "bottom-4 right-4"
                    : design.layout === "top-left"
                    ? "top-4 left-4"
                    : "top-4 right-4"
                } max-w-sm bg-card border shadow-lg p-4 animate-fade-in`}
                style={{
                  borderRadius: `${design.borderRadius}px`,
                  opacity: `${design.opacity}%`,
                }}
              >
                <div className="flex gap-3">
                  {design.showImage && (
                    <div className="w-12 h-12 rounded bg-primary/10 flex items-center justify-center text-primary text-xs">
                      IMG
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-medium">{design.headline || "Your headline here"}</p>
                    {design.subtext && (
                      <p className="text-xs text-muted-foreground mt-1">{design.subtext}</p>
                    )}
                    {design.ctaEnabled && (
                      <Button
                        size="sm"
                        className="mt-2"
                        style={{ backgroundColor: design.primaryColor }}
                      >
                        {design.ctaLabel}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
