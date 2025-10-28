import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { CampaignTypeSelector } from "./CampaignTypeSelector";
import { DataSourceSelector } from "./DataSourceSelector";
import { DesignEditor } from "./DesignEditor";
import { RulesTargeting } from "./RulesTargeting";
import { DataMapping } from "./DataMapping";
import { ReviewActivate } from "./ReviewActivate";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CampaignWizardProps {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
}

const STEPS = [
  "Choose Campaign Type",
  "Select Data Source",
  "Design Notification",
  "Rules & Targeting",
  "Data Mapping",
  "Review & Activate",
];

export function CampaignWizard({ open, onClose, onComplete }: CampaignWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [campaignData, setCampaignData] = useState({
    name: "",
    type: "",
    data_source: "",
    settings: {},
    rules: {},
    field_map: {},
  });

  const progress = ((currentStep + 1) / STEPS.length) * 100;

  // Check for template parameter on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const templateId = urlParams.get('template');
    
    if (templateId && open) {
      fetchAndApplyTemplate(templateId);
    }
  }, [open]);

  const fetchAndApplyTemplate = async (templateId: string) => {
    try {
      const { data: template, error } = await supabase
        .from('marketplace_templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (error) throw error;

      if (template) {
        const templateConfig = typeof template.template_config === 'string' 
          ? JSON.parse(template.template_config) 
          : template.template_config;
        
        const styleConfig = typeof template.style_config === 'string'
          ? JSON.parse(template.style_config)
          : template.style_config;

        const displayRules = typeof template.display_rules === 'string'
          ? JSON.parse(template.display_rules)
          : template.display_rules;

        updateCampaignData({
          name: template.name,
          settings: { ...templateConfig, ...styleConfig },
          rules: displayRules || {},
        });

        // Also update download count
        await supabase
          .from('marketplace_templates')
          .update({ download_count: (template.download_count || 0) + 1 })
          .eq('id', templateId);

        toast.success(`Template "${template.name}" applied!`);
      }
    } catch (error) {
      console.error('Error loading template:', error);
      toast.error("Failed to load template");
    }
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleClose = () => {
    setCurrentStep(0);
    setCampaignData({
      name: "",
      type: "",
      data_source: "",
      settings: {},
      rules: {},
      field_map: {},
    });
    onClose();
  };

  const updateCampaignData = (data: Partial<typeof campaignData>) => {
    setCampaignData((prev) => ({ ...prev, ...data }));
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <CampaignTypeSelector
            selectedType={campaignData.type}
            onSelect={(type) => updateCampaignData({ type })}
          />
        );
      case 1:
        return (
          <DataSourceSelector
            selectedSource={campaignData.data_source}
            onSelect={(source) => updateCampaignData({ data_source: source })}
          />
        );
      case 2:
        return (
          <DesignEditor
            settings={campaignData.settings}
            onChange={(settings) => updateCampaignData({ settings })}
          />
        );
      case 3:
        return (
          <RulesTargeting
            rules={campaignData.rules}
            onChange={(rules) => updateCampaignData({ rules })}
          />
        );
      case 4:
        return (
          <DataMapping
            fieldMap={campaignData.field_map}
            campaignType={campaignData.type}
            onChange={(field_map) => updateCampaignData({ field_map })}
          />
        );
      case 5:
        return (
          <ReviewActivate
            campaignData={campaignData}
            onComplete={() => {
              onComplete();
              handleClose();
            }}
          />
        );
      default:
        return null;
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return campaignData.type !== "";
      case 1:
        return campaignData.data_source !== "";
      default:
        return true;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl">Create New Campaign</DialogTitle>
          <div className="space-y-2 pt-4">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Step {currentStep + 1} of {STEPS.length}</span>
              <span>{STEPS[currentStep]}</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-6">{renderStep()}</div>

        <div className="flex justify-between border-t pt-4">
          <Button variant="outline" onClick={handleBack} disabled={currentStep === 0}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={handleClose}>
              Cancel
            </Button>
            {currentStep < STEPS.length - 1 && (
              <Button onClick={handleNext} disabled={!canProceed()}>
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
