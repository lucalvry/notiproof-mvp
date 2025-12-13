import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Globe, Megaphone, Code, TrendingUp, ArrowRight, X } from "lucide-react";
import { useOnboardingState } from "@/hooks/useOnboarding";
import { useNavigate } from "react-router-dom";

interface OnboardingPromptsProps {
  userId: string;
}

export function OnboardingPrompts({ userId }: OnboardingPromptsProps) {
  const navigate = useNavigate();
  const { progress, isLoading } = useOnboardingState(userId);

  if (isLoading || progress.dismissed || progress.completion_percentage === 100) {
    return null;
  }

  const websiteCount = progress.website_added ? 1 : 0;
  const campaignCount = progress.campaign_created ? 1 : 0;

  // Priority 1: No websites
  if (!progress.website_added) {
    return (
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-primary/10 p-2">
                <Globe className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Add Your First Website</CardTitle>
                <CardDescription>Start showing social proof to your visitors</CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Connect your website to start displaying real-time notifications that build trust and increase conversions.
            </p>
            <Button onClick={() => navigate('/websites')} className="gap-2">
              <Globe className="h-4 w-4" />
              Add Website Now
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Priority 2: Has website but no campaigns
  if (progress.website_added && !progress.campaign_created) {
    return (
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-primary/10 p-2">
                <Megaphone className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Create Your First Notification</CardTitle>
                <CardDescription>Choose from proven templates</CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Great! Your website is connected. Now create a notification to start showing activity to your visitors.
            </p>
            <Button onClick={() => navigate('/campaigns')} className="gap-2">
              <Megaphone className="h-4 w-4" />
              Create Notification
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Priority 3: Has campaign but no widget installation
  if (progress.campaign_created && !progress.widget_installed) {
    return (
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-primary/10 p-2">
                <Code className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Install Your Widget</CardTitle>
                <CardDescription>Just one snippet away from going live</CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Your notification is ready! Install the widget code on your website to start displaying it.
            </p>
            <Button onClick={() => navigate('/websites')} className="gap-2">
              <Code className="h-4 w-4" />
              View Installation Code
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
}
