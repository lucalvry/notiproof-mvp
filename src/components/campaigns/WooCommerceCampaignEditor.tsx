import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Palette, 
  Layout, 
  Sliders, 
  Target, 
  ShoppingCart,
  Save,
  RotateCcw,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { WooCommerceDesignPresets, WOOCOMMERCE_THEME_PRESETS, DesignPreset } from "./WooCommerceDesignPresets";
import { WooCommerceTemplateGallery } from "./WooCommerceTemplateGallery";
import { RulesTargeting } from "./RulesTargeting";
import { ContentAlignmentSelector, ContentAlignment } from "./ContentAlignmentSelector";
import { LiveNotificationPreview } from "./LiveNotificationPreview";

interface WooCommerceCampaignEditorProps {
  campaignId: string;
  websiteId: string;
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  integrationSettings?: any;
  templateId?: string;
}

const DEFAULT_DESIGN = {
  primaryColor: "#96588a",
  backgroundColor: "#ffffff",
  textColor: "#43454b",
  linkColor: "#96588a",
  borderRadius: "8",
  shadow: "md",
  fontSize: "14",
  position: "bottom-left",
  animation: "slide-in",
  fontFamily: "inherit",
  textAlignment: "left",
  templateLayout: "card",
  contentAlignment: "top" as ContentAlignment,
};

const FONT_OPTIONS = [
  { value: "inherit", label: "System Default" },
  { value: "'Inter', sans-serif", label: "Inter" },
  { value: "'Roboto', sans-serif", label: "Roboto" },
  { value: "'Open Sans', sans-serif", label: "Open Sans" },
  { value: "'Poppins', sans-serif", label: "Poppins" },
  { value: "'Lato', sans-serif", label: "Lato" },
];

const POSITION_OPTIONS = [
  { value: "bottom-left", label: "Bottom Left" },
  { value: "bottom-right", label: "Bottom Right" },
  { value: "bottom-center", label: "Bottom Center" },
  { value: "top-left", label: "Top Left" },
  { value: "top-right", label: "Top Right" },
  { value: "top-center", label: "Top Center" },
];

const ANIMATION_OPTIONS = [
  { value: "slide-in", label: "Slide In" },
  { value: "fade-in", label: "Fade In" },
  { value: "bounce", label: "Bounce" },
  { value: "scale", label: "Scale" },
];

const SHADOW_OPTIONS = [
  { value: "none", label: "None" },
  { value: "sm", label: "Small" },
  { value: "md", label: "Medium" },
  { value: "lg", label: "Large" },
];

export function WooCommerceCampaignEditor({
  campaignId,
  websiteId,
  open,
  onClose,
  onSave,
  integrationSettings = {},
}: WooCommerceCampaignEditorProps) {
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("presets");
  const [selectedPresetId, setSelectedPresetId] = useState<string | undefined>();
  
  // Design settings
  const [design, setDesign] = useState({ ...DEFAULT_DESIGN });
  
  // Rules settings
  const [rules, setRules] = useState({
    frequency: 10,
    sessionLimit: 5,
    pageTargeting: "all-pages",
    deviceTargeting: "both",
  });

  // Load campaign data
  useEffect(() => {
    if (open && campaignId) {
      loadCampaign();
    }
  }, [open, campaignId]);

  const loadCampaign = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .eq("id", campaignId)
        .single();

      if (error) throw error;

      const displayRules = (data.display_rules as any) || {};
      const settings = displayRules;

      // Load design settings
      setDesign({
        primaryColor: settings.primaryColor || settings.accentColor || DEFAULT_DESIGN.primaryColor,
        backgroundColor: settings.backgroundColor || DEFAULT_DESIGN.backgroundColor,
        textColor: settings.textColor || DEFAULT_DESIGN.textColor,
        linkColor: settings.linkColor || settings.primaryColor || DEFAULT_DESIGN.linkColor,
        borderRadius: settings.borderRadius || DEFAULT_DESIGN.borderRadius,
        shadow: settings.shadow || DEFAULT_DESIGN.shadow,
        fontSize: settings.fontSize || DEFAULT_DESIGN.fontSize,
        position: settings.position || DEFAULT_DESIGN.position,
        animation: settings.animation || DEFAULT_DESIGN.animation,
        fontFamily: settings.fontFamily || DEFAULT_DESIGN.fontFamily,
        textAlignment: settings.textAlignment || DEFAULT_DESIGN.textAlignment,
        templateLayout: settings.templateLayout || DEFAULT_DESIGN.templateLayout,
        contentAlignment: settings.contentAlignment || settings.content_alignment || DEFAULT_DESIGN.contentAlignment,
      });

      // Load rules
      setRules({
        frequency: displayRules.interval_ms ? displayRules.interval_ms / 1000 : 10,
        sessionLimit: displayRules.max_per_session || 5,
        pageTargeting: displayRules.pageTargeting || "all-pages",
        deviceTargeting: displayRules.deviceTargeting || "both",
      });

      // Check if current design matches any preset
      checkPresetMatch(settings);
    } catch (error) {
      console.error("Error loading campaign:", error);
      toast.error("Failed to load campaign");
    } finally {
      setLoading(false);
    }
  };

  const checkPresetMatch = (settings: any) => {
    const matchedPreset = WOOCOMMERCE_THEME_PRESETS.find((preset) => 
      preset.colors.primaryColor === (settings.primaryColor || settings.accentColor) &&
      preset.colors.backgroundColor === settings.backgroundColor &&
      preset.colors.textColor === settings.textColor
    );
    setSelectedPresetId(matchedPreset?.id);
  };

  const handlePresetSelect = (preset: DesignPreset) => {
    setSelectedPresetId(preset.id);
    setDesign((prev) => ({
      ...prev,
      primaryColor: preset.colors.primaryColor,
      backgroundColor: preset.colors.backgroundColor,
      textColor: preset.colors.textColor,
      linkColor: preset.colors.linkColor,
      borderRadius: preset.colors.borderRadius,
      shadow: preset.colors.shadow || "md",
    }));
    toast.success(`Applied ${preset.name} theme`);
  };

  const handleTemplateLayoutSelect = (layout: string) => {
    setDesign((prev) => ({ ...prev, templateLayout: layout }));
  };

  const updateDesign = (updates: Partial<typeof design>) => {
    setDesign((prev) => ({ ...prev, ...updates }));
    // Clear preset selection when customizing
    setSelectedPresetId(undefined);
  };

  const resetToDefault = () => {
    setDesign({ ...DEFAULT_DESIGN });
    setSelectedPresetId(undefined);
    toast.success("Reset to default design");
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updatedSettings = {
        ...design,
        accentColor: design.primaryColor, // For backward compatibility
        content_alignment: design.contentAlignment, // Ensure snake_case for consistency
        interval_ms: rules.frequency * 1000,
        max_per_session: rules.sessionLimit,
        pageTargeting: rules.pageTargeting,
        deviceTargeting: rules.deviceTargeting,
      };

      const { error } = await supabase
        .from("campaigns")
        .update({
          display_rules: updatedSettings,
          updated_at: new Date().toISOString(),
        })
        .eq("id", campaignId);

      if (error) throw error;

      // Update widget style_config with contentAlignment
      const { data: widget } = await supabase
        .from("widgets")
        .select("id, style_config")
        .eq("campaign_id", campaignId)
        .single();

      if (widget) {
        const existingConfig = (widget.style_config as any) || {};
        await supabase
          .from("widgets")
          .update({
            style_config: {
              ...existingConfig,
              contentAlignment: design.contentAlignment || 'top',
            },
          })
          .eq("id", widget.id);
      }

      toast.success("WooCommerce notification updated successfully");
      onSave();
      onClose();
    } catch (error) {
      console.error("Error updating campaign:", error);
      toast.error("Failed to update notification");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" />
            Edit WooCommerce Notification
          </DialogTitle>
          <DialogDescription>
            Customize your notification design, layout, and display rules
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        ) : (
          <div className="flex gap-4 flex-1 min-h-0">
            {/* Left Panel - Tabs Content */}
            <div className="flex-1 min-w-0 flex flex-col min-h-0">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
                <TabsList className="grid grid-cols-4 w-full shrink-0">
                  <TabsTrigger value="presets" className="flex items-center gap-2">
                    <Palette className="h-4 w-4" />
                    <span className="hidden sm:inline">Presets</span>
                  </TabsTrigger>
                  <TabsTrigger value="templates" className="flex items-center gap-2">
                    <Layout className="h-4 w-4" />
                    <span className="hidden sm:inline">Templates</span>
                  </TabsTrigger>
                  <TabsTrigger value="style" className="flex items-center gap-2">
                    <Sliders className="h-4 w-4" />
                    <span className="hidden sm:inline">Style</span>
                  </TabsTrigger>
                  <TabsTrigger value="rules" className="flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    <span className="hidden sm:inline">Rules</span>
                  </TabsTrigger>
                </TabsList>

                <ScrollArea className="flex-1 mt-4 h-[calc(90vh-280px)]">
                  <div className="pb-4 pr-4">
                    {/* Design Presets Tab */}
                    <TabsContent value="presets" className="mt-0">
                      <WooCommerceDesignPresets
                        selectedPresetId={selectedPresetId}
                        onSelect={handlePresetSelect}
                      />
                    </TabsContent>

                    {/* Template Gallery Tab */}
                    <TabsContent value="templates" className="mt-0">
                      <WooCommerceTemplateGallery
                        websiteId={websiteId}
                        selectedTemplateLayout={design.templateLayout}
                        onSelect={handleTemplateLayoutSelect}
                        designSettings={design}
                      />
                    </TabsContent>

                    {/* Style Editor Tab */}
                    <TabsContent value="style" className="mt-0">
                      <div className="space-y-6">
                        {/* Colors Section */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-base">Colors</CardTitle>
                            <CardDescription>Customize notification colors</CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
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
                                    className="flex-1"
                                  />
                                </div>
                              </div>
                              <div className="space-y-2">
                                <Label>Background Color</Label>
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
                                    className="flex-1"
                                  />
                                </div>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
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
                                    className="flex-1"
                                  />
                                </div>
                              </div>
                              <div className="space-y-2">
                                <Label>Link Color</Label>
                                <div className="flex gap-2">
                                  <Input
                                    type="color"
                                    value={design.linkColor}
                                    onChange={(e) => updateDesign({ linkColor: e.target.value })}
                                    className="w-12 h-10 p-1"
                                  />
                                  <Input
                                    value={design.linkColor}
                                    onChange={(e) => updateDesign({ linkColor: e.target.value })}
                                    className="flex-1"
                                  />
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Typography & Layout Section */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-base">Typography & Layout</CardTitle>
                            <CardDescription>Font and spacing settings</CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="space-y-2">
                              <Label>Font Family</Label>
                              <Select
                                value={design.fontFamily}
                                onValueChange={(value) => updateDesign({ fontFamily: value })}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {FONT_OPTIONS.map((font) => (
                                    <SelectItem key={font.value} value={font.value}>
                                      {font.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-2">
                              <Label>Font Size: {design.fontSize}px</Label>
                              <Slider
                                value={[parseInt(design.fontSize)]}
                                min={10}
                                max={18}
                                step={1}
                                onValueChange={([value]) => updateDesign({ fontSize: value.toString() })}
                              />
                            </div>

                            <div className="space-y-2">
                              <Label>Border Radius: {design.borderRadius}px</Label>
                              <Slider
                                value={[parseInt(design.borderRadius)]}
                                min={0}
                                max={24}
                                step={1}
                                onValueChange={([value]) => updateDesign({ borderRadius: value.toString() })}
                              />
                            </div>

                            <div className="space-y-2">
                              <Label>Shadow</Label>
                              <Select
                                value={design.shadow}
                                onValueChange={(value) => updateDesign({ shadow: value })}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {SHADOW_OPTIONS.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                      {option.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-2">
                              <Label>Text Alignment</Label>
                              <Select
                                value={design.textAlignment}
                                onValueChange={(value) => updateDesign({ textAlignment: value })}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="left">Left</SelectItem>
                                  <SelectItem value="center">Center</SelectItem>
                                  <SelectItem value="right">Right</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Position & Animation Section */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-base">Position & Animation</CardTitle>
                            <CardDescription>Display location and effects</CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="space-y-2">
                              <Label>Position</Label>
                              <Select
                                value={design.position}
                                onValueChange={(value) => updateDesign({ position: value })}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {POSITION_OPTIONS.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                      {option.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-2">
                              <Label>Animation</Label>
                              <Select
                                value={design.animation}
                                onValueChange={(value) => updateDesign({ animation: value })}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {ANIMATION_OPTIONS.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                      {option.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Content Alignment */}
                            <ContentAlignmentSelector
                              value={design.contentAlignment as ContentAlignment}
                              onChange={(value) => updateDesign({ contentAlignment: value })}
                            />
                          </CardContent>
                        </Card>
                      </div>
                    </TabsContent>

                    {/* Rules Tab */}
                    <TabsContent value="rules" className="mt-0">
                      <RulesTargeting
                        rules={rules}
                        onChange={setRules}
                      />
                    </TabsContent>
                  </div>
                </ScrollArea>
              </Tabs>
            </div>

            {/* Right Panel - Live Preview (hidden on smaller screens) */}
            <div className="hidden lg:flex w-72 shrink-0 flex-col gap-4">
              <Card className="flex-1">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    Live Preview
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Preview updates in real-time
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <LiveNotificationPreview design={design} />
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        <div className="flex justify-between gap-3 pt-4 border-t mt-auto shrink-0">
          <Button variant="outline" onClick={resetToDefault} disabled={saving}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
