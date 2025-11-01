import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Globe, Megaphone, Code, TrendingUp, ArrowRight, X } from "lucide-react";
import { useOnboardingState } from "@/hooks/useOnboardingState";
import { useNavigate } from "react-router-dom";

interface OnboardingPromptsProps {
  userId: string;
}

export function OnboardingPrompts({ userId }: OnboardingPromptsProps) {
  const navigate = useNavigate();
  const { 
    progress, 
    websiteCount, 
    campaignCount, 
    hasActivity,
    dismissOnboarding,
    isLoading 
  } = useOnboardingState(userId);

  if (isLoading || !progress || progress.dismissed || progress.completion_percentage === 100) {
    return null;
  }

  const handleDismiss = async () => {
    await dismissOnboarding();
  };

  // Priority 1: No websites
  if (websiteCount === 0) {
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
            <Button variant="ghost" size="icon" onClick={handleDismiss} className="h-6 w-6">
              <X className="h-4 w-4" />
            </Button>
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
  if (websiteCount > 0 && campaignCount === 0) {
    return (
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-primary/10 p-2">
                <Megaphone className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Create Your First Campaign</CardTitle>
                <CardDescription>Choose from proven templates</CardDescription>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={handleDismiss} className="h-6 w-6">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Great! Your website is connected. Now create a campaign to start showing notifications to your visitors.
            </p>
            <Button onClick={() => navigate('/campaigns')} className="gap-2">
              <Megaphone className="h-4 w-4" />
              Create Campaign
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Priority 3: Has campaign but no widget installation
  if (campaignCount > 0 && !progress.widget_installed) {
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
            <Button variant="ghost" size="icon" onClick={handleDismiss} className="h-6 w-6">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Your campaign is ready! Install the widget code on your website to start displaying notifications.
            </p>
            <div className="flex gap-2">
              <Button onClick={() => navigate('/websites')} className="gap-2 flex-1">
                <Code className="h-4 w-4" />
                View Installation Code
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button 
                onClick={() => window.open('https://docs.notiproof.com/installation', '_blank')} 
                variant="outline"
              >
                See Guide
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Priority 4: Widget installed but no conversions
  if (progress.widget_installed && !hasActivity) {
    return (
      <Alert className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
        <TrendingUp className="h-4 w-4 text-primary" />
        <div className="flex items-start justify-between w-full">
          <div className="flex-1">
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-semibold">Waiting for Your First Conversion</p>
                <p className="text-sm text-muted-foreground">
                  Your widget is installed! Visit your website to see notifications in action.
                </p>
                <Button size="sm" variant="outline" onClick={() => navigate('/analytics')} className="gap-2 mt-2">
                  <TrendingUp className="h-4 w-4" />
                  View Analytics
                </Button>
              </div>
            </AlertDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={handleDismiss} className="h-6 w-6 ml-2">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </Alert>
    );
  }

  return null;
}
