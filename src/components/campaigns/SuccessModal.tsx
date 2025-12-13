import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Eye, MousePointerClick, Sparkles, ExternalLink, Settings } from "lucide-react";
import confetti from "canvas-confetti";
import { useEffect } from "react";

interface SuccessModalProps {
  open: boolean;
  onClose: () => void;
  campaignName: string;
  integrationName: string;
  campaignId?: string;
  onViewCampaign?: () => void;
  onCustomize?: () => void;
}

export function SuccessModal({ 
  open, 
  onClose, 
  campaignName, 
  integrationName,
  campaignId,
  onViewCampaign,
  onCustomize
}: SuccessModalProps) {
  
  useEffect(() => {
    if (open) {
      // Trigger confetti celebration
      const duration = 2000;
      const animationEnd = Date.now() + duration;
      
      const randomInRange = (min: number, max: number) => {
        return Math.random() * (max - min) + min;
      };

      const interval = setInterval(() => {
        const timeLeft = animationEnd - Date.now();
        
        if (timeLeft <= 0) {
          clearInterval(interval);
          return;
        }
        
        const particleCount = 50 * (timeLeft / duration);
        
        confetti({
          particleCount,
          startVelocity: 30,
          spread: 360,
          origin: {
            x: randomInRange(0.1, 0.3),
            y: Math.random() - 0.2
          },
          colors: ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899']
        });
        
        confetti({
          particleCount,
          startVelocity: 30,
          spread: 360,
          origin: {
            x: randomInRange(0.7, 0.9),
            y: Math.random() - 0.2
          },
          colors: ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899']
        });
      }, 250);

      return () => clearInterval(interval);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="relative">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/60 animate-pulse">
                <CheckCircle2 className="h-8 w-8 text-white" />
              </div>
              <div className="absolute -top-2 -right-2">
                <Sparkles className="h-6 w-6 text-yellow-500 animate-bounce" />
              </div>
            </div>
          </div>
          <DialogTitle className="text-center text-2xl">
            🎉 Your Notification is Live!
          </DialogTitle>
          <DialogDescription className="text-center text-base">
            <strong className="text-foreground">{campaignName}</strong> is now active and showing on your website
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Quick Stats Preview */}
          <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardContent className="pt-6">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="flex items-center justify-center gap-2 text-primary mb-1">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <p className="text-2xl font-bold text-foreground">Active</p>
                  <p className="text-xs text-muted-foreground">Status</p>
                </div>
                <div>
                  <div className="flex items-center justify-center gap-2 text-primary mb-1">
                    <Eye className="h-5 w-5" />
                  </div>
                  <p className="text-2xl font-bold text-foreground">0</p>
                  <p className="text-xs text-muted-foreground">Views (starting now)</p>
                </div>
                <div>
                  <div className="flex items-center justify-center gap-2 text-primary mb-1">
                    <MousePointerClick className="h-5 w-5" />
                  </div>
                  <p className="text-2xl font-bold text-foreground">0%</p>
                  <p className="text-xs text-muted-foreground">Click Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Integration Badge */}
          <div className="flex items-center justify-center gap-2">
            <Badge variant="outline" className="px-4 py-2 text-sm">
              <CheckCircle2 className="h-4 w-4 mr-2 text-success" />
              {integrationName} Connected
            </Badge>
          </div>

          {/* What Happens Next */}
          <div className="space-y-3">
            <h3 className="font-semibold text-center">What happens next?</h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold flex-shrink-0">1</div>
                <p><strong className="text-foreground">Auto-syncing enabled:</strong> Your {integrationName} data will automatically create new notifications</p>
              </div>
              <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold flex-shrink-0">2</div>
                <p><strong className="text-foreground">Live on your site:</strong> Visitors will see notifications as events happen in real-time</p>
              </div>
              <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold flex-shrink-0">3</div>
                <p><strong className="text-foreground">Track performance:</strong> View clicks, conversions, and engagement in your dashboard</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={onCustomize}
            >
              <Settings className="h-4 w-4 mr-2" />
              Customize Design
            </Button>
            <Button
              className="flex-1"
              onClick={() => {
                if (onViewCampaign) {
                  onViewCampaign();
                }
                onClose();
              }}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              View Dashboard
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            💡 Tip: Customize colors, position, and timing in the notification settings
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
