import { Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface FrequencyUsageIndicatorProps {
  maxPerPage: number;
  maxPerSession: number;
}

export function FrequencyUsageIndicator({ maxPerPage, maxPerSession }: FrequencyUsageIndicatorProps) {
  return (
    <Card className="bg-blue-50/50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800">
      <CardContent className="pt-4">
        <Alert className="border-0 bg-transparent p-0">
          <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <AlertDescription className="text-sm text-blue-900 dark:text-blue-100">
            <div className="space-y-3">
              <div>
                <p className="font-medium mb-1">Frequency Limits Active</p>
                <p className="text-xs opacity-80">
                  Visitors will see a maximum of <strong>{maxPerPage} notifications per page</strong> and{" "}
                  <strong>{maxPerSession} per session</strong> to prevent notification fatigue.
                </p>
              </div>
              
              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span>Per Page Limit</span>
                    <span className="font-medium">{maxPerPage} notifications</span>
                  </div>
                  <Progress value={100} className="h-1.5 bg-blue-200 dark:bg-blue-900" />
                </div>
                
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span>Per Session Limit</span>
                    <span className="font-medium">{maxPerSession} notifications</span>
                  </div>
                  <Progress value={100} className="h-1.5 bg-blue-200 dark:bg-blue-900" />
                </div>
              </div>
              
              <p className="text-xs opacity-70 italic">
                These limits are enforced client-side and reset when users navigate to a new page (per-page) or close their browser (per-session).
              </p>
            </div>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
