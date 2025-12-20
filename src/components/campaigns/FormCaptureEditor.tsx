import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CardDescription, Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { FormCaptureTemplateStep } from "./steps/FormCaptureTemplateStep";
import { ContentAlignmentSelector, ContentAlignment } from "./ContentAlignmentSelector";
import { NotificationStyleEditor, NotificationStyleSettings } from "./NotificationStyleEditor";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  const [contentAlignment, setContentAlignment] = useState<ContentAlignment>(integrationSettings?.content_alignment || 'top');
  const [styleSettings, setStyleSettings] = useState<NotificationStyleSettings>({
    backgroundColor: integrationSettings?.backgroundColor || '#ffffff',
    textColor: integrationSettings?.textColor || '#1a1a1a',
    primaryColor: integrationSettings?.primaryColor || '#2563EB',
    borderRadius: integrationSettings?.borderRadius || 12,
    shadow: integrationSettings?.shadow || 'md',
    fontSize: integrationSettings?.fontSize || 14,
    fontFamily: integrationSettings?.fontFamily || 'system',
  });

  // Reset form when dialog opens with new settings
  useEffect(() => {
    if (open && integrationSettings) {
      setFormType(integrationSettings.form_type || null);
      setMessageTemplate(integrationSettings.message_template || "{{name}} just signed up!");
      setAvatar(integrationSettings.avatar || "📧");
      setFieldMappings(integrationSettings.field_mappings || {});
      setContentAlignment(integrationSettings.content_alignment || 'top');
      setStyleSettings({
        backgroundColor: integrationSettings.backgroundColor || '#ffffff',
        textColor: integrationSettings.textColor || '#1a1a1a',
        primaryColor: integrationSettings.primaryColor || '#2563EB',
        borderRadius: integrationSettings.borderRadius || 12,
        shadow: integrationSettings.shadow || 'md',
        fontSize: integrationSettings.fontSize || 14,
        fontFamily: integrationSettings.fontFamily || 'system',
      });
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
        content_alignment: contentAlignment,
        // Style settings
        backgroundColor: styleSettings.backgroundColor,
        textColor: styleSettings.textColor,
        primaryColor: styleSettings.primaryColor,
        borderRadius: styleSettings.borderRadius,
        shadow: styleSettings.shadow,
        fontSize: styleSettings.fontSize,
        fontFamily: styleSettings.fontFamily,
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

      // Update widget style_config with all style settings
      const { data: widget } = await supabase
        .from("widgets")
        .select("id, style_config")
        .eq("campaign_id", campaignId)
        .single();

      if (widget) {
        const existingConfig = (widget.style_config as any) || {};
        await supabase
          .from("widgets")
          .update({
            style_config: {
              ...existingConfig,
              contentAlignment: contentAlignment,
              backgroundColor: styleSettings.backgroundColor,
              textColor: styleSettings.textColor,
              primaryColor: styleSettings.primaryColor,
              borderRadius: styleSettings.borderRadius,
              shadow: styleSettings.shadow,
              fontSize: styleSettings.fontSize,
              fontFamily: styleSettings.fontFamily,
            },
          })
          .eq("id", widget.id);
      }

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

        <Tabs defaultValue="content" className="py-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="content">Content & Template</TabsTrigger>
            <TabsTrigger value="styling">Notification Styling</TabsTrigger>
          </TabsList>

          <TabsContent value="content" className="space-y-4 mt-4">
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
            
            {formType && (
              <Card>
                <CardContent className="pt-6">
                  <ContentAlignmentSelector
                    value={contentAlignment}
                    onChange={setContentAlignment}
                  />
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="styling" className="mt-4">
            <Card>
              <CardContent className="pt-6">
                <NotificationStyleEditor
                  value={styleSettings}
                  onChange={setStyleSettings}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

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
