import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Slider } from "@/components/ui/slider";
import { Users, ChevronDown, Settings, Plus, Trash2, ExternalLink, Paintbrush, AlertTriangle, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ContentAlignmentSelector, ContentAlignment } from "@/components/campaigns/ContentAlignmentSelector";
import { 
  URGENCY_LEVELS, 
  UrgencyLevel, 
  MESSAGE_PRESETS, 
  getSuggestedIcon,
  ICON_OPTIONS,
  DESTINATION_PAGE_PRESETS,
  DestinationPage,
  SIMULATED_COUNTRIES,
  TIME_AGO_OPTIONS,
  generateRuleId,
} from "@/lib/visitorsPulsePresets";

// Shadow options
const SHADOW_OPTIONS = [
  { id: 'none', name: 'None', value: 'none' },
  { id: 'sm', name: 'Small', value: '0 1px 2px 0 rgb(0 0 0 / 0.05)' },
  { id: 'md', name: 'Medium', value: '0 4px 6px -1px rgb(0 0 0 / 0.1)' },
  { id: 'lg', name: 'Large', value: '0 10px 15px -3px rgb(0 0 0 / 0.1)' },
  { id: 'xl', name: 'Extra Large', value: '0 20px 25px -5px rgb(0 0 0 / 0.1)' },
];

const FONT_OPTIONS = [
  { id: 'system-ui', name: 'System Default' },
  { id: 'Inter, sans-serif', name: 'Inter' },
  { id: 'Arial, sans-serif', name: 'Arial' },
  { id: 'Georgia, serif', name: 'Georgia' },
  { id: 'Helvetica, sans-serif', name: 'Helvetica' },
];

interface LiveVisitorConfigProps {
  config: {
    mode: 'real' | 'simulated';
    scope: 'site' | 'page';
    min_count: number;
    max_count: number;
    variance_percent: number;
    update_interval_seconds: number;
    target_pages?: string[];
    template_style?: string;
    message_template?: string;
    icon?: string;
    show_location?: boolean;
    urgency_level?: UrgencyLevel;
    page_rules?: any[];
    excluded_pages?: string[];
    show_verification_badge?: boolean;
    content_alignment?: ContentAlignment;
    destination_pages?: DestinationPage[];
    // Styling options
    backgroundColor?: string;
    textColor?: string;
    linkColor?: string;
    fontSize?: number;
    fontFamily?: string;
    borderRadius?: number;
    borderWidth?: number;
    borderColor?: string;
    shadow?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  };
  onChange: (config: any) => void;
}

export function LiveVisitorConfig({ config, onChange }: LiveVisitorConfigProps) {
  const safeConfig = {
    mode: config.mode || 'simulated',
    scope: config.scope || 'site',
    min_count: config.min_count ?? 5,
    max_count: config.max_count ?? 50,
    variance_percent: config.variance_percent ?? 30,
    update_interval_seconds: config.update_interval_seconds ?? 10,
    target_pages: config.target_pages || [],
    template_style: config.template_style || 'social_proof',
    message_template: config.message_template || 'Someone from {{country}} just viewed {{page_name}}',
    icon: config.icon || '👥',
    show_location: config.show_location ?? true,
    urgency_level: (config.urgency_level || 'social_proof') as UrgencyLevel,
    page_rules: config.page_rules || [],
    excluded_pages: config.excluded_pages || [],
    show_verification_badge: config.show_verification_badge ?? true,
    content_alignment: config.content_alignment || 'top',
    destination_pages: config.destination_pages || [],
    backgroundColor: config.backgroundColor || '#ffffff',
    textColor: config.textColor || '#1a1a1a',
    linkColor: config.linkColor || '#667eea',
    fontSize: config.fontSize ?? 14,
    fontFamily: config.fontFamily || 'system-ui',
    borderRadius: config.borderRadius ?? 12,
    borderWidth: config.borderWidth ?? 0,
    borderColor: config.borderColor || '#e5e7eb',
    shadow: config.shadow || 'md',
  };

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showStyling, setShowStyling] = useState(false);
  const [previewCountry] = useState(() => SIMULATED_COUNTRIES[Math.floor(Math.random() * SIMULATED_COUNTRIES.length)]);
  const [previewTimeAgo] = useState(() => TIME_AGO_OPTIONS[Math.floor(Math.random() * TIME_AGO_OPTIONS.length)]);
  const [previewCount] = useState(() => Math.floor(Math.random() * (safeConfig.max_count - safeConfig.min_count) + safeConfig.min_count));

  const selectedUrgency = URGENCY_LEVELS.find(u => u.id === safeConfig.urgency_level) || URGENCY_LEVELS[1];
  const currentIconOptions = ICON_OPTIONS[safeConfig.urgency_level] || ICON_OPTIONS.social_proof;

  const getShadowValue = (shadowId: string) => SHADOW_OPTIONS.find(s => s.id === shadowId)?.value || 'none';

  // --- Destination Pages ---
  const addDestinationPage = (preset?: { name: string; url: string }) => {
    const newPage: DestinationPage = {
      id: generateRuleId(),
      name: preset?.name || '',
      url: preset?.url || '',
      enabled: true,
    };
    onChange({ ...safeConfig, destination_pages: [...safeConfig.destination_pages, newPage] });
  };

  const updateDestinationPage = (id: string, field: keyof DestinationPage, value: any) => {
    onChange({
      ...safeConfig,
      destination_pages: safeConfig.destination_pages.map(p =>
        p.id === id ? { ...p, [field]: value } : p
      ),
    });
  };

  const removeDestinationPage = (id: string) => {
    onChange({ ...safeConfig, destination_pages: safeConfig.destination_pages.filter(p => p.id !== id) });
  };

  // --- Preview ---
  const getPreviewMessage = () => {
    const destPage = safeConfig.destination_pages.find(p => p.enabled);
    const pageName = destPage?.name || 'Pricing Plans';
    const pageUrl = destPage?.url || '/pricing';

    const template = destPage?.message_override || safeConfig.message_template;
    const rendered = template
      .replace(/\{\{country\}\}/g, previewCountry)
      .replace(/\{\{count\}\}/g, previewCount.toString())
      .replace(/\{\{time_ago\}\}/g, previewTimeAgo)
      .replace(
        /\{\{page_name\}\}/g,
        `<a href="${pageUrl}" style="color: ${safeConfig.linkColor}; text-decoration: underline; font-weight: 600;">${pageName}</a>`
      );
    return rendered;
  };

  const handleUrgencyChange = (urgency: UrgencyLevel) => {
    const icon = getSuggestedIcon(urgency);
    const messages = MESSAGE_PRESETS[urgency];
    onChange({
      ...safeConfig,
      urgency_level: urgency,
      icon,
      message_template: messages[0],
    });
  };

  // Which presets are already added
  const addedUrls = new Set(safeConfig.destination_pages.map(p => p.url));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Active Visitors Setup
        </CardTitle>
        <CardDescription>
          Drive visitors to your high-value pages with social proof notifications
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">

        {/* SECTION 1: Destination Pages */}
        <div className="space-y-3">
          <div>
            <Label className="text-base font-semibold">Destination Pages</Label>
            <p className="text-sm text-muted-foreground mt-0.5">
              Choose which pages to promote. Notifications will link visitors to these pages.
            </p>
          </div>

          {/* Quick-add presets */}
          <div className="flex flex-wrap gap-2">
            {DESTINATION_PAGE_PRESETS.filter(p => !addedUrls.has(p.url)).slice(0, 6).map((preset) => (
              <Button
                key={preset.url}
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={() => addDestinationPage(preset)}
              >
                <span>{preset.icon}</span>
                {preset.name}
                <Plus className="h-3 w-3 ml-0.5" />
              </Button>
            ))}
          </div>

          {/* Added destination pages */}
          {safeConfig.destination_pages.length === 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Add at least one destination page. Without it, notifications won't have a meaningful link.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            {safeConfig.destination_pages.map((page) => (
              <div key={page.id} className="flex items-start gap-2 p-3 rounded-lg border bg-card">
                <div className="flex-1 grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">Page Name</Label>
                    <Input
                      value={page.name}
                      onChange={(e) => updateDestinationPage(page.id, 'name', e.target.value)}
                      placeholder="e.g. Pricing Plans"
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Page URL</Label>
                    <Input
                      value={page.url}
                      onChange={(e) => updateDestinationPage(page.id, 'url', e.target.value)}
                      placeholder="e.g. /pricing"
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 mt-5 text-muted-foreground hover:text-destructive"
                  onClick={() => removeDestinationPage(page.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full gap-2"
            onClick={() => addDestinationPage()}
          >
            <Plus className="h-4 w-4" />
            Add Custom Page
          </Button>
        </div>

        {/* SECTION 2: Notification Tone */}
        <div className="space-y-3">
          <Label className="text-base font-semibold">Notification Tone</Label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {URGENCY_LEVELS.map((urgency) => (
              <button
                key={urgency.id}
                type="button"
                onClick={() => handleUrgencyChange(urgency.id)}
                className={cn(
                  "p-3 rounded-lg border-2 text-center transition-all hover:border-primary/50",
                  safeConfig.urgency_level === urgency.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted/50"
                )}
              >
                <span className="text-xl block mb-1">{urgency.icon}</span>
                <span className="text-xs font-medium block">{urgency.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* SECTION 3: Message Template */}
        <div className="space-y-2">
          <Label className="text-base font-semibold">Message Template</Label>
          <Select
            value={safeConfig.message_template}
            onValueChange={(v) => onChange({ ...safeConfig, message_template: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose a message style" />
            </SelectTrigger>
            <SelectContent>
              {(MESSAGE_PRESETS[safeConfig.urgency_level] || MESSAGE_PRESETS.social_proof).map((msg) => (
                <SelectItem key={msg} value={msg}>{msg}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            value={safeConfig.message_template}
            onChange={(e) => onChange({ ...safeConfig, message_template: e.target.value })}
            placeholder="Someone from {{country}} just viewed {{page_name}}"
            className="text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Variables: <code className="bg-muted px-1 rounded">{'{{page_name}}'}</code>{' '}
            <code className="bg-muted px-1 rounded">{'{{country}}'}</code>{' '}
            <code className="bg-muted px-1 rounded">{'{{count}}'}</code>{' '}
            <code className="bg-muted px-1 rounded">{'{{time_ago}}'}</code>
          </p>
        </div>

        {/* SECTION 4: Icon Picker */}
        <div className="space-y-2">
          <Label>Icon</Label>
          <div className="flex flex-wrap gap-2">
            {currentIconOptions.map((icon) => (
              <button
                key={icon}
                type="button"
                onClick={() => onChange({ ...safeConfig, icon })}
                className={cn(
                  "w-10 h-10 rounded-lg border-2 flex items-center justify-center text-xl transition-all",
                  safeConfig.icon === icon
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50"
                )}
              >
                {icon}
              </button>
            ))}
          </div>
        </div>

        {/* SECTION 5: Visitor Count Range */}
        <div className="space-y-3">
          <Label className="text-base font-semibold">Visitor Count Range</Label>
          <p className="text-sm text-muted-foreground -mt-1">
            Used when the message includes <code className="bg-muted px-1 rounded">{'{{count}}'}</code>
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Minimum</Label>
              <Select
                value={safeConfig.min_count.toString()}
                onValueChange={(v) => {
                  const min = parseInt(v);
                  onChange({ ...safeConfig, min_count: min, max_count: Math.max(safeConfig.max_count, min + 5) });
                }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3</SelectItem>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Maximum</Label>
              <Select
                value={safeConfig.max_count.toString()}
                onValueChange={(v) => onChange({ ...safeConfig, max_count: parseInt(v) })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15</SelectItem>
                  <SelectItem value="30">30</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                  <SelectItem value="200">200</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* SECTION 6: Content Alignment */}
        <ContentAlignmentSelector
          value={safeConfig.content_alignment}
          onChange={(alignment) => onChange({ ...safeConfig, content_alignment: alignment })}
        />

        {/* LIVE PREVIEW */}
        <Card className="bg-muted/50 border-dashed overflow-hidden">
          <CardContent className="p-0">
            <div className="px-4 pt-3 pb-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Live Preview</p>
            </div>
            <div
              className={cn("m-4 mt-2 p-4 transition-all", selectedUrgency.animation === 'pulse' && "animate-pulse")}
              style={{
                backgroundColor: safeConfig.backgroundColor,
                borderRadius: `${safeConfig.borderRadius}px`,
                border: `${safeConfig.borderWidth}px solid ${safeConfig.borderColor}`,
                boxShadow: getShadowValue(safeConfig.shadow),
                fontFamily: safeConfig.fontFamily,
                fontSize: `${safeConfig.fontSize}px`,
                color: safeConfig.textColor,
              }}
            >
              <div className={cn(
                "flex gap-4",
                safeConfig.content_alignment === 'top' && "items-start",
                safeConfig.content_alignment === 'center' && "items-center",
                safeConfig.content_alignment === 'bottom' && "items-end"
              )}>
                <div className={cn(
                  "flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-2xl",
                  `bg-gradient-to-br ${selectedUrgency.colorClass}`
                )}>
                  <span>{safeConfig.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div
                    className="font-semibold"
                    style={{ color: safeConfig.textColor, fontSize: `${safeConfig.fontSize}px` }}
                    dangerouslySetInnerHTML={{ __html: getPreviewMessage() }}
                  />
                  <div className="mt-0.5 opacity-60" style={{ fontSize: `${Math.max(safeConfig.fontSize - 2, 11)}px` }}>
                    {previewTimeAgo}
                  </div>
                  {safeConfig.show_verification_badge && (
                    <div className="flex items-center gap-1 mt-1.5" style={{ fontSize: `${Math.max(safeConfig.fontSize - 3, 10)}px`, color: '#16a34a' }}>
                      <span>✓</span>
                      <span>NotiProof Verified</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="px-4 pb-3 text-center">
              <p className="text-xs text-muted-foreground">
                Notifications cycle through your destination pages
              </p>
            </div>
          </CardContent>
        </Card>

        {/* COLLAPSED: Styling */}
        <Collapsible open={showStyling} onOpenChange={setShowStyling}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full gap-2 justify-between">
              <span className="flex items-center gap-2">
                <Paintbrush className="h-4 w-4" />
                Appearance & Styling
              </span>
              <ChevronDown className={cn("h-4 w-4 transition-transform", showStyling && "rotate-180")} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 mt-4 pt-4 border-t">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm">Background</Label>
                <div className="flex gap-2">
                  <input type="color" value={safeConfig.backgroundColor} onChange={(e) => onChange({ ...safeConfig, backgroundColor: e.target.value })} className="w-8 h-8 rounded cursor-pointer" />
                  <Input value={safeConfig.backgroundColor} onChange={(e) => onChange({ ...safeConfig, backgroundColor: e.target.value })} className="h-8 text-sm flex-1" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Text Color</Label>
                <div className="flex gap-2">
                  <input type="color" value={safeConfig.textColor} onChange={(e) => onChange({ ...safeConfig, textColor: e.target.value })} className="w-8 h-8 rounded cursor-pointer" />
                  <Input value={safeConfig.textColor} onChange={(e) => onChange({ ...safeConfig, textColor: e.target.value })} className="h-8 text-sm flex-1" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Link Color</Label>
                <div className="flex gap-2">
                  <input type="color" value={safeConfig.linkColor} onChange={(e) => onChange({ ...safeConfig, linkColor: e.target.value })} className="w-8 h-8 rounded cursor-pointer" />
                  <Input value={safeConfig.linkColor} onChange={(e) => onChange({ ...safeConfig, linkColor: e.target.value })} className="h-8 text-sm flex-1" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Border Color</Label>
                <div className="flex gap-2">
                  <input type="color" value={safeConfig.borderColor} onChange={(e) => onChange({ ...safeConfig, borderColor: e.target.value })} className="w-8 h-8 rounded cursor-pointer" />
                  <Input value={safeConfig.borderColor} onChange={(e) => onChange({ ...safeConfig, borderColor: e.target.value })} className="h-8 text-sm flex-1" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm">Font Size ({safeConfig.fontSize}px)</Label>
                <Slider value={[safeConfig.fontSize]} onValueChange={([v]) => onChange({ ...safeConfig, fontSize: v })} min={11} max={18} step={1} />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Border Radius ({safeConfig.borderRadius}px)</Label>
                <Slider value={[safeConfig.borderRadius]} onValueChange={([v]) => onChange({ ...safeConfig, borderRadius: v })} min={0} max={24} step={1} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm">Font Family</Label>
                <Select value={safeConfig.fontFamily} onValueChange={(v) => onChange({ ...safeConfig, fontFamily: v })}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FONT_OPTIONS.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Shadow</Label>
                <Select value={safeConfig.shadow} onValueChange={(v: any) => onChange({ ...safeConfig, shadow: v })}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SHADOW_OPTIONS.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Border Width ({safeConfig.borderWidth}px)</Label>
              <Slider value={[safeConfig.borderWidth]} onValueChange={([v]) => onChange({ ...safeConfig, borderWidth: v })} min={0} max={4} step={1} />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm">Verification Badge</Label>
                <p className="text-xs text-muted-foreground">
                  Show <span className="font-medium text-foreground">✓ NotiProof Verified</span> below message
                </p>
              </div>
              <input type="checkbox" checked={safeConfig.show_verification_badge} onChange={(e) => onChange({ ...safeConfig, show_verification_badge: e.target.checked })} className="h-4 w-4" />
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* COLLAPSED: Advanced Options */}
        <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full gap-2 justify-between">
              <span className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Advanced Options
              </span>
              <ChevronDown className={cn("h-4 w-4 transition-transform", showAdvanced && "rotate-180")} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 mt-4 pt-4 border-t">
            <div className="space-y-2">
              <Label className="text-sm">Data Source</Label>
              <Select value={safeConfig.mode} onValueChange={(v: any) => onChange({ ...safeConfig, mode: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="simulated">Simulated (Recommended)</SelectItem>
                  <SelectItem value="real">Real Analytics (Requires GA4)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {safeConfig.mode === 'simulated'
                  ? 'Shows realistic visitor counts and countries to create social proof'
                  : 'Uses real data from Google Analytics 4 integration'}
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Update Frequency</Label>
              <Select value={safeConfig.update_interval_seconds.toString()} onValueChange={(v) => onChange({ ...safeConfig, update_interval_seconds: parseInt(v) })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">Every 10 seconds</SelectItem>
                  <SelectItem value="30">Every 30 seconds</SelectItem>
                  <SelectItem value="60">Every 60 seconds</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Page Targeting */}
            <div className="space-y-4 pt-2 border-t">
              <div>
                <Label className="text-sm font-semibold flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Page Targeting
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Control which pages this notification appears on. Use one path per line. Supports <code className="bg-muted px-1 rounded">*</code> wildcards (e.g. <code className="bg-muted px-1 rounded">/blog/*</code>).
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Show only on these pages</Label>
                <Textarea
                  placeholder={"Leave empty to show on all pages\n/pricing\n/products/*"}
                  value={(safeConfig.target_pages || []).join('\n')}
                  onChange={(e) => onChange({
                    ...safeConfig,
                    target_pages: e.target.value.split('\n').map(s => s.trim()).filter(Boolean),
                    scope: e.target.value.trim() ? 'page' : 'site',
                  })}
                  className="text-sm font-mono min-h-[80px]"
                />
                <p className="text-xs text-muted-foreground">If empty, shows on all pages (subject to exclusions below).</p>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Hide on these pages</Label>
                <Textarea
                  placeholder={"/checkout\n/account/*\n/admin/*"}
                  value={(safeConfig.excluded_pages || []).join('\n')}
                  onChange={(e) => onChange({
                    ...safeConfig,
                    excluded_pages: e.target.value.split('\n').map(s => s.trim()).filter(Boolean),
                  })}
                  className="text-sm font-mono min-h-[80px]"
                />
                <p className="text-xs text-muted-foreground">Notifications will never show on these pages, even if matched above.</p>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
