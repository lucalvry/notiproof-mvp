import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { 
  Mail, 
  UserPlus, 
  MessageSquare, 
  ShoppingCart, 
  Settings2,
  Calendar,
  FileText,
  Check
} from "lucide-react";

interface FormCaptureRule {
  id: string;
  targetUrl: string;
  formType: string;
  fieldMappings: Record<string, string>;
  messageTemplate: string;
  requireModeration: boolean;
  enabled: boolean;
}

interface FormCaptureRuleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rule: FormCaptureRule | null;
  onSave: (rule: FormCaptureRule) => void;
  websiteDomain: string;
}

interface FormTypeConfig {
  id: string;
  label: string;
  icon: any;
  description: string;
  defaultFields: Record<string, string>;
  defaultTemplate: string;
}

const formTypes: FormTypeConfig[] = [
  {
    id: "newsletter",
    label: "Newsletter Signup",
    icon: Mail,
    description: "Email subscription forms",
    defaultFields: { email: "email" },
    defaultTemplate: "Someone just subscribed to our newsletter! 📧",
  },
  {
    id: "registration",
    label: "Registration / Signup",
    icon: UserPlus,
    description: "User registration forms",
    defaultFields: { name: "name", email: "email" },
    defaultTemplate: "{{name}} just signed up! 🎉",
  },
  {
    id: "contact",
    label: "Contact Form",
    icon: MessageSquare,
    description: "Contact and inquiry forms",
    defaultFields: { name: "name", email: "email" },
    defaultTemplate: "{{name}} just reached out to us",
  },
  {
    id: "book_demo",
    label: "Book Demo",
    icon: Calendar,
    description: "Demo request forms",
    defaultFields: { name: "name", email: "email", company: "company" },
    defaultTemplate: "{{name}} from {{company}} just booked a demo! 📅",
  },
  {
    id: "rfp",
    label: "Request Proposal",
    icon: FileText,
    description: "RFP and quote request forms",
    defaultFields: { name: "name", email: "email", company: "company" },
    defaultTemplate: "{{name}} from {{company}} requested a proposal! 📋",
  },
  {
    id: "checkout",
    label: "Order / Checkout",
    icon: ShoppingCart,
    description: "Purchase and checkout forms",
    defaultFields: { name: "name", location: "city" },
    defaultTemplate: "{{name}} from {{location}} just placed an order! 🛒",
  },
  {
    id: "custom",
    label: "Custom Form",
    icon: Settings2,
    description: "Define your own mappings",
    defaultFields: {},
    defaultTemplate: "{{name}} just submitted a form",
  },
];

const availableVariables = ["name", "email", "location", "company"];

export function FormCaptureRuleDialog({
  open,
  onOpenChange,
  rule,
  onSave,
  websiteDomain,
}: FormCaptureRuleDialogProps) {
  const [formData, setFormData] = useState<FormCaptureRule>({
    id: "",
    targetUrl: "",
    formType: "custom",
    fieldMappings: { name: "name", email: "email" },
    messageTemplate: "{{name}} just submitted a form",
    requireModeration: true,
    enabled: true,
  });

  useEffect(() => {
    if (rule) {
      setFormData(rule);
    } else {
      setFormData({
        id: "",
        targetUrl: "",
        formType: "custom",
        fieldMappings: { name: "name", email: "email" },
        messageTemplate: "{{name}} just submitted a form",
        requireModeration: true,
        enabled: true,
      });
    }
  }, [rule, open]);

  const handleFormTypeChange = (typeId: string) => {
    const formType = formTypes.find(t => t.id === typeId);
    if (formType) {
      setFormData(prev => ({
        ...prev,
        formType: typeId,
        fieldMappings: { ...formType.defaultFields },
        messageTemplate: formType.defaultTemplate,
      }));
    }
  };

  const normalizeTargetUrl = (input: string): string => {
    const trimmed = input.trim();
    if (!trimmed) return '';
    
    // Remove domain if user included it
    let path = trimmed;
    if (websiteDomain && path.includes(websiteDomain)) {
      path = path.replace(new RegExp(`https?://${websiteDomain}`, 'i'), '');
      path = path.replace(websiteDomain, '');
    }
    
    // Ensure path starts with /
    if (path && !path.startsWith('/')) {
      path = '/' + path;
    }
    
    return path || '/';
  };

  const handleSave = () => {
    const normalizedData = {
      ...formData,
      targetUrl: normalizeTargetUrl(formData.targetUrl)
    };
    onSave(normalizedData);
    onOpenChange(false);
  };

  const getPreviewMessage = () => {
    let preview = formData.messageTemplate;
    preview = preview.replace(/\{\{name\}\}/g, "Sarah");
    preview = preview.replace(/\{\{email\}\}/g, "sarah@example.com");
    preview = preview.replace(/\{\{location\}\}/g, "New York");
    preview = preview.replace(/\{\{company\}\}/g, "Acme Inc");
    return preview;
  };

  const selectedFormType = formTypes.find(t => t.id === formData.formType);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{rule ? "Edit Form Rule" : "Add Form Capture Rule"}</DialogTitle>
          <DialogDescription>
            Configure which form to capture and how to display it as a notification
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Target URL */}
          <div className="space-y-2">
            <Label>Target Page URL</Label>
            <Input
              placeholder="e.g., /book-demo, /contact, /newsletter"
              value={formData.targetUrl}
              onChange={(e) => setFormData(prev => ({ ...prev, targetUrl: e.target.value }))}
            />
            {websiteDomain && (
              <p className="text-xs text-muted-foreground">
                Will capture forms on: <code className="bg-muted px-1 rounded">{websiteDomain}{formData.targetUrl || "/*"}</code>
              </p>
            )}
          </div>

          {/* Form Type Selection */}
          <div className="space-y-3">
            <Label>Form Type</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {formTypes.map((type) => {
                const Icon = type.icon;
                const isSelected = formData.formType === type.id;
                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => handleFormTypeChange(type.id)}
                    className={`p-3 rounded-lg border-2 text-left transition-all ${
                      isSelected 
                        ? "border-primary bg-primary/5" 
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className={`h-4 w-4 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                      <span className="text-sm font-medium">{type.label}</span>
                      {isSelected && <Check className="h-3 w-3 text-primary ml-auto" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Field Mappings */}
          {formData.formType === "custom" && (
            <div className="space-y-3">
              <Label>Custom Field Mappings</Label>
              <p className="text-xs text-muted-foreground">
                Map your form field names to notification variables
              </p>
              <div className="space-y-2">
                {availableVariables.map((variable) => (
                  <div key={variable} className="flex items-center gap-3">
                    <Badge variant="secondary" className="font-mono min-w-[90px] justify-center">
                      {`{{${variable}}}`}
                    </Badge>
                    <span className="text-muted-foreground">→</span>
                    <Input
                      placeholder={`Your form's ${variable} field`}
                      value={formData.fieldMappings[variable] || ""}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        fieldMappings: { ...prev.fieldMappings, [variable]: e.target.value }
                      }))}
                      className="flex-1"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Message Template */}
          <div className="space-y-2">
            <Label>Message Template</Label>
            <Textarea
              placeholder="{{name}} just signed up!"
              value={formData.messageTemplate}
              onChange={(e) => setFormData(prev => ({ ...prev, messageTemplate: e.target.value }))}
              rows={2}
            />
            <div className="flex flex-wrap gap-2">
              <span className="text-xs text-muted-foreground">Variables:</span>
              {availableVariables.map((v) => (
                <Badge 
                  key={v} 
                  variant="outline" 
                  className="font-mono text-xs cursor-pointer hover:bg-primary/10"
                  onClick={() => {
                    setFormData(prev => ({
                      ...prev,
                      messageTemplate: prev.messageTemplate + ` {{${v}}}`
                    }));
                  }}
                >
                  {`{{${v}}}`}
                </Badge>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="p-4 rounded-lg bg-muted/30 border">
            <p className="text-xs text-muted-foreground mb-2">Preview:</p>
            <p className="font-medium">{getPreviewMessage()}</p>
          </div>

          {/* Options */}
          <div className="flex items-center justify-between p-3 rounded-lg border">
            <div>
              <Label>Require Moderation</Label>
              <p className="text-xs text-muted-foreground">
                Review before displaying as notifications
              </p>
            </div>
            <Switch
              checked={formData.requireModeration}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, requireModeration: checked }))}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            {rule ? "Save Changes" : "Add Rule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
