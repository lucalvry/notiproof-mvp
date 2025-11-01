import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Trophy, TrendingUp, AlertCircle } from "lucide-react";
import { ABTest, ABTestVariant } from "@/hooks/useABTests";

interface ABTestResultsProps {
  test: ABTest;
  variants: ABTestVariant[];
  onMakeWinnerPermanent: () => void;
}

export function ABTestResults({ test, variants, onMakeWinnerPermanent }: ABTestResultsProps) {
  const sortedVariants = [...variants].sort((a, b) => {
    const ctrA = a.views > 0 ? (a.clicks / a.views) * 100 : 0;
    const ctrB = b.views > 0 ? (b.clicks / b.views) * 100 : 0;
    return ctrB - ctrA;
  });

  const winner = test.winner_variant_id
    ? variants.find(v => v.id === test.winner_variant_id)
    : null;

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 95) return { variant: 'default' as const, label: 'High Confidence' };
    if (confidence >= 80) return { variant: 'secondary' as const, label: 'Medium Confidence' };
    return { variant: 'outline' as const, label: 'Low Confidence' };
  };

  const confidenceBadge = getConfidenceBadge(test.confidence_level);

  return (
    <div className="space-y-6">
      {/* Overall Test Stats */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Test Performance</CardTitle>
              <CardDescription>
                {test.total_views.toLocaleString()} total views • {test.total_clicks.toLocaleString()} total clicks
              </CardDescription>
            </div>
            <Badge {...confidenceBadge}>{confidenceBadge.label}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Statistical Confidence</span>
              <span className="font-semibold">{test.confidence_level.toFixed(1)}%</span>
            </div>
            <Progress value={test.confidence_level} className="h-2" />
            {test.confidence_level < 95 && (
              <p className="text-xs text-muted-foreground">
                Need {(95 - test.confidence_level).toFixed(1)}% more confidence to auto-declare winner
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Winner Alert */}
      {winner && (
        <Alert>
          <Trophy className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <div>
              <p className="font-semibold">Winner: {winner.name}</p>
              <p className="text-sm">
                Declared on {new Date(test.winner_declared_at!).toLocaleDateString()}
              </p>
            </div>
            <Button onClick={onMakeWinnerPermanent} size="sm">
              Make Winner Permanent
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Variant Comparison */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sortedVariants.map((variant, index) => {
          const ctr = variant.views > 0 ? (variant.clicks / variant.views) * 100 : 0;
          const isWinner = variant.id === test.winner_variant_id;
          const isLeading = index === 0 && !isWinner;

          return (
            <Card key={variant.id} className={isWinner ? 'border-primary' : ''}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{variant.name}</CardTitle>
                  <div className="flex gap-1">
                    {variant.is_control && <Badge variant="outline">Control</Badge>}
                    {isWinner && <Badge><Trophy className="h-3 w-3 mr-1" />Winner</Badge>}
                    {isLeading && <Badge variant="secondary"><TrendingUp className="h-3 w-3 mr-1" />Leading</Badge>}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Views</span>
                    <span className="font-semibold">{variant.views.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Clicks</span>
                    <span className="font-semibold">{variant.clicks.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Click-Through Rate</span>
                    <span className="text-lg font-bold">{ctr.toFixed(2)}%</span>
                  </div>
                </div>
                <Progress value={(variant.views / test.total_views) * 100} className="h-1" />
                <p className="text-xs text-muted-foreground">
                  {((variant.views / test.total_views) * 100).toFixed(1)}% of traffic
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Insights */}
      {test.confidence_level >= 50 && !winner && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <p className="font-semibold mb-1">Test is progressing</p>
            <p className="text-sm">
              Continue running the test to reach 95% confidence. Current best performer: {sortedVariants[0]?.name}
            </p>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
