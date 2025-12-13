import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, MousePointer, Eye, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface EmailStats {
  total_sent: number;
  total_opened: number;
  total_clicked: number;
  open_rate: number;
  click_rate: number;
  by_type: Record<string, { sent: number; opened: number; clicked: number }>;
}

export function EmailAnalyticsWidget() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["email-analytics"],
    queryFn: async (): Promise<EmailStats> => {
      // Fetch trial email stats
      const { data: trialEmails, error: trialError } = await supabase
        .from("trial_email_notifications")
        .select("email_type, status, opened_at, clicked_at");

      if (trialError) throw trialError;

      // Fetch winback email stats
      const { data: winbackEmails, error: winbackError } = await supabase
        .from("winback_email_campaigns")
        .select("template_key, status, opened_at, clicked_at");

      if (winbackError) throw winbackError;

      // Calculate stats
      const allEmails = [
        ...(trialEmails || []).map((e) => ({
          type: e.email_type,
          sent: e.status === "sent",
          opened: !!e.opened_at,
          clicked: !!e.clicked_at,
        })),
        ...(winbackEmails || []).map((e) => ({
          type: e.template_key,
          sent: e.status !== "pending" && e.status !== "failed",
          opened: !!e.opened_at,
          clicked: !!e.clicked_at,
        })),
      ];

      const total_sent = allEmails.filter((e) => e.sent).length;
      const total_opened = allEmails.filter((e) => e.opened).length;
      const total_clicked = allEmails.filter((e) => e.clicked).length;

      const by_type: Record<string, { sent: number; opened: number; clicked: number }> = {};
      for (const email of allEmails) {
        if (!by_type[email.type]) {
          by_type[email.type] = { sent: 0, opened: 0, clicked: 0 };
        }
        if (email.sent) by_type[email.type].sent++;
        if (email.opened) by_type[email.type].opened++;
        if (email.clicked) by_type[email.type].clicked++;
      }

      return {
        total_sent,
        total_opened,
        total_clicked,
        open_rate: total_sent > 0 ? (total_opened / total_sent) * 100 : 0,
        click_rate: total_opened > 0 ? (total_clicked / total_opened) * 100 : 0,
        by_type,
      };
    },
    refetchInterval: 60000,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatType = (type: string) => {
    return type
      .replace(/_/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase());
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Email Analytics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold text-primary">
              {stats?.total_sent || 0}
            </div>
            <div className="text-xs text-muted-foreground">Total Sent</div>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-center gap-1">
              <Eye className="h-4 w-4 text-blue-500" />
              <span className="text-2xl font-bold">{stats?.total_opened || 0}</span>
            </div>
            <div className="text-xs text-muted-foreground">Opens</div>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-center gap-1">
              <MousePointer className="h-4 w-4 text-green-500" />
              <span className="text-2xl font-bold">{stats?.total_clicked || 0}</span>
            </div>
            <div className="text-xs text-muted-foreground">Clicks</div>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-center gap-1">
              <TrendingUp className="h-4 w-4 text-purple-500" />
              <span className="text-2xl font-bold">
                {stats?.open_rate.toFixed(1) || 0}%
              </span>
            </div>
            <div className="text-xs text-muted-foreground">Open Rate</div>
          </div>
        </div>

        {/* By Type Breakdown */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">By Email Type</h4>
          <div className="space-y-2">
            {Object.entries(stats?.by_type || {}).map(([type, data]) => {
              const openRate = data.sent > 0 ? (data.opened / data.sent) * 100 : 0;
              const clickRate = data.opened > 0 ? (data.clicked / data.opened) * 100 : 0;
              
              return (
                <div
                  key={type}
                  className="flex items-center justify-between p-2 bg-muted/30 rounded text-sm"
                >
                  <span className="font-medium">{formatType(type)}</span>
                  <div className="flex items-center gap-4 text-muted-foreground">
                    <span>{data.sent} sent</span>
                    <span className="text-blue-500">{openRate.toFixed(0)}% opened</span>
                    <span className="text-green-500">{clickRate.toFixed(0)}% clicked</span>
                  </div>
                </div>
              );
            })}
            {Object.keys(stats?.by_type || {}).length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No email data yet
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
