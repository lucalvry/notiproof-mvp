import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ExternalLink, BarChart3, Plus, Users, CheckCircle } from "lucide-react";
import confetti from "canvas-confetti";

interface OnboardingSuccessProps {
  websiteName: string;
  websiteDomain: string;
  campaignName?: string;
  campaignId?: string;
  eventsCount?: number;
  onViewWebsite?: () => void;
  onViewAnalytics?: () => void;
  onCreateCampaign?: () => void;
  onInviteTeam?: () => void;
  onGoToDashboard: () => void;
}

export function OnboardingSuccess({
  websiteName,
  websiteDomain,
  campaignName,
  campaignId,
  eventsCount = 0,
  onViewWebsite,
  onViewAnalytics,
  onCreateCampaign,
  onInviteTeam,
  onGoToDashboard,
}: OnboardingSuccessProps) {
  useEffect(() => {
    // Trigger confetti animation on mount
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    const interval = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
      });
    }, 250);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6 py-6">
      {/* Success Header */}
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="rounded-full bg-success/10 p-4">
            <CheckCircle className="h-16 w-16 text-success" />
          </div>
        </div>
        <div>
          <h2 className="text-3xl font-bold">🎉 Congratulations!</h2>
          <p className="text-xl text-muted-foreground mt-2">Your widget is live!</p>
        </div>
      </div>

      {/* Summary Stats */}
      <Card className="border-success/20 bg-success/5">
        <CardContent className="pt-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Website:</span>
              <span className="font-semibold">{websiteDomain}</span>
            </div>
            {campaignName && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Campaign:</span>
                <span className="font-semibold">{campaignName}</span>
              </div>
            )}
            {eventsCount > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Events ready:</span>
                <span className="font-semibold">{eventsCount}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div>
        <h3 className="font-semibold mb-3">Quick Actions</h3>
        <div className="grid gap-3">
          {onViewWebsite && (
            <Button
              variant="outline"
              className="justify-start h-auto py-4"
              onClick={onViewWebsite}
            >
              <div className="flex items-start gap-3 text-left">
                <ExternalLink className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-semibold">View Live Widget</div>
                  <div className="text-xs text-muted-foreground">
                    Open your website in a new tab
                  </div>
                </div>
              </div>
            </Button>
          )}
          
          {onViewAnalytics && (
            <Button
              variant="outline"
              className="justify-start h-auto py-4"
              onClick={onViewAnalytics}
            >
              <div className="flex items-start gap-3 text-left">
                <BarChart3 className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-semibold">See Analytics Dashboard</div>
                  <div className="text-xs text-muted-foreground">
                    Track views, clicks, and conversions
                  </div>
                </div>
              </div>
            </Button>
          )}
          
          {onCreateCampaign && (
            <Button
              variant="outline"
              className="justify-start h-auto py-4"
              onClick={onCreateCampaign}
            >
              <div className="flex items-start gap-3 text-left">
                <Plus className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-semibold">Create Another Campaign</div>
                  <div className="text-xs text-muted-foreground">
                    Add more social proof notifications
                  </div>
                </div>
              </div>
            </Button>
          )}
          
          {onInviteTeam && (
            <Button
              variant="outline"
              className="justify-start h-auto py-4"
              onClick={onInviteTeam}
            >
              <div className="flex items-start gap-3 text-left">
                <Users className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-semibold">Invite Team Members</div>
                  <div className="text-xs text-muted-foreground">
                    Collaborate with your team
                  </div>
                </div>
              </div>
            </Button>
          )}
        </div>
      </div>

      {/* Primary CTA */}
      <Button 
        className="w-full" 
        size="lg"
        onClick={onGoToDashboard}
      >
        Go to Dashboard
      </Button>
    </div>
  );
}
