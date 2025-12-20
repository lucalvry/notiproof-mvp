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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sparkles, Link2, ShoppingCart, FileText, ChevronDown, AlertTriangle, Smartphone, Shield, ExternalLink, RotateCcw } from "lucide-react";
import { WidgetPreviewFrame } from "./WidgetPreviewFrame";
import { SettingsSections } from "../settings/SettingsSections";
import { PreviewOnSiteDialog } from "./PreviewOnSiteDialog";
import { toast } from "sonner";

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

// Form Capture specific themes
const FORM_CAPTURE_THEMES = [
  { 
    name: "✅ Success Green", 
    description: "Perfect for signups & confirmations",
    performanceBoost: "+28% form completions",
    primaryColor: "#10b981", 
    backgroundColor: "#ecfdf5", 
    textColor: "#065f46" 
  },
  { 
    name: "📧 Newsletter Blue", 
    description: "Clean look for subscriptions",
    performanceBoost: "+19% signups",
    primaryColor: "#3b82f6", 
    backgroundColor: "#eff6ff", 
    textColor: "#1e40af" 
  },
  { 
    name: "💼 Professional", 
    description: "Great for B2B lead capture",
    performanceBoost: "+24% demo requests",
    primaryColor: "#6366f1", 
    backgroundColor: "#ffffff", 
    textColor: "#1f2937" 
  },
  { 
    name: "🎯 Contact Form", 
    description: "Welcoming & approachable",
    performanceBoost: "+15% inquiries",
    primaryColor: "#f59e0b", 
    backgroundColor: "#fffbeb", 
    textColor: "#92400e" 
  },
];

const FONT_FAMILIES = [
  { name: "System Default", value: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" },
  { name: "Inter", value: "'Inter', sans-serif" },
  { name: "Roboto", value: "'Roboto', sans-serif" },
  { name: "Open Sans", value: "'Open Sans', sans-serif" },
  { name: "Poppins", value: "'Poppins', sans-serif" },
  { name: "Lato", value: "'Lato', sans-serif" },
  { name: "Montserrat", value: "'Montserrat', sans-serif" },
  { name: "Playfair Display", value: "'Playfair Display', serif" },
  { name: "Source Sans Pro", value: "'Source Sans Pro', sans-serif" },
  { name: "Nunito", value: "'Nunito', sans-serif" },
];

const HOVER_EFFECTS = [
  { name: "None", value: "none", description: "No hover effect" },
  { name: "Subtle Scale", value: "subtle", description: "Gentle 2% scale up" },
  { name: "Lift", value: "lift", description: "Lifts up with shadow" },
  { name: "Glow", value: "glow", description: "Adds a colored glow" },
  { name: "Brighten", value: "brighten", description: "Brightens on hover" },
];

const TEXT_ALIGNMENTS = [
  { name: "Left", value: "left" },
  { name: "Center", value: "center" },
  { name: "Right", value: "right" },
];

export function DesignEditor({ 
  settings, 
  onChange, 
  campaignType, 
  dataSource, 
  integrationPath, 
  templateName 
}: DesignEditorProps) {
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  
  // PHASE 2: Debug what we're receiving
  useEffect(() => {
    console.log('🎨 DesignEditor mounted with:', {
      headline: settings.headline,
      messageTemplate: settings.messageTemplate,
      message: settings.message,
      allSettings: settings
    });
  }, [settings]);
  
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
      'form_hook': [
        { placeholder: '{{name}}', label: 'Person Name', example: 'Sarah' },
        { placeholder: '{{email}}', label: 'Email Address', example: 'sarah@example.com' },
        { placeholder: '{{company}}', label: 'Company Name', example: 'Acme Inc' },
        { placeholder: '{{location}}', label: 'Location', example: 'New York' },
        { placeholder: '{{product}}', label: 'Product/Service', example: 'Premium Plan' },
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
      // Form Capture types
      'form-capture': '{{name}} just submitted a form',
      'contact_form': '{{name}} from {{company}} just reached out',
      'newsletter': '{{name}} just subscribed to updates',
      'demo_request': '{{name}} from {{company}} requested a demo',
      'lead_form': '{{name}} from {{company}} is interested',
      'survey': '{{name}} just completed a survey',
      'other': '{{name}} just took action',
      // Announcement
      'announcement': 'New announcement',
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
      
      // Form Capture
      'form-capture': 'Be part of our community',
      'newsletter': 'Join {{count}}+ subscribers',
      'demo_request': 'Schedule your demo today',
      'lead_form': 'Get your personalized quote',
      'survey': 'Your feedback matters',
      'other': 'Join others who took action',
      
      // Announcement
      'announcement': 'Check out our latest update',
    };
    
    return subtexts[campaignType] || "Join {{name}} and thousands of others";
  };

  // Helper to get campaign type display label
  const getCampaignTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'form-capture': 'Form Capture',
      'contact_form': 'Contact Form',
      'signup': 'Signup Form',
      'newsletter': 'Newsletter',
      'demo_request': 'Demo Request',
      'lead_form': 'Lead Capture',
      'survey': 'Survey',
      'other': 'Form Capture',
      'live-visitor': 'Live Visitors',
      'recent-purchase': 'Recent Purchase',
      'review': 'Reviews',
      'announcement': 'Announcement',
      'social-proof': 'Social Proof',
    };
    return labels[type] || type.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  // Helper to check if current campaign is form-related
  const isFormCaptureCampaign = () => {
    const formTypes = ['form-capture', 'contact_form', 'newsletter', 'demo_request', 'lead_form', 'survey', 'other'];
    return formTypes.includes(campaignType || '') || dataSource === 'form_hook';
  };

  // Get themes based on campaign type
  const getThemesForCampaign = () => {
    if (isFormCaptureCampaign()) {
      return FORM_CAPTURE_THEMES;
    }
    return PRESET_THEMES;
  };
  
  // PHASE 2: Merge strategy - baseDefaults < templateSettings < userEdits
  const baseDefaults = {
    // Position & Animation
    position: "bottom-left",
    animation: "slide",
    animationSpeed: "normal",
    exitAnimation: "fade",
    contentAlignment: "center",
    
    // Hover Effects
    hoverScale: "1.02",
    hoverBrightness: "1.05",
    
    // Content - PRIORITY: Use settings.headline if exists (from Step 2), else generate
    headline: settings.headline || settings.messageTemplate || settings.message || getCampaignPlaceholder(),
    subtext: settings.subtext || getCampaignSubtext(),
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
    linkColor: "#2563EB", // NEW: Link color for clickable elements
    borderRadius: "12",
    shadow: "md",
    fontSize: "14",
    fontFamily: FONT_FAMILIES[0].value,
    
    // NEW: Enhanced styling options
    borderColor: "transparent",
    borderWidth: "0",
    textAlignment: "left",
    lineHeight: "1.4",
    hoverEffect: "subtle",
    notificationPadding: "16",
    
    // Timing
    initialDelay: "0",
    displayDuration: "5",
    interval: "8",
    maxPerPage: "5",
    maxPerSession: "20",
    
    // Images (PHASE 2)
    showProductImage: true,
    showAvatar: true,
    productImageUrl: "",
    userAvatarUrl: "",
    fallbackImageUrl: "",
    notificationIcon: "🛍️",
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
                        {getCampaignTypeLabel(campaignType)}
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
              {getThemesForCampaign().map((theme) => (
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
                  
                  {/* PHASE 2: Restore Message Template Button */}
                  {settings.messageTemplate && settings.messageTemplate !== design.headline && (
                    <Alert className="bg-primary/5 border-primary/20">
                      <AlertDescription>
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className="text-xs font-medium">Original template from Step 2</p>
                            <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                              {settings.messageTemplate}
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              updateDesign({ headline: settings.messageTemplate });
                              toast.success("Message template restored from Step 2");
                            }}
                            className="text-xs gap-1.5 shrink-0"
                          >
                            <RotateCcw className="h-3 w-3" />
                            Restore
                          </Button>
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}
                  
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
                
                {/* PHASE 1: Privacy Controls - Show Names & Locations (not for announcements) */}
                {dataSource !== 'announcements' && (
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
                )}
                
                {dataSource !== 'announcements' && dataSource !== 'live_visitors' && (
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
                )}
                
                {/* PHASE 4: Product Images Display Control (not for announcements or live_visitors) */}
                {dataSource !== 'announcements' && dataSource !== 'live_visitors' && (
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
                )}
                
                {/* CTA Button (not for announcements or live_visitors - they configure CTA in their own config) */}
                {dataSource !== 'announcements' && dataSource !== 'live_visitors' && (
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
                )}

                {/* PHASE 2: Image Configuration (not for announcements or live_visitors - they configure in their own config) */}
                {dataSource !== 'announcements' && dataSource !== 'live_visitors' && (
                  <div className="space-y-3 pt-2 border-t">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">🖼️</span>
                      <p className="text-sm font-medium">Notification Images</p>
                    </div>
                    
                    {/* Show Product Images Toggle */}
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Show Product Images</Label>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Display product thumbnails from your integration
                        </p>
                      </div>
                      <Switch
                        checked={design.showProductImage !== false}
                        onCheckedChange={(checked) => updateDesign({ showProductImage: checked })}
                      />
                    </div>

                    {/* Show User Avatars Toggle */}
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Show User Avatars</Label>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Display customer profile pictures or initials
                        </p>
                      </div>
                      <Switch
                        checked={design.showAvatar !== false}
                        onCheckedChange={(checked) => updateDesign({ showAvatar: checked })}
                      />
                    </div>

                    {/* Fallback Image URL */}
                    <div className="space-y-2">
                      <Label>Fallback Image (when data has no image)</Label>
                      <Input
                        type="url"
                        placeholder="https://example.com/default-image.png"
                        value={design.fallbackImageUrl || ""}
                        onChange={(e) => updateDesign({ fallbackImageUrl: e.target.value })}
                      />
                      {design.fallbackImageUrl && (
                        <div className="flex items-center gap-2 p-2 border rounded">
                          <img 
                            src={design.fallbackImageUrl} 
                            alt="Fallback preview" 
                            className="w-10 h-10 rounded-full object-cover"
                            onError={(e) => {
                              e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect width="40" height="40" fill="%23ddd"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="%23999" font-size="20">?</text></svg>';
                            }}
                          />
                          <span className="text-xs text-muted-foreground">Preview</span>
                        </div>
                      )}
                    </div>

                    {/* Icon/Emoji Picker for Non-Commerce Campaigns (not for announcements) */}
                    {!['recent-purchase', 'cart-additions', 'product-reviews'].includes(campaignType || '') && dataSource !== 'announcements' && (
                      <div className="space-y-2">
                        <Label>Notification Icon</Label>
                        <div className="grid grid-cols-8 gap-2">
                          {['🎉', '✅', '🔥', '⭐', '💡', '📢', '🚀', '👋', '💰', '📊', '🎯', '🏆'].map(emoji => (
                            <Button
                              key={emoji}
                              variant={design.notificationIcon === emoji ? "default" : "outline"}
                              onClick={() => updateDesign({ notificationIcon: emoji })}
                              className="text-xl p-2 h-12"
                            >
                              {emoji}
                            </Button>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Choose an icon to display when there's no product image
                        </p>
                      </div>
                    )}
                  </div>
                )}
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
                  <Label>Content Alignment</Label>
                  <Select value={design.contentAlignment || 'center'} onValueChange={(value) => updateDesign({ contentAlignment: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="top">Top</SelectItem>
                      <SelectItem value="center">Center</SelectItem>
                      <SelectItem value="bottom">Bottom</SelectItem>
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
                
                <div className="grid grid-cols-2 gap-3">
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
                        placeholder="#2563EB"
                        className="flex-1"
                      />
                    </div>
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

                {/* NEW: Border Color & Width */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Border Color</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={design.borderColor === 'transparent' ? '#ffffff' : design.borderColor}
                        onChange={(e) => updateDesign({ borderColor: e.target.value })}
                        className="w-12 h-10 p-1"
                      />
                      <Input
                        value={design.borderColor}
                        onChange={(e) => updateDesign({ borderColor: e.target.value })}
                        placeholder="transparent"
                        className="flex-1"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Border Width: {design.borderWidth}px</Label>
                    <Input
                      type="range"
                      min="0"
                      max="4"
                      value={design.borderWidth}
                      onChange={(e) => updateDesign({ borderWidth: e.target.value })}
                    />
                  </div>
                </div>

                {/* NEW: Text Alignment */}
                <div className="space-y-2">
                  <Label>Text Alignment</Label>
                  <Select value={design.textAlignment} onValueChange={(value) => updateDesign({ textAlignment: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TEXT_ALIGNMENTS.map((align) => (
                        <SelectItem key={align.value} value={align.value}>
                          {align.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* NEW: Line Height */}
                <div className="space-y-2">
                  <Label>Line Height: {design.lineHeight}</Label>
                  <Input
                    type="range"
                    min="1.2"
                    max="2.0"
                    step="0.1"
                    value={design.lineHeight}
                    onChange={(e) => updateDesign({ lineHeight: e.target.value })}
                  />
                </div>

                {/* NEW: Padding */}
                <div className="space-y-2">
                  <Label>Padding: {design.notificationPadding}px</Label>
                  <Input
                    type="range"
                    min="8"
                    max="24"
                    value={design.notificationPadding}
                    onChange={(e) => updateDesign({ notificationPadding: e.target.value })}
                  />
                </div>

                {/* NEW: Hover Effect */}
                <div className="space-y-2">
                  <Label>Hover Effect</Label>
                  <Select value={design.hoverEffect} onValueChange={(value) => updateDesign({ hoverEffect: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {HOVER_EFFECTS.map((effect) => (
                        <SelectItem key={effect.value} value={effect.value}>
                          <div className="flex flex-col">
                            <span>{effect.name}</span>
                            <span className="text-xs text-muted-foreground">{effect.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
      
      {/* Preview Dialog */}
      <PreviewOnSiteDialog
        open={showPreviewDialog}
        onClose={() => setShowPreviewDialog(false)}
      />
    </div>
  );
}
