import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Activity } from "lucide-react";

interface TeamActivityLogProps {
  organizationId?: string;
}

export function TeamActivityLog({ organizationId }: TeamActivityLogProps) {
  const { data: activities, isLoading } = useQuery({
    queryKey: ['team-activity', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];

      const { data, error } = await supabase
        .from('audit_logs')
        .select(`
          *,
          admin:profiles!admin_id(name)
        `)
        .eq('resource_type', 'team_invitation')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Activity Log
        </CardTitle>
        <CardDescription>Recent team collaboration activities</CardDescription>
      </CardHeader>
      <CardContent>
        {!activities || activities.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No activity recorded yet
          </p>
        ) : (
          <div className="space-y-4">
            {activities.map((activity) => (
              <div key={activity.id} className="flex items-start gap-4 pb-4 border-b last:border-0">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {(activity.admin as any)?.name || 'Unknown'}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {activity.action}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {(activity.details as any)?.target_user_name && (
                      <span>for {(activity.details as any).target_user_name}</span>
                    )}
                    {(activity.details as any)?.role && (
                      <span className="ml-1">- Role: {(activity.details as any).role}</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(activity.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
