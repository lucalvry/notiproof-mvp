import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  FileInput, 
  CheckCircle, 
  XCircle, 
  Clock, 
  TrendingUp,
  Eye,
  MousePointer
} from "lucide-react";
import { useFormCaptureAnalytics } from "@/hooks/useFormCaptureAnalytics";

interface FormCaptureAnalyticsProps {
  websiteId: string;
}

export function FormCaptureAnalytics({ websiteId }: FormCaptureAnalyticsProps) {
  const { data: analytics, isLoading } = useFormCaptureAnalytics(websiteId);

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const stats = [
    {
      title: "Total Captures",
      value: analytics?.totalCaptures || 0,
      icon: FileInput,
      description: "Form submissions captured",
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      title: "Approved",
      value: analytics?.approvedCaptures || 0,
      icon: CheckCircle,
      description: `${analytics?.approvalRate?.toFixed(1) || 0}% approval rate`,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      title: "Pending Review",
      value: analytics?.pendingCaptures || 0,
      icon: Clock,
      description: "Awaiting moderation",
      color: "text-yellow-600",
      bgColor: "bg-yellow-100",
    },
    {
      title: "Rejected",
      value: analytics?.rejectedCaptures || 0,
      icon: XCircle,
      description: "Not displayed",
      color: "text-red-600",
      bgColor: "bg-red-100",
    },
  ];

  const performanceStats = [
    {
      title: "Total Views",
      value: analytics?.totalViews || 0,
      icon: Eye,
      description: "Notification impressions",
    },
    {
      title: "Total Clicks",
      value: analytics?.totalClicks || 0,
      icon: MousePointer,
      description: "User interactions",
    },
    {
      title: "Click Rate",
      value: `${analytics?.clickRate?.toFixed(1) || 0}%`,
      icon: TrendingUp,
      description: "Engagement rate",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Form Capture Analytics</h2>
        <p className="text-muted-foreground mt-1">
          Track capture rates, approval rates, and notification performance
        </p>
      </div>

      {/* Status Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Performance Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Performance</CardTitle>
          <CardDescription>
            How your form capture notifications are performing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-3">
            {performanceStats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.title} className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-muted">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Tips Card */}
      <Card className="bg-muted/30">
        <CardHeader>
          <CardTitle className="text-base">Tips to Improve Performance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• Use compelling message templates with emojis to increase engagement</p>
          <p>• Include location data when available for social proof</p>
          <p>• Review and approve submissions quickly for fresh content</p>
          <p>• A/B test different message templates to find what works best</p>
        </CardContent>
      </Card>
    </div>
  );
}
