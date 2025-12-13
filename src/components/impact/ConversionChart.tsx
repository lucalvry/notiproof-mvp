import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format, subDays, eachDayOfInterval } from "date-fns";

interface ConversionChartProps {
  websiteId: string;
  userId: string;
}

export function ConversionChart({ websiteId, userId }: ConversionChartProps) {
  const { data: chartData, isLoading } = useQuery({
    queryKey: ["impact-chart", websiteId],
    queryFn: async () => {
      const thirtyDaysAgo = subDays(new Date(), 30);

      const { data, error } = await supabase
        .from("impact_conversions")
        .select("created_at, monetary_value")
        .eq("website_id", websiteId)
        .eq("user_id", userId)
        .gte("created_at", thirtyDaysAgo.toISOString())
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Create a map of dates to conversion counts
      const dateMap = new Map<string, { conversions: number; revenue: number }>();

      // Initialize all days in the range
      const days = eachDayOfInterval({
        start: thirtyDaysAgo,
        end: new Date(),
      });

      days.forEach((day) => {
        const key = format(day, "yyyy-MM-dd");
        dateMap.set(key, { conversions: 0, revenue: 0 });
      });

      // Aggregate conversions by day
      data?.forEach((conversion) => {
        const key = format(new Date(conversion.created_at), "yyyy-MM-dd");
        const current = dateMap.get(key) || { conversions: 0, revenue: 0 };
        dateMap.set(key, {
          conversions: current.conversions + 1,
          revenue: current.revenue + (Number(conversion.monetary_value) || 0),
        });
      });

      // Convert to array for chart
      return Array.from(dateMap.entries()).map(([date, values]) => ({
        date,
        label: format(new Date(date), "MMM d"),
        conversions: values.conversions,
        revenue: values.revenue,
      }));
    },
    enabled: !!websiteId && !!userId,
  });

  if (isLoading) {
    return (
      <div className="h-[300px] flex items-center justify-center">
        <p className="text-muted-foreground">Loading chart...</p>
      </div>
    );
  }

  if (!chartData || chartData.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center">
        <p className="text-muted-foreground">No conversion data yet.</p>
      </div>
    );
  }

  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--popover))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
            }}
            labelStyle={{ color: "hsl(var(--popover-foreground))" }}
          />
          <Line
            type="monotone"
            dataKey="conversions"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={false}
            name="Conversions"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
