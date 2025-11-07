import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useNavigate } from "react-router-dom";
import { useEventUsage } from "@/hooks/useEventUsage";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Calendar,
  Activity,
  Zap
} from "lucide-react";
import { toast } from "sonner";

interface UsageDashboardProps {
  userId: string;
  showUpgradePrompts?: boolean;
}

export function UsageDashboard({ userId, showUpgradePrompts = true }: UsageDashboardProps) {
  const navigate = useNavigate();
  const { data: usage, isLoading: usageLoading } = useEventUsage(userId);
  const { plan, planName, isLoading: planLoading } = useSubscription(userId);
  const [hasShownPrompt, setHasShownPrompt] = useState<Record<string, boolean>>({});

  const usagePercentage = usage?.usage_percentage || 0;
  const eventsUsed = usage?.events_used || 0;
  const quotaLimit = usage?.quota_limit || 0;
  const quotaRemaining = usage?.quota_remaining || 0;

  // Determine status and threshold
  const getUsageStatus = () => {
    if (usagePercentage >= 100) return { level: 'critical', color: 'destructive', icon: XCircle };
    if (usagePercentage >= 80) return { level: 'warning', color: 'warning', icon: AlertTriangle };
    if (usagePercentage >= 50) return { level: 'moderate', color: 'secondary', icon: Activity };
    return { level: 'healthy', color: 'success', icon: CheckCircle };
  };

  const status = getUsageStatus();
  const StatusIcon = status.icon;

  // Show upgrade prompts at thresholds
  useEffect(() => {
    if (!showUpgradePrompts || usageLoading || planLoading) return;

    const promptKey = `usage_${status.level}_${new Date().getMonth()}`;
    
    if (hasShownPrompt[promptKey]) return;

    if (usagePercentage >= 100 && !hasShownPrompt[promptKey]) {
      toast.error("Event Quota Exceeded", {
        description: "You've reached your monthly event limit. Upgrade to continue tracking.",
        action: {
          label: "Upgrade Now",
          onClick: () => navigate("/billing")
        },
        duration: 10000,
      });
      setHasShownPrompt(prev => ({ ...prev, [promptKey]: true }));
    } else if (usagePercentage >= 80 && !hasShownPrompt[promptKey]) {
      toast.warning("High Event Usage", {
        description: `You've used ${usagePercentage.toFixed(0)}% of your monthly quota. Consider upgrading.`,
        action: {
          label: "View Plans",
          onClick: () => navigate("/billing")
        },
        duration: 8000,
      });
      setHasShownPrompt(prev => ({ ...prev, [promptKey]: true }));
    } else if (usagePercentage >= 50 && !hasShownPrompt[promptKey]) {
      toast.info("Event Usage Notice", {
        description: `You've used ${usagePercentage.toFixed(0)}% of your monthly quota.`,
        duration: 5000,
      });
      setHasShownPrompt(prev => ({ ...prev, [promptKey]: true }));
    }
  }, [usagePercentage, status.level, showUpgradePrompts, usageLoading, planLoading, hasShownPrompt, navigate]);

  if (usageLoading || planLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading usage data...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Event Usage Dashboard
              </CardTitle>
              <CardDescription>
                Monthly quota consumption for {planName} plan
              </CardDescription>
            </div>
            <Badge variant={status.color as any}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {status.level.toUpperCase()}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Usage Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Events Used</span>
              <span className="font-semibold">
                {eventsUsed.toLocaleString()} / {quotaLimit.toLocaleString()}
              </span>
            </div>
            <Progress 
              value={usagePercentage} 
              className={`h-3 ${usagePercentage >= 100 ? 'bg-destructive/20' : usagePercentage >= 80 ? 'bg-warning/20' : ''}`}
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{usagePercentage.toFixed(1)}% used</span>
              <span>{quotaRemaining.toLocaleString()} remaining</span>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <div className="p-2 rounded-md bg-primary/10">
                <Calendar className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Current Period</p>
                <p className="text-sm font-semibold">
                  {new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <div className="p-2 rounded-md bg-primary/10">
                <TrendingUp className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Daily Average</p>
                <p className="text-sm font-semibold">
                  {Math.round(eventsUsed / new Date().getDate()).toLocaleString()}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <div className="p-2 rounded-md bg-primary/10">
                <Zap className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Plan</p>
                <p className="text-sm font-semibold">{planName}</p>
              </div>
            </div>
          </div>

          {/* Warning Messages */}
          {usagePercentage >= 100 && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Quota Exceeded!</strong> You've reached your {quotaLimit.toLocaleString()} event limit. 
                New events may not be tracked until you upgrade or your quota resets next month.
              </AlertDescription>
            </Alert>
          )}

          {usagePercentage >= 80 && usagePercentage < 100 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>High Usage Alert:</strong> You're approaching your monthly limit. 
                Consider upgrading to avoid service interruption.
              </AlertDescription>
            </Alert>
          )}

          {/* Upgrade CTA */}
          {usagePercentage >= 50 && (
            <Button 
              className="w-full" 
              onClick={() => navigate("/billing")}
              variant={usagePercentage >= 80 ? "default" : "outline"}
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              {usagePercentage >= 100 ? "Upgrade Now" : "View Upgrade Options"}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
