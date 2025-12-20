import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Slider } from "@/components/ui/slider";
import { Users, ChevronDown, Settings, Info, AlertTriangle, Palette, Target, Paintbrush } from "lucide-react";
import { cn } from "@/lib/utils";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { PageRulesEditor } from "@/components/visitors-pulse/PageRulesEditor";
import { ContentAlignmentSelector, ContentAlignment } from "@/components/campaigns/ContentAlignmentSelector";
import { 
  URGENCY_LEVELS, 
  UrgencyLevel, 
  MESSAGE_PRESETS, 
  getSuggestedIcon,
  PageRule,
  ICON_OPTIONS,
} from "@/lib/visitorsPulsePresets";

// Template style options
const TEMPLATE_STYLES = [
  { id: 'social_proof', name: 'Social Proof Card', icon: '👥' },
  { id: 'compact', name: 'Compact Badge', icon: '👀' },
  { id: 'animated', name: 'Live Counter', icon: '🔴' },
  { id: 'urgency', name: 'Urgency Banner', icon: '🔥' },
  { id: 'detailed', name: 'Location Rich', icon: '🌍' },
];

// Shadow options
const SHADOW_OPTIONS = [
  { id: 'none', name: 'None', value: 'none' },
  { id: 'sm', name: 'Small', value: '0 1px 2px 0 rgb(0 0 0 / 0.05)' },
  { id: 'md', name: 'Medium', value: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' },
  { id: 'lg', name: 'Large', value: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)' },
  { id: 'xl', name: 'Extra Large', value: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)' },
];

// Font family options
const FONT_OPTIONS = [
  { id: 'system-ui', name: 'System Default' },
  { id: 'Inter, sans-serif', name: 'Inter' },
  { id: 'Arial, sans-serif', name: 'Arial' },
  { id: 'Georgia, serif', name: 'Georgia' },
  { id: 'Helvetica, sans-serif', name: 'Helvetica' },
];

// Legacy icon options for backward compatibility
const LEGACY_ICON_OPTIONS = ['👥', '👀', '🔥', '⚡', '🌟', '✨', '💫', '🚀', '📈', '🎯', '🌍', '💪'];

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
    page_rules?: PageRule[];
    excluded_pages?: string[];
    show_verification_badge?: boolean;
    verification_text?: string;
    content_alignment?: ContentAlignment;
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
    mode: config.mode || 'real',
    scope: config.scope || 'site',
    min_count: config.min_count ?? 5,
    max_count: config.max_count ?? 50,
    variance_percent: config.variance_percent ?? 30,
    update_interval_seconds: config.update_interval_seconds ?? 30,
    target_pages: config.target_pages || [],
    template_style: config.template_style || 'social_proof',
    message_template: config.message_template || '{{count}} visitors in the last hour',
    icon: config.icon || '👥',
    show_location: config.show_location ?? true,
    urgency_level: config.urgency_level || 'social_proof' as UrgencyLevel,
    page_rules: config.page_rules || [],
    excluded_pages: config.excluded_pages || [],
    show_verification_badge: config.show_verification_badge ?? true,
    verification_text: config.verification_text || 'Real-time data',
    content_alignment: config.content_alignment || 'top',
    // Styling defaults
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
  
  const [previewCount] = useState(() => Math.floor(Math.random() * (safeConfig.max_count - safeConfig.min_count) + safeConfig.min_count));
  const [showDisplayStyle, setShowDisplayStyle] = useState(false);
  const [showTonePresets, setShowTonePresets] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showStyling, setShowStyling] = useState(false);
  const [showPageRules, setShowPageRules] = useState(safeConfig.page_rules.length > 0 || safeConfig.excluded_pages.length > 0);

  const getShadowValue = (shadowId: string) => {
    return SHADOW_OPTIONS.find(s => s.id === shadowId)?.value || 'none';
  };

  const getPreviewMessage = () => {
    let message = safeConfig.message_template
      .replace('{{count}}', previewCount.toString())
      .replace('{{location}}', 'United States');
    
    // Handle hyperlinks - parse and style any <a> tags or create links from page placeholders
    message = message.replace(
      /\{\{page_name\}\}/g,
      `<a href="#" style="color: ${safeConfig.linkColor}; font-size: inherit; text-decoration: underline; font-weight: 600;">Your Page</a>`
    );
    
    // Style any existing <a> tags to inherit font-size
    message = message.replace(
      /<a\s+([^>]*)>/gi,
      (match, attrs) => {
        // Remove any existing style attribute and add our styled version
        const cleanAttrs = attrs.replace(/style="[^"]*"/gi, '').trim();
        return `<a ${cleanAttrs} style="color: ${safeConfig.linkColor}; font-size: inherit; text-decoration: underline;">`;
      }
    );
    
    return message;
  };
  
  // Check if message contains HTML (links)
  const messageHasHtml = /<[^>]+>/.test(getPreviewMessage());

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

  const selectedUrgency = URGENCY_LEVELS.find(u => u.id === safeConfig.urgency_level) || URGENCY_LEVELS[1];
  const currentIconOptions = ICON_OPTIONS[safeConfig.urgency_level] || LEGACY_ICON_OPTIONS;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Visitors Pulse Setup
        </CardTitle>
        <CardDescription>
          Show how many people are viewing your site right now.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* PRIMARY: Message & Icon */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-base">Your Message</Label>
            <Textarea
              value={safeConfig.message_template}
              onChange={(e) => onChange({ ...safeConfig, message_template: e.target.value })}
              placeholder="{{count}} people are viewing this page"
              className="min-h-[70px]"
            />
            <p className="text-xs text-muted-foreground">
              Use <code className="bg-muted px-1 rounded">{'{{count}}'}</code> for visitor count
            </p>
          </div>
          
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
        </div>

        {/* PRIMARY: Visitor Count Range */}
        <div className="space-y-3">
          <Label className="text-base">Visitor Count Range</Label>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-normal text-muted-foreground">Minimum</Label>
              <Select 
                value={safeConfig.min_count.toString()} 
                onValueChange={(v) => {
                  const min = parseInt(v);
                  const updatedConfig = { 
                    ...safeConfig, 
                    min_count: min,
                    max_count: Math.max(safeConfig.max_count, min + 5) 
                  };
                  onChange(updatedConfig);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 visitors</SelectItem>
                  <SelectItem value="5">5 visitors</SelectItem>
                  <SelectItem value="10">10 visitors</SelectItem>
                  <SelectItem value="25">25 visitors</SelectItem>
                  <SelectItem value="50">50 visitors</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm font-normal text-muted-foreground">Maximum</Label>
              <Select 
                value={safeConfig.max_count.toString()} 
                onValueChange={(v) => onChange({ ...safeConfig, max_count: parseInt(v) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 visitors</SelectItem>
                  <SelectItem value="30">30 visitors</SelectItem>
                  <SelectItem value="50">50 visitors</SelectItem>
                  <SelectItem value="100">100 visitors</SelectItem>
                  <SelectItem value="200">200 visitors</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* PRIMARY: Content Alignment - Now visible without expanding */}
        <ContentAlignmentSelector
          value={safeConfig.content_alignment}
          onChange={(alignment) => onChange({ ...safeConfig, content_alignment: alignment })}
        />

        {/* Live Preview Card - Dynamic with applied styles */}
        <Card className="bg-muted/50 border-dashed overflow-hidden">
          <CardContent className="p-0">
            <div 
              className={cn(
                "m-4 p-4 transition-all",
                selectedUrgency.animation === 'pulse' && "animate-pulse"
              )}
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
                  safeConfig.template_style === 'animated' && "relative",
                  `bg-gradient-to-br ${selectedUrgency.colorClass}`
                )}>
                  {safeConfig.template_style === 'animated' && (
                    <span className="absolute top-0 right-0 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                  )}
                  <span>{safeConfig.icon}</span>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div 
                    className="font-semibold" 
                    style={{ color: safeConfig.textColor, fontSize: `${safeConfig.fontSize}px` }}
                    dangerouslySetInnerHTML={{ __html: getPreviewMessage() }}
                  />
                  {safeConfig.show_location && (
                    <div className="mt-0.5 opacity-70" style={{ fontSize: `${Math.max(safeConfig.fontSize - 2, 11)}px` }}>
                      from <span style={{ color: safeConfig.linkColor, fontWeight: 600 }}>United States</span>, Canada & more
                    </div>
                  )}
                  {safeConfig.show_verification_badge && (
                    <div className="flex items-center gap-1 mt-1.5" style={{ fontSize: `${Math.max(safeConfig.fontSize - 3, 10)}px`, color: '#16a34a' }}>
                      <span>✓</span>
                      <span>{safeConfig.verification_text}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="px-4 pb-3 text-center">
              <p className="text-xs text-muted-foreground">
                Live preview • Updates every {safeConfig.update_interval_seconds}s
              </p>
            </div>
          </CardContent>
        </Card>

        {/* COLLAPSED: Display Style */}
        <Collapsible open={showDisplayStyle} onOpenChange={setShowDisplayStyle}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full gap-2 justify-between">
              <span className="flex items-center gap-2">
                <Palette className="h-4 w-4" />
                Display Style
              </span>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {TEMPLATE_STYLES.find(s => s.id === safeConfig.template_style)?.name || 'Social Proof'}
                </Badge>
                <ChevronDown className={cn("h-4 w-4 transition-transform", showDisplayStyle && "rotate-180")} />
              </div>
            </Button>
          </CollapsibleTrigger>
          
          <CollapsibleContent className="space-y-4 mt-4 pt-4 border-t">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {TEMPLATE_STYLES.map((style) => (
                <button
                  key={style.id}
                  type="button"
                  onClick={() => onChange({ ...safeConfig, template_style: style.id })}
                  className={cn(
                    "p-3 rounded-lg border-2 text-center transition-all hover:border-primary/50",
                    safeConfig.template_style === style.id 
                      ? "border-primary bg-primary/5" 
                      : "border-border hover:bg-muted/50"
                  )}
                >
                  <span className="text-xl block mb-1">{style.icon}</span>
                  <span className="text-xs font-medium">{style.name}</span>
                </button>
              ))}
            </div>
            
            <div className="flex items-center justify-between pt-2">
              <div className="space-y-0.5">
                <Label className="text-sm">Show Visitor Location</Label>
                <p className="text-xs text-muted-foreground">Display where visitors are from</p>
              </div>
              <input
                type="checkbox"
                checked={safeConfig.show_location}
                onChange={(e) => onChange({ ...safeConfig, show_location: e.target.checked })}
                className="h-4 w-4"
              />
            </div>
            
            <div className="flex items-center justify-between pt-2">
              <div className="space-y-0.5">
                <Label className="text-sm">Show Verification Badge</Label>
                <p className="text-xs text-muted-foreground">Display "Real-time data" trust indicator</p>
              </div>
              <input
                type="checkbox"
                checked={safeConfig.show_verification_badge}
                onChange={(e) => onChange({ ...safeConfig, show_verification_badge: e.target.checked })}
                className="h-4 w-4"
              />
            </div>
            
            {safeConfig.show_verification_badge && (
              <div className="space-y-2 pl-4 border-l-2 border-muted">
                <Label className="text-sm">Verification Text</Label>
                <Input
                  value={safeConfig.verification_text}
                  onChange={(e) => onChange({ ...safeConfig, verification_text: e.target.value })}
                  placeholder="Real-time data"
                  className="h-8 text-sm"
                />
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>

        {/* COLLAPSED: Styling */}
        <Collapsible open={showStyling} onOpenChange={setShowStyling}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full gap-2 justify-between">
              <span className="flex items-center gap-2">
                <Paintbrush className="h-4 w-4" />
                Styling
              </span>
              <ChevronDown className={cn("h-4 w-4 transition-transform", showStyling && "rotate-180")} />
            </Button>
          </CollapsibleTrigger>
          
          <CollapsibleContent className="space-y-4 mt-4 pt-4 border-t">
            {/* Colors */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-sm">Background</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={safeConfig.backgroundColor}
                    onChange={(e) => onChange({ ...safeConfig, backgroundColor: e.target.value })}
                    className="w-8 h-8 rounded border cursor-pointer"
                  />
                  <Input
                    value={safeConfig.backgroundColor}
                    onChange={(e) => onChange({ ...safeConfig, backgroundColor: e.target.value })}
                    className="h-8 text-xs font-mono flex-1"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm">Text Color</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={safeConfig.textColor}
                    onChange={(e) => onChange({ ...safeConfig, textColor: e.target.value })}
                    className="w-8 h-8 rounded border cursor-pointer"
                  />
                  <Input
                    value={safeConfig.textColor}
                    onChange={(e) => onChange({ ...safeConfig, textColor: e.target.value })}
                    className="h-8 text-xs font-mono flex-1"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm">Link Color</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={safeConfig.linkColor}
                    onChange={(e) => onChange({ ...safeConfig, linkColor: e.target.value })}
                    className="w-8 h-8 rounded border cursor-pointer"
                  />
                  <Input
                    value={safeConfig.linkColor}
                    onChange={(e) => onChange({ ...safeConfig, linkColor: e.target.value })}
                    className="h-8 text-xs font-mono flex-1"
                  />
                </div>
              </div>
            </div>

            {/* Font Size */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Font Size</Label>
                <span className="text-xs text-muted-foreground">{safeConfig.fontSize}px</span>
              </div>
              <Slider
                value={[safeConfig.fontSize]}
                onValueChange={([value]) => onChange({ ...safeConfig, fontSize: value })}
                min={11}
                max={20}
                step={1}
                className="w-full"
              />
            </div>

            {/* Font Family */}
            <div className="space-y-2">
              <Label className="text-sm">Font Family</Label>
              <Select
                value={safeConfig.fontFamily}
                onValueChange={(v) => onChange({ ...safeConfig, fontFamily: v })}
              >
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FONT_OPTIONS.map((font) => (
                    <SelectItem key={font.id} value={font.id}>
                      <span style={{ fontFamily: font.id }}>{font.name}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Border Radius */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Border Radius</Label>
                <span className="text-xs text-muted-foreground">{safeConfig.borderRadius}px</span>
              </div>
              <Slider
                value={[safeConfig.borderRadius]}
                onValueChange={([value]) => onChange({ ...safeConfig, borderRadius: value })}
                min={0}
                max={24}
                step={1}
                className="w-full"
              />
            </div>

            {/* Border */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Border Width</Label>
                <span className="text-xs text-muted-foreground">{safeConfig.borderWidth}px</span>
              </div>
              <div className="flex items-center gap-3">
                <Slider
                  value={[safeConfig.borderWidth]}
                  onValueChange={([value]) => onChange({ ...safeConfig, borderWidth: value })}
                  min={0}
                  max={4}
                  step={1}
                  className="flex-1"
                />
                {safeConfig.borderWidth > 0 && (
                  <div className="flex items-center gap-1">
                    <input
                      type="color"
                      value={safeConfig.borderColor}
                      onChange={(e) => onChange({ ...safeConfig, borderColor: e.target.value })}
                      className="w-7 h-7 rounded border cursor-pointer"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Shadow */}
            <div className="space-y-2">
              <Label className="text-sm">Shadow</Label>
              <Select
                value={safeConfig.shadow}
                onValueChange={(v) => onChange({ ...safeConfig, shadow: v as any })}
              >
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SHADOW_OPTIONS.map((opt) => (
                    <SelectItem key={opt.id} value={opt.id}>{opt.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* COLLAPSED: Tone Presets */}
        <Collapsible open={showTonePresets} onOpenChange={setShowTonePresets}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full gap-2 justify-between">
              <span className="flex items-center gap-2">
                <span className="text-base">{selectedUrgency.icon}</span>
                Tone Presets
              </span>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {selectedUrgency.name}
                </Badge>
                <ChevronDown className={cn("h-4 w-4 transition-transform", showTonePresets && "rotate-180")} />
              </div>
            </Button>
          </CollapsibleTrigger>
          
          <CollapsibleContent className="space-y-4 mt-4 pt-4 border-t">
            <div className="grid grid-cols-2 gap-2">
              {URGENCY_LEVELS.map((level) => (
                <button
                  key={level.id}
                  type="button"
                  onClick={() => handleUrgencyChange(level.id)}
                  className={cn(
                    "p-3 rounded-lg border-2 text-left transition-all hover:border-primary/50",
                    safeConfig.urgency_level === level.id 
                      ? "border-primary bg-primary/5" 
                      : "border-border hover:bg-muted/50"
                  )}
                >
                  <span className="text-xl">{level.icon}</span>
                  <div className="font-medium text-sm mt-1">{level.name}</div>
                </button>
              ))}
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm">Quick Templates</Label>
              <div className="flex flex-wrap gap-2">
                {MESSAGE_PRESETS[safeConfig.urgency_level].map((msg, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onChange({ ...safeConfig, message_template: msg })}
                    className={cn(
                      "text-xs px-3 py-1.5 rounded-full border transition-all",
                      safeConfig.message_template === msg
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    {msg.replace('{{count}}', String(previewCount))}
                  </button>
                ))}
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* COLLAPSED: Page-Specific Rules */}
        <Collapsible open={showPageRules} onOpenChange={setShowPageRules}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full gap-2 justify-between">
              <span className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                Page-Specific Rules
              </span>
              <div className="flex items-center gap-2">
                {(safeConfig.page_rules.length > 0 || safeConfig.excluded_pages.length > 0) && (
                  <Badge variant="secondary" className="text-xs">
                    {safeConfig.page_rules.length + safeConfig.excluded_pages.length} configured
                  </Badge>
                )}
                <ChevronDown className={cn("h-4 w-4 transition-transform", showPageRules && "rotate-180")} />
              </div>
            </Button>
          </CollapsibleTrigger>
          
          <CollapsibleContent className="mt-4 pt-4 border-t">
            <PageRulesEditor
              rules={safeConfig.page_rules}
              onChange={(rules) => onChange({ ...safeConfig, page_rules: rules })}
              excludedPages={safeConfig.excluded_pages}
              onExcludedPagesChange={(pages) => onChange({ ...safeConfig, excluded_pages: pages })}
            />
          </CollapsibleContent>
        </Collapsible>

        {/* Transparency Notice */}
        {safeConfig.mode !== 'real' && (
          <Alert variant="default" className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
            <AlertDescription className="text-sm">
              <strong>Transparency Notice:</strong> Simulated mode shows random counts within your range. 
              Ensure compliance with advertising standards in your region.
            </AlertDescription>
          </Alert>
        )}

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
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Label>Data Source</Label>
                <Info className="h-3 w-3 text-muted-foreground" />
              </div>
              <Select 
                value={safeConfig.mode} 
                onValueChange={(v) => onChange({ ...safeConfig, mode: v as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="real">
                    <div className="font-medium flex items-center gap-2">
                      Real Tracking
                      <Badge variant="secondary" className="text-[10px]">Recommended</Badge>
                    </div>
                  </SelectItem>
                  <SelectItem value="simulated">
                    <div className="font-medium">Simulated</div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Update Frequency</Label>
              <Select
                value={safeConfig.update_interval_seconds.toString()}
                onValueChange={(v) => onChange({ ...safeConfig, update_interval_seconds: parseInt(v) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">Every 15 seconds</SelectItem>
                  <SelectItem value="30">Every 30 seconds</SelectItem>
                  <SelectItem value="45">Every 45 seconds</SelectItem>
                  <SelectItem value="60">Every 60 seconds</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-3">
              <Label>Show On</Label>
              <RadioGroup 
                value={safeConfig.scope} 
                onValueChange={(v) => onChange({ ...safeConfig, scope: v as 'site' | 'page' })}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="site" id="scope-site" />
                  <Label htmlFor="scope-site" className="font-normal cursor-pointer">All Pages</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="page" id="scope-page" />
                  <Label htmlFor="scope-page" className="font-normal cursor-pointer">Specific Pages</Label>
                </div>
              </RadioGroup>
              
              {safeConfig.scope === 'page' && (
                <div className="space-y-2 pl-6">
                  <Input
                    placeholder="e.g., /products, /pricing"
                    value={safeConfig.target_pages.join(', ')}
                    onChange={(e) => onChange({
                      ...safeConfig,
                      target_pages: e.target.value.split(',').map(p => p.trim()).filter(Boolean)
                    })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Separate multiple pages with commas
                  </p>
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
