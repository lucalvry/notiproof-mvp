import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Mail } from "lucide-react";

interface ResendConfirmationDialogProps {
  email?: string;
}

export function ResendConfirmationDialog({ email: initialEmail }: ResendConfirmationDialogProps) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState(initialEmail || "");
  const [loading, setLoading] = useState(false);

  const handleResend = async () => {
    if (!email) {
      toast.error("Please enter an email address");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('resend-confirmation', {
        body: { email },
      });

      if (error) throw error;

      toast.success("Confirmation email sent successfully!");
      setOpen(false);
    } catch (error: any) {
      console.error("Error resending confirmation:", error);
      toast.error(error.message || "Failed to resend confirmation email");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Mail className="mr-2 h-4 w-4" />
          Resend Confirmation
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Resend Confirmation Email</DialogTitle>
          <DialogDescription>
            Send a new confirmation email to verify the user's email address
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleResend} disabled={loading}>
            {loading ? "Sending..." : "Send Confirmation Email"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
