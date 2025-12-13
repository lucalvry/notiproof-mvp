import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  CheckCircle2, 
  PartyPopper, 
  ArrowRight,
  Megaphone,
  ListOrdered,
  BarChart3,
  MessageSquare,
  Settings
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import confetti from "canvas-confetti";
import { OnboardingPath } from "@/hooks/useOnboarding";

interface SuccessStepProps {
  path: OnboardingPath;
  onComplete: () => void;
  websiteId?: string;
}

const pathSuccessContent: Record<NonNullable<OnboardingPath>, {
  title: string;
  description: string;
  nextSteps: Array<{
    title: string;
    description: string;
    icon: any;
    path: string;
    primary?: boolean;
  }>;
}> = {
  testimonials: {
    title: "Your Testimonial Form is Ready!",
    description: "Share the link with customers to start collecting reviews",
    nextSteps: [
      {
        title: "Create a Notification",
        description: "Show testimonials as popups on your site",
        icon: Megaphone,
        path: "/campaigns",
        primary: true,
      },
      {
        title: "Create a Playlist",
        description: "Rotate multiple campaigns automatically",
        icon: ListOrdered,
        path: "/playlists",
      },
      {
        title: "View Analytics",
        description: "Track testimonial performance",
        icon: BarChart3,
        path: "/analytics",
      },
    ],
  },
  social_proof: {
    title: "Your Notification is Live!",
    description: "Visitors will now see real-time activity notifications",
    nextSteps: [
      {
        title: "Create a Playlist",
        description: "Rotate multiple notifications automatically",
        icon: ListOrdered,
        path: "/playlists",
        primary: true,
      },
      {
        title: "Collect Testimonials",
        description: "Add customer reviews to your notifications",
        icon: MessageSquare,
        path: "/campaigns?type=testimonials",
      },
      {
        title: "View Analytics",
        description: "Track notification performance",
        icon: BarChart3,
        path: "/analytics",
      },
    ],
  },
  announcements: {
    title: "Your Announcement is Live!",
    description: "Your custom notification is now showing to visitors",
    nextSteps: [
      {
        title: "Create More Notifications",
        description: "Add social proof notifications",
        icon: Megaphone,
        path: "/campaigns",
        primary: true,
      },
      {
        title: "Collect Testimonials",
        description: "Add customer reviews to your notifications",
        icon: MessageSquare,
        path: "/campaigns?type=testimonials",
      },
      {
        title: "Customize Settings",
        description: "Adjust timing and display rules",
        icon: Settings,
        path: "/settings",
      },
    ],
  },
  integrations: {
    title: "Integration Connected!",
    description: "Your data will sync automatically to power notifications",
    nextSteps: [
      {
        title: "Create a Notification",
        description: "Use your integration data for notifications",
        icon: Megaphone,
        path: "/campaigns",
        primary: true,
      },
      {
        title: "Add More Integrations",
        description: "Connect additional data sources",
        icon: Settings,
        path: "/integrations",
      },
      {
        title: "View Analytics",
        description: "Track integration performance",
        icon: BarChart3,
        path: "/analytics",
      },
    ],
  },
};

export function SuccessStep({ path, onComplete, websiteId }: SuccessStepProps) {
  const navigate = useNavigate();
  const content = path ? pathSuccessContent[path] : null;

  useEffect(() => {
    // Trigger confetti on mount
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
  }, []);

  const handleNavigate = (targetPath: string) => {
    onComplete();
    navigate(websiteId ? `${targetPath}?website=${websiteId}` : targetPath);
  };

  if (!content) {
    return null;
  }

  return (
    <div className="space-y-8 text-center py-4">
      {/* Success Message */}
      <div className="space-y-4">
        <div className="flex justify-center">
          <div className="relative">
            <div className="rounded-full bg-success/20 p-6">
              <PartyPopper className="h-12 w-12 text-success" />
            </div>
            <div className="absolute -top-1 -right-1 rounded-full bg-success p-1.5">
              <CheckCircle2 className="h-4 w-4 text-success-foreground" />
            </div>
          </div>
        </div>
        
        <h2 className="text-2xl font-bold">🎉 {content.title}</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          {content.description}
        </p>
      </div>

      {/* Next Steps */}
      <div className="space-y-4">
        <h3 className="font-semibold text-lg">What's Next?</h3>
        <div className="grid gap-3">
          {content.nextSteps.map((step, index) => {
            const Icon = step.icon;
            return (
              <Card 
                key={index}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  step.primary 
                    ? 'bg-primary/5 border-primary/20' 
                    : 'hover:bg-muted/50'
                }`}
                onClick={() => handleNavigate(step.path)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    <div className={`rounded-full p-2 ${
                      step.primary ? 'bg-primary/10' : 'bg-muted'
                    }`}>
                      <Icon className={`h-4 w-4 ${step.primary ? 'text-primary' : 'text-muted-foreground'}`} />
                    </div>
                    <div className="text-left flex-1">
                      <CardTitle className="text-base">{step.title}</CardTitle>
                      <CardDescription>{step.description}</CardDescription>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Go to Dashboard */}
      <Button 
        variant="outline" 
        onClick={() => handleNavigate('/dashboard')}
        className="gap-2"
      >
        Go to Dashboard
        <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
