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
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Info } from "lucide-react";

type SourceMode = 'all' | 'type' | 'integration';

interface FormCaptureIntegration {
  id: string;
  name: string;
  config: {
    target_url?: string;
    form_type?: string;
  };
}

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
  const [sourceMode, setSourceMode] = useState<SourceMode>(integrationSettings?.source_mode || 'type');
  const [selectedIntegrationId, setSelectedIntegrationId] = useState<string | null>(integrationSettings?.integration_id || null);
  const [integrations, setIntegrations] = useState<FormCaptureIntegration[]>([]);
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

  // Fetch available form capture integrations
  useEffect(() => {
    async function loadIntegrations() {
      if (!websiteId || !open) return;
      
      const { data, error } = await supabase
        .from('integration_connectors')
        .select('id, name, config')
        .eq('website_id', websiteId)
        .eq('integration_type', 'form_hook')
        .eq('status', 'active');
      
      if (error) {
        console.error('Error loading integrations:', error);
        return;
      }
      
      setIntegrations((data || []).map(item => ({
        id: item.id,
        name: item.name,
        config: (item.config as any) || {},
      })));
    }
    
    loadIntegrations();
  }, [websiteId, open]);

  // Reset form when dialog opens with new settings
  useEffect(() => {
    if (open && integrationSettings) {
      setSourceMode(integrationSettings.source_mode || 'type');
      setSelectedIntegrationId(integrationSettings.integration_id || null);
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
    // Validate based on source mode
    if (sourceMode === 'type' && !formType) {
      toast.error("Please select a form type");
      return;
    }
    if (sourceMode === 'integration' && !selectedIntegrationId) {
      toast.error("Please select a form integration");
      return;
    }

    setSaving(true);
    try {
      const updatedSettings = {
        ...integrationSettings,
        source_mode: sourceMode,
        integration_id: sourceMode === 'integration' ? selectedIntegrationId : null,
        preserve_original_message: sourceMode === 'all',
        form_type: sourceMode === 'type' ? formType : null,
        message_template: sourceMode !== 'all' ? messageTemplate : null,
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

  const canSave = () => {
    if (sourceMode === 'all') return true;
    if (sourceMode === 'type') return !!formType;
    if (sourceMode === 'integration') return !!selectedIntegrationId;
    return false;
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
            {/* Form Source Selection */}
            <Card>
              <CardContent className="pt-6 space-y-4">
                <Label className="text-base font-semibold">Form Source</Label>
                
                <RadioGroup 
                  value={sourceMode} 
                  onValueChange={(value) => setSourceMode(value as SourceMode)}
                  className="space-y-3"
                >
                  <div className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                    <RadioGroupItem value="all" id="all-forms" className="mt-1" />
                    <div className="flex-1">
                      <Label htmlFor="all-forms" className="font-medium cursor-pointer">All Forms</Label>
                      <p className="text-sm text-muted-foreground">
                        Show all captured forms with their original messages from integration rules
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                    <RadioGroupItem value="type" id="by-type" className="mt-1" />
                    <div className="flex-1">
                      <Label htmlFor="by-type" className="font-medium cursor-pointer">By Form Type</Label>
                      <p className="text-sm text-muted-foreground">
                        Group by type (newsletter, registration, contact, etc.) with a custom template
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                    <RadioGroupItem value="integration" id="specific-form" className="mt-1" />
                    <div className="flex-1">
                      <Label htmlFor="specific-form" className="font-medium cursor-pointer">Specific Form</Label>
                      <p className="text-sm text-muted-foreground">
                        Show submissions from a specific form capture rule only
                      </p>
                    </div>
                  </div>
                </RadioGroup>

                {/* Integration selector when source_mode = 'integration' */}
                {sourceMode === 'integration' && (
                  <div className="pt-2">
                    <Label className="text-sm mb-2 block">Select Form Integration</Label>
                    <Select value={selectedIntegrationId || ''} onValueChange={setSelectedIntegrationId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a form integration..." />
                      </SelectTrigger>
                      <SelectContent>
                        {integrations.length === 0 ? (
                          <div className="p-2 text-sm text-muted-foreground text-center">
                            No active form integrations found
                          </div>
                        ) : (
                          integrations.map(int => (
                            <SelectItem key={int.id} value={int.id}>
                              {int.name} {int.config.target_url && `(${int.config.target_url})`}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Info banner when "All Forms" is selected */}
            {sourceMode === 'all' && (
              <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                    Original messages will be preserved
                  </p>
                  <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                    Each form submission will display with its original message template from the integration rules. 
                    Newsletter signups, contact forms, and registration forms will each show their configured messages.
                  </p>
                </div>
              </div>
            )}

            {/* Form type and template selection - only show when source_mode is 'type' */}
            {sourceMode === 'type' && (
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
            )}
            
            {/* Content alignment - show for all modes */}
            <Card>
              <CardContent className="pt-6">
                <ContentAlignmentSelector
                  value={contentAlignment}
                  onChange={setContentAlignment}
                />
              </CardContent>
            </Card>
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
          <Button onClick={handleSave} disabled={saving || !canSave()}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
