import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, X } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (requestId: string) => void;
}

const STARTER_PROMPTS = [
  "What problem were you trying to solve when you found us?",
  "What was the result?",
  "Who would you recommend us to?",
];

export function RequestTestimonialModal({ open, onOpenChange, onCreated }: Props) {
  const { currentBusinessId } = useAuth();
  const { toast } = useToast();
  const [creating, setCreating] = useState(false);
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [customMessage, setCustomMessage] = useState("");
  const [prompts, setPrompts] = useState<string[]>([]);
  const [newPrompt, setNewPrompt] = useState("");

  const reset = () => {
    setRecipientName("");
    setRecipientEmail("");
    setCustomMessage("");
    setPrompts([]);
    setNewPrompt("");
  };

  const addPrompt = (text?: string) => {
    const v = (text ?? newPrompt).trim();
    if (!v) return;
    if (prompts.length >= 5) {
      toast({ title: "Up to 5 prompts", variant: "destructive" });
      return;
    }
    setPrompts([...prompts, v]);
    setNewPrompt("");
  };

  const removePrompt = (i: number) => setPrompts(prompts.filter((_, idx) => idx !== i));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBusinessId) return;
    setCreating(true);
    const { data: inserted, error } = await supabase
      .from("testimonial_requests")
      .insert({
        business_id: currentBusinessId,
        recipient_email: recipientEmail.trim(),
        recipient_name: recipientName.trim() || null,
        custom_message: customMessage.trim() || null,
        prompt_questions: prompts,
        status: "scheduled",
      })
      .select("id")
      .maybeSingle();

    if (error || !inserted) {
      setCreating(false);
      toast({
        title: "Could not create request",
        description: error?.message ?? "Unknown error",
        variant: "destructive",
      });
      return;
    }

    const { data: sendResp, error: sendErr } = await supabase.functions.invoke(
      "send-testimonial-request",
      { body: { request_id: inserted.id, app_origin: window.location.origin } },
    );
    setCreating(false);

    if (sendErr || !sendResp?.ok) {
      // Try to surface the real error from the edge function (e.g. Brevo rejection)
      let detail = sendResp?.error as string | undefined;
      if (!detail && (sendErr as any)?.context?.body) {
        try {
          const parsed = typeof (sendErr as any).context.body === "string"
            ? JSON.parse((sendErr as any).context.body)
            : (sendErr as any).context.body;
          detail = parsed?.error;
        } catch { /* ignore */ }
      }
      toast({
        title: "Request created (email not sent)",
        description: detail ?? sendErr?.message ?? "You can copy the link and share it manually.",
        variant: "destructive",
      });
    } else {
      toast({ title: "Testimonial request sent ✓", description: `Email delivered to ${recipientEmail}.` });
    }

    onCreated?.(inserted.id);
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>Request a testimonial</DialogTitle>
            <DialogDescription>
              We'll generate a personal collection link and email it to your customer.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="r_name">Customer name</Label>
                <Input
                  id="r_name"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="Jane Doe"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="r_email">
                  Customer email <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="r_email"
                  type="email"
                  required
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="jane@example.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="r_msg">Personal note (optional)</Label>
              <Textarea
                id="r_msg"
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder="Add a short personal message — included in the email."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Prompt questions (optional)</Label>
              <p className="text-xs text-muted-foreground">
                Shown on the collection page to help your customer write a great testimonial.
              </p>

              {prompts.length > 0 && (
                <ul className="space-y-1.5">
                  {prompts.map((p, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm"
                    >
                      <span className="flex-1">{p}</span>
                      <button
                        type="button"
                        onClick={() => removePrompt(i)}
                        className="text-muted-foreground hover:text-destructive"
                        aria-label="Remove"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <div className="flex gap-2">
                <Input
                  value={newPrompt}
                  onChange={(e) => setNewPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addPrompt();
                    }
                  }}
                  placeholder="e.g. What was the result you got?"
                />
                <Button type="button" variant="outline" size="icon" onClick={() => addPrompt()}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {prompts.length === 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {STARTER_PROMPTS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => addPrompt(p)}
                      className="text-xs rounded-full border px-2.5 py-1 text-muted-foreground hover:border-accent hover:text-foreground transition-colors"
                    >
                      + {p}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={creating || !recipientEmail.trim()}>
              {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Send request
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
