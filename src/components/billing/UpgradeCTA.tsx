import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, Zap } from "lucide-react";

interface UpgradeCTAProps {
  title?: string;
  description?: string;
  currentPlan: string;
  limitType: "websites" | "events";
  currentUsage: number;
  maxAllowed: number;
}

export function UpgradeCTA({
  title,
  description,
  currentPlan,
  limitType,
  currentUsage,
  maxAllowed,
}: UpgradeCTAProps) {
  const navigate = useNavigate();

  const defaultTitle = limitType === "websites" 
    ? "Website Limit Reached"
    : "Event Limit Approaching";

  const defaultDescription = limitType === "websites"
    ? `You've reached your ${currentPlan} plan limit of ${maxAllowed} website${maxAllowed !== 1 ? 's' : ''}. Upgrade to add more websites.`
    : `You're approaching your ${currentPlan} plan limit of ${maxAllowed.toLocaleString()} events per month.`;

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              {title || defaultTitle}
            </CardTitle>
            <CardDescription>
              {description || defaultDescription}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Current usage</span>
          <span className="font-semibold">
            {currentUsage} / {maxAllowed}
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${Math.min((currentUsage / maxAllowed) * 100, 100)}%` }}
          />
        </div>
        <Button
          className="w-full gap-2"
          onClick={() => navigate("/pricing")}
        >
          <TrendingUp className="h-4 w-4" />
          View Upgrade Options
        </Button>
      </CardContent>
    </Card>
  );
}
