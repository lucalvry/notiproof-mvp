import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { LiveVisitorConfig } from "./native/LiveVisitorConfig";

interface VisitorsPulseCampaignEditorProps {
  campaignId: string;
  websiteId: string;
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  integrationSettings?: any;
}

export function VisitorsPulseCampaignEditor({
  campaignId,
  websiteId,
  open,
  onClose,
  onSave,
  integrationSettings = {},
}: VisitorsPulseCampaignEditorProps) {
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState({
    mode: 'real' as 'real' | 'simulated',
    scope: 'site' as 'site' | 'page',
    min_count: 5,
    max_count: 50,
    variance_percent: 30,
    update_interval_seconds: 30,
    target_pages: [] as string[],
    template_style: 'social_proof',
    message_template: '{{count}} people are viewing this page',
    icon: '👥',
    show_location: true,
    // New enhanced fields
    urgency_level: 'social_proof' as 'informational' | 'social_proof' | 'fomo' | 'scarcity',
    page_rules: [] as any[],
    excluded_pages: [] as string[],
    content_alignment: 'top' as 'top' | 'center' | 'bottom',
    // Styling options
    backgroundColor: '#ffffff',
    textColor: '#1a1a1a',
    linkColor: '#667eea',
    fontSize: 14,
    fontFamily: 'system-ui',
    borderRadius: 12,
    borderWidth: 0,
    borderColor: '#e5e7eb',
    shadow: 'md' as 'none' | 'sm' | 'md' | 'lg' | 'xl',
    show_verification_badge: true,
    verification_text: 'Real-time data',
  });

  // Initialize config from integrationSettings when dialog opens
  useEffect(() => {
    if (open && integrationSettings) {
      setConfig({
        mode: integrationSettings.mode || 'real',
        scope: integrationSettings.scope || 'site',
        min_count: integrationSettings.min_count ?? 5,
        max_count: integrationSettings.max_count ?? 50,
        variance_percent: integrationSettings.variance_percent ?? 30,
        update_interval_seconds: integrationSettings.update_interval_seconds ?? 30,
        target_pages: integrationSettings.target_pages || [],
        template_style: integrationSettings.template_style || 'social_proof',
        message_template: integrationSettings.message_template || '{{count}} people are viewing this page',
        icon: integrationSettings.icon || '👥',
        show_location: integrationSettings.show_location ?? true,
        // New enhanced fields
        urgency_level: integrationSettings.urgency_level || 'social_proof',
        page_rules: integrationSettings.page_rules || [],
        excluded_pages: integrationSettings.excluded_pages || [],
        content_alignment: integrationSettings.content_alignment || 'top',
        // Styling options
        backgroundColor: integrationSettings.backgroundColor || '#ffffff',
        textColor: integrationSettings.textColor || '#1a1a1a',
        linkColor: integrationSettings.linkColor || '#667eea',
        fontSize: integrationSettings.fontSize ?? 14,
        fontFamily: integrationSettings.fontFamily || 'system-ui',
        borderRadius: integrationSettings.borderRadius ?? 12,
        borderWidth: integrationSettings.borderWidth ?? 0,
        borderColor: integrationSettings.borderColor || '#e5e7eb',
        shadow: integrationSettings.shadow || 'md',
        show_verification_badge: integrationSettings.show_verification_badge ?? true,
        verification_text: integrationSettings.verification_text || 'Real-time data',
      });
    }
  }, [open, integrationSettings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("campaigns")
        .update({
          integration_settings: config,
          native_config: config,
          updated_at: new Date().toISOString(),
        })
        .eq("id", campaignId);

      if (error) throw error;

      // Update widget style_config with content_alignment
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
              contentAlignment: config.content_alignment,
              backgroundColor: config.backgroundColor,
              textColor: config.textColor,
              linkColor: config.linkColor,
              fontSize: config.fontSize,
              fontFamily: config.fontFamily,
              borderRadius: config.borderRadius,
              borderWidth: config.borderWidth,
              borderColor: config.borderColor,
              shadow: config.shadow,
            },
          })
          .eq("id", widget.id);
      }

      toast.success("Visitors Pulse notification updated successfully");
      onSave();
      onClose();
    } catch (error) {
      console.error("Error updating Visitors Pulse notification:", error);
      toast.error("Failed to update notification");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Visitors Pulse Notification</DialogTitle>
          <CardDescription>
            Configure how visitor counts are displayed on your site
          </CardDescription>
        </DialogHeader>

        <div className="py-4">
          <LiveVisitorConfig
            config={config}
            onChange={setConfig}
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
