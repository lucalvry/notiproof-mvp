import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useOnboardingState } from "@/hooks/useOnboardingState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  CheckCircle2, 
  Globe, 
  Megaphone, 
  Code, 
  PartyPopper, 
  ArrowRight, 
  ArrowLeft,
  Copy,
  ExternalLink,
  Sparkles,
  Star,
  Download,
  Eye,
  Zap,
  Link2,
  AlertCircle,
  RefreshCw
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useWebsites } from "@/hooks/useWebsites";
import { getPopularBusinessTypes, getAllBusinessTypes, getBusinessTypesByCategory, getCategoryLabel, suggestBusinessType } from "@/lib/businessTypes";
import { CampaignTypeSelector } from "@/components/campaigns/CampaignTypeSelector";
import { IntegrationPathSelector } from "@/components/onboarding/IntegrationPathSelector";
import { OnboardingSuccess } from "@/components/onboarding/OnboardingSuccess";
import confetti from "canvas-confetti";

interface OnboardingWizardProps {
  open: boolean;
  onComplete: () => void;
  planName: string;
  userId: string;
}

interface Template {
  id: string;
  name: string;
  description: string | null;
  category_name?: string;
  download_count: number;
  rating_average: number | null;
  template_config: any;
  style_config?: any;
  display_rules?: any;
}

export function OnboardingWizard({ open, onComplete, planName, userId }: OnboardingWizardProps) {
  const navigate = useNavigate();
  const { addWebsiteAsync } = useWebsites(userId);
  const { updateMilestone } = useOnboardingState(userId);
  const [currentStep, setCurrentStep] = useState(1);
  const [websiteData, setWebsiteData] = useState({
    name: "",
    domain: "",
    businessType: "",
  });
  const [createdWebsite, setCreatedWebsite] = useState<any>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [isCreatingWebsite, setIsCreatingWebsite] = useState(false);
  const [showAllBusinessTypes, setShowAllBusinessTypes] = useState(false);
  const [suggestedBusinessType, setSuggestedBusinessType] = useState<string | null>(null);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [selectedCampaignType, setSelectedCampaignType] = useState("");
  const [selectedIntegrationPath, setSelectedIntegrationPath] = useState("");
  const [createdCampaign, setCreatedCampaign] = useState<any>(null);
  const [createdWidget, setCreatedWidget] = useState<any>(null);
  const [isCreatingCampaign, setIsCreatingCampaign] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set([1]));
  const [websiteVerificationStatus, setWebsiteVerificationStatus] = useState<'checking' | 'verified' | 'pending'>('checking');

  const totalSteps = 7;
  const popularBusinessTypes = getPopularBusinessTypes();
  const allBusinessTypes = getAllBusinessTypes();
  const businessTypesByCategory = getBusinessTypesByCategory();
  const progress = (currentStep / totalSteps) * 100;

  // Preload templates when step 2 is reached to avoid race condition
  useEffect(() => {
    if (open && currentStep >= 2 && templates.length === 0 && !isLoadingTemplates) {
      fetchTemplates();
    }
  }, [open, currentStep]);

  // Check website verification status when Step 7 loads
  useEffect(() => {
    if (currentStep === 7 && createdWebsite?.id) {
      checkWebsiteVerification();
    }
  }, [currentStep, createdWebsite]);

  const checkWebsiteVerification = async () => {
    if (!createdWebsite?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('websites')
        .select('is_verified, last_verification_at')
        .eq('id', createdWebsite.id)
        .single();
      
      if (error) throw error;
      
      setWebsiteVerificationStatus(data.is_verified ? 'verified' : 'pending');
    } catch (error) {
      console.error('Error checking verification:', error);
      setWebsiteVerificationStatus('pending');
    }
  };

  const fetchTemplates = async () => {
    setIsLoadingTemplates(true);
    try {
      const { data, error } = await supabase
        .from('marketplace_templates')
        .select('*')
        .eq('is_public', true)
        .order('download_count', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.error('Failed to load templates, but you can continue');
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  const handleCreateWebsite = async () => {
    if (!websiteData.name || !websiteData.domain || !websiteData.businessType) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsCreatingWebsite(true);
    try {
      console.log('Creating website...');
      const website = await addWebsiteAsync({
        name: websiteData.name,
        domain: websiteData.domain,
        business_type: websiteData.businessType,
      });

      if (!website || !website.id) {
        throw new Error('Website created but data is missing');
      }

      console.log('Website created successfully:', website.id);
      setCreatedWebsite(website);
      setCompletedSteps(prev => new Set([...prev, 2]));

      // Update milestone (non-blocking)
      try {
        await updateMilestone('websites_added', true);
        console.log('Milestone updated successfully');
      } catch (milestoneError) {
        console.error('Failed to update milestone (non-critical):', milestoneError);
        // Don't block progression if milestone fails
      }

      console.log('Advancing to step 3...');
      toast.success('Website added successfully!', { duration: 1000 });
      
      // Small delay to ensure state updates before advancing
      setTimeout(() => {
        setCurrentStep(3);
        console.log('Advanced to step 3');
      }, 100);
      
    } catch (error: any) {
      console.error('Error creating website:', error);
      toast.error(error.message || 'Failed to create website. Please try again.');
    } finally {
      setIsCreatingWebsite(false);
    }
  };

  const handleSkipStep = () => {
    // Only allow skipping step 1 (welcome) - steps 2-5 are critical
    if (currentStep === 1 && currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const canProceedToStep = (targetStep: number): boolean => {
    // Check if all required steps before target are complete
    if (targetStep > 2 && !completedSteps.has(2)) return false; // Need website
    if (targetStep > 3 && !completedSteps.has(3)) return false; // Need campaign type
    if (targetStep > 4 && !completedSteps.has(4)) return false; // Need integration path
    if (targetStep > 5 && !completedSteps.has(5)) return false; // Need template
    return true;
  };

  const handleCreateCampaignAndWidget = async () => {
    // Phase 1: Enhanced validation with specific error messages
    if (!createdWebsite) {
      toast.error("Please add a website first");
      setCurrentStep(2);
      return;
    }
    
    if (!selectedCampaignType || selectedCampaignType === "") {
      toast.error("Please select a campaign type first");
      setCurrentStep(3);
      return;
    }
    
    if (!selectedIntegrationPath || selectedIntegrationPath === "") {
      toast.error("Please select how you want to connect data");
      setCurrentStep(4);
      return;
    }
    
    if (!selectedTemplate) {
      toast.error("Please choose a template first");
      setCurrentStep(5);
      return;
    }

    setIsCreatingCampaign(true);
    console.log('[OnboardingWizard] Starting campaign creation with:', {
      websiteId: createdWebsite.id,
      campaignType: selectedCampaignType,
      integrationPath: selectedIntegrationPath,
      templateId: selectedTemplate.id
    });
    try {
      toast.loading("Creating your campaign...");
      
      // Step 1: Create Campaign with default values
      const campaignData = {
        user_id: userId!,
        name: `${selectedTemplate.name} Campaign`,
        description: `Auto-created from onboarding for ${createdWebsite.name}`,
        status: 'active' as const,
        website_id: createdWebsite.id,
        data_source: 'manual' as const,
        display_rules: selectedTemplate.display_rules || { devices: ['desktop', 'mobile'], pages: ['all'] },
        auto_repeat: false,
        repeat_config: {},
      };
      
      console.log('[OnboardingWizard] Creating campaign with data:', campaignData);
      
      const { data: campaign, error: campaignError } = await supabase
        .from('campaigns')
        .insert([campaignData])
        .select()
        .single();

      if (campaignError) {
        console.error('[OnboardingWizard] Campaign creation error:', campaignError);
        throw new Error(`Failed to create campaign: ${campaignError.message}`);
      }
      
      console.log('[OnboardingWizard] Campaign created successfully:', campaign.id);
      setCreatedCampaign(campaign);

      // Step 2: Create Widget with default values
      const widgetData = {
        user_id: userId,
        website_id: createdWebsite.id,
        campaign_id: campaign.id,
        name: `${websiteData.name} - ${selectedTemplate.name}`,
        template_name: selectedTemplate.name.toLowerCase().replace(/\s+/g, '_'),
        style_config: selectedTemplate.style_config || { position: 'bottom-left', theme: 'light' },
        display_rules: selectedTemplate.display_rules || { devices: ['desktop', 'mobile'], pages: ['all'] },
        status: 'active' as const,
      };
      
      console.log('[OnboardingWizard] Creating widget with data:', widgetData);
      
      const { data: widget, error: widgetError } = await supabase
        .from('widgets')
        .insert(widgetData)
        .select()
        .single();

      if (widgetError) {
        console.error('[OnboardingWizard] Widget creation error:', widgetError);
        throw new Error(`Failed to create widget: ${widgetError.message}`);
      }
      
      console.log('[OnboardingWizard] Widget created successfully:', widget.id);
      setCreatedWidget(widget);

      // Step 3: Generate Demo Data if user selected demo path
      if (selectedIntegrationPath === 'demo') {
        const demoEvents = generateDemoEvents(selectedCampaignType, websiteData.businessType);
        
        const eventsToInsert = demoEvents.map((eventData, index) => ({
          widget_id: widget.id,
          event_type: selectedCampaignType,
          event_data: eventData,
          source: 'demo' as const,
          status: 'approved' as const,
          business_type: websiteData.businessType as any,
          message_template: eventData.message,
          created_at: new Date(Date.now() - (index * 3600000)).toISOString(), // Hourly intervals
        }));

        const { error: eventsError } = await supabase
          .from('events')
          .insert(eventsToInsert);

        if (eventsError) {
          console.error('Error creating demo events:', eventsError);
          // Non-critical, continue anyway
        }
      }

      // Step 4: Update milestones (non-blocking)
      try {
        await updateMilestone('campaigns_created', true);
        await updateMilestone('widget_installed', true);
      } catch (milestoneError) {
        console.error('Failed to update milestones (non-critical):', milestoneError);
        // Don't block progression if milestone fails
      }

      toast.dismiss();
      toast.success("🎉 Campaign and widget created successfully!");
      
      // Trigger confetti celebration
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
      
      // Advance to success screen
      setCompletedSteps(prev => new Set([...prev, 6]));
      setCurrentStep(7);
      
    } catch (error: any) {
      // Phase 4: Enhanced error handling
      console.error('[OnboardingWizard] Error creating campaign:', {
        error: error,
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        currentState: {
          websiteId: createdWebsite?.id,
          campaignType: selectedCampaignType,
          integrationPath: selectedIntegrationPath,
          templateId: selectedTemplate?.id
        }
      });
      
      toast.dismiss();
      
      // If campaign and/or widget were created, still advance to success
      if (createdCampaign || createdWidget) {
        setCompletedSteps(prev => new Set([...prev, 6]));
        setCurrentStep(7);
        
        if (createdCampaign && createdWidget) {
          toast.success("Campaign and widget created! (Note: Some settings may need adjustment)", { duration: 4000 });
        } else if (createdCampaign) {
          toast.warning("Campaign created but widget setup incomplete. You can create a widget manually.", { duration: 5000 });
        } else if (createdWidget) {
          toast.warning("Widget created but campaign setup incomplete. You can create a campaign manually.", { duration: 5000 });
        }
        return;
      }
      
      // Provide specific error messages based on error type
      let errorMessage = "Failed to create campaign. ";
      
      if (error?.message?.includes('campaign')) {
        errorMessage += "There was an issue creating the campaign. Please try again or contact support.";
      } else if (error?.message?.includes('widget')) {
        errorMessage += "Campaign was created but widget setup failed. Please create a widget manually.";
      } else if (error?.message?.includes('permission') || error?.message?.includes('policy')) {
        errorMessage += "Permission denied. Please refresh the page and try again.";
      } else {
        errorMessage += error?.message || "Please try again.";
      }
      
      toast.error(errorMessage, { duration: 5000 });
    } finally {
      setIsCreatingCampaign(false);
    }
  };

  const handleComplete = () => {
    onComplete();
    
    // Navigate to campaign details if campaign was created
    if (createdCampaign) {
      navigate(`/campaign-details/${createdCampaign.id}`);
    } else if (createdWebsite) {
      navigate(`/campaigns?website=${createdWebsite.id}`);
    } else {
      navigate('/websites');
    }
  };

  const generateDemoEvents = (campaignType: string, businessType: string) => {
    const demoTemplates: Record<string, any[]> = {
      'recent_purchase': [
        { message: 'Sarah M. from Lagos just purchased Premium Plan', customer: 'Sarah M.', location: 'Lagos, Nigeria', product: 'Premium Plan' },
        { message: 'John D. from Abuja bought Pro Package 12 minutes ago', customer: 'John D.', location: 'Abuja, Nigeria', product: 'Pro Package' },
        { message: 'Ada K. from Port Harcourt purchased Starter Kit', customer: 'Ada K.', location: 'Port Harcourt, Nigeria', product: 'Starter Kit' },
        { message: 'Emeka O. just bought Advanced Bundle', customer: 'Emeka O.', location: 'Enugu, Nigeria', product: 'Advanced Bundle' },
        { message: 'Chioma N. from Kano purchased Business Plan', customer: 'Chioma N.', location: 'Kano, Nigeria', product: 'Business Plan' },
      ],
      'recent_signup': [
        { message: 'Tunde A. from Accra just signed up', name: 'Tunde A.', location: 'Accra, Ghana' },
        { message: 'Ngozi P. joined from Lagos 8 minutes ago', name: 'Ngozi P.', location: 'Lagos, Nigeria' },
        { message: 'David M. just created an account', name: 'David M.', location: 'Ibadan, Nigeria' },
        { message: 'Fatima B. from Kano signed up', name: 'Fatima B.', location: 'Kano, Nigeria' },
        { message: 'Yemi S. just joined from Abuja', name: 'Yemi S.', location: 'Abuja, Nigeria' },
      ],
      'live_visitor_count': [
        { message: '47 people are viewing this page right now', count: 47 },
        { message: '52 active visitors browsing your site', count: 52 },
        { message: '38 people currently online', count: 38 },
      ],
      'social_proof_counter': [
        { message: '5,234 happy customers trust us', metric: 'customers', count: 5234 },
        { message: '892 five-star reviews and counting', metric: 'reviews', count: 892 },
        { message: 'Join 3,456 satisfied users', metric: 'users', count: 3456 },
      ],
      'recent_review': [
        { message: '"Amazing product! Highly recommend" - Bola A. ⭐⭐⭐⭐⭐', reviewer: 'Bola A.', rating: 5, review: 'Amazing product! Highly recommend' },
        { message: '"Best service I\'ve used in years" - Kemi L. ⭐⭐⭐⭐⭐', reviewer: 'Kemi L.', rating: 5, review: 'Best service I\'ve used in years' },
        { message: '"Outstanding quality and support" - Chidi O. ⭐⭐⭐⭐⭐', reviewer: 'Chidi O.', rating: 5, review: 'Outstanding quality and support' },
      ],
    };

    // Return demo data for the campaign type, or default to recent_purchase
    return demoTemplates[campaignType] || demoTemplates['recent_purchase'];
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6 py-6">
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="rounded-full bg-primary/10 p-4">
                  <PartyPopper className="h-12 w-12 text-primary" />
                </div>
              </div>
              <div>
                <h2 className="text-3xl font-bold mb-2">Welcome to NotiProof! 🎉</h2>
                <p className="text-muted-foreground text-lg">
                  Let's get you set up in just a few steps
                </p>
              </div>
            </div>

            <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-4">
                  <CheckCircle2 className="h-6 w-6 text-success" />
                  <div>
                    <p className="font-semibold text-lg">Your {planName} trial has started</p>
                    <p className="text-sm text-muted-foreground">14 days free, cancel anytime</p>
                  </div>
                </div>
                <div className="space-y-2 ml-9">
                  <p className="text-sm">✓ Unlimited widgets during trial</p>
                  <p className="text-sm">✓ All premium features included</p>
                  <p className="text-sm">✓ No credit card required to cancel</p>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-3">
              <h3 className="font-semibold text-center mb-4">What you'll set up:</h3>
              <div className="grid gap-3">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Globe className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Add your website</p>
                    <p className="text-sm text-muted-foreground">Connect your domain</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Zap className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Choose campaign type</p>
                    <p className="text-sm text-muted-foreground">Select what to showcase</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Link2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Connect your data</p>
                    <p className="text-sm text-muted-foreground">Integration or manual</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Megaphone className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Choose a template</p>
                    <p className="text-sm text-muted-foreground">Pick from proven designs</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Code className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Install the widget</p>
                    <p className="text-sm text-muted-foreground">Simple copy & paste</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button onClick={handleSkipStep} variant="outline" className="flex-1">
                Skip Setup
              </Button>
              <Button onClick={() => setCurrentStep(2)} className="flex-1 gap-2">
                Let's Get Started
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6 py-6">
            <div className="text-center space-y-2">
              <div className="flex justify-center mb-4">
                <div className="rounded-full bg-primary/10 p-3">
                  <Globe className="h-8 w-8 text-primary" />
                </div>
              </div>
              <h2 className="text-2xl font-bold">Add Your Website</h2>
              <p className="text-muted-foreground">
                Tell us about your website to get started
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="website-name">Website Name *</Label>
                <Input
                  id="website-name"
                  placeholder="e.g., My Store"
                  value={websiteData.name}
                  onChange={(e) => setWebsiteData({ ...websiteData, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="website-domain">Domain *</Label>
                <Input
                  id="website-domain"
                  placeholder="e.g., example.com"
                  value={websiteData.domain}
                  onChange={(e) => {
                    const domain = e.target.value;
                    setWebsiteData({ ...websiteData, domain });
                    
                    // Smart suggestion based on domain
                    if (domain.length > 3) {
                      const suggestion = suggestBusinessType(domain);
                      if (suggestion && !websiteData.businessType) {
                        setSuggestedBusinessType(suggestion);
                        toast.info(`Detected ${getPopularBusinessTypes().find(t => t.value === suggestion)?.label} business type`);
                      }
                    }
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  Enter your domain without http:// or https://
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="business-type">Business Type *</Label>
                {suggestedBusinessType && !websiteData.businessType && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full mb-2"
                    onClick={() => {
                      setWebsiteData({ ...websiteData, businessType: suggestedBusinessType });
                      setSuggestedBusinessType(null);
                    }}
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Use suggested: {popularBusinessTypes.find(t => t.value === suggestedBusinessType)?.label}
                  </Button>
                )}
                <Select
                  value={websiteData.businessType}
                  onValueChange={(value) => setWebsiteData({ ...websiteData, businessType: value })}
                >
                  <SelectTrigger id="business-type">
                    <SelectValue placeholder="Select your business type" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {!showAllBusinessTypes ? (
                      <>
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                          Popular Types
                        </div>
                        {popularBusinessTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full mt-1"
                          onClick={() => setShowAllBusinessTypes(true)}
                        >
                          View all {allBusinessTypes.length} types
                        </Button>
                      </>
                    ) : (
                      <>
                        {Object.entries(businessTypesByCategory).map(([category, types]) => (
                          <div key={category}>
                            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                              {getCategoryLabel(category)}
                            </div>
                            {types.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </div>
                        ))}
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button onClick={() => setCurrentStep(1)} variant="outline" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <Button 
                onClick={handleCreateWebsite} 
                className="flex-1 gap-2"
                disabled={isCreatingWebsite || !websiteData.name || !websiteData.domain || !websiteData.businessType}
              >
                {isCreatingWebsite ? "Creating..." : "Add Website"}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6 py-6">
            <div className="text-center space-y-2">
              <div className="flex justify-center mb-4">
                <div className="rounded-full bg-primary/10 p-3">
                  <Zap className="h-8 w-8 text-primary" />
                </div>
              </div>
              <h2 className="text-2xl font-bold">Choose Campaign Type</h2>
              <p className="text-muted-foreground">
                What kind of social proof do you want to showcase?
              </p>
            </div>

            <div className="max-h-[400px] overflow-y-auto pr-2">
              <CampaignTypeSelector
                selectedType={selectedCampaignType}
                onSelect={setSelectedCampaignType}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button onClick={() => setCurrentStep(2)} variant="outline" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <Button 
                onClick={() => {
                  if (!selectedCampaignType) {
                    toast.error("Please select a campaign type");
                    return;
                  }
                  setCompletedSteps(prev => new Set([...prev, 3]));
                  setCurrentStep(4);
                }} 
                className="flex-1 gap-2"
                disabled={!selectedCampaignType}
              >
                Continue
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6 py-6">
            <div className="text-center space-y-2">
              <div className="flex justify-center mb-4">
                <div className="rounded-full bg-primary/10 p-3">
                  <Link2 className="h-8 w-8 text-primary" />
                </div>
              </div>
              <h2 className="text-2xl font-bold">Connect Your Data</h2>
              <p className="text-muted-foreground">
                How would you like to populate your campaign?
              </p>
            </div>

            <IntegrationPathSelector
              campaignType={selectedCampaignType}
              selectedPath={selectedIntegrationPath}
              onSelect={setSelectedIntegrationPath}
            />

            <div className="flex gap-3 pt-4">
              <Button onClick={() => setCurrentStep(3)} variant="outline" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <Button 
                onClick={() => {
                  if (!selectedIntegrationPath) {
                    toast.error("Please select an integration path");
                    return;
                  }
                  setCompletedSteps(prev => new Set([...prev, 4]));
                  setCurrentStep(5);
                }} 
                className="flex-1 gap-2"
                disabled={!selectedIntegrationPath}
              >
                Continue
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6 py-6">
            <div className="text-center space-y-2">
              <div className="flex justify-center mb-4">
                <div className="rounded-full bg-primary/10 p-3">
                  <Megaphone className="h-8 w-8 text-primary" />
                </div>
              </div>
              <h2 className="text-2xl font-bold">Choose a Template</h2>
              <p className="text-muted-foreground">
                Start with a proven template or create from scratch
              </p>
            </div>

            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
              {templates.map((template) => (
                <Card 
                  key={template.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedTemplate?.id === template.id ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => setSelectedTemplate(template)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-base">{template.name}</CardTitle>
                        <CardDescription className="text-sm mt-1">
                          {template.description}
                        </CardDescription>
                      </div>
                      {selectedTemplate?.id === template.id && (
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        <span>{template.rating_average?.toFixed(1) || 'N/A'}</span>
                      </div>
                      <span>•</span>
                      <div className="flex items-center gap-1">
                        <Download className="h-3 w-3" />
                        <span>{template.download_count} uses</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex gap-3 pt-4">
              <Button onClick={() => setCurrentStep(4)} variant="outline" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <Button 
                onClick={() => {
                  if (!selectedTemplate) {
                    toast.error("Please select a template");
                    return;
                  }
                  setCompletedSteps(prev => new Set([...prev, 5]));
                  setCurrentStep(6);
                }} 
                className="flex-1 gap-2"
                disabled={!selectedTemplate}
              >
                Continue
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-6 py-6">
            <div className="text-center space-y-2">
              <div className="flex justify-center mb-4">
                <div className="rounded-full bg-primary/10 p-3">
                  <Code className="h-8 w-8 text-primary" />
                </div>
              </div>
              <h2 className="text-2xl font-bold">Install Your Widget</h2>
              <p className="text-muted-foreground">
                Copy this code and paste it before the closing {`</body>`} tag
              </p>
            </div>

            {createdWebsite ? (
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Installation Code</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="rounded-lg bg-muted p-4 font-mono text-sm break-all">
                        {`<script src="${window.location.origin}/widget.js" data-site-token="${createdWebsite.verification_token}"></script>`}
                      </div>
                      <Button
                        onClick={() => {
                          const code = `<script src="${window.location.origin}/widget.js" data-site-token="${createdWebsite.verification_token}"></script>`;
                          navigator.clipboard.writeText(code);
                          toast.success("Code copied to clipboard!");
                        }}
                        variant="outline"
                        className="w-full gap-2"
                      >
                        <Copy className="h-4 w-4" />
                        Copy Installation Code
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="pt-6">
                    <div className="space-y-3 text-sm">
                      <p className="font-semibold">Quick Installation Tips:</p>
                      <ul className="space-y-2 ml-4">
                        <li className="flex items-start gap-2">
                          <span className="text-primary mt-0.5">•</span>
                          <span>Paste before {`</body>`} tag in your HTML</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-primary mt-0.5">•</span>
                          <span>Works with all website builders (WordPress, Shopify, etc.)</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-primary mt-0.5">•</span>
                          <span>Widget will appear automatically once installed</span>
                        </li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>

                <Button 
                  variant="outline" 
                  className="w-full gap-2"
                  onClick={() => window.open('https://docs.notiproof.com/installation', '_blank')}
                >
                  <ExternalLink className="h-4 w-4" />
                  View Detailed Installation Guide
                </Button>
              </div>
            ) : (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground">
                    Create a website first to get your installation code
                  </p>
                  <Button onClick={() => setCurrentStep(2)} className="mt-4" variant="outline">
                    Go Back to Add Website
                  </Button>
                </CardContent>
              </Card>
            )}

            <div className="flex gap-3 pt-4">
              <Button onClick={() => setCurrentStep(5)} variant="outline" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <Button 
                onClick={handleCreateCampaignAndWidget} 
                className="flex-1 gap-2"
                disabled={isCreatingCampaign}
              >
                {isCreatingCampaign ? "Creating Campaign..." : "Finish Setup"}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        );

      case 7:
        return (
          <div className="space-y-6 py-6">
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="rounded-full bg-success/10 p-4 animate-pulse">
                  <Sparkles className="h-16 w-16 text-success" />
                </div>
              </div>
              <div>
                <h2 className="text-3xl font-bold mb-2">You're All Set! 🎉</h2>
                <p className="text-muted-foreground text-lg">
                  Your NotiProof account is ready to go
                </p>
              </div>
            </div>

            <Card className={`bg-gradient-to-br ${
              websiteVerificationStatus === 'verified' 
                ? 'from-success/10 to-primary/10 border-success/20' 
                : 'from-orange-500/10 to-yellow-500/10 border-orange-500/20'
            }`}>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
                    <p className="text-sm">
                      <span className="font-semibold">Trial activated:</span> 14 days of {planName} features
                    </p>
                  </div>
                  {createdWebsite && (
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
                      <p className="text-sm">
                        <span className="font-semibold">Website added:</span> {createdWebsite.domain}
                      </p>
                    </div>
                  )}
                  {createdCampaign && (
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
                      <p className="text-sm">
                        <span className="font-semibold">Campaign created:</span> {createdCampaign.name}
                      </p>
                    </div>
                  )}
                  {createdWidget && (
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
                      <p className="text-sm">
                        <span className="font-semibold">Widget activated:</span> {createdWidget.name}
                      </p>
                    </div>
                  )}
                  {selectedIntegrationPath === 'demo' && createdWidget && (
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
                      <p className="text-sm">
                        <span className="font-semibold">Demo data loaded:</span> 5 sample notifications
                      </p>
                    </div>
                  )}
                  
                  {/* Verification Status Check */}
                  {createdWebsite && (
                    <div className="flex items-center gap-3 pt-2 border-t mt-4">
                      {websiteVerificationStatus === 'checking' && (
                        <>
                          <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin shrink-0" />
                          <p className="text-sm">
                            <span className="font-semibold">Checking website verification...</span>
                          </p>
                        </>
                      )}
                      {websiteVerificationStatus === 'verified' && (
                        <>
                          <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
                          <p className="text-sm">
                            <span className="font-semibold text-success">Website verified!</span> Widget is live on your site
                          </p>
                        </>
                      )}
                      {websiteVerificationStatus === 'pending' && (
                        <>
                          <AlertCircle className="h-5 w-5 text-orange-500 shrink-0" />
                          <div className="text-sm">
                            <p className="font-semibold text-orange-700">Widget not detected yet</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Install the code snippet on your website to activate notifications
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Conditional Help Card for Pending Verification */}
            {websiteVerificationStatus === 'pending' && createdWebsite && (
              <Card className="border-orange-500/30 bg-orange-50 dark:bg-orange-950/20">
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Code className="h-4 w-4" />
                    Quick Installation Reminder
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm space-y-2">
                    <p className="font-semibold">To activate your widget:</p>
                    <ol className="list-decimal list-inside space-y-1 text-muted-foreground ml-2">
                      <li>Copy the installation code</li>
                      <li>Paste it before the {`</body>`} tag on your website</li>
                      <li>Clear your website cache if using caching plugins</li>
                      <li>Refresh your website to see notifications appear</li>
                    </ol>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        const code = `<script src="${window.location.origin}/widget.js" data-site-token="${createdWebsite.verification_token}"></script>`;
                        navigator.clipboard.writeText(code);
                        toast.success("Installation code copied!");
                      }}
                      variant="outline"
                      size="sm"
                      className="gap-2"
                    >
                      <Copy className="h-3 w-3" />
                      Copy Code
                    </Button>
                    
                    <Button
                      onClick={() => {
                        setWebsiteVerificationStatus('checking');
                        checkWebsiteVerification();
                      }}
                      variant="outline"
                      size="sm"
                      className="gap-2"
                    >
                      <RefreshCw className="h-3 w-3" />
                      Check Again
                    </Button>
                  </div>
                  
                  <p className="text-xs text-muted-foreground">
                    💡 <span className="font-semibold">Note:</span> If you've installed the code but it's not detected, try clearing your website's cache.
                  </p>
                </CardContent>
              </Card>
            )}

            <OnboardingSuccess
              websiteName={websiteData.name}
              websiteDomain={createdWebsite?.domain || websiteData.domain}
              campaignName={createdCampaign?.name}
              campaignId={createdCampaign?.id}
              eventsCount={selectedIntegrationPath === 'demo' ? 5 : 0}
              onViewWebsite={
                createdWebsite 
                  ? () => window.open(`https://${createdWebsite.domain}`, '_blank')
                  : undefined
              }
              onViewAnalytics={
                createdCampaign
                  ? () => navigate(`/campaign-details/${createdCampaign.id}`)
                  : undefined
              }
              onCreateCampaign={() => {
                onComplete();
                navigate('/campaigns');
              }}
              onInviteTeam={() => {
                onComplete();
                navigate('/settings');
              }}
              onGoToDashboard={handleComplete}
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent 
        className="sm:max-w-2xl max-h-[90vh] overflow-y-auto"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="sr-only">Setup Wizard</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Step {currentStep} of {totalSteps}</span>
              <span className="font-medium">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Step Content */}
          {renderStepContent()}
        </div>
      </DialogContent>
    </Dialog>
  );
}
