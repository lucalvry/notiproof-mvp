import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  ArrowLeft, 
  ArrowRight, 
  MessageSquare, 
  Activity, 
  Megaphone, 
  Plug,
  CheckCircle2,
  LucideIcon
} from "lucide-react";
import { OnboardingPath } from "@/hooks/useOnboarding";

interface PathGuideProps {
  path: OnboardingPath;
  onContinue: () => void;
  onBack: () => void;
}

interface PathConfig {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  steps: string[];
  iconBg: string;
  iconColor: string;
}

const pathConfigs: Record<Exclude<OnboardingPath, null>, PathConfig> = {
  testimonials: {
    icon: MessageSquare,
    title: "Collect & Display Testimonials",
    subtitle: "Create a form to gather reviews, then showcase them anywhere on your site",
    steps: [
      "Create a testimonial collection form",
      "Share the link with customers via email or social media",
      "Review and approve testimonials in your dashboard",
      "Display as notifications, carousels, sliders, or embed widgets on your site"
    ],
    iconBg: "bg-purple-500/10",
    iconColor: "text-purple-500",
  },
  social_proof: {
    icon: Activity,
    title: "Show Real-Time Activity",
    subtitle: "Display live signups, purchases, and activity to build trust",
    steps: [
      "Select your website to display notifications on",
      "Choose your data source (form captures, integrations, etc.)",
      "Pick a notification template and customize the style",
      "Set when and where notifications appear on your site"
    ],
    iconBg: "bg-blue-500/10",
    iconColor: "text-blue-500",
  },
  announcements: {
    icon: Megaphone,
    title: "Create Smart Announcements",
    subtitle: "Show promotions, alerts, and updates with eye-catching notifications",
    steps: [
      "Write your announcement message",
      "Choose an emoji or icon to grab attention",
      "Set display rules (which pages, timing, frequency)",
      "Activate and watch engagement grow"
    ],
    iconBg: "bg-green-500/10",
    iconColor: "text-green-500",
  },
  integrations: {
    icon: Plug,
    title: "Connect Your Tools",
    subtitle: "Integrate with Stripe, Shopify, Zapier, and more",
    steps: [
      "Browse available integrations",
      "Connect with one click using API keys or OAuth",
      "Configure which events to display",
      "Real activities automatically become notifications"
    ],
    iconBg: "bg-orange-500/10",
    iconColor: "text-orange-500",
  },
};

export function PathGuide({ path, onContinue, onBack }: PathGuideProps) {
  if (!path) return null;
  
  const config = pathConfigs[path];
  const Icon = config.icon;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-2 -ml-2 mb-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <div className="flex items-center gap-3">
          <div className={`rounded-full ${config.iconBg} p-3`}>
            <Icon className={`h-6 w-6 ${config.iconColor}`} />
          </div>
          <div>
            <h2 className="text-2xl font-bold">{config.title}</h2>
            <p className="text-muted-foreground">{config.subtitle}</p>
          </div>
        </div>
      </div>

      {/* Steps Overview */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="text-sm font-medium text-muted-foreground mb-4">Here's what you'll do:</h3>
          <div className="space-y-3">
            {config.steps.map((step, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                  {index + 1}
                </div>
                <p className="text-sm pt-0.5">{step}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Ready prompt */}
      <div className="bg-muted/50 rounded-lg p-4 flex items-start gap-3">
        <CheckCircle2 className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
        <p className="text-sm text-muted-foreground">
          {path === 'testimonials' && "You'll be taken to the Testimonials page to create your first collection form."}
          {path === 'social_proof' && "You'll be taken to the Campaign Wizard to create your first social proof notification."}
          {path === 'announcements' && "You'll be taken to the Campaign Wizard to create your first announcement."}
          {path === 'integrations' && "You'll be taken to the Integrations page to connect your first tool."}
        </p>
      </div>

      {/* Action button */}
      <Button onClick={onContinue} size="lg" className="w-full gap-2">
        Let's do it!
        <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
