import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Link2, 
  Upload, 
  Sparkles, 
  CheckCircle2,
  ArrowRight,
  Zap
} from "lucide-react";
import { getIntegrationMetadata } from "@/lib/integrationMetadata";
import { cn } from "@/lib/utils";

interface IntegrationPathSelectorProps {
  campaignType: string;
  selectedPath: string;
  onSelect: (path: string) => void;
}

// Map campaign types to relevant integrations
const CAMPAIGN_TO_INTEGRATIONS: Record<string, string[]> = {
  "recent-purchase": ["shopify", "woocommerce", "stripe", "paypal"],
  "cart-additions": ["shopify", "woocommerce"],
  "product-reviews": ["shopify", "woocommerce", "google_reviews"],
  "new-signup": ["webhook", "zapier"],
  "new-bookings": ["calendly"],
  "newsletter-signups": ["mailchimp", "convertkit", "beehiiv"],
  "contact-form": ["typeform", "jotform", "webhook"],
  "donation-notification": ["stripe", "paypal"],
  "course-enrollment": ["teachable", "thinkific"],
  // Add more mappings as needed
};

export function IntegrationPathSelector({ 
  campaignType, 
  selectedPath, 
  onSelect 
}: IntegrationPathSelectorProps) {
  const [hoveredPath, setHoveredPath] = useState<string | null>(null);
  
  // Get suggested integrations for this campaign type
  const suggestedIntegrations = CAMPAIGN_TO_INTEGRATIONS[campaignType] || ["webhook", "zapier"];
  const integrationMetadata = suggestedIntegrations.slice(0, 4).map(getIntegrationMetadata);

  const paths = [
    {
      id: "integration",
      title: "Connect Integration",
      description: "Automatically sync data from your existing tools",
      icon: <Link2 className="h-8 w-8" />,
      benefits: [
        "Real-time data sync",
        "Automatic updates",
        "No manual work required"
      ],
      badge: "Recommended",
      badgeVariant: "default" as const,
    },
    {
      id: "manual",
      title: "Upload CSV File",
      description: "Import your own data manually",
      icon: <Upload className="h-8 w-8" />,
      benefits: [
        "Full control over data",
        "One-time upload",
        "Works with any source"
      ],
      badge: "Quick Start",
      badgeVariant: "secondary" as const,
    },
    {
      id: "demo",
      title: "Use Demo Data",
      description: "Start with sample data to explore features",
      icon: <Sparkles className="h-8 w-8" />,
      benefits: [
        "Instant setup",
        "See how it works",
        "Switch anytime"
      ],
      badge: "Fastest",
      badgeVariant: "outline" as const,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <p className="text-sm text-muted-foreground">
          Choose how you want to populate your campaign with data
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {paths.map((path) => (
          <Card
            key={path.id}
            className={cn(
              "cursor-pointer transition-all hover:shadow-lg relative",
              selectedPath === path.id && "ring-2 ring-primary",
              hoveredPath === path.id && "scale-[1.02]"
            )}
            onClick={() => onSelect(path.id)}
            onMouseEnter={() => setHoveredPath(path.id)}
            onMouseLeave={() => setHoveredPath(null)}
          >
            {selectedPath === path.id && (
              <div className="absolute -top-2 -right-2 z-10">
                <div className="rounded-full bg-primary p-1">
                  <CheckCircle2 className="h-4 w-4 text-primary-foreground" />
                </div>
              </div>
            )}
            
            <CardHeader className="text-center pb-4">
              <div className="flex justify-center mb-3">
                <div className={cn(
                  "rounded-full p-3 transition-colors",
                  selectedPath === path.id 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-primary/10 text-primary"
                )}>
                  {path.icon}
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-center gap-2">
                  <CardTitle className="text-lg">{path.title}</CardTitle>
                  <Badge variant={path.badgeVariant} className="text-xs">
                    {path.badge}
                  </Badge>
                </div>
                <CardDescription className="text-xs">
                  {path.description}
                </CardDescription>
              </div>
            </CardHeader>
            
            <CardContent>
              <ul className="space-y-2 text-sm">
                {path.benefits.map((benefit, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">{benefit}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedPath === "integration" && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Recommended Integrations for This Campaign
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {integrationMetadata.map((integration) => {
                const Icon = integration.icon;
                return (
                  <div
                    key={integration.displayName}
                    className="flex flex-col items-center gap-2 p-3 rounded-lg bg-background border hover:border-primary/50 transition-colors"
                  >
                    <Icon className="h-6 w-6 text-primary" />
                    <span className="text-xs font-medium text-center">
                      {integration.displayName}
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-3 text-center">
              You'll connect your integration in the next step
            </p>
          </CardContent>
        </Card>
      )}

      {selectedPath === "manual" && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Upload className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium">CSV Upload Tips</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Include columns: name, location, timestamp, action</li>
                  <li>• Maximum 1,000 rows per upload</li>
                  <li>• You can update your data anytime</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedPath === "demo" && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium">Demo Data Preview</p>
                <p className="text-xs text-muted-foreground">
                  We'll populate your campaign with realistic sample data so you can see how it looks on your site. 
                  You can switch to real data anytime from the campaign settings.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
