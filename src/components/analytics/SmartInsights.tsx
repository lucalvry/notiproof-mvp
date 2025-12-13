import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Sparkles, TrendingUp, TrendingDown, Award, AlertTriangle, Info } from "lucide-react";
import { useMemo } from "react";

interface SmartInsightsProps {
  totalViews: number;
  totalClicks: number;
  ctr: number;
  previousViews: number;
  previousClicks: number;
  previousCtr: number;
  campaigns: Array<{
    name: string;
    views: number;
    clicks: number;
    ctr: number;
    type: string;
  }>;
  eventInsights: Array<{
    eventType: string;
    count: number;
    percentage: number;
  }>;
  isLoading?: boolean;
}

interface Insight {
  type: 'success' | 'warning' | 'info';
  icon: typeof TrendingUp;
  title: string;
  description: string;
}

export function SmartInsights({
  totalViews,
  totalClicks,
  ctr,
  previousViews,
  previousClicks,
  previousCtr,
  campaigns,
  eventInsights,
  isLoading = false,
}: SmartInsightsProps) {
  const insights = useMemo(() => {
    const result: Insight[] = [];

    // Only generate insights if we have data
    if (totalViews === 0 && campaigns.length === 0) {
      return result;
    }

    // CTR change insight
    if (previousCtr > 0) {
      const ctrChange = ((ctr - previousCtr) / previousCtr) * 100;
      if (ctrChange > 10) {
        result.push({
          type: 'success',
          icon: TrendingUp,
          title: 'CTR is improving!',
          description: `Your click-through rate increased by ${ctrChange.toFixed(1)}% compared to the previous period.`,
        });
      } else if (ctrChange < -10) {
        result.push({
          type: 'warning',
          icon: TrendingDown,
          title: 'CTR is declining',
          description: `Your click-through rate decreased by ${Math.abs(ctrChange).toFixed(1)}%. Consider refreshing your notification messaging.`,
        });
      }
    }

    // Views growth insight
    if (previousViews > 0) {
      const viewsChange = ((totalViews - previousViews) / previousViews) * 100;
      if (viewsChange > 20) {
        result.push({
          type: 'success',
          icon: TrendingUp,
          title: 'Strong growth in views',
          description: `Your notifications reached ${viewsChange.toFixed(1)}% more people this period.`,
        });
      }
    }

    // Top performing notification
    if (campaigns.length > 0) {
      const topNotification = [...campaigns].sort((a, b) => b.ctr - a.ctr)[0];
      if (topNotification.views > 0) {
        result.push({
          type: 'success',
          icon: Award,
          title: `Top performer: ${topNotification.name}`,
          description: `This notification has the highest CTR at ${topNotification.ctr.toFixed(2)}% with ${topNotification.views.toLocaleString()} views.`,
        });
      }
    }

    // Notification type comparison
    if (campaigns.length > 1) {
      const typeStats = campaigns.reduce((acc, c) => {
        if (!acc[c.type]) {
          acc[c.type] = { views: 0, clicks: 0 };
        }
        acc[c.type].views += c.views;
        acc[c.type].clicks += c.clicks;
        return acc;
      }, {} as Record<string, { views: number; clicks: number }>);

      const typePerformance = Object.entries(typeStats)
        .map(([type, stats]) => ({
          type,
          ctr: stats.views > 0 ? (stats.clicks / stats.views) * 100 : 0,
        }))
        .filter(t => t.ctr > 0)
        .sort((a, b) => b.ctr - a.ctr);

      if (typePerformance.length > 1) {
        const best = typePerformance[0];
        const worst = typePerformance[typePerformance.length - 1];
        if (best.ctr > worst.ctr * 1.5) {
          result.push({
            type: 'info',
            icon: Info,
            title: 'Notification type insight',
            description: `${best.type} notifications outperform ${worst.type} notifications by ${((best.ctr / worst.ctr - 1) * 100).toFixed(0)}% in CTR.`,
          });
        }
      }
    }

    // Event distribution insight
    if (eventInsights.length > 0) {
      const topEvent = eventInsights[0];
      if (topEvent.percentage > 50) {
        result.push({
          type: 'info',
          icon: Info,
          title: 'Event concentration',
          description: `${topEvent.eventType.replace(/_/g, ' ')} events make up ${topEvent.percentage.toFixed(0)}% of your total activity.`,
        });
      }
    }

    // Low activity warning
    if (totalViews > 0 && totalViews < 100) {
      result.push({
        type: 'warning',
        icon: AlertTriangle,
        title: 'Low traffic detected',
        description: 'Consider adding the widget to more pages or promoting your notifications to increase visibility.',
      });
    }

    return result.slice(0, 4); // Limit to 4 insights
  }, [totalViews, totalClicks, ctr, previousViews, previousClicks, previousCtr, campaigns, eventInsights]);

  const getAlertStyle = (type: Insight['type']) => {
    switch (type) {
      case 'success':
        return 'border-green-500/50 bg-green-500/10';
      case 'warning':
        return 'border-yellow-500/50 bg-yellow-500/10';
      case 'info':
        return 'border-blue-500/50 bg-blue-500/10';
    }
  };

  const getIconStyle = (type: Insight['type']) => {
    switch (type) {
      case 'success':
        return 'text-green-500';
      case 'warning':
        return 'text-yellow-500';
      case 'info':
        return 'text-blue-500';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <CardTitle>Smart Insights</CardTitle>
        </div>
        <CardDescription>Data-driven recommendations based on your performance</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex h-[200px] items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : insights.length === 0 ? (
          <div className="flex flex-col h-[150px] items-center justify-center gap-2">
            <p className="text-muted-foreground">Not enough data for insights yet</p>
            <p className="text-sm text-muted-foreground">Continue collecting data to unlock smart recommendations</p>
          </div>
        ) : (
          <div className="space-y-3">
            {insights.map((insight, index) => (
              <Alert key={index} className={getAlertStyle(insight.type)}>
                <insight.icon className={`h-4 w-4 ${getIconStyle(insight.type)}`} />
                <AlertDescription>
                  <div className="space-y-1 ml-2">
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
