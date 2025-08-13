import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, ArrowRight, ArrowLeft, Wand2, Globe, Zap, Target } from 'lucide-react';
import { NotificationTypeSelector } from './NotificationTypeSelector';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface WizardData {
  businessType: string;
  websiteUrl: string;
  primaryGoal: string;
  notificationTypes: string[];
  widgetStyle: {
    position: string;
    color: string;
    template: string;
  };
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
  const { toast } = useToast();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [isCreating, setIsCreating] = useState(false);
  const [wizardData, setWizardData] = useState<WizardData>({
    businessType: '',
    websiteUrl: '',
    primaryGoal: '',
    notificationTypes: [],
    widgetStyle: {
      position: 'bottom-left',
      color: '#3B82F6',
      template: 'modern-popup'
    }
  });

  const totalSteps = 4;
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
    if (!profile) return;

    setIsCreating(true);
    try {
      const widgetName = `${wizardData.businessType} Widget`;
      
      const { data, error } = await supabase
        .from('widgets')
        .insert({
          user_id: profile.id,
          name: widgetName,
          template_name: wizardData.widgetStyle.template,
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

      toast({
        title: "Widget created successfully!",
        description: "Your widget is ready to use. Copy the installation code to add it to your website.",
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
        return wizardData.notificationTypes.length > 0;
      case 4:
        return true;
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
              </div>
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
              <Zap className="h-12 w-12 text-primary mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Choose notification types</h2>
              <p className="text-muted-foreground">
                Select the types of notifications that will help achieve your goals
              </p>
            </div>

            <NotificationTypeSelector
              selectedTypes={wizardData.notificationTypes}
              onSelectionChange={(types) => updateWizardData({ notificationTypes: types })}
              maxSelections={3}
            />
          </div>
        );

      case 4:
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
        ) : (
          <Button 
            onClick={createWidget}
            disabled={!canProceed() || isCreating}
          >
            {isCreating ? 'Creating Widget...' : 'Create Widget'}
            <Wand2 className="h-4 w-4 ml-2" />
          </Button>
        )}
      </div>
    </Card>
  );
};