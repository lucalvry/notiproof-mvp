import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, ArrowRight, Sparkles, Globe } from "lucide-react";
import { toast } from "sonner";
import { useWebsites } from "@/hooks/useWebsites";
import { useOnboarding } from "@/hooks/useOnboarding";
import { getPopularBusinessTypes, getAllBusinessTypes, getCategoryLabel, suggestBusinessType } from "@/lib/businessTypes";

interface WebsiteStepProps {
  userId: string;
  onComplete: (website: any) => void;
  onBack: () => void;
  existingWebsite?: any;
}

export function WebsiteStep({ userId, onComplete, onBack, existingWebsite }: WebsiteStepProps) {
  const { addWebsiteAsync } = useWebsites(userId);
  const { updateMilestone } = useOnboarding();
  
  const [websiteData, setWebsiteData] = useState({
    name: existingWebsite?.name || "",
    domain: existingWebsite?.domain || "",
    businessType: existingWebsite?.business_type || "",
  });
  const [isCreating, setIsCreating] = useState(false);
  const [showAllBusinessTypes, setShowAllBusinessTypes] = useState(false);
  const [suggestedBusinessType, setSuggestedBusinessType] = useState<string | null>(null);

  const popularBusinessTypes = getPopularBusinessTypes();
  const allBusinessTypes = getAllBusinessTypes();

  const suggestBusinessTypeFromInput = () => {
    if (websiteData.name || websiteData.domain) {
      const suggestion = suggestBusinessType(`${websiteData.name} ${websiteData.domain}`);
      if (suggestion) {
        setSuggestedBusinessType(suggestion);
      }
    }
  };

  const handleSubmit = async () => {
    if (!websiteData.name || !websiteData.domain || !websiteData.businessType) {
      toast.error("Please fill in all fields");
      return;
    }

    // If we already have an existing website, just continue
    if (existingWebsite) {
      onComplete(existingWebsite);
      return;
    }

    setIsCreating(true);
    try {
      const website = await addWebsiteAsync({
        name: websiteData.name,
        domain: websiteData.domain,
        business_type: websiteData.businessType,
      });

      if (!website || !website.id) {
        throw new Error('Website created but data is missing');
      }

      await updateMilestone('website_added', true);
      toast.success('Website added!');
      onComplete(website);
      
    } catch (error: any) {
      console.error('Error creating website:', error);
      toast.error(error.message || 'Failed to create website');
    } finally {
      setIsCreating(false);
    }
  };

  const isValid = websiteData.name && websiteData.domain && websiteData.businessType;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-2 -ml-2 mb-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-primary/10 p-3">
            <Globe className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Add Your Website</h2>
            <p className="text-muted-foreground">Tell us about your website to personalize your experience</p>
          </div>
        </div>
      </div>

      {/* Form */}
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

              {showAllBusinessTypes && allBusinessTypes.map((typeMetadata) => (
                !popularBusinessTypes.some(p => p.value === typeMetadata.value) && (
                  <SelectItem key={typeMetadata.value} value={typeMetadata.value}>
                    {getCategoryLabel(typeMetadata.value)}
                  </SelectItem>
                )
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Continue Button */}
      <Button
        onClick={handleSubmit}
        disabled={!isValid || isCreating}
        className="w-full gap-2"
        size="lg"
      >
        {isCreating ? "Creating..." : "Continue"}
        <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
