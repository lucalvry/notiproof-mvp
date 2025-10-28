import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

interface ConnectionWizardProps {
  website: {
    id: string;
    name: string;
    is_verified: boolean;
    widgetCount?: number;
  };
  onViewCode: () => void;
}

export function ConnectionWizard({ website, onViewCode }: ConnectionWizardProps) {
  const navigate = useNavigate();
  const hasWidget = (website.widgetCount || 0) > 0;
  const isVerified = website.is_verified;

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader>
        <CardTitle className="text-lg">Complete Setup for {website.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Step 1: Website Added */}
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-success text-success-foreground">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="font-medium">Website added</p>
              <p className="text-xs text-muted-foreground">Your website is registered</p>
            </div>
          </div>

          {/* Step 2: Create Widget */}
          <div className="flex items-center gap-3">
            <div className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full",
              hasWidget ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground"
            )}>
              {hasWidget ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
            </div>
            <div className="flex-1">
              <p className={cn("font-medium", !hasWidget && "text-muted-foreground")}>
                Create a widget
              </p>
              <p className="text-xs text-muted-foreground">
                Set up your first notification widget
              </p>
            </div>
            {!hasWidget && (
              <Button 
                size="sm" 
                onClick={() => navigate(`/campaigns?website=${website.id}`)}
              >
                Create Widget
              </Button>
            )}
          </div>

          {/* Step 3: Install Widget */}
          <div className="flex items-center gap-3">
            <div className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full",
              isVerified ? "bg-success text-success-foreground" : hasWidget ? "bg-pending text-pending-foreground" : "bg-muted text-muted-foreground"
            )}>
              {isVerified ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : hasWidget ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Circle className="h-5 w-5" />
              )}
            </div>
            <div className="flex-1">
              <p className={cn("font-medium", !hasWidget && "text-muted-foreground")}>
                Install unified script on your site
              </p>
              <p className="text-xs text-muted-foreground">
                {isVerified ? "Connected and working!" : hasWidget ? "Waiting for script installation..." : "One script handles all your widgets"}
              </p>
            </div>
            {hasWidget && !isVerified && (
              <Button 
                size="sm" 
                variant="outline"
                onClick={onViewCode}
              >
                View Code
              </Button>
            )}
          </div>
        </div>

        {hasWidget && !isVerified && (
          <div className="mt-4 p-3 bg-pending/10 border border-pending/20 rounded-lg">
            <p className="text-sm text-pending-foreground">
              💡 Checking for widget installation every 10 seconds...
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
