import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Target, TrendingUp, DollarSign, Activity } from "lucide-react";

interface ImpactMetricsProps {
  websiteId: string;
  userId: string;
}

export function ImpactMetrics({ websiteId, userId }: ImpactMetricsProps) {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ["impact-metrics", websiteId],
    queryFn: async () => {
      // Get total conversions
      const { count: totalConversions, error: convError } = await supabase
        .from("impact_conversions")
        .select("*", { count: "exact", head: true })
        .eq("website_id", websiteId)
        .eq("user_id", userId);

      if (convError) throw convError;

      // Get total revenue
      const { data: revenueData, error: revError } = await supabase
        .from("impact_conversions")
        .select("monetary_value")
        .eq("website_id", websiteId)
        .eq("user_id", userId);

      if (revError) throw revError;

      const totalRevenue = revenueData?.reduce((sum, c) => sum + (Number(c.monetary_value) || 0), 0) || 0;

      // Get active goals count
      const { count: activeGoals, error: goalsError } = await supabase
        .from("impact_goals")
        .select("*", { count: "exact", head: true })
        .eq("website_id", websiteId)
        .eq("user_id", userId)
        .eq("is_active", true);

      if (goalsError) throw goalsError;

      // Get conversions from last 7 days for trend
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { count: recentConversions } = await supabase
        .from("impact_conversions")
        .select("*", { count: "exact", head: true })
        .eq("website_id", websiteId)
        .eq("user_id", userId)
        .gte("created_at", sevenDaysAgo.toISOString());

      return {
        totalConversions: totalConversions || 0,
        totalRevenue,
        activeGoals: activeGoals || 0,
        recentConversions: recentConversions || 0,
      };
    },
    enabled: !!websiteId && !!userId,
  });

  const cards = [
    {
      title: "Total Conversions",
      value: metrics?.totalConversions || 0,
      icon: Target,
      description: "Attributed to NotiProof",
    },
    {
      title: "This Week",
      value: metrics?.recentConversions || 0,
      icon: TrendingUp,
      description: "Last 7 days",
    },
    {
      title: "Total Revenue",
      value: `$${(metrics?.totalRevenue || 0).toFixed(2)}`,
      icon: DollarSign,
      description: "From goal values",
    },
    {
      title: "Active Goals",
      value: metrics?.activeGoals || 0,
      icon: Activity,
      description: "Tracking conversions",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.title}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {card.title}
                  </p>
                  <p className="text-2xl font-bold">
                    {isLoading ? "-" : card.value}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {card.description}
                  </p>
                </div>
                <Icon className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
