import { AlertTriangle, CreditCard, Clock, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import type { BlockReason } from "@/hooks/useSubscription";

interface AccessBlockedBannerProps {
  blockReason: BlockReason | null;
  trialEndsAt?: string | null;
  planName?: string;
  variant?: 'banner' | 'fullscreen';
}

const reasonConfig: Record<BlockReason, {
  icon: typeof AlertTriangle;
  title: string;
  description: string;
  actionLabel: string;
  actionPath: string;
  color: string;
}> = {
  no_subscription: {
    icon: CreditCard,
    title: "No Active Subscription",
    description: "Choose a plan to unlock all features and start displaying social proof on your website.",
    actionLabel: "Choose a Plan",
    actionPath: "/select-plan",
    color: "text-warning",
  },
  trial_expired: {
    icon: Clock,
    title: "Trial Period Expired",
    description: "Your free trial has ended. Subscribe now to continue using NotiProof and keep your notifications live.",
    actionLabel: "Subscribe Now",
    actionPath: "/select-plan",
    color: "text-destructive",
  },
  payment_failed: {
    icon: AlertTriangle,
    title: "Payment Failed",
    description: "We couldn't process your payment. Please update your payment method to restore access.",
    actionLabel: "Update Payment",
    actionPath: "/settings/billing",
    color: "text-destructive",
  },
  subscription_cancelled: {
    icon: XCircle,
    title: "Subscription Cancelled",
    description: "Your subscription has been cancelled. Resubscribe to restore access to your account.",
    actionLabel: "Resubscribe",
    actionPath: "/select-plan",
    color: "text-muted-foreground",
  },
  lifetime: {
    icon: CreditCard,
    title: "Lifetime Access",
    description: "You have lifetime access to NotiProof.",
    actionLabel: "Go to Dashboard",
    actionPath: "/dashboard",
    color: "text-primary",
  },
};

export function AccessBlockedBanner({ 
  blockReason, 
  trialEndsAt, 
  planName,
  variant = 'banner' 
}: AccessBlockedBannerProps) {
  const navigate = useNavigate();
  
  if (!blockReason) return null;
  
  const config = reasonConfig[blockReason];
  const Icon = config.icon;

  if (variant === 'fullscreen') {
    return (
      <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
        <Card className="max-w-md w-full shadow-2xl border-destructive/20">
          <CardHeader className="text-center pb-2">
            <div className={`mx-auto mb-4 p-4 rounded-full bg-destructive/10 ${config.color}`}>
              <Icon className="h-12 w-12" />
            </div>
            <CardTitle className="text-2xl">{config.title}</CardTitle>
            <CardDescription className="text-base mt-2">
              {config.description}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {blockReason === 'trial_expired' && trialEndsAt && (
              <p className="text-sm text-center text-muted-foreground">
                Trial ended on {new Date(trialEndsAt).toLocaleDateString()}
              </p>
            )}
            
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <h4 className="font-medium text-sm">While your account is blocked:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Notifications are not displaying on your website</li>
                <li>• Data exports are disabled</li>
                <li>• Campaign creation is paused</li>
                <li>• Your data is safe and will be restored</li>
              </ul>
            </div>

            <Button 
              onClick={() => navigate(config.actionPath)} 
              className="w-full"
              size="lg"
            >
              {config.actionLabel}
            </Button>
            
            <p className="text-xs text-center text-muted-foreground">
              Need help? <a href="mailto:support@notiproof.com" className="underline hover:text-foreground">Contact Support</a>
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Banner variant
  return (
    <div className="bg-destructive/10 border-l-4 border-destructive p-4 rounded-r-lg mb-6">
      <div className="flex items-start gap-3">
        <Icon className={`h-5 w-5 mt-0.5 ${config.color}`} />
        <div className="flex-1">
          <h4 className="font-semibold text-destructive">{config.title}</h4>
          <p className="text-sm text-muted-foreground mt-1">{config.description}</p>
        </div>
        <Button 
          onClick={() => navigate(config.actionPath)} 
          size="sm"
          variant="destructive"
        >
          {config.actionLabel}
        </Button>
      </div>
    </div>
  );
}
