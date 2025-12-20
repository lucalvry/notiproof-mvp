import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, Eye } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TemplateRenderer } from "@/components/templates/TemplateRenderer";
import { CanonicalEvent } from "@/lib/integrations/types";
import type { TemplateConfig } from "@/lib/templateEngine";
import { ContentAlignmentSelector, ContentAlignment } from "@/components/campaigns/ContentAlignmentSelector";

interface AnnouncementConfigProps {
  config: {
    /** Notification headline (max 80 characters) */
    title: string;
    /** Message content (max 150 characters) */
    message: string;
    /** CTA button text (max 20 characters, optional) */
    cta_text?: string;
    /** CTA button URL (optional) */
    cta_url?: string;
    schedule_type: 'instant' | 'scheduled' | 'recurring';
    start_date?: string;
    end_date?: string;
    recurrence?: {
      pattern: 'daily' | 'weekly' | 'monthly';
      days_of_week?: number[];
      time_of_day?: string;
    };
    priority: number;
    variables: Record<string, string>;
    image_type: 'emoji' | 'icon' | 'upload' | 'url';
    emoji?: string;
    image_url?: string;
    icon?: string;
    content_alignment?: ContentAlignment;
    /** Full-width CTA button */
    button_stretch?: boolean;
    /** Font size in pixels (12-18) */
    font_size?: number;
    /** Font family: system, serif, or mono */
    font_family?: 'system' | 'serif' | 'mono';
  };
  onChange: (config: any) => void;
  selectedTemplate?: TemplateConfig;
  showSaveButton?: boolean;
  onSave?: () => void;
}

export function AnnouncementConfig({ config, onChange, selectedTemplate, showSaveButton, onSave }: AnnouncementConfigProps) {
  const [showPreview, setShowPreview] = useState(true);

  // Create a default announcement template when none is provided
  const defaultAnnouncementTemplate: TemplateConfig = useMemo(() => ({
    id: 'default-announcement',
    provider: 'announcements',
    template_key: 'announcement-default',
    name: 'Announcement',
    description: 'Default announcement template',
    style_variant: 'card',
    category: 'announcement',
    html_template: `
      <div class="noti-card" style="display: flex; gap: 12px; padding: 16px; background: white; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); max-width: 320px; align-items: ${config.content_alignment === 'center' ? 'center' : config.content_alignment === 'bottom' ? 'flex-end' : 'flex-start'};">
        <div class="noti-icon" style="font-size: 32px;">{{template.icon}}</div>
        <div class="noti-content" style="flex: 1;">
          <div style="font-weight: 600; color: #111;">{{template.title}}</div>
          <div style="color: #555; font-size: 14px; margin-top: 4px;">{{template.message}}</div>
          {{#template.cta_text}}
          <a href="{{template.cta_url}}" style="display: inline-block; margin-top: 8px; padding: 6px 16px; background: #3b82f6; color: white; border-radius: 6px; text-decoration: none; font-size: 13px;">{{template.cta_text}}</a>
          {{/template.cta_text}}
        </div>
      </div>
    `,
    required_fields: ['template.title', 'template.message'],
    preview_json: {},
    is_active: true,
  }), [config.content_alignment]);

  // Use provided template or fall back to default
  const effectiveTemplate = selectedTemplate || defaultAnnouncementTemplate;

  // Create mock event data for live preview
  const mockEvent: CanonicalEvent = useMemo(() => ({
    event_id: 'preview',
    provider: 'announcements',
    provider_event_type: 'announcement_preview',
    timestamp: new Date().toISOString(),
    payload: {},
    normalized: {
      'template.title': config.title || 'Your Title Here',
      'template.message': config.message || 'Your message content will appear here',
      'template.icon': config.icon || config.emoji || '📢',
      'template.cta_text': config.cta_text || 'Click Here',
      'template.cta_url': config.cta_url || '#',
      'template.image_url': config.image_url || '',
    },
  }), [config]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Configuration Form */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>📢 Smart Announcement Setup</CardTitle>
              <CardDescription>
                Create promotional notifications without third-party tools
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPreview(!showPreview)}
              className="lg:hidden"
            >
              <Eye className="h-4 w-4 mr-2" />
              {showPreview ? 'Hide' : 'Show'} Preview
            </Button>
          </div>
        </CardHeader>
      <CardContent className="space-y-6">
        {/* Basic Info */}
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Notification Headline</Label>
              <span className="text-xs text-muted-foreground">{config.title?.length || 0}/80</span>
            </div>
            <Input
              placeholder="e.g., 🎉 Black Friday Sale - 50% Off!"
              value={config.title || ''}
              maxLength={80}
              onChange={(e) => {
                onChange({ ...config, title: e.target.value });
              }}
            />
            <p className="text-xs text-muted-foreground">Keep it short and attention-grabbing</p>
          </div>
          
          {/* Image Selection */}
          <div className="space-y-3">
            <Label>Notification Visual</Label>
            <Tabs 
              value={config.image_type || 'emoji'} 
              onValueChange={(v) => onChange({ ...config, image_type: v as any })}
            >
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="emoji">Emoji</TabsTrigger>
                <TabsTrigger value="icon">Icon</TabsTrigger>
                <TabsTrigger value="url">Image URL</TabsTrigger>
                <TabsTrigger value="upload">Upload</TabsTrigger>
              </TabsList>
              
              <TabsContent value="emoji" className="mt-3">
                <Input 
                  placeholder="e.g., 🎉 🔥 ✨ 🎁"
                  value={config.emoji || '📢'}
                  onChange={(e) => onChange({ ...config, emoji: e.target.value })}
                />
              </TabsContent>
              
              <TabsContent value="icon" className="mt-3">
                <Select 
                  value={config.icon || '📢'} 
                  onValueChange={(v) => onChange({ ...config, icon: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent 
                    className="z-[9999] bg-background border shadow-lg"
                    position="popper"
                    sideOffset={5}
                  >
                    <SelectItem value="🛍️">🛍️ Shopping Bag</SelectItem>
                    <SelectItem value="🎉">🎉 Celebration</SelectItem>
                    <SelectItem value="📢">📢 Announcement</SelectItem>
                    <SelectItem value="⚡">⚡ Flash</SelectItem>
                    <SelectItem value="🎁">🎁 Gift</SelectItem>
                    <SelectItem value="🔥">🔥 Hot Deal</SelectItem>
                    <SelectItem value="✨">✨ Sparkle</SelectItem>
                    <SelectItem value="💎">💎 Premium</SelectItem>
                  </SelectContent>
                </Select>
              </TabsContent>
              
              <TabsContent value="url" className="mt-3">
                <Input 
                  placeholder="https://example.com/image.jpg"
                  value={config.image_url || ''}
                  onChange={(e) => onChange({ ...config, image_url: e.target.value })}
                />
              </TabsContent>
              
              <TabsContent value="upload" className="mt-3">
                <div className="border-2 border-dashed rounded-lg p-6 text-center bg-muted/30">
                  <p className="text-sm text-muted-foreground mb-2">Image upload coming soon</p>
                  <p className="text-xs text-muted-foreground">Use Image URL for now</p>
                </div>
              </TabsContent>
            </Tabs>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Message Content</Label>
              <span className="text-xs text-muted-foreground">{config.message?.length || 0}/150</span>
            </div>
            <Textarea
              placeholder="e.g., Limited time: {{discount}}% off all products!"
              value={config.message || ''}
              maxLength={150}
              onChange={(e) => {
                onChange({ ...config, message: e.target.value });
              }}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">Additional details about your announcement</p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="text-xs">Available: {`{{discount}}`}</Badge>
              <Badge variant="secondary" className="text-xs">{`{{coupon_code}}`}</Badge>
              <Badge variant="secondary" className="text-xs">{`{{product_name}}`}</Badge>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Call-to-Action Text (Optional)</Label>
                <Input
                  placeholder="e.g., Shop Now, Learn More"
                  value={config.cta_text ?? ''}
                  maxLength={20}
                  onChange={(e) => {
                    onChange({ ...config, cta_text: e.target.value });
                  }}
                />
                <p className="text-xs text-muted-foreground">Button text (20 chars max)</p>
              </div>
              <div className="space-y-2">
                <Label>CTA Link URL (Optional)</Label>
                <Input
                  placeholder="https://..."
                  value={config.cta_url ?? ''}
                  onChange={(e) => {
                    onChange({ ...config, cta_url: e.target.value });
                  }}
                />
                <p className="text-xs text-muted-foreground">Where the button links to</p>
              </div>
            </div>
            
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-xs">
                💡 <strong>Best Practice:</strong> Add a CTA button to make your announcement actionable. If left empty, the notification will show "Just now" timestamp instead.
              </AlertDescription>
            </Alert>
          </div>
        </div>

        {/* Schedule Configuration */}
        <div className="space-y-3">
          <Label>Schedule Type</Label>
          <Tabs 
            value={config.schedule_type} 
            onValueChange={(v) => onChange({ ...config, schedule_type: v as any })}
          >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="instant">Publish Now</TabsTrigger>
              <TabsTrigger value="scheduled">Schedule Once</TabsTrigger>
              <TabsTrigger value="recurring">Recurring</TabsTrigger>
            </TabsList>
            
            <TabsContent value="scheduled" className="space-y-3 mt-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Start Date & Time</Label>
                  <Input
                    type="datetime-local"
                    value={config.start_date || ''}
                    onChange={(e) => onChange({ ...config, start_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Date & Time (Optional)</Label>
                  <Input
                    type="datetime-local"
                    value={config.end_date || ''}
                    onChange={(e) => onChange({ ...config, end_date: e.target.value })}
                  />
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="recurring" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Recurrence Pattern</Label>
                <Select
                  value={config.recurrence?.pattern || 'daily'}
                  onValueChange={(v) => onChange({
                    ...config,
                    recurrence: { ...config.recurrence, pattern: v as any }
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-50 bg-background">
                    <SelectItem value="daily">Every Day</SelectItem>
                    <SelectItem value="weekly">Specific Days of Week</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {config.recurrence?.pattern === 'weekly' && (
                <div className="space-y-2">
                  <Label>Days of Week</Label>
                  <div className="flex gap-2">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, idx) => (
                      <Button
                        key={idx}
                        variant={config.recurrence?.days_of_week?.includes(idx) ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => {
                          const days = config.recurrence?.days_of_week || [];
                          const newDays = days.includes(idx)
                            ? days.filter(d => d !== idx)
                            : [...days, idx];
                          onChange({
                            ...config,
                            recurrence: { ...config.recurrence, days_of_week: newDays }
                          });
                        }}
                      >
                        {day}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="space-y-2">
                <Label>Time of Day</Label>
                <Input
                  type="time"
                  value={config.recurrence?.time_of_day || '09:00'}
                  onChange={(e) => onChange({
                    ...config,
                    recurrence: { ...config.recurrence, time_of_day: e.target.value }
                  })}
                />
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Priority */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Display Priority</Label>
            <Badge>{config.priority || 5}/10</Badge>
          </div>
          <Slider
            min={1}
            max={10}
            step={1}
            value={[config.priority || 5]}
            onValueChange={(values) => onChange({ ...config, priority: values[0] })}
          />
          <p className="text-xs text-muted-foreground">
            Higher priority announcements show first when multiple are active
          </p>
        </div>

        {/* Content Alignment */}
        <ContentAlignmentSelector
          value={config.content_alignment || 'top'}
          onChange={(alignment) => onChange({ ...config, content_alignment: alignment })}
        />

        {/* Typography Settings */}
        <div className="space-y-4 pt-4 border-t">
          <Label className="text-base font-medium">Typography</Label>
          
          {/* Font Size */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Font Size</Label>
              <Badge variant="secondary">{config.font_size || 14}px</Badge>
            </div>
            <Slider
              min={12}
              max={18}
              step={1}
              value={[config.font_size || 14]}
              onValueChange={(values) => onChange({ ...config, font_size: values[0] })}
            />
          </div>

          {/* Font Family */}
          <div className="space-y-2">
            <Label className="text-sm">Font Family</Label>
            <Select
              value={config.font_family || 'system'}
              onValueChange={(v) => onChange({ ...config, font_family: v as 'system' | 'serif' | 'mono' })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-[9999] bg-background border shadow-lg">
                <SelectItem value="system">System Default</SelectItem>
                <SelectItem value="serif">Serif (Georgia)</SelectItem>
                <SelectItem value="mono">Monospace</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Button Settings */}
        <div className="space-y-4 pt-4 border-t">
          <Label className="text-base font-medium">Button Style</Label>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm">Full-Width Button</Label>
              <p className="text-xs text-muted-foreground">Stretch the CTA button to full width</p>
            </div>
            <Switch
              checked={config.button_stretch || false}
              onCheckedChange={(checked) => onChange({ ...config, button_stretch: checked })}
            />
          </div>
        </div>
        
        {/* Save Button for Edit Mode */}
        {showSaveButton && (
          <div className="pt-4 border-t flex gap-3">
            <Button 
              onClick={() => onSave?.()} 
              className="flex-1"
              size="lg"
            >
              Update Announcement
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setShowPreview(!showPreview)}
              className="lg:hidden"
            >
              <Eye className="h-4 w-4 mr-2" />
              {showPreview ? 'Hide' : 'Show'} Preview
            </Button>
          </div>
        )}
      </CardContent>
    </Card>

      {/* Live Preview Panel */}
      {showPreview && (
        <Card className="lg:sticky lg:top-6 lg:self-start">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Live Preview
            </CardTitle>
            <CardDescription>
              See how your announcement will appear to visitors
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden bg-muted/30 relative min-h-[300px] flex items-center justify-center">
              <div className="absolute inset-0 scale-75 origin-center">
                <TemplateRenderer
                  template={effectiveTemplate}
                  event={mockEvent}
                  className="announcement-preview"
                />
              </div>
            </div>
            <div className="mt-4 text-xs text-muted-foreground">
              <Badge variant="outline" className="mb-2">Preview Mode</Badge>
              <p>This is a scaled-down preview. Your announcement will display at full size on your website.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
