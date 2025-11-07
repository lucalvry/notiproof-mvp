import { useNavigate } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, Sparkles } from "lucide-react";

interface FreeTrialLimitBannerProps {
  type: "websites" | "events" | "integrations" | "templates";
  current: number;
  limit: number;
  planName?: string;
}

export function FreeTrialLimitBanner({ type, current, limit, planName = "Free" }: FreeTrialLimitBannerProps) {
  const navigate = useNavigate();
  
  const isAtLimit = current >= limit;
  const isNearLimit = current >= limit * 0.8;

  if (!isAtLimit && !isNearLimit) return null;

  const messages = {
    websites: {
      title: isAtLimit ? "Website Limit Reached" : "Website Limit Approaching",
      description: isAtLimit 
        ? `You've reached your ${planName} plan limit of ${limit} website${limit !== 1 ? 's' : ''}. Upgrade to add more websites.`
        : `You're using ${current} of ${limit} website${limit !== 1 ? 's' : ''}. Upgrade to add more.`
    },
    events: {
      title: isAtLimit ? "Monthly View Limit Reached" : "Monthly View Limit Approaching",
      description: isAtLimit
        ? `You've reached your ${planName} plan limit of ${limit.toLocaleString()} monthly views. Upgrade for more capacity.`
        : `You're using ${current.toLocaleString()} of ${limit.toLocaleString()} monthly views.`
    },
    integrations: {
      title: isAtLimit ? "Integration Limit Reached" : "Integration Limit Approaching",
      description: isAtLimit
        ? `You've reached your ${planName} plan limit of ${limit} integration${limit !== 1 ? 's' : ''}. Upgrade to connect more platforms.`
        : `You're using ${current} of ${limit} integration${limit !== 1 ? 's' : ''}. Upgrade to connect more.`
    },
    templates: {
      title: isAtLimit ? "Template Limit Reached" : "Template Limit Approaching",
      description: isAtLimit
        ? `You've reached your ${planName} plan limit of ${limit} campaign template${limit !== 1 ? 's' : ''}. Upgrade for unlimited templates.`
        : `You're using ${current} of ${limit} campaign template${limit !== 1 ? 's' : ''}. Upgrade for more.`
    }
  };

  const message = messages[type];

  return (
    <Alert variant={isAtLimit ? "destructive" : "default"} className="mb-6">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between">
        <div>
          <p className="font-semibold">{message.title}</p>
          <p className="text-sm mt-1">{message.description}</p>
        </div>
        <Button
          variant={isAtLimit ? "default" : "outline"}
          size="sm"
          onClick={() => navigate("/pricing")}
          className="ml-4 shrink-0"
        >
          <Sparkles className="h-4 w-4 mr-2" />
          {planName === "Free" ? "Upgrade Now" : "View Plans"}
        </Button>
      </AlertDescription>
    </Alert>
  );
}
