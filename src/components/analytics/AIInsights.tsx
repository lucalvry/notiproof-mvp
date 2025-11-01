import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Sparkles, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface Insight {
  type: 'success' | 'warning' | 'info';
  title: string;
  description: string;
}

interface AIInsightsProps {
  insights: Insight[];
  isProPlan: boolean;
  isLoading?: boolean;
}

export function AIInsights({ insights, isProPlan, isLoading = false }: AIInsightsProps) {
  const navigate = useNavigate();

  if (!isProPlan) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle>AI-Powered Insights</CardTitle>
          </div>
          <CardDescription>Get intelligent recommendations to boost performance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 gap-4">
            <Lock className="h-12 w-12 text-muted-foreground" />
            <div className="text-center space-y-2">
              <h3 className="font-semibold">Pro+ Feature</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                Unlock AI-powered insights that analyze your campaigns and provide actionable recommendations to increase conversions.
              </p>
            </div>
            <Button onClick={() => navigate('/billing')}>
              Upgrade to Pro+
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <CardTitle>AI-Powered Insights</CardTitle>
        </div>
        <CardDescription>Intelligent recommendations based on your data</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex h-[200px] items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : insights.length === 0 ? (
          <div className="flex h-[200px] items-center justify-center">
            <p className="text-muted-foreground">No insights available yet. Continue collecting data.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {insights.map((insight, index) => (
              <Alert key={index}>
                <AlertDescription>
                  <div className="space-y-1">
                    <p className="font-semibold">{insight.title}</p>
                    <p className="text-sm text-muted-foreground">{insight.description}</p>
                  </div>
                </AlertDescription>
              </Alert>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
