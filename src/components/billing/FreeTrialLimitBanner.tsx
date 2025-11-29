import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, Sparkles } from "lucide-react";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";
import { supabase } from "@/integrations/supabase/client";

interface FreeTrialLimitBannerProps {
  type: "websites" | "events" | "storage" | "video";
  current: number;
  limit: number;
  planName?: string;
}

export function FreeTrialLimitBanner({ type, current, limit, planName = "Free" }: FreeTrialLimitBannerProps) {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | undefined>();
  const { isSuperAdmin } = useSuperAdmin(userId);
  
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUserId(user?.id));
  }, []);
  
  // Hide for super admins
  if (isSuperAdmin) return null;
  
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
    storage: {
      title: isAtLimit ? "Storage Limit Reached" : "Storage Limit Approaching",
      description: isAtLimit
        ? `You've reached your ${planName} plan storage limit. Upgrade or purchase additional storage.`
        : `You're approaching your storage limit. Consider upgrading or adding more storage.`
    },
    video: {
      title: "Video Recording Limit",
      description: `Your ${planName} plan allows videos up to ${Math.floor(limit / 60)} minute${Math.floor(limit / 60) !== 1 ? 's' : ''}. Upgrade for longer videos.`
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
