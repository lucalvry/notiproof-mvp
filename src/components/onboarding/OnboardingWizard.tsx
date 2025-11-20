import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useOnboardingState } from "@/hooks/useOnboardingState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  Sparkles,
  Zap,
  AlertCircle,
  RefreshCw
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useWebsites } from "@/hooks/useWebsites";
import { getPopularBusinessTypes, getAllBusinessTypes, getBusinessTypesByCategory, getCategoryLabel, suggestBusinessType } from "@/lib/businessTypes";
import { CampaignWizard } from "@/components/campaigns/CampaignWizard";
import { OnboardingSuccess } from "@/components/onboarding/OnboardingSuccess";
import confetti from "canvas-confetti";

interface OnboardingWizardProps {
  open: boolean;
  onComplete: () => void;
  planName: string;
  userId: string;
}

export function OnboardingWizard({ open, onComplete, planName, userId }: OnboardingWizardProps) {
  const navigate = useNavigate();
  const { addWebsiteAsync } = useWebsites(userId);
  const { updateMilestone } = useOnboardingState(userId);
  
  // State management
  const [currentStep, setCurrentStep] = useState(1);
  const [websiteData, setWebsiteData] = useState({
    name: "",
    domain: "",
    businessType: "",
  });
  const [createdWebsite, setCreatedWebsite] = useState<any>(null);
  const [isCreatingWebsite, setIsCreatingWebsite] = useState(false);
  const [showAllBusinessTypes, setShowAllBusinessTypes] = useState(false);
  const [suggestedBusinessType, setSuggestedBusinessType] = useState<string | null>(null);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set([1]));
  const [websiteVerificationStatus, setWebsiteVerificationStatus] = useState<'checking' | 'verified' | 'pending'>('checking');
  const [campaignWizardOpen, setCampaignWizardOpen] = useState(false);
  const [campaignCreated, setCampaignCreated] = useState(false);

  const totalSteps = 5; // Simplified: Welcome, Website, Campaign Wizard, Widget, Success
  const popularBusinessTypes = getPopularBusinessTypes();
  const allBusinessTypes = getAllBusinessTypes();
  const businessTypesByCategory = getBusinessTypesByCategory();
  const progress = (currentStep / totalSteps) * 100;

  // Check website verification status when Step 4 loads
  useEffect(() => {
    if (currentStep === 4 && createdWebsite?.id) {
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

  const handleCreateWebsite = async () => {
    if (!websiteData.name || !websiteData.domain || !websiteData.businessType) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsCreatingWebsite(true);
    try {
      const website = await addWebsiteAsync({
        name: websiteData.name,
        domain: websiteData.domain,
        business_type: websiteData.businessType,
      });

      if (!website || !website.id) {
        throw new Error('Website created but data is missing');
      }

      setCreatedWebsite(website);
      setCompletedSteps(prev => new Set([...prev, 2]));

      // Update milestone
      try {
        await updateMilestone('websites_added', true);
      } catch (milestoneError) {
        console.error('Failed to update milestone (non-critical):', milestoneError);
      }

      toast.success('Website added successfully!', { duration: 1000 });
      setTimeout(() => setCurrentStep(3), 100);
      
    } catch (error: any) {
      console.error('Error creating website:', error);
      toast.error(error.message || 'Failed to create website. Please try again.');
    } finally {
      setIsCreatingWebsite(false);
    }
  };

  const handleCampaignWizardComplete = () => {
    setCampaignWizardOpen(false);
    setCampaignCreated(true);
    setCompletedSteps(prev => new Set([...prev, 3]));
    
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
    
    toast.success('Campaign created successfully!');
    setTimeout(() => setCurrentStep(4), 500);
  };

  const handleComplete = () => {
    onComplete();
    if (createdWebsite) {
      navigate(`/campaigns?website=${createdWebsite.id}`);
    } else {
      navigate('/campaigns');
    }
  };

  const suggestBusinessTypeFromInput = () => {
    if (websiteData.name || websiteData.domain) {
      const suggestion = suggestBusinessType(`${websiteData.name} ${websiteData.domain}`);
      if (suggestion) {
        setSuggestedBusinessType(suggestion);
      }
    }
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
              <h2 className="text-2xl font-bold">Welcome to NotiProof! 🎉</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                Let's get you set up in just a few steps. We'll help you create your first social proof notification campaign.
              </p>
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Globe className="h-5 w-5 text-primary" />
                      <span className="text-sm">Add your website</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Megaphone className="h-5 w-5 text-primary" />
                      <span className="text-sm">Create your first campaign</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Code className="h-5 w-5 text-primary" />
                      <span className="text-sm">Install the widget code</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">Add Your Website</h2>
              <p className="text-muted-foreground">
                Tell us about your website to personalize your experience
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="website-name">Website Name *</Label>
                <Input
                  id="website-name"
                  placeholder="My Awesome Site"
                  value={websiteData.name}
                  onChange={(e) => setWebsiteData({ ...websiteData, name: e.target.value })}
                  onBlur={suggestBusinessTypeFromInput}
                />
              </div>

              <div>
                <Label htmlFor="website-domain">Domain *</Label>
                <Input
                  id="website-domain"
                  placeholder="example.com"
                  value={websiteData.domain}
                  onChange={(e) => setWebsiteData({ ...websiteData, domain: e.target.value })}
                  onBlur={suggestBusinessTypeFromInput}
                />
              </div>

              <div>
                <Label htmlFor="business-type">Business Type *</Label>
                {suggestedBusinessType && !websiteData.businessType && (
                  <div className="mb-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setWebsiteData({ ...websiteData, businessType: suggestedBusinessType })}
                      className="gap-2"
                    >
                      <Sparkles className="h-4 w-4" />
                      Use suggestion: {getCategoryLabel(suggestedBusinessType)}
                    </Button>
                  </div>
                )}
                <Select 
                  value={websiteData.businessType} 
                  onValueChange={(value) => setWebsiteData({ ...websiteData, businessType: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select your business type" />
                  </SelectTrigger>
                  <SelectContent>
                    <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">Popular</div>
                    {popularBusinessTypes.map((typeMetadata) => (
                      <SelectItem key={typeMetadata.value} value={typeMetadata.value}>
                        {getCategoryLabel(typeMetadata.value)}
                      </SelectItem>
                    ))}
                    
                    {!showAllBusinessTypes && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full mt-2"
                        onClick={() => setShowAllBusinessTypes(true)}
                      >
                        Show all business types
                      </Button>
                    )}

                    {showAllBusinessTypes && (
                      <>
                        {Object.entries(businessTypesByCategory).map(([category, types]) => (
                          <div key={category}>
                            <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
                              {category}
                            </div>
                            {types.map((typeMetadata) => (
                              <SelectItem key={typeMetadata.value} value={typeMetadata.value}>
                                {getCategoryLabel(typeMetadata.value)}
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

            <Button
              onClick={handleCreateWebsite}
              disabled={isCreatingWebsite || !websiteData.name || !websiteData.domain || !websiteData.businessType}
              className="w-full"
            >
              {isCreatingWebsite ? "Creating..." : "Continue"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="rounded-full bg-primary/10 p-4">
                  <Megaphone className="h-12 w-12 text-primary" />
                </div>
              </div>
              <h2 className="text-2xl font-bold">Create Your First Campaign</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                Let's set up your first social proof notification campaign using our guided wizard.
              </p>
            </div>

            {!campaignCreated ? (
              <Card className="bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    Campaign Wizard
                  </CardTitle>
                  <CardDescription>
                    Our wizard will help you choose integrations, templates, and configure your campaign
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={() => setCampaignWizardOpen(true)}
                    className="w-full gap-2"
                    size="lg"
                  >
                    <Zap className="h-5 w-5" />
                    Launch Campaign Wizard
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-8 w-8 text-green-600" />
                    <div>
                      <p className="font-semibold">Campaign Created!</p>
                      <p className="text-sm text-muted-foreground">Ready to install the widget</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Button
              onClick={() => setCurrentStep(4)}
              disabled={!campaignCreated}
              className="w-full"
            >
              Continue to Widget Installation
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">Install Widget Code</h2>
              <p className="text-muted-foreground">
                Add this code snippet to your website to start showing notifications
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Code className="h-5 w-5" />
                  Installation Code
                </CardTitle>
                <CardDescription>
                  Add this code before the closing {"</body>"} tag
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                    <code>{`<script src="https://cdn.notiproof.com/widget.js"></script>
<script>
  NotiProof.init({
    websiteId: "${createdWebsite?.id || 'your-website-id'}"
  });
</script>`}</code>
                  </pre>
                  <Button
                    variant="outline"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `<script src="https://cdn.notiproof.com/widget.js"></script>\n<script>\n  NotiProof.init({\n    websiteId: "${createdWebsite?.id || 'your-website-id'}"\n  });\n</script>`
                      );
                      toast.success("Code copied to clipboard!");
                    }}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy
                  </Button>
                </div>

                <div className="flex items-start gap-2 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                  <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-blue-900 dark:text-blue-100">
                      Need help installing?
                    </p>
                    <p className="text-blue-700 dark:text-blue-300 mt-1">
                      Check our{" "}
                      <a
                        href="https://docs.notiproof.com/installation"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline hover:no-underline"
                      >
                        installation guide
                      </a>{" "}
                      for platform-specific instructions.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Verification Status</CardTitle>
              </CardHeader>
              <CardContent>
                {websiteVerificationStatus === 'checking' && (
                  <div className="flex items-center gap-3">
                    <RefreshCw className="h-5 w-5 animate-spin text-primary" />
                    <span className="text-sm text-muted-foreground">Checking for widget...</span>
                  </div>
                )}
                {websiteVerificationStatus === 'verified' && (
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <span className="text-sm font-medium text-green-700 dark:text-green-400">
                      Widget detected! Your site is live.
                    </span>
                  </div>
                )}
                {websiteVerificationStatus === 'pending' && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <AlertCircle className="h-5 w-5 text-amber-600" />
                      <span className="text-sm text-muted-foreground">
                        Widget not detected yet
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={checkWebsiteVerification}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Check Again
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Button onClick={() => setCurrentStep(5)} className="w-full">
              Continue
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        );

      case 5:
        return (
          <OnboardingSuccess
            websiteName={createdWebsite?.name || ""}
            websiteDomain={createdWebsite?.domain || ""}
            onGoToDashboard={handleComplete}
          />
        );

      default:
        return null;
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onComplete}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {currentStep === 1 && "Welcome"}
              {currentStep === 2 && "Website Setup"}
              {currentStep === 3 && "Campaign Creation"}
              {currentStep === 4 && "Widget Installation"}
              {currentStep === 5 && "Success!"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Step {currentStep} of {totalSteps}</span>
                <span>{Math.round(progress)}% Complete</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            {renderStepContent()}

            {currentStep > 1 && currentStep < 5 && (
              <Button
                variant="ghost"
                onClick={() => setCurrentStep(currentStep - 1)}
                className="w-full"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Campaign Wizard Modal */}
      {createdWebsite && (
        <CampaignWizard
          open={campaignWizardOpen}
          onClose={() => setCampaignWizardOpen(false)}
          onComplete={handleCampaignWizardComplete}
        />
      )}
    </>
  );
}
