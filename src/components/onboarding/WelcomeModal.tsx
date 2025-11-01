import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Globe, Megaphone, Code } from "lucide-react";

interface WelcomeModalProps {
  open: boolean;
  onClose: () => void;
  planName: string;
}

export function WelcomeModal({ open, onClose, planName }: WelcomeModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl">
            🎉 Welcome to NotiProof!
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="flex items-center gap-3 rounded-lg bg-success/10 p-3">
            <CheckCircle2 className="h-5 w-5 text-success" />
            <div>
              <p className="font-semibold">Your {planName} trial has started</p>
              <p className="text-sm text-muted-foreground">14 days free, cancel anytime</p>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold">Get started in 3 easy steps:</h4>
            <div className="space-y-3">
              <div className="flex gap-3 items-start">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Globe className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">Add your website</p>
                  <p className="text-sm text-muted-foreground">Connect your domain to start showing social proof</p>
                </div>
              </div>
              
              <div className="flex gap-3 items-start">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Megaphone className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">Create a campaign</p>
                  <p className="text-sm text-muted-foreground">Choose a template and customize your notifications</p>
                </div>
              </div>
              
              <div className="flex gap-3 items-start">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Code className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">Install the widget</p>
                  <p className="text-sm text-muted-foreground">Add our script to your site and you're live!</p>
                </div>
              </div>
            </div>
          </div>

          <Button className="w-full" onClick={onClose}>
            Get Started →
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
