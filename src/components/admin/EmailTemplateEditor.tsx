import { useState, useMemo } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Code, Eye, Save, Send, Smartphone, Monitor, RotateCcw, Copy, Check } from "lucide-react";

interface Placeholder {
  key: string;
  description: string;
}

interface EmailTemplate {
  id: string;
  template_key: string;
  name: string;
  description: string | null;
  subject: string;
  body_html: string;
  placeholders: Placeholder[];
  is_active: boolean;
  updated_at: string;
}

interface EmailTemplateEditorProps {
  template: EmailTemplate;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (updates: Partial<EmailTemplate>) => void;
  previewOnly?: boolean;
}

const SAMPLE_DATA: Record<string, string> = {
  name: "John Doe",
  planName: "Pro",
  daysRemaining: "3",
  email: "john@example.com",
};

export function EmailTemplateEditor({
  template,
  open,
  onOpenChange,
  onSave,
  previewOnly = false,
}: EmailTemplateEditorProps) {
  const [subject, setSubject] = useState(template.subject);
  const [bodyHtml, setBodyHtml] = useState(template.body_html);
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const [copiedPlaceholder, setCopiedPlaceholder] = useState<string | null>(null);

  const hasChanges = subject !== template.subject || bodyHtml !== template.body_html;

  // Render template with sample data
  const renderedSubject = useMemo(() => {
    return subject.replace(/\{\{(\w+)\}\}/g, (_, key) => SAMPLE_DATA[key] || `{{${key}}}`);
  }, [subject]);

  const renderedHtml = useMemo(() => {
    return bodyHtml.replace(/\{\{(\w+)\}\}/g, (_, key) => SAMPLE_DATA[key] || `{{${key}}}`);
  }, [bodyHtml]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({ subject, body_html: bodyHtml });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setSubject(template.subject);
    setBodyHtml(template.body_html);
  };

  const handleSendTestEmail = async () => {
    setIsSendingTest(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        toast.error("No email found for current user");
        return;
      }

      const { error } = await supabase.functions.invoke("admin-user-actions", {
        body: {
          action: "send-test-email",
          templateKey: template.template_key,
          recipientEmail: user.email,
          customSubject: subject,
          customHtml: bodyHtml,
        },
      });

      if (error) throw error;
      toast.success(`Test email sent to ${user.email}`);
    } catch (error: any) {
      console.error("Error sending test email:", error);
      toast.error(error.message || "Failed to send test email");
    } finally {
      setIsSendingTest(false);
    }
  };

  const copyPlaceholder = (placeholder: string) => {
    navigator.clipboard.writeText(`{{${placeholder}}}`);
    setCopiedPlaceholder(placeholder);
    setTimeout(() => setCopiedPlaceholder(null), 2000);
  };

  const insertPlaceholder = (placeholder: string) => {
    const textArea = document.getElementById("html-editor") as HTMLTextAreaElement;
    if (textArea) {
      const start = textArea.selectionStart;
      const end = textArea.selectionEnd;
      const text = `{{${placeholder}}}`;
      const newValue = bodyHtml.substring(0, start) + text + bodyHtml.substring(end);
      setBodyHtml(newValue);
      // Reset cursor position after React re-render
      setTimeout(() => {
        textArea.focus();
        textArea.setSelectionRange(start + text.length, start + text.length);
      }, 0);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {previewOnly ? <Eye className="h-5 w-5" /> : <Code className="h-5 w-5" />}
            {previewOnly ? "Preview" : "Edit"}: {template.name}
          </DialogTitle>
          <DialogDescription>
            {template.description}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0">
          <Tabs defaultValue={previewOnly ? "preview" : "edit"} className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-2">
              {!previewOnly && <TabsTrigger value="edit">Edit</TabsTrigger>}
              <TabsTrigger value="preview" className={previewOnly ? "col-span-2" : ""}>
                Preview
              </TabsTrigger>
            </TabsList>

            {!previewOnly && (
              <TabsContent value="edit" className="flex-1 min-h-0 mt-4">
                <div className="grid grid-cols-3 gap-4 h-full">
                  {/* Editor */}
                  <div className="col-span-2 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="subject">Subject Line</Label>
                      <Input
                        id="subject"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="Email subject..."
                      />
                    </div>

                    <div className="space-y-2 flex-1">
                      <Label htmlFor="html-editor">HTML Body</Label>
                      <Textarea
                        id="html-editor"
                        value={bodyHtml}
                        onChange={(e) => setBodyHtml(e.target.value)}
                        className="font-mono text-sm h-[400px] resize-none"
                        placeholder="HTML content..."
                      />
                    </div>
                  </div>

                  {/* Placeholders */}
                  <div className="space-y-4">
                    <div>
                      <Label>Available Placeholders</Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Click to insert or copy
                      </p>
                    </div>
                    <ScrollArea className="h-[450px] rounded-md border p-3">
                      <div className="space-y-2">
                        {template.placeholders.map((p) => (
                          <div
                            key={p.key}
                            className="p-2 rounded-md border bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <code
                                className="text-sm font-medium text-primary"
                                onClick={() => insertPlaceholder(p.key)}
                              >
                                {`{{${p.key}}}`}
                              </code>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => copyPlaceholder(p.key)}
                              >
                                {copiedPlaceholder === p.key ? (
                                  <Check className="h-3 w-3 text-green-600" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </Button>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {p.description}
                            </p>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>

                    <Separator />

                    <div>
                      <Label>Sample Data</Label>
                      <p className="text-xs text-muted-foreground mt-1 mb-2">
                        Used for preview
                      </p>
                      <div className="space-y-1 text-sm">
                        {Object.entries(SAMPLE_DATA).map(([key, value]) => (
                          <div key={key} className="flex justify-between">
                            <code className="text-muted-foreground">{key}:</code>
                            <span>{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
            )}

            <TabsContent value="preview" className="flex-1 min-h-0 mt-4">
              <div className="space-y-4 h-full flex flex-col">
                {/* Preview Controls */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Button
                      variant={previewMode === "desktop" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPreviewMode("desktop")}
                    >
                      <Monitor className="h-4 w-4 mr-1" />
                      Desktop
                    </Button>
                    <Button
                      variant={previewMode === "mobile" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPreviewMode("mobile")}
                    >
                      <Smartphone className="h-4 w-4 mr-1" />
                      Mobile
                    </Button>
                  </div>
                  <Badge variant="outline">
                    Subject: {renderedSubject}
                  </Badge>
                </div>

                {/* Preview Frame */}
                <div className="flex-1 min-h-0 border rounded-lg overflow-hidden bg-muted/30 flex justify-center">
                  <div
                    className={`bg-white h-full overflow-auto transition-all ${
                      previewMode === "mobile" ? "w-[375px]" : "w-full"
                    }`}
                  >
                    <iframe
                      srcDoc={renderedHtml}
                      className="w-full h-full border-0"
                      title="Email Preview"
                    />
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter className="flex items-center justify-between gap-4 sm:justify-between">
          <div className="flex items-center gap-2">
            {!previewOnly && (
              <>
                <Button
                  variant="outline"
                  onClick={handleReset}
                  disabled={!hasChanges || isSaving}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset
                </Button>
                <Button
                  variant="outline"
                  onClick={handleSendTestEmail}
                  disabled={isSendingTest}
                >
                  <Send className="h-4 w-4 mr-2" />
                  {isSendingTest ? "Sending..." : "Send Test"}
                </Button>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {previewOnly ? "Close" : "Cancel"}
            </Button>
            {!previewOnly && (
              <Button onClick={handleSave} disabled={!hasChanges || isSaving}>
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
