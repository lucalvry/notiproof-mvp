import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Activity, MousePointer, Eye } from "lucide-react";

interface ConversionsTableProps {
  websiteId: string;
  userId: string;
}

export function ConversionsTable({ websiteId, userId }: ConversionsTableProps) {
  const { data: conversions, isLoading } = useQuery({
    queryKey: ["impact-conversions", websiteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("impact_conversions")
        .select(`
          *,
          goal:impact_goals(name),
          campaign:campaigns(name)
        `)
        .eq("website_id", websiteId)
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    },
    enabled: !!websiteId && !!userId,
  });

  const getInteractionIcon = (type: string) => {
    if (type === "click") return <MousePointer className="h-3 w-3" />;
    if (type === "hover") return <Eye className="h-3 w-3" />;
    return <Activity className="h-3 w-3" />;
  };

  if (isLoading) {
    return <p className="text-muted-foreground">Loading conversions...</p>;
  }

  if (!conversions || conversions.length === 0) {
    return (
      <div className="text-center py-8">
        <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No conversions recorded yet.</p>
        <p className="text-sm text-muted-foreground mt-1">
          Conversions will appear here after visitors interact with notifications and complete goals.
        </p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Goal</TableHead>
          <TableHead>Campaign</TableHead>
          <TableHead>Interaction</TableHead>
          <TableHead>Value</TableHead>
          <TableHead>Page URL</TableHead>
          <TableHead>Converted At</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {conversions.map((conversion) => (
          <TableRow key={conversion.id}>
            <TableCell className="font-medium">
              {(conversion.goal as any)?.name || "Unknown Goal"}
            </TableCell>
            <TableCell>
              {(conversion.campaign as any)?.name || "-"}
            </TableCell>
            <TableCell>
              <Badge variant="outline" className="gap-1">
                {getInteractionIcon(conversion.interaction_type)}
                {conversion.interaction_type}
              </Badge>
            </TableCell>
            <TableCell>
              {conversion.monetary_value > 0 ? `$${conversion.monetary_value}` : "-"}
            </TableCell>
            <TableCell>
              <code className="text-xs bg-muted px-2 py-1 rounded max-w-[200px] truncate block">
                {conversion.page_url || "-"}
              </code>
            </TableCell>
            <TableCell className="text-muted-foreground text-sm">
              {format(new Date(conversion.created_at), "MMM d, yyyy h:mm a")}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
