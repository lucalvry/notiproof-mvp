import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, MousePointer, TrendingUp, Zap, ArrowUpIcon, ArrowDownIcon } from "lucide-react";

interface OverviewCardsProps {
  totalViews: number;
  totalClicks: number;
  conversionRate: number;
  activeWidgets: number;
  previousViews?: number;
  previousClicks?: number;
  previousConversionRate?: number;
  previousActiveWidgets?: number;
  isLoading?: boolean;
}

export function OverviewCards({
  totalViews,
  totalClicks,
  conversionRate,
  activeWidgets,
  previousViews = 0,
  previousClicks = 0,
  previousConversionRate = 0,
  previousActiveWidgets = 0,
  isLoading = false,
}: OverviewCardsProps) {
  const calculateChange = (current: number, previous: number) => {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  const viewsChange = calculateChange(totalViews, previousViews);
  const clicksChange = calculateChange(totalClicks, previousClicks);
  const conversionChange = calculateChange(conversionRate, previousConversionRate);
  const widgetsChange = calculateChange(activeWidgets, previousActiveWidgets);

  const stats = [
    {
      label: "Total Views",
      value: isLoading ? "..." : totalViews.toLocaleString(),
      icon: Eye,
      change: viewsChange,
    },
    {
      label: "Total Clicks",
      value: isLoading ? "..." : totalClicks.toLocaleString(),
      icon: MousePointer,
      change: clicksChange,
    },
    {
      label: "Conversion Rate",
      value: isLoading ? "..." : `${conversionRate.toFixed(1)}%`,
      icon: TrendingUp,
      change: conversionChange,
    },
    {
      label: "Active Widgets",
      value: isLoading ? "..." : activeWidgets.toString(),
      icon: Zap,
      change: widgetsChange,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        const isPositive = stat.change > 0;
        const isNegative = stat.change < 0;
        
        return (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              {!isLoading && (
                <div className="flex items-center gap-1 mt-1">
                  {isPositive && (
                    <>
                      <ArrowUpIcon className="h-3 w-3 text-green-500" />
                      <span className="text-xs text-green-500">+{stat.change.toFixed(1)}%</span>
                    </>
                  )}
                  {isNegative && (
                    <>
                      <ArrowDownIcon className="h-3 w-3 text-red-500" />
                      <span className="text-xs text-red-500">{stat.change.toFixed(1)}%</span>
                    </>
                  )}
                  {!isPositive && !isNegative && (
                    <span className="text-xs text-muted-foreground">No change</span>
                  )}
                  <span className="text-xs text-muted-foreground ml-1">vs last period</span>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
