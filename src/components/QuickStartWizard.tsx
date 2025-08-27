import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, ArrowRight, ArrowLeft, Wand2, Globe, Zap, Target, Link as LinkIcon, Gift, Activity, Sparkles } from 'lucide-react';
import { NotificationTypeSelector } from './NotificationTypeSelector';
import { useAuth } from '@/hooks/useAuth';
import { useWebsites } from '@/hooks/useWebsites';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { getTemplatesByBusinessType } from '@/data/enhancedQuickWinTemplates';

interface WizardData {
  businessType: string;
  websiteUrl: string;
  primaryGoal: string;
  eventSources: {
    integrations: string[];
    quickWins: Array<{
      templateId: string;
      customData: Record<string, any>;
    }>;
    naturalEvents: boolean;
  };
  notificationTypes: string[];
  widgetStyle: {
    position: string;
    color: string;
    template: string;
  };
  widgetName: string;
}

const businessTypes = [
  { value: 'ecommerce', label: 'E-commerce Store', icon: '🛒' },
  { value: 'saas', label: 'SaaS Platform', icon: '💻' },
  { value: 'service', label: 'Service Business', icon: '🔧' },
  { value: 'education', label: 'Education/Course', icon: '🎓' },
  { value: 'agency', label: 'Agency/Consultancy', icon: '🏢' },
  { value: 'blog', label: 'Blog/Content Site', icon: '📝' },
  { value: 'nonprofit', label: 'Non-Profit', icon: '❤️' },
  { value: 'other', label: 'Other', icon: '📋' }
];

const primaryGoals = [
  { value: 'increase-conversions', label: 'Increase Conversions', description: 'Drive more sales and sign-ups' },
  { value: 'build-trust', label: 'Build Trust', description: 'Show social proof and credibility' },
  { value: 'create-urgency', label: 'Create Urgency', description: 'Encourage immediate action' },
  { value: 'engage-visitors', label: 'Engage Visitors', description: 'Keep visitors on your site longer' },
  { value: 'collect-leads', label: 'Collect Leads', description: 'Capture contact information' }
];

const templates = [
  { id: 'modern-popup', name: 'Modern Popup', preview: 'Clean notification popup' },
  { id: 'minimal-bar', name: 'Minimal Bar', preview: 'Simple horizontal notification' },
  { id: 'elegant-card', name: 'Elegant Card', preview: 'Card-style notification' }
];

interface QuickStartWizardProps {
  onComplete?: (widgetId: string) => void;
  onSkip?: () => void;
}

export const QuickStartWizard = ({ onComplete, onSkip }: QuickStartWizardProps = {}) => {
  const { profile } = useAuth();
  const { selectedWebsite } = useWebsites();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [isCreating, setIsCreating] = useState(false);
  const [wizardData, setWizardData] = useState<WizardData>({
    businessType: '',
    websiteUrl: '',
    primaryGoal: '',
    eventSources: {
      integrations: [],
      quickWins: [],
      naturalEvents: false
    },
    notificationTypes: [],
    widgetStyle: {
      position: 'bottom-left',
      color: '#3B82F6',
      template: 'modern-popup'
    },
    widgetName: ''
  });

  const totalSteps = 6;
  const progress = (currentStep / totalSteps) * 100;

  const updateWizardData = (updates: Partial<WizardData>) => {
    setWizardData(prev => ({ ...prev, ...updates }));
  };

  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const createWidget = async () => {
    if (!profile || !selectedWebsite) {
      toast({
        title: "No website selected",
        description: "Please select a website before creating a widget. Verification is required for optimal performance.",
        variant: "destructive",
      });
      return;
    }

    // Check if website is verified
    if (!selectedWebsite.is_verified) {
      toast({
        title: "Website verification required",
        description: "Please verify your website ownership before creating widgets for enhanced security and performance.",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      const widgetName = wizardData.widgetName || `${wizardData.businessType} Widget`;
      
      // Determine allowed event sources based on user selection
      const allowedSources = [];
      if (wizardData.eventSources.integrations.length > 0) allowedSources.push('integration');
      if (wizardData.eventSources.quickWins.length > 0) allowedSources.push('quick-win');
      if (wizardData.eventSources.naturalEvents) allowedSources.push('natural');
      
      const { data, error } = await supabase
        .from('widgets')
        .insert({
          user_id: profile.id,
          website_id: selectedWebsite.id,
          name: widgetName,
          template_name: wizardData.widgetStyle.template,
          notification_types: wizardData.notificationTypes,
          allowed_event_sources: allowedSources.length > 0 ? allowedSources : ['quick-win'],
          allow_fallback_content: false, // No fallback for new unified widgets
          style_config: {
            position: wizardData.widgetStyle.position,
            color: wizardData.widgetStyle.color,
            delay: 3000
          },
          display_rules: {
            show_duration_ms: 5000,
            interval_ms: 8000,
            max_per_page: 5,
            max_per_session: 20,
            triggers: {
              min_time_on_page_ms: 2000,
              scroll_depth_pct: 0,
              exit_intent: false,
            },
            enforce_verified_only: false,
            url_allowlist: wizardData.websiteUrl ? [wizardData.websiteUrl] : [],
            url_denylist: [],
            referrer_allowlist: [],
            referrer_denylist: [],
            geo_allowlist: [],
            geo_denylist: [],
          },
          status: 'active'
        })
        .select()
        .single();

      if (error) throw error;

      // Create quick-win events if selected
      if (wizardData.eventSources.quickWins.length > 0) {
        // Get templates for the business type and create 2-3 default events
        const templates = getTemplatesByBusinessType(wizardData.businessType);
        const defaultEvents = templates.slice(0, 3).map((template, index) => ({
          widget_id: data.id,
          event_type: template.event_type,
          event_data: {
            message: template.template_message,
            metadata: template.default_metadata,
            template_id: template.id,
            quick_win: true
          },
          source: 'quick_win' as const,
          status: 'approved' as const,
          business_type: wizardData.businessType as any,
          created_at: new Date(Date.now() - (index * 1000 * 60 * 5)).toISOString() // Stagger by 5 minutes
        }));

        const { error: eventsError } = await supabase
          .from('events')
          .insert(defaultEvents);

        if (eventsError) {
          console.error('Error creating quick-win events:', eventsError);
        } else {
          console.log(`Created ${defaultEvents.length} quick-win events for widget ${data.id}`);
        }
      }

      toast({
        title: "Widget created successfully!",
        description: `Created widget with ${wizardData.eventSources.quickWins.length > 0 ? 'quick-win events' : 'event sources'} ready to go`,
      });

      onComplete?.(data.id);
    } catch (error) {
      console.error('Error creating widget:', error);
      toast({
        title: "Error",
        description: "Failed to create widget. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return wizardData.businessType && wizardData.websiteUrl;
      case 2:
        return wizardData.primaryGoal;
      case 3:
        const hasEventSource = wizardData.eventSources.integrations.length > 0 || 
                              wizardData.eventSources.quickWins.length > 0 || 
                              wizardData.eventSources.naturalEvents;
        return hasEventSource;
      case 4:
        return wizardData.notificationTypes.length > 0;
      case 5:
        return true;
      case 6:
        return wizardData.widgetName.trim().length > 0;
      default:
        return false;
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Globe className="h-12 w-12 text-primary mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Tell us about your business</h2>
              <p className="text-muted-foreground">
                Help us customize the perfect widget for your website
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="businessType">What type of business do you have?</Label>
                <Select 
                  value={wizardData.businessType} 
                  onValueChange={(value) => updateWizardData({ businessType: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select your business type" />
                  </SelectTrigger>
                  <SelectContent>
                    {businessTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <span>{type.icon}</span>
                          <span>{type.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="websiteUrl">What's your website URL?</Label>
                <Input
                  id="websiteUrl"
                  value={wizardData.websiteUrl}
                  onChange={(e) => updateWizardData({ websiteUrl: e.target.value })}
                  placeholder="https://yourwebsite.com"
                  type="url"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  This should match your selected website: {selectedWebsite?.domain}
                </p>
              </div>

              {/* Website Verification Status */}
              {selectedWebsite && (
                <div className="p-3 border rounded-lg bg-muted/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm">Selected Website: {selectedWebsite.name}</div>
                      <div className="text-xs text-muted-foreground">{selectedWebsite.domain}</div>
                    </div>
                    <Badge variant={selectedWebsite.is_verified ? "default" : "destructive"}>
                      {selectedWebsite.is_verified ? "✓ Verified" : "⚠ Unverified"}
                    </Badge>
                  </div>
                  {!selectedWebsite.is_verified && (
                    <div className="mt-2 text-xs text-amber-600 bg-amber-50 p-2 rounded border">
                      Website verification is recommended for enhanced security and performance. You can verify after creating the widget.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Target className="h-12 w-12 text-primary mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">What's your primary goal?</h2>
              <p className="text-muted-foreground">
                Choose your main objective to get personalized recommendations
              </p>
            </div>

            <div className="grid gap-3">
              {primaryGoals.map((goal) => (
                <Card 
                  key={goal.value}
                  className={`cursor-pointer transition-all ${
                    wizardData.primaryGoal === goal.value 
                      ? 'ring-2 ring-primary border-primary bg-primary/5' 
                      : 'hover:shadow-md hover:border-primary/50'
                  }`}
                  onClick={() => updateWizardData({ primaryGoal: goal.value })}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{goal.label}</CardTitle>
                      {wizardData.primaryGoal === goal.value && (
                        <CheckCircle className="h-5 w-5 text-primary" />
                      )}
                    </div>
                    <CardDescription>{goal.description}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <LinkIcon className="h-12 w-12 text-primary mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Configure Event Sources</h2>
              <p className="text-muted-foreground">
                Choose how your widget will get real events to display
              </p>
            </div>

            <div className="grid gap-4">
              {/* Integrations Option */}
              <Card 
                className={`cursor-pointer transition-all ${
                  wizardData.eventSources.integrations.length > 0
                    ? 'ring-2 ring-primary border-primary bg-primary/5' 
                    : 'hover:shadow-md hover:border-primary/50'
                }`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <LinkIcon className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <CardTitle className="text-base">Integrations</CardTitle>
                        <CardDescription>Connect to your existing platforms</CardDescription>
                      </div>
                    </div>
                    {wizardData.eventSources.integrations.length > 0 && (
                      <CheckCircle className="h-5 w-5 text-primary" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Automatically pull real events from your business platforms
                  </p>
                  
                  {/* Expandable integration options */}
                  <div className="space-y-2">
                    {['Shopify', 'WooCommerce', 'Stripe', 'Google Analytics', 'Mailchimp'].map((integration) => (
                      <div key={integration} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                        <span className="text-sm">{integration}</span>
                        <input
                          type="checkbox"
                          checked={wizardData.eventSources.integrations.includes(integration.toLowerCase())}
                          onChange={(e) => {
                            const integrations = e.target.checked
                              ? [...wizardData.eventSources.integrations, integration.toLowerCase()]
                              : wizardData.eventSources.integrations.filter(i => i !== integration.toLowerCase());
                            updateWizardData({ 
                              eventSources: { 
                                ...wizardData.eventSources, 
                                integrations 
                              } 
                            });
                          }}
                          className="rounded"
                        />
                      </div>
                    ))}
                  </div>
                </CardHeader>
              </Card>

              {/* Quick-Wins Option */}
              <Card 
                className={`cursor-pointer transition-all ${
                  wizardData.eventSources.quickWins.length > 0
                    ? 'ring-2 ring-primary border-primary bg-primary/5' 
                    : 'hover:shadow-md hover:border-primary/50'
                }`}
                onClick={() => {
                  // Show available templates for business type
                  const businessTypeTemplates = getTemplatesByBusinessType(wizardData.businessType);
                  const defaultTemplate = businessTypeTemplates[0];
                  
                  const newQuickWins = wizardData.eventSources.quickWins.length > 0 
                    ? [] 
                    : defaultTemplate ? [{
                        templateId: defaultTemplate.id,
                        customData: defaultTemplate.default_metadata
                      }] : [];
                  
                  updateWizardData({ 
                    eventSources: { 
                      ...wizardData.eventSources, 
                      quickWins: newQuickWins 
                    } 
                  });
                }}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <Gift className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <CardTitle className="text-base">Quick-Wins (60+ Templates)</CardTitle>
                        <CardDescription>Launch real marketing campaigns</CardDescription>
                      </div>
                    </div>
                    {wizardData.eventSources.quickWins.length > 0 && (
                      <CheckCircle className="h-5 w-5 text-primary" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Create real offers and promotions from 60+ performance-optimized templates.
                  </p>
                  {wizardData.eventSources.quickWins.length > 0 && (
                    <div className="mt-2 text-xs bg-green-50 text-green-700 p-2 rounded border">
                      <Sparkles className="h-3 w-3 inline mr-1" />
                      Will auto-select {getTemplatesByBusinessType(wizardData.businessType).slice(0, 3).length} templates for {wizardData.businessType} business
                    </div>
                  )}
                  
                  {/* Show template preview */}
                  {wizardData.businessType && (
                    <div className="mt-3 text-xs text-muted-foreground">
                      <span className="font-medium">Available for {wizardData.businessType}:</span>
                      <div className="mt-1 space-y-1">
                        {getTemplatesByBusinessType(wizardData.businessType).slice(0, 3).map((template, idx) => (
                          <div key={idx} className="bg-muted/30 p-2 rounded text-xs">
                            • {template.name}: {template.description}
                          </div>
                        ))}
                        {getTemplatesByBusinessType(wizardData.businessType).length > 3 && (
                          <div className="text-center text-primary font-medium">
                            +{getTemplatesByBusinessType(wizardData.businessType).length - 3} more templates available
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardHeader>
              </Card>

              {/* Natural Events Option */}
              <Card 
                className={`cursor-pointer transition-all ${
                  wizardData.eventSources.naturalEvents
                    ? 'ring-2 ring-primary border-primary bg-primary/5' 
                    : 'hover:shadow-md hover:border-primary/50'
                }`}
                onClick={() => {
                  updateWizardData({ 
                    eventSources: { 
                      ...wizardData.eventSources, 
                      naturalEvents: !wizardData.eventSources.naturalEvents 
                    } 
                  });
                }}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <Activity className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <CardTitle className="text-base">Natural Events</CardTitle>
                        <CardDescription>Track real user interactions</CardDescription>
                      </div>
                    </div>
                    {wizardData.eventSources.naturalEvents && (
                      <CheckCircle className="h-5 w-5 text-primary" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Monitor signups, purchases, and page visits directly from your website.
                  </p>
                </CardHeader>
              </Card>
            </div>

            {/* Selected Sources Summary */}
            {(wizardData.eventSources.integrations.length > 0 || 
              wizardData.eventSources.quickWins.length > 0 || 
              wizardData.eventSources.naturalEvents) && (
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Selected Event Sources:</h4>
                <div className="space-y-1 text-sm">
                  {wizardData.eventSources.integrations.length > 0 && (
                    <div>✅ Integrations: Ready to connect your platforms</div>
                  )}
                  {wizardData.eventSources.quickWins.length > 0 && (
                    <div>✅ Marketing Offers: {wizardData.eventSources.quickWins.length} offer(s) configured</div>
                  )}
                  {wizardData.eventSources.naturalEvents && (
                    <div>✅ Natural Events: Will track real user interactions</div>
                  )}
                </div>
              </div>
            )}
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Zap className="h-12 w-12 text-primary mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Choose notification types</h2>
              <p className="text-muted-foreground">
                Select the types of notifications compatible with your event sources
              </p>
            </div>

            <NotificationTypeSelector
              selectedTypes={wizardData.notificationTypes}
              onSelectionChange={(types) => updateWizardData({ notificationTypes: types })}
              maxSelections={3}
            />
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Wand2 className="h-12 w-12 text-primary mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Customize your widget</h2>
              <p className="text-muted-foreground">
                Choose how your widget will look and behave
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label>Widget Template</Label>
                  <div className="grid gap-2 mt-2">
                    {templates.map((template) => (
                      <Card
                        key={template.id}
                        className={`cursor-pointer p-3 ${
                          wizardData.widgetStyle.template === template.id
                            ? 'ring-2 ring-primary border-primary'
                            : 'hover:border-primary/50'
                        }`}
                        onClick={() => updateWizardData({ 
                          widgetStyle: { ...wizardData.widgetStyle, template: template.id }
                        })}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{template.name}</div>
                            <div className="text-sm text-muted-foreground">{template.preview}</div>
                          </div>
                          {wizardData.widgetStyle.template === template.id && (
                            <CheckCircle className="h-4 w-4 text-primary" />
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>

                <div>
                  <Label htmlFor="position">Position</Label>
                  <Select 
                    value={wizardData.widgetStyle.position} 
                    onValueChange={(value) => updateWizardData({ 
                      widgetStyle: { ...wizardData.widgetStyle, position: value }
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bottom-left">Bottom Left</SelectItem>
                      <SelectItem value="bottom-right">Bottom Right</SelectItem>
                      <SelectItem value="top-left">Top Left</SelectItem>
                      <SelectItem value="top-right">Top Right</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="color">Primary Color</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      type="color"
                      value={wizardData.widgetStyle.color}
                      onChange={(e) => updateWizardData({ 
                        widgetStyle: { ...wizardData.widgetStyle, color: e.target.value }
                      })}
                      className="w-16 h-10"
                    />
                    <Input
                      value={wizardData.widgetStyle.color}
                      onChange={(e) => updateWizardData({ 
                        widgetStyle: { ...wizardData.widgetStyle, color: e.target.value }
                      })}
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label>Preview</Label>
                <div className="bg-muted rounded-lg p-6 mt-2 min-h-[200px] relative">
                  <div 
                    className={`absolute p-3 bg-background border rounded-lg shadow-lg max-w-xs ${
                      wizardData.widgetStyle.position.includes('bottom') ? 'bottom-4' : 'top-4'
                    } ${
                      wizardData.widgetStyle.position.includes('right') ? 'right-4' : 'left-4'
                    }`}
                    style={{ borderLeftColor: wizardData.widgetStyle.color, borderLeftWidth: '4px' }}
                  >
                    <div className="text-sm">
                      🛒 Someone from New York just purchased Pro Plan
                    </div>
                  </div>
                  <div className="text-center text-muted-foreground">
                    Website Preview
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Wand2 className="h-12 w-12 text-primary mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Name your widget</h2>
              <p className="text-muted-foreground">
                Give your widget a descriptive name for easy management
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="widgetName">Widget Name</Label>
                <Input
                  id="widgetName"
                  value={wizardData.widgetName}
                  onChange={(e) => updateWizardData({ widgetName: e.target.value })}
                  placeholder={`${wizardData.businessType || 'My'} Social Proof Widget`}
                  required
                />
              </div>

              {/* Widget Summary */}
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-3">Widget Summary</h4>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">Business Type:</div>
                    <div className="font-medium">{wizardData.businessType || 'Not specified'}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Primary Goal:</div>
                    <div className="font-medium">{wizardData.primaryGoal || 'Not specified'}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Event Sources:</div>
                    <div className="font-medium">
                      {wizardData.eventSources.integrations.length > 0 && 'Integrations '}
                      {wizardData.eventSources.quickWins.length > 0 && 'Marketing Offers '}
                      {wizardData.eventSources.naturalEvents && 'Natural Events'}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Notification Types:</div>
                    <div className="font-medium">{wizardData.notificationTypes.length} selected</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Wand2 className="h-5 w-5" />
              Quick Start Wizard
            </CardTitle>
            <CardDescription>
              Get your first widget up and running in minutes
            </CardDescription>
          </div>
          <Button variant="ghost" onClick={onSkip}>
            Skip Setup
          </Button>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Step {currentStep} of {totalSteps}</span>
            <span>{Math.round(progress)}% complete</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </CardHeader>

      <CardContent className="min-h-[400px]">
        {renderStep()}
      </CardContent>

      <div className="flex items-center justify-between p-6 border-t">
        <Button 
          variant="outline" 
          onClick={prevStep}
          disabled={currentStep === 1}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Previous
        </Button>

        <div className="flex gap-2">
          {Array.from({ length: totalSteps }, (_, index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full ${
                index < currentStep 
                  ? 'bg-primary' 
                  : index === currentStep - 1
                  ? 'bg-primary/50'
                  : 'bg-muted'
              }`}
            />
          ))}
        </div>

        {currentStep < totalSteps ? (
          <Button 
            onClick={nextStep}
            disabled={!canProceed()}
          >
            Next
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        ) : currentStep === totalSteps ? (
          <Button 
            onClick={createWidget}
            disabled={!canProceed() || isCreating}
          >
            {isCreating ? 'Creating Widget...' : 'Create Widget'}
            <Wand2 className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button 
            onClick={nextStep}
            disabled={!canProceed()}
          >
            Next
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </div>
    </Card>
  );
};