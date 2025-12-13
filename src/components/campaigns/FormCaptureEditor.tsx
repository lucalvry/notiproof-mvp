import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { FormCaptureTemplateStep } from "./steps/FormCaptureTemplateStep";

interface FormCaptureEditorProps {
  campaignId: string;
  websiteId: string;
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  integrationSettings?: any;
}

export function FormCaptureEditor({
  campaignId,
  websiteId,
  open,
  onClose,
  onSave,
  integrationSettings = {},
}: FormCaptureEditorProps) {
  const [saving, setSaving] = useState(false);
  const [formType, setFormType] = useState<string | null>(integrationSettings?.form_type || null);
  const [messageTemplate, setMessageTemplate] = useState(integrationSettings?.message_template || "{{name}} just signed up!");
  const [avatar, setAvatar] = useState(integrationSettings?.avatar || "📧");
  const [fieldMappings, setFieldMappings] = useState<Record<string, string>>(integrationSettings?.field_mappings || {});

  // Reset form when dialog opens with new settings
  useEffect(() => {
    if (open && integrationSettings) {
      setFormType(integrationSettings.form_type || null);
      setMessageTemplate(integrationSettings.message_template || "{{name}} just signed up!");
      setAvatar(integrationSettings.avatar || "📧");
      setFieldMappings(integrationSettings.field_mappings || {});
    }
  }, [open, integrationSettings]);

  const handleSave = async () => {
    if (!formType) {
      toast.error("Please select a form type");
      return;
    }

    setSaving(true);
    try {
      const updatedSettings = {
        ...integrationSettings,
        form_type: formType,
        message_template: messageTemplate,
        avatar: avatar,
        field_mappings: fieldMappings,
      };

      const { error } = await supabase
        .from("campaigns")
        .update({
          integration_settings: updatedSettings,
          native_config: updatedSettings,
          updated_at: new Date().toISOString(),
        })
        .eq("id", campaignId);

      if (error) throw error;

      toast.success("Form capture campaign updated successfully");
      onSave();
      onClose();
    } catch (error) {
      console.error("Error updating form capture campaign:", error);
      toast.error("Failed to update campaign");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Form Capture Campaign</DialogTitle>
          <CardDescription>
            Configure how form submissions appear as notifications
          </CardDescription>
        </DialogHeader>

        <div className="py-4">
          <FormCaptureTemplateStep
            websiteId={websiteId}
            selectedFormType={formType}
            messageTemplate={messageTemplate}
            avatar={avatar}
            fieldMappings={fieldMappings}
            onFormTypeSelect={setFormType}
            onMessageTemplateChange={setMessageTemplate}
            onAvatarChange={setAvatar}
            onFieldMappingsChange={setFieldMappings}
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !formType}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
