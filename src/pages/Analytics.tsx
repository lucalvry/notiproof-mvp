import { useEffect, useState, useRef } from "react";
import { useAnalytics } from "@/hooks/useAnalytics";
import { supabase } from "@/integrations/supabase/client";
import { OverviewCards } from "@/components/analytics/OverviewCards";
import { PerformanceGraph } from "@/components/analytics/PerformanceGraph";
import { NotificationTable } from "@/components/analytics/NotificationTable";
import { EventInsights } from "@/components/analytics/EventInsights";
import { SmartInsights } from "@/components/analytics/SmartInsights";
import { ExportButton } from "@/components/analytics/ExportButton";
import { DateRangeFilter } from "@/components/dashboard/DateRangeFilter";
import { useWebsiteContext } from "@/contexts/WebsiteContext";
import { Globe } from "lucide-react";

export default function Analytics() {
  const [userId, setUserId] = useState<string>();
  const [dateRange, setDateRange] = useState(30);
  const { currentWebsite } = useWebsiteContext();
  const { data: analytics, isLoading } = useAnalytics(
    userId, 
    dateRange, 
    currentWebsite?.id
  );
  const performanceChartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id);
    });
  }, []);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="text-muted-foreground">
            Track your notification performance and engagement
          </p>
          {currentWebsite && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
              <Globe className="h-4 w-4" />
              <span>Showing data for: <strong className="text-foreground">{currentWebsite.domain}</strong></span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <DateRangeFilter value={dateRange} onChange={setDateRange} />
          <ExportButton 
            data={analytics?.dailyStats || []} 
            filename={`analytics-${currentWebsite?.domain || 'all'}-${new Date().toISOString().split('T')[0]}`}
          />
        </div>
      </div>

      {/* Section 1: Performance Summary */}
      <OverviewCards
        totalViews={analytics?.totalViews || 0}
        totalClicks={analytics?.totalClicks || 0}
        ctr={analytics?.ctr || 0}
        activeNotifications={analytics?.activeCampaigns || 0}
        totalEvents={analytics?.totalEvents || 0}
        previousViews={analytics?.previousViews}
        previousClicks={analytics?.previousClicks}
        previousCtr={analytics?.previousCtr}
        previousActiveNotifications={analytics?.previousActiveCampaigns}
        previousTotalEvents={analytics?.previousTotalEvents}
        isLoading={isLoading}
      />

      {/* Section 2: Trend Over Time */}
      <div ref={performanceChartRef}>
        <PerformanceGraph
          dailyStats={analytics?.dailyStats || []}
          isLoading={isLoading}
        />
      </div>

      {/* Section 3: Notification Breakdown */}
      <NotificationTable
        notifications={analytics?.campaigns || []}
        isLoading={isLoading}
      />

      {/* Section 4 & 5: Event Insights and Smart Insights */}
      <div className="grid gap-6 md:grid-cols-2">
        <EventInsights
          events={analytics?.eventInsights || []}
          isLoading={isLoading}
        />
        <SmartInsights
          totalViews={analytics?.totalViews || 0}
          totalClicks={analytics?.totalClicks || 0}
          ctr={analytics?.ctr || 0}
          previousViews={analytics?.previousViews || 0}
          previousClicks={analytics?.previousClicks || 0}
          previousCtr={analytics?.previousCtr || 0}
          campaigns={analytics?.campaigns || []}
          eventInsights={analytics?.eventInsights || []}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
