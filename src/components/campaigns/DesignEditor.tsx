import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sparkles, Link2, ShoppingCart, FileText, ChevronDown, AlertTriangle, Smartphone, Shield } from "lucide-react";

interface DesignEditorProps {
  settings: any;
  onChange: (settings: any) => void;
  // PHASE 2: New context props
  campaignType?: string;
  dataSource?: string;
  integrationPath?: string;
  templateName?: string;
}

// Enhancement 6: Conversion-Focused Presets with performance indicators
const PRESET_THEMES = [
  { 
    name: "🚀 High-Converting (Blue)", 
    description: "Used by top e-commerce brands",
    performanceBoost: "+23% higher CTR",
    primaryColor: "#2563EB", 
    backgroundColor: "#ffffff", 
    textColor: "#1a1a1a" 
  },
  { 
    name: "🌙 Premium Dark", 
    description: "Luxury brands prefer this",
    performanceBoost: "+18% engagement",
    primaryColor: "#818cf8", 
    backgroundColor: "#1f2937", 
    textColor: "#f9fafb" 
  },
  { 
    name: "✅ Trust Builder (Green)", 
    description: "Best for SaaS signups",
    performanceBoost: "+31% conversions",
    primaryColor: "#10b981", 
    backgroundColor: "#f9fafb", 
    textColor: "#111827" 
  },
  { 
    name: "🔥 Urgency Red", 
    description: "Creates FOMO, increases sales",
    performanceBoost: "+42% click-through",
    primaryColor: "#ef4444", 
    backgroundColor: "#000000", 
    textColor: "#ffffff" 
  },
  { 
    name: "💜 Elegant Purple", 
    description: "Best for creative products",
    performanceBoost: "+15% engagement",
    primaryColor: "#8b5cf6", 
    backgroundColor: "#faf5ff", 
    textColor: "#1f2937" 
  },
];

const FONT_FAMILIES = [
  { name: "System Default", value: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" },
  { name: "Inter", value: "'Inter', sans-serif" },
  { name: "Roboto", value: "'Roboto', sans-serif" },
  { name: "Open Sans", value: "'Open Sans', sans-serif" },
  { name: "Poppins", value: "'Poppins', sans-serif" },
];

export function DesignEditor({ 
  settings, 
  onChange, 
  campaignType, 
  dataSource, 
  integrationPath, 
  templateName 
}: DesignEditorProps) {
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [previewBackground, setPreviewBackground] = useState<'light' | 'dark' | 'image'>('light');
  
  // Enhancement 3: Advanced Placeholder Helper - Get available placeholders for integration
  const getAvailablePlaceholders = () => {
    const placeholdersByType: Record<string, Array<{ placeholder: string; label: string; example: string }>> = {
      'shopify': [
        { placeholder: '{{user_name}}', label: 'Customer Name', example: 'John Smith' },
        { placeholder: '{{product_name}}', label: 'Product Name', example: 'Premium Headphones' },
        { placeholder: '{{location}}', label: 'Customer Location', example: 'New York, NY' },
        { placeholder: '{{price}}', label: 'Product Price', example: '$99.99' },
        { placeholder: '{{product_url}}', label: 'Product URL', example: 'https://...' },
      ],
      'stripe': [
        { placeholder: '{{user_name}}', label: 'Customer Name', example: 'Sarah Johnson' },
        { placeholder: '{{plan_name}}', label: 'Plan Name', example: 'Premium Plan' },
        { placeholder: '{{amount}}', label: 'Amount', example: '$49/mo' },
        { placeholder: '{{location}}', label: 'Customer Location', example: 'San Francisco' },
      ],
      'ga4': [
        { placeholder: '{{page_name}}', label: 'Page Name', example: 'Product Page' },
        { placeholder: '{{visitor_count}}', label: 'Visitor Count', example: '47' },
        { placeholder: '{{time_spent}}', label: 'Time Spent', example: '5 minutes' },
        { placeholder: '{{location}}', label: 'Visitor Location', example: 'Los Angeles' },
      ],
      'woocommerce': [
        { placeholder: '{{user_name}}', label: 'Customer Name', example: 'Mike Brown' },
        { placeholder: '{{product_name}}', label: 'Product Name', example: 'Wireless Mouse' },
        { placeholder: '{{location}}', label: 'Customer Location', example: 'Chicago' },
        { placeholder: '{{price}}', label: 'Product Price', example: '$29.99' },
      ],
      'default': [
        { placeholder: '{{user_name}}', label: 'User Name', example: 'Alex' },
        { placeholder: '{{location}}', label: 'Location', example: 'Austin, TX' },
        { placeholder: '{{action}}', label: 'Action', example: 'signed up' },
        { placeholder: '{{time}}', label: 'Time', example: '5 minutes ago' },
      ],
    };

    return placeholdersByType[dataSource || 'default'] || placeholdersByType['default'];
  };

  // PHASE 2: Get campaign-type-specific placeholder
  const getCampaignPlaceholder = () => {
    if (!campaignType) return "{{name}} from {{city}} just {{action}}";
    
    const placeholders: Record<string, string> = {
      'recent-purchase': '{{user_name}} from {{location}} just bought {{product_name}}',
      'trial-start': '{{user_name}} just started a free trial',
      'signup': '{{user_name}} from {{location}} just signed up',
      'live-visitor': '{{visitor_count}} people viewing {{page_name}} right now',
      'review': '{{user_name}} gave {{rating}} stars - "{{review_text}}"',
      'download': '{{user_name}} just downloaded {{resource_name}}',
      'booking': '{{user_name}} from {{location}} just booked {{service_name}}',
    };
    
    return placeholders[campaignType] || "{{name}} from {{city}} just {{action}}";
  };
  
  // Enhancement 4: Mobile-First Design Warnings
  const getMobileWarnings = () => {
    const warnings = [];
    
    if (parseInt(design.fontSize) < 13) {
      warnings.push({
        type: 'font-size',
        message: 'Text may be hard to read on mobile devices',
        suggestion: 'Increase font size to at least 13px',
        autoFix: () => updateDesign({ fontSize: '13' })
      });
    }
    
    if (design.headline.length > 60) {
      warnings.push({
        type: 'headline-length',
        message: 'Headline will wrap on small screens',
        suggestion: 'Keep headline under 60 characters for best mobile experience',
        autoFix: null
      });
    }
    
    if (parseInt(design.borderRadius) > 20) {
      warnings.push({
        type: 'border-radius',
        message: 'Excessive rounding may look odd on mobile',
        suggestion: 'Consider reducing border radius',
        autoFix: () => updateDesign({ borderRadius: '16' })
      });
    }
    
    return warnings;
  };
  
  // PHASE 1: Get campaign-type-specific subtext
  const getCampaignSubtext = () => {
    if (!campaignType) return "Join {{name}} and thousands of others";
    
    const subtexts: Record<string, string> = {
      // E-commerce
      'recent-purchase': 'Join {{count}} happy customers today!',
      'cart-additions': 'Limited stock - order yours now!',
      'product-reviews': 'Verified customer review',
      'low-stock': 'Only {{stock_count}} left in stock!',
      'visitor-counter': "Don't miss out - shop now!",
      'recently-viewed': 'Still available - grab yours today!',
      'wishlist-additions': 'Popular item - {{count}} people want this',
      'flash-sale': '⚡ Limited time offer - act fast!',
      
      // SaaS
      'new-signup': 'Join {{count}}+ professionals using our platform',
      'trial-start': 'Start your free trial today',
      'trial-starts': 'Start your free trial today',
      'upgrade-events': 'Unlock premium features today',
      'feature-releases': 'Try it now - available to all users',
      'user-milestones': 'You can achieve this too!',
      'signup': 'Join thousands of satisfied users',
      
      // Services & Booking
      'new-bookings': 'Book your appointment today!',
      'service-requests': 'Get your free quote now',
      'appointments': 'Limited slots available',
      'contact-form': 'We typically respond within 24 hours',
      'booking': 'Reserve your spot today',
      
      // Content & Media
      'newsletter-signups': 'Get exclusive updates delivered to your inbox',
      'content-downloads': 'Free download - no signup required',
      'blog-comments': 'Join the conversation',
      'download': 'Free instant access - download now',
      
      // Social & Reviews
      'social-shares': 'Join the conversation on social media',
      'community-joins': 'Be part of our growing community',
      'review': 'Read more verified reviews',
      'live-visitor': 'See what others are viewing',
      
      // Specialized
      'donation-notification': 'Every contribution makes a difference',
      'impact-milestone': 'Be part of the movement',
      'volunteer-signup': 'Make an impact - volunteer today',
      'course-enrollment': 'Start learning today - limited seats available',
      'completion-milestone': 'Complete your course today',
    };
    
    return subtexts[campaignType] || "Join {{name}} and thousands of others";
  };
  
  // PHASE 2: Merge strategy - baseDefaults < templateSettings < userEdits
  const baseDefaults = {
    // Position & Animation
    position: "bottom-left",
    animation: "slide",
    animationSpeed: "normal",
    exitAnimation: "fade",
    
    // Hover Effects
    hoverScale: "1.02",
    hoverBrightness: "1.05",
    
    // Content
    headline: getCampaignPlaceholder(),
    subtext: getCampaignSubtext(),
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
  };
  
  const [design, setDesign] = useState({
    ...baseDefaults,
    ...settings, // Template settings override defaults, user edits override all
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

  // PHASE 2: Get campaign type icon
  const getCampaignIcon = () => {
    if (!campaignType) return Sparkles;
    
    const icons: Record<string, any> = {
      'recent-purchase': ShoppingCart,
      'signup': Link2,
      'trial-start': Sparkles,
      'review': FileText,
    };
    
    return icons[campaignType] || Sparkles;
  };
  
  const CampaignIcon = getCampaignIcon();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Editor Panel */}
      <div className="space-y-6">
        {/* PHASE 2: Context Display Card */}
        {(campaignType || templateName || dataSource) && (
          <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
            <CardContent className="pt-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <CampaignIcon className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Campaign Context</span>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {campaignType && (
                    <Badge variant="secondary" className="gap-1.5">
                      <span className="text-xs">Type:</span>
                      <span className="font-medium">
                        {campaignType.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                      </span>
                    </Badge>
                  )}
                  
                  {templateName && (
                    <Badge variant="outline" className="gap-1.5">
                      <Sparkles className="h-3 w-3" />
                      <span className="text-xs">{templateName}</span>
                    </Badge>
                  )}
                  
                  {dataSource && integrationPath === 'integration' && (
                    <Badge variant="outline" className="gap-1.5">
                      <Link2 className="h-3 w-3" />
                      <span className="text-xs">{dataSource}</span>
                    </Badge>
                  )}
                  
                  {integrationPath === 'demo' && (
                    <Badge variant="outline" className="gap-1.5 text-purple-600 border-purple-300">
                      <Sparkles className="h-3 w-3" />
                      <span className="text-xs">Demo Mode</span>
                    </Badge>
                  )}
                  
                  {integrationPath === 'manual' && (
                    <Badge variant="outline" className="gap-1.5 text-orange-600 border-orange-300">
                      <FileText className="h-3 w-3" />
                      <span className="text-xs">Manual Upload</span>
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Enhancement 6: Conversion-Focused Preset Themes */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Quick Themes</CardTitle>
            <CardDescription className="text-xs">Proven high-converting designs</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {PRESET_THEMES.map((theme) => (
                <Button
                  key={theme.name}
                  variant="outline"
                  onClick={() => applyPresetTheme(theme)}
                  className="w-full justify-start text-left h-auto py-2 px-3"
                >
                  <div className="flex flex-col gap-1 w-full">
                    <div className="flex items-center justify-between w-full">
                      <span className="text-sm font-medium">{theme.name}</span>
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        {theme.performanceBoost}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground font-normal">
                      {theme.description}
                    </span>
                  </div>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
        
        {/* Enhancement 4: Mobile-First Design Warnings */}
        {getMobileWarnings().length > 0 && (
          <Alert variant="destructive">
            <Smartphone className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium text-sm">Mobile Optimization Alerts</p>
                {getMobileWarnings().map((warning, idx) => (
                  <div key={idx} className="flex items-start justify-between gap-2 text-xs">
                    <div>
                      <p className="font-medium">{warning.message}</p>
                      <p className="text-muted-foreground mt-0.5">{warning.suggestion}</p>
                    </div>
                    {warning.autoFix && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={warning.autoFix}
                        className="shrink-0 h-7 text-xs"
                      >
                        Auto-Fix
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </AlertDescription>
          </Alert>
        )}

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
                {/* Enhancement 3: Placeholder Helper for Headline */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Headline</Label>
                    <div className="flex items-center gap-2">
                      {templateName && design.headline && design.headline !== baseDefaults.headline && (
                        <Badge variant="secondary" className="text-xs gap-1">
                          <Sparkles className="h-3 w-3" />
                          From template
                        </Badge>
                      )}
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                            Insert Variable <ChevronDown className="h-3 w-3" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80" align="end">
                          <div className="space-y-3">
                            <div>
                              <h4 className="font-medium text-sm mb-1">Available Variables</h4>
                              <p className="text-xs text-muted-foreground">
                                Click to insert at cursor position
                              </p>
                            </div>
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                              {getAvailablePlaceholders().map((item, idx) => (
                                <button
                                  key={idx}
                                  onClick={() => {
                                    const input = document.querySelector('input[value="' + design.headline + '"]') as HTMLInputElement;
                                    if (input) {
                                      const cursorPos = input.selectionStart || design.headline.length;
                                      const newValue = 
                                        design.headline.slice(0, cursorPos) + 
                                        item.placeholder + 
                                        design.headline.slice(cursorPos);
                                      updateDesign({ headline: newValue });
                                    }
                                  }}
                                  className="w-full text-left p-2 rounded-md hover:bg-muted transition-colors"
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium font-mono">{item.placeholder}</p>
                                      <p className="text-xs text-muted-foreground mt-0.5">{item.label}</p>
                                    </div>
                                    <Badge variant="outline" className="text-[10px] shrink-0">
                                      {item.example}
                                    </Badge>
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                  <Input
                    value={design.headline}
                    onChange={(e) => updateDesign({ headline: e.target.value })}
                    placeholder={getCampaignPlaceholder()}
                  />
                  <p className="text-xs text-muted-foreground">
                    💡 Click "Insert Variable" to see all available placeholders for {dataSource || 'your integration'}
                  </p>
                </div>
                {/* Enhancement 3: Placeholder Helper for Subtext */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Subtext (optional)</Label>
                    <div className="flex items-center gap-2">
                      {templateName && design.subtext && design.subtext !== baseDefaults.subtext && (
                        <Badge variant="secondary" className="text-xs gap-1">
                          <Sparkles className="h-3 w-3" />
                          From template
                        </Badge>
                      )}
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                            Insert Variable <ChevronDown className="h-3 w-3" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80" align="end">
                          <div className="space-y-3">
                            <div>
                              <h4 className="font-medium text-sm mb-1">Available Variables</h4>
                              <p className="text-xs text-muted-foreground">
                                Click to insert at cursor position
                              </p>
                            </div>
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                              {getAvailablePlaceholders().map((item, idx) => (
                                <button
                                  key={idx}
                                  onClick={() => {
                                    const textarea = document.querySelector('textarea[value="' + design.subtext + '"]') as HTMLTextAreaElement;
                                    if (textarea) {
                                      const cursorPos = textarea.selectionStart || design.subtext.length;
                                      const newValue = 
                                        design.subtext.slice(0, cursorPos) + 
                                        item.placeholder + 
                                        design.subtext.slice(cursorPos);
                                      updateDesign({ subtext: newValue });
                                    }
                                  }}
                                  className="w-full text-left p-2 rounded-md hover:bg-muted transition-colors"
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium font-mono">{item.placeholder}</p>
                                      <p className="text-xs text-muted-foreground mt-0.5">{item.label}</p>
                                    </div>
                                    <Badge variant="outline" className="text-[10px] shrink-0">
                                      {item.example}
                                    </Badge>
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                  <Textarea
                    value={design.subtext}
                    onChange={(e) => updateDesign({ subtext: e.target.value })}
                    placeholder={getCampaignSubtext()}
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">
                    💡 Try: {
                      campaignType === 'recent-purchase' ? '"Limited stock!" or "{{count}} sold today"' :
                      campaignType === 'trial-start' ? '"No credit card required" or "Cancel anytime"' :
                      campaignType === 'booking' ? '"Book within {{time}} to save {{discount}}"' :
                      '"Add urgency or social proof to increase conversions"'
                    }
                  </p>
                </div>
                
                {/* PHASE 1: Privacy Controls - Show Names & Locations */}
                <div className="space-y-3 pt-2 border-t">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="h-4 w-4 text-primary" />
                    <p className="text-sm font-medium">Privacy Controls</p>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Show Customer Names</Label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Display actual names or use "Someone"
                      </p>
                    </div>
                    <Switch
                      checked={design.showNames !== false}
                      onCheckedChange={(checked) => {
                        updateDesign({ showNames: checked });
                        // Update headline template based on privacy setting
                        if (!checked && design.headline) {
                          const updatedHeadline = design.headline.replace(/\{\{user_name\}\}/gi, 'Someone');
                          updateDesign({ headline: updatedHeadline, showNames: checked });
                        }
                      }}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Show Locations</Label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Display city/country information
                      </p>
                    </div>
                    <Switch
                      checked={design.showLocations !== false}
                      onCheckedChange={(checked) => {
                        updateDesign({ showLocations: checked });
                        // Update headline template based on privacy setting
                        if (!checked && design.headline) {
                          const updatedHeadline = design.headline.replace(/ from \{\{location\}\}/gi, '');
                          updateDesign({ headline: updatedHeadline, showLocations: checked });
                        }
                      }}
                    />
                  </div>
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
                
                {/* PHASE 4: Product Images Display Control */}
                <div className="space-y-3 pt-2 border-t">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Show Product Images</Label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Display product images when available (replaces avatar)
                      </p>
                    </div>
                    <Switch
                      checked={design.showProductImages !== false}
                      onCheckedChange={(checked) => updateDesign({ showProductImages: checked })}
                    />
                  </div>
                  
                  {design.showProductImages !== false && (
                    <div className="ml-2 space-y-2 pl-3 border-l-2 border-muted">
                      <Label className="text-xs font-medium">Fallback Icon</Label>
                      <Select
                        value={design.fallbackIcon || 'default'}
                        onValueChange={(value) => updateDesign({ fallbackIcon: value })}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="default">📦 Package (Default)</SelectItem>
                          <SelectItem value="cart">🛒 Shopping Cart</SelectItem>
                          <SelectItem value="heart">❤️ Heart</SelectItem>
                          <SelectItem value="fire">🔥 Fire</SelectItem>
                          <SelectItem value="star">⭐ Star</SelectItem>
                          <SelectItem value="gift">🎁 Gift</SelectItem>
                          <SelectItem value="trophy">🏆 Trophy</SelectItem>
                          <SelectItem value="rocket">🚀 Rocket</SelectItem>
                          <SelectItem value="sparkles">✨ Sparkles</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Icon shown when no product image is available
                      </p>
                    </div>
                  )}
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
                  <Label>Exit Animation</Label>
                  <Select value={design.exitAnimation} onValueChange={(value) => updateDesign({ exitAnimation: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fade">Fade Out</SelectItem>
                      <SelectItem value="slide">Slide Out</SelectItem>
                      <SelectItem value="shrink">Shrink</SelectItem>
                      <SelectItem value="none">None</SelectItem>
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
                    <div className="flex items-center justify-between">
                      <Label>Primary Color</Label>
                      {templateName && design.primaryColor !== baseDefaults.primaryColor && (
                        <Badge variant="secondary" className="text-[10px] gap-1 h-4 px-1.5">
                          <Sparkles className="h-2.5 w-2.5" />
                          Template
                        </Badge>
                      )}
                    </div>
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
                    <div className="flex items-center justify-between">
                      <Label>Background</Label>
                      {templateName && design.backgroundColor !== baseDefaults.backgroundColor && (
                        <Badge variant="secondary" className="text-[10px] gap-1 h-4 px-1.5">
                          <Sparkles className="h-2.5 w-2.5" />
                          Template
                        </Badge>
                      )}
                    </div>
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
                <Tabs value={previewDevice} onValueChange={(v: any) => setPreviewDevice(v)} className="w-auto">
                  <TabsList className="grid w-[200px] grid-cols-2">
                    <TabsTrigger value="desktop">Desktop</TabsTrigger>
                    <TabsTrigger value="mobile">Mobile</TabsTrigger>
                  </TabsList>
                </Tabs>
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
            <div className="space-y-3">
              <div className="flex gap-2">
                <Button
                  variant={previewBackground === 'light' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPreviewBackground('light')}
                >
                  Light
                </Button>
                <Button
                  variant={previewBackground === 'dark' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPreviewBackground('dark')}
                >
                  Dark
                </Button>
                <Button
                  variant={previewBackground === 'image' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPreviewBackground('image')}
                >
                  Image
                </Button>
              </div>
            </div>
            <div 
              className={`relative rounded-lg overflow-hidden border mt-3 ${
                previewDevice === 'mobile' ? 'max-w-[375px] mx-auto h-[667px]' : 'h-[500px]'
              } ${
                previewBackground === 'dark' ? 'bg-slate-900' :
                previewBackground === 'image' ? 'bg-gradient-to-br from-purple-500 via-pink-500 to-red-500' :
                'bg-gradient-to-br from-muted/30 to-muted/50'
              }`}
            >
              {/* Simulated website background */}
              <div className={`absolute inset-0 p-8 ${previewBackground === 'dark' ? 'opacity-30' : 'opacity-20'}`}>
                <div className={`h-6 w-48 rounded mb-6 ${previewBackground === 'dark' ? 'bg-white' : 'bg-foreground'}`} />
                <div className={`h-3 w-full rounded mb-2 ${previewBackground === 'dark' ? 'bg-white' : 'bg-foreground'}`} />
                <div className={`h-3 w-3/4 rounded mb-2 ${previewBackground === 'dark' ? 'bg-white' : 'bg-foreground'}`} />
                <div className={`h-3 w-5/6 rounded ${previewBackground === 'dark' ? 'bg-white' : 'bg-foreground'}`} />
              </div>

              {/* Notification Preview */}
              <div
                id="notification-preview"
                className={`absolute ${
                  previewDevice === 'mobile' || design.position === "bottom-center"
                    ? "bottom-4 left-1/2 -translate-x-1/2"
                    : design.position === "bottom-left"
                    ? "bottom-4 left-4"
                    : design.position === "bottom-right"
                    ? "bottom-4 right-4"
                    : design.position === "top-left"
                    ? "top-4 left-4"
                    : design.position === "top-right"
                    ? "top-4 right-4"
                    : design.position === "top-center"
                    ? "top-4 left-1/2 -translate-x-1/2"
                    : "bottom-4 left-4"
                } ${previewDevice === 'mobile' ? 'max-w-[calc(100%-2rem)]' : 'max-w-sm'} animate-in ${
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
                } cursor-pointer transition-transform hover:scale-[${design.hoverScale}]`}
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
                  fontSize: previewDevice === 'mobile' ? `${Math.max(12, parseInt(design.fontSize) - 2)}px` : `${design.fontSize}px`,
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
                💡 <strong>Tip:</strong> {previewDevice === 'mobile' 
                  ? 'Mobile view automatically centers notifications for optimal UX. Font size is reduced by 2px on mobile.'
                  : 'Toggle to mobile view to see how your notification adapts to smaller screens. Hover to see hover effects.'
                }
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
