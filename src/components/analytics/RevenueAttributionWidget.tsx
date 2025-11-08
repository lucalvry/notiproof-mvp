import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp, Target, Users } from "lucide-react";
import { useRevenueAttribution } from "@/hooks/useRevenueAttribution";
import { formatDistanceToNow } from "date-fns";

interface RevenueAttributionWidgetProps {
  userId: string;
  campaignId?: string;
  periodType?: 'daily' | 'weekly' | 'monthly';
}

export function RevenueAttributionWidget({
  userId,
  campaignId,
  periodType = 'monthly',
}: RevenueAttributionWidgetProps) {
  const {
    revenueStats,
    recentConversions,
    isLoading,
    averageOrderValue,
    attributionBreakdown,
  } = useRevenueAttribution(userId, campaignId, periodType);

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="animate-pulse">
              <div className="h-4 bg-muted rounded w-24" />
              <div className="h-8 bg-muted rounded w-32 mt-2" />
            </CardHeader>
          </Card>
        ))}
      </div>
    );
  }

  if (!revenueStats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Revenue Attribution</CardTitle>
          <CardDescription>
            No conversion data available yet. Start tracking conversions to see revenue attribution.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: revenueStats.currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="space-y-4">
      {/* Main Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(revenueStats.total_revenue)}</div>
            <p className="text-xs text-muted-foreground">
              {revenueStats.total_conversions} conversions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Direct Revenue</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(revenueStats.direct_revenue)}</div>
            <p className="text-xs text-muted-foreground">
              {attributionBreakdown?.direct.percentage.toFixed(1)}% of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Influenced Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(revenueStats.influenced_revenue)}</div>
            <p className="text-xs text-muted-foreground">
              Multi-touch attribution
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(averageOrderValue)}</div>
            <p className="text-xs text-muted-foreground">
              Per conversion
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Attribution Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Attribution Model Breakdown</CardTitle>
          <CardDescription>
            How notifications contributed to revenue
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="default">Direct</Badge>
                <span className="text-sm text-muted-foreground">Last-click attribution</span>
              </div>
              <div className="text-right">
                <div className="font-semibold">{formatCurrency(revenueStats.direct_revenue)}</div>
                <div className="text-xs text-muted-foreground">
                  {attributionBreakdown?.direct.percentage.toFixed(1)}%
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Assisted</Badge>
                <span className="text-sm text-muted-foreground">Multi-touch contributions</span>
              </div>
              <div className="text-right">
                <div className="font-semibold">{formatCurrency(revenueStats.assisted_revenue)}</div>
                <div className="text-xs text-muted-foreground">
                  {attributionBreakdown?.assisted.percentage.toFixed(1)}%
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline">Influenced</Badge>
                <span className="text-sm text-muted-foreground">Total impact</span>
              </div>
              <div className="text-right">
                <div className="font-semibold">{formatCurrency(revenueStats.influenced_revenue)}</div>
                <div className="text-xs text-muted-foreground">
                  100%
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Conversions */}
      {recentConversions && recentConversions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Conversions</CardTitle>
            <CardDescription>Latest attributed conversions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentConversions.map((conversion) => (
                <div
                  key={conversion.id}
                  className="flex items-center justify-between border-b border-border pb-3 last:border-0 last:pb-0"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {conversion.conversion_type}
                      </Badge>
                      <Badge
                        variant={
                          conversion.attribution_type === 'direct'
                            ? 'default'
                            : conversion.attribution_type === 'assisted'
                            ? 'secondary'
                            : 'outline'
                        }
                        className="text-xs"
                      >
                        {conversion.attribution_type}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {conversion.campaign?.name || 'Unknown campaign'}
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <div className="font-semibold">
                      {formatCurrency(conversion.conversion_value)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(conversion.created_at), { addSuffix: true })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
