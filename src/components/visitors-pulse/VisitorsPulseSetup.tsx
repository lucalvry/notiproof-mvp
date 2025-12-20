import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Check, Loader2, Info, Zap, Palette } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface VisitorsPulseSetupProps {
  websiteId: string;
}

// Template style options matching the LiveVisitorConfig
const TEMPLATE_STYLES = [
  { id: 'social_proof', name: 'Social Proof Card', icon: '👥', description: 'Clean icon + text layout' },
  { id: 'compact', name: 'Compact Badge', icon: '👀', description: 'Minimal pill style' },
  { id: 'animated', name: 'Live Counter', icon: '🔴', description: 'Pulsing live indicator' },
  { id: 'urgency', name: 'Urgency Banner', icon: '🔥', description: 'Bold attention-grabbing' },
  { id: 'detailed', name: 'Location Rich', icon: '🌍', description: 'Shows visitor locations' },
];

const ICON_OPTIONS = ['👥', '👀', '🔥', '⚡', '🌟', '✨', '💫', '🚀', '📈', '🎯', '🌍', '💪'];

interface VisitorsPulseConfig {
  enabled: boolean;
  trackingScope: "all" | "specific";
  specificPages: string[];
  minVisitors: number;
  maxVisitors: number;
  updateFrequency: number;
  showLocation: boolean;
  locationLevel: "country" | "region" | "city";
  // New customization fields
  templateStyle: string;
  messageTemplate: string;
  icon: string;
}

export function VisitorsPulseSetup({ websiteId }: VisitorsPulseSetupProps) {
  const [config, setConfig] = useState<VisitorsPulseConfig>({
    enabled: false,
    trackingScope: "all",
    specificPages: [],
    minVisitors: 5,
    maxVisitors: 50,
    updateFrequency: 30,
    showLocation: true,
    locationLevel: "country",
    // New defaults
    templateStyle: "social_proof",
    messageTemplate: "{{count}} people are viewing this page",
    icon: "👥",
  });
  const [saving, setSaving] = useState(false);
  const [existingConfig, setExistingConfig] = useState<any>(null);
  const [newPage, setNewPage] = useState("");
  const [showCustomization, setShowCustomization] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, [websiteId]);

  const fetchConfig = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("integrations")
        .select("*")
        .eq("website_id", websiteId)
        .eq("provider", "live_visitors")
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;

      if (data) {
        setExistingConfig(data);
        const credentials = data.credentials as any;
        setConfig({
          enabled: data.is_active || false,
          trackingScope: credentials?.trackingScope || "all",
          specificPages: credentials?.specificPages || [],
          minVisitors: credentials?.minVisitors || 5,
          maxVisitors: credentials?.maxVisitors || 50,
          updateFrequency: credentials?.updateFrequency || 30,
          showLocation: credentials?.showLocation ?? true,
          locationLevel: credentials?.locationLevel || "country",
          // New fields
          templateStyle: credentials?.templateStyle || "social_proof",
          messageTemplate: credentials?.messageTemplate || "{{count}} people are viewing this page",
          icon: credentials?.icon || "👥",
        });
      }
    } catch (error) {
      console.error("Error fetching config:", error);
      toast.error("Failed to load configuration");
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const integrationData = {
        website_id: websiteId,
        user_id: user.id,
        provider: "live_visitors",
        name: "Visitors Pulse",
        is_active: config.enabled,
        credentials: {
          trackingScope: config.trackingScope,
          specificPages: config.specificPages,
          minVisitors: config.minVisitors,
          maxVisitors: config.maxVisitors,
          updateFrequency: config.updateFrequency,
          showLocation: config.showLocation,
          locationLevel: config.locationLevel,
          // New fields
          templateStyle: config.templateStyle,
          messageTemplate: config.messageTemplate,
          icon: config.icon,
        },
      };

      if (existingConfig) {
        const { error } = await supabase
          .from("integrations")
          .update(integrationData)
          .eq("id", existingConfig.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("integrations")
          .insert(integrationData)
          .select()
          .single();
        if (error) throw error;
        setExistingConfig(data);
      }

      toast.success("Configuration saved successfully");
    } catch (error) {
      console.error("Error saving config:", error);
      toast.error("Failed to save configuration");
    } finally {
      setSaving(false);
    }
  };

  const addPage = () => {
    if (newPage && !config.specificPages.includes(newPage)) {
      setConfig(prev => ({
        ...prev,
        specificPages: [...prev.specificPages, newPage],
      }));
      setNewPage("");
    }
  };

  const removePage = (page: string) => {
    setConfig(prev => ({
      ...prev,
      specificPages: prev.specificPages.filter(p => p !== page),
    }));
  };

  // Get preview message
  const getPreviewMessage = () => {
    const previewCount = Math.floor(Math.random() * (config.maxVisitors - config.minVisitors) + config.minVisitors);
    return config.messageTemplate
      .replace('{{count}}', previewCount.toString())
      .replace('{{location}}', 'United States');
  };

  const selectedStyle = TEMPLATE_STYLES.find(t => t.id === config.templateStyle) || TEMPLATE_STYLES[0];

  return (
    <div className="space-y-6">
      {/* Enable Toggle */}
      <div className="flex items-center justify-between p-4 border rounded-lg">
        <div className="space-y-0.5">
          <Label className="text-base font-medium">Enable Visitors Pulse</Label>
          <p className="text-sm text-muted-foreground">
            Track and display real-time visitor counts on your website
          </p>
        </div>
        <Switch
          checked={config.enabled}
          onCheckedChange={(checked) => setConfig(prev => ({ ...prev, enabled: checked }))}
        />
      </div>

      {config.enabled && (
        <>
          {/* Save Prompt for new configs */}
          {!existingConfig && (
            <Card className="border-primary bg-primary/5">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Check className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">Almost ready!</p>
                      <p className="text-sm text-muted-foreground">
                        Save your configuration to start tracking visitors
                      </p>
                    </div>
                  </div>
                  <Button onClick={handleSave} disabled={saving}>
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save & Continue"
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Template Style Selection */}
          <div className="space-y-3">
            <Label className="text-base">Notification Style</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {TEMPLATE_STYLES.map((style) => (
                <button
                  key={style.id}
                  type="button"
                  onClick={() => setConfig(prev => ({ ...prev, templateStyle: style.id }))}
                  className={cn(
                    "p-4 rounded-lg border-2 text-left transition-all hover:border-primary/50",
                    config.templateStyle === style.id 
                      ? "border-primary bg-primary/5" 
                      : "border-border hover:bg-muted/50"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{style.icon}</span>
                    <div>
                      <div className="font-medium text-sm">{style.name}</div>
                      <div className="text-xs text-muted-foreground">{style.description}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Message & Icon Customization */}
          <Collapsible open={showCustomization} onOpenChange={setShowCustomization}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full gap-2">
                <Palette className="h-4 w-4" />
                Customize Message & Icon
              </Button>
            </CollapsibleTrigger>
            
            <CollapsibleContent className="space-y-4 mt-4 pt-4 border-t">
              {/* Message Template */}
              <div className="space-y-2">
                <Label>Message Template</Label>
                <Textarea
                  value={config.messageTemplate}
                  onChange={(e) => setConfig(prev => ({ ...prev, messageTemplate: e.target.value }))}
                  placeholder="{{count}} people are viewing this page"
                  className="min-h-[80px]"
                />
                <p className="text-xs text-muted-foreground">
                  Use <code className="bg-muted px-1 rounded">{'{{count}}'}</code> for visitor count
                </p>
              </div>
              
              {/* Icon Selector */}
              <div className="space-y-2">
                <Label>Icon</Label>
                <div className="flex flex-wrap gap-2">
                  {ICON_OPTIONS.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setConfig(prev => ({ ...prev, icon }))}
                      className={cn(
                        "w-10 h-10 rounded-lg border-2 flex items-center justify-center text-xl transition-all",
                        config.icon === icon 
                          ? "border-primary bg-primary/10" 
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Preview Section */}
          <Card className="border-dashed border-2 overflow-hidden">
            <CardContent className="p-0">
              <div className="bg-background border rounded-lg m-4 p-4 shadow-md">
                <div className="flex items-center gap-4">
                  {/* Media/Icon Side */}
                  <div className={cn(
                    "flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-2xl",
                    config.templateStyle === 'animated' && "relative",
                    config.templateStyle === 'urgency' 
                      ? "bg-gradient-to-br from-orange-500 to-red-500" 
                      : "bg-gradient-to-br from-primary/20 to-primary/40"
                  )}>
                    {config.templateStyle === 'animated' && (
                      <span className="absolute top-0 right-0 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                    )}
                    <span>{config.icon}</span>
                  </div>
                  
                  {/* Text Side */}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-foreground">
                      {getPreviewMessage()}
                    </div>
                    {config.showLocation && (
                      <div className="text-sm text-muted-foreground mt-0.5">
                        from United States, Canada & more
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="px-4 pb-3 text-center">
                <p className="text-xs text-muted-foreground">
                  Live preview • Updates every {config.updateFrequency}s
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Tracking Scope */}
          <div className="space-y-3">
            <Label>Tracking Scope</Label>
            <Select
              value={config.trackingScope}
              onValueChange={(value: "all" | "specific") => 
                setConfig(prev => ({ ...prev, trackingScope: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Pages</SelectItem>
                <SelectItem value="specific">Specific Pages Only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {config.trackingScope === "specific" && (
            <div className="space-y-3">
              <Label>Pages to Track</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="/pricing, /checkout, etc."
                  value={newPage}
                  onChange={(e) => setNewPage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addPage()}
                />
                <Button onClick={addPage} variant="secondary">Add</Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {config.specificPages.map((page) => (
                  <Badge
                    key={page}
                    variant="secondary"
                    className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                    onClick={() => removePage(page)}
                  >
                    {page} ×
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Visitor Count Range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Minimum Visitors to Show</Label>
              <Input
                type="number"
                min={1}
                value={config.minVisitors}
                onChange={(e) => setConfig(prev => ({ 
                  ...prev, 
                  minVisitors: parseInt(e.target.value) || 1 
                }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Maximum Display Count</Label>
              <Input
                type="number"
                min={1}
                value={config.maxVisitors}
                onChange={(e) => setConfig(prev => ({ 
                  ...prev, 
                  maxVisitors: parseInt(e.target.value) || 100 
                }))}
              />
            </div>
          </div>

          {/* Update Frequency */}
          <div className="space-y-2">
            <Label>Update Frequency</Label>
            <Select
              value={config.updateFrequency.toString()}
              onValueChange={(value) => 
                setConfig(prev => ({ ...prev, updateFrequency: parseInt(value) }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">Every 15 seconds</SelectItem>
                <SelectItem value="30">Every 30 seconds</SelectItem>
                <SelectItem value="60">Every minute</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Location Settings */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-0.5">
              <Label>Show Visitor Location</Label>
              <p className="text-sm text-muted-foreground">
                Display geographic information in notifications
              </p>
            </div>
            <Switch
              checked={config.showLocation}
              onCheckedChange={(checked) => 
                setConfig(prev => ({ ...prev, showLocation: checked }))
              }
            />
          </div>

          {/* How it works */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>How it works:</strong> Our tracking script monitors active sessions on your site. 
              When the visitor count meets your threshold, notifications automatically display to other visitors, 
              creating social proof and urgency.
            </AlertDescription>
          </Alert>
        </>
      )}

      {/* Save Button */}
      {existingConfig && (
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
