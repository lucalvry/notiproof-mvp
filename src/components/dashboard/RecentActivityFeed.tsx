import { formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Bell, FileText, Star, Megaphone, Users, ShoppingCart, UserPlus, Activity } from "lucide-react";
import { ActivityItem } from "@/hooks/useRecentActivity";
import { EmptyState } from "./EmptyState";

interface RecentActivityFeedProps {
  activities: ActivityItem[];
  isLoading: boolean;
}

const eventIcons: Record<string, typeof Bell> = {
  purchase: ShoppingCart,
  signup: UserPlus,
  testimonial: Star,
  announcement: Megaphone,
  form_submission: FileText,
  live_visitors: Users,
  conversion: Activity,
  visitor: Users,
};

const eventColors: Record<string, string> = {
  purchase: "text-green-500 bg-green-500/10",
  signup: "text-blue-500 bg-blue-500/10",
  testimonial: "text-amber-500 bg-amber-500/10",
  announcement: "text-purple-500 bg-purple-500/10",
  form_submission: "text-cyan-500 bg-cyan-500/10",
  live_visitors: "text-pink-500 bg-pink-500/10",
  conversion: "text-emerald-500 bg-emerald-500/10",
  visitor: "text-indigo-500 bg-indigo-500/10",
};

export function RecentActivityFeed({ activities, isLoading }: RecentActivityFeedProps) {
  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest proof notifications</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest proof notifications</CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyState
            title="No activity yet"
            description="Create your first notification to start seeing activity here"
            icon={Activity}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>Latest proof notifications</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[300px] px-6">
          <div className="space-y-4 pb-4">
            {activities.map((activity) => {
              const Icon = eventIcons[activity.type] || Bell;
              const colorClass = eventColors[activity.type] || "text-primary bg-primary/10";
              
              return (
                <div key={activity.id} className="flex items-start gap-3">
                  <div className={`p-2 rounded-full ${colorClass}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {activity.message}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                      <span>
                        {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                      </span>
                      {activity.clicks > 0 && (
                        <>
                          <span>•</span>
                          <span>{activity.clicks} clicks</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
