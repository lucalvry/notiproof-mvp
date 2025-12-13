import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, MousePointerClick, Percent, Bell, Activity, ArrowUp, ArrowDown } from "lucide-react";

interface OverviewCardsProps {
  totalViews: number;
  totalClicks: number;
  ctr: number;
  activeNotifications: number;
  totalEvents: number;
  previousViews?: number;
  previousClicks?: number;
  previousCtr?: number;
  previousActiveNotifications?: number;
  previousTotalEvents?: number;
  isLoading?: boolean;
}

export function OverviewCards({
  totalViews,
  totalClicks,
  ctr,
  activeNotifications,
  totalEvents,
  previousViews = 0,
  previousClicks = 0,
  previousCtr = 0,
  previousActiveNotifications = 0,
  previousTotalEvents = 0,
  isLoading = false,
}: OverviewCardsProps) {
  const calculateChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const cards = [
    {
      title: "Total Views",
      value: totalViews,
      icon: Eye,
      change: calculateChange(totalViews, previousViews),
      format: (v: number) => v.toLocaleString(),
    },
    {
      title: "Total Clicks",
      value: totalClicks,
      icon: MousePointerClick,
      change: calculateChange(totalClicks, previousClicks),
      format: (v: number) => v.toLocaleString(),
    },
    {
      title: "Click-Through Rate",
      value: ctr,
      icon: Percent,
      change: calculateChange(ctr, previousCtr),
      format: (v: number) => `${v.toFixed(2)}%`,
    },
    {
      title: "Active Notifications",
      value: activeNotifications,
      icon: Bell,
      change: calculateChange(activeNotifications, previousActiveNotifications),
      format: (v: number) => v.toString(),
    },
    {
      title: "Total Events",
      value: totalEvents,
      icon: Activity,
      change: calculateChange(totalEvents, previousTotalEvents),
      format: (v: number) => v.toLocaleString(),
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
            <card.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? "..." : card.format(card.value)}
            </div>
            {!isLoading && card.change !== 0 && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                {card.change > 0 ? (
                  <ArrowUp className="h-3 w-3 text-green-500" />
                ) : (
                  <ArrowDown className="h-3 w-3 text-red-500" />
                )}
                <span className={card.change > 0 ? "text-green-500" : "text-red-500"}>
                  {Math.abs(card.change).toFixed(1)}%
                </span>
                <span>vs last period</span>
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
