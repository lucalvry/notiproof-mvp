import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Edit, Trash2, Target } from "lucide-react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface GoalsTableProps {
  websiteId: string;
  userId: string;
  onEditGoal: (goal: any) => void;
}

export function GoalsTable({ websiteId, userId, onEditGoal }: GoalsTableProps) {
  const queryClient = useQueryClient();

  const { data: goals, isLoading } = useQuery({
    queryKey: ["impact-goals", websiteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("impact_goals")
        .select("*")
        .eq("website_id", websiteId)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!websiteId && !!userId,
  });

  const handleToggleActive = async (goalId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from("impact_goals")
        .update({ is_active: isActive })
        .eq("id", goalId);

      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["impact-goals"] });
      toast.success(isActive ? "Goal activated" : "Goal deactivated");
    } catch (error: any) {
      toast.error("Failed to update goal");
    }
  };

  const handleDelete = async (goalId: string) => {
    try {
      const { error } = await supabase
        .from("impact_goals")
        .delete()
        .eq("id", goalId);

      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["impact-goals"] });
      toast.success("Goal deleted");
    } catch (error: any) {
      toast.error("Failed to delete goal");
    }
  };

  const getInteractionLabel = (type: string) => {
    const labels: Record<string, string> = {
      click: "Click",
      hover: "Hover",
      click_or_hover: "Click or Hover",
    };
    return labels[type] || type;
  };

  if (isLoading) {
    return <p className="text-muted-foreground">Loading goals...</p>;
  }

  if (!goals || goals.length === 0) {
    return (
      <div className="text-center py-8">
        <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No goals created yet.</p>
        <p className="text-sm text-muted-foreground mt-1">
          Create a goal to start tracking conversions.
        </p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Goal Name</TableHead>
          <TableHead>URL Pattern</TableHead>
          <TableHead>Interaction</TableHead>
          <TableHead>Window</TableHead>
          <TableHead>Value</TableHead>
          <TableHead>Active</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {goals.map((goal) => (
          <TableRow key={goal.id}>
            <TableCell className="font-medium">{goal.name}</TableCell>
            <TableCell>
              <code className="text-xs bg-muted px-2 py-1 rounded">
                {goal.match_type === "exact" ? "= " : "~ "}
                {goal.match_value}
              </code>
            </TableCell>
            <TableCell>
              <Badge variant="outline">{getInteractionLabel(goal.interaction_type)}</Badge>
            </TableCell>
            <TableCell>{goal.conversion_window_days} days</TableCell>
            <TableCell>
              {goal.monetary_value > 0 ? `$${goal.monetary_value}` : "-"}
            </TableCell>
            <TableCell>
              <Switch
                checked={goal.is_active}
                onCheckedChange={(checked) => handleToggleActive(goal.id, checked)}
              />
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onEditGoal(goal)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Goal</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete "{goal.name}"? This will also delete all associated conversion data.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDelete(goal.id)}>
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
