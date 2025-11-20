import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CampaignTypeSelector } from "./CampaignTypeSelector";
import { DesignEditor } from "./DesignEditor";
import { RulesTargeting } from "./RulesTargeting";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CampaignEditorProps {
  campaignId: string;
  open: boolean;
  onClose: () => void;
  onSave: () => void;
}

export function CampaignEditor({ campaignId, open, onClose, onSave }: CampaignEditorProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [campaignName, setCampaignName] = useState("");
  const [campaignData, setCampaignData] = useState<any>({
    type: "",
    data_sources: [],
    settings: {},
    rules: {},
  });

  useEffect(() => {
    if (open && campaignId) {
      loadCampaign();
    }
  }, [open, campaignId]);

  const loadCampaign = async () => {
    try {
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .eq("id", campaignId)
        .single();

      if (error) throw error;

      setCampaignName(data.name);
      const displayRules = data.display_rules as any;
      const dataSources = Array.isArray(data.data_sources) ? data.data_sources as any[] : [];
      
      setCampaignData({
        type: data.campaign_type || "notification",
        data_sources: dataSources,
        template_id: data.template_id,
        template_mapping: data.template_mapping || {},
        priority: data.priority || 100,
        frequency_cap: data.frequency_cap || { per_user: 1, per_session: 1, cooldown_seconds: 600 },
        schedule: data.schedule || {},
        settings: displayRules || {},
        rules: {
          frequency: displayRules?.interval_ms ? displayRules.interval_ms / 1000 : 10,
          sessionLimit: displayRules?.max_per_session || 5,
          pageTargeting: "all-pages",
          deviceTargeting: "both",
          startDate: data.start_date,
          endDate: data.end_date,
        },
      });
    } catch (error) {
      console.error("Error loading campaign:", error);
      toast.error("Failed to load campaign");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!campaignName) {
      toast.error("Please enter a campaign name");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("campaigns")
        .update({
          name: campaignName,
          campaign_type: campaignData.type,
          data_sources: campaignData.data_sources || [],
          template_id: campaignData.template_id || null,
          template_mapping: campaignData.template_mapping || {},
          priority: campaignData.priority || 100,
          frequency_cap: campaignData.frequency_cap,
          schedule: campaignData.schedule,
          display_rules: {
            ...campaignData.settings,
            frequency: campaignData.rules?.frequency,
            sessionLimit: campaignData.rules?.sessionLimit,
            interval_ms: (campaignData.rules?.frequency || 10) * 1000,
            max_per_session: campaignData.rules?.sessionLimit || 5,
          },
          start_date: campaignData.rules?.startDate || null,
          end_date: campaignData.rules?.endDate || null,
        })
        .eq("id", campaignId);

      if (error) throw error;

      toast.success("Campaign updated successfully");
      onSave();
      onClose();
    } catch (error) {
      console.error("Error updating campaign:", error);
      toast.error("Failed to update campaign");
    } finally {
      setSaving(false);
    }
  };

  const updateCampaignData = (updates: any) => {
    setCampaignData((prev: any) => ({ ...prev, ...updates }));
  };

  const steps = [
    { number: 1, title: "Campaign Type", component: CampaignTypeSelector },
    { number: 2, title: "Design", component: DesignEditor },
    { number: 3, title: "Rules & Targeting", component: RulesTargeting },
  ];

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl">
          <div className="flex items-center justify-center h-64">
            <p>Loading campaign...</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Campaign</DialogTitle>
          <DialogDescription>
            Update your campaign settings - Step {step} of {steps.length}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {step === steps.length && (
            <div className="space-y-2">
              <Label htmlFor="campaign-name">Campaign Name</Label>
              <Input
                id="campaign-name"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                placeholder="e.g., Holiday Sales Campaign"
              />
            </div>
          )}

          {step === 1 && (
            <CampaignTypeSelector
              selectedType={campaignData.type}
              onSelect={(type: string) => updateCampaignData({ type })}
            />
          )}

          {step === 2 && (
            <DesignEditor
              settings={campaignData.settings}
              onChange={(settings: any) => updateCampaignData({ settings })}
            />
          )}

          {step === 3 && (
            <RulesTargeting
              rules={campaignData.rules}
              onChange={(rules: any) => updateCampaignData({ rules })}
            />
          )}

          <div className="flex justify-between gap-3">
            <Button
              variant="outline"
              onClick={() => setStep(step - 1)}
              disabled={step === 1}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>

            {step < steps.length ? (
              <Button onClick={() => setStep(step + 1)}>
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
