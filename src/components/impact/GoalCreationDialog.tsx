import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

interface GoalCreationDialogProps {
  open: boolean;
  onClose: () => void;
  websiteId: string;
  userId: string;
  editingGoal?: any;
}

export function GoalCreationDialog({
  open,
  onClose,
  websiteId,
  userId,
  editingGoal,
}: GoalCreationDialogProps) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [matchType, setMatchType] = useState<"exact" | "contains">("contains");
  const [matchValue, setMatchValue] = useState("");
  const [interactionType, setInteractionType] = useState<"click" | "hover" | "click_or_hover">("click");
  const [conversionWindow, setConversionWindow] = useState("30");
  const [monetaryValue, setMonetaryValue] = useState("");

  useEffect(() => {
    if (editingGoal) {
      setName(editingGoal.name || "");
      setMatchType(editingGoal.match_type || "contains");
      setMatchValue(editingGoal.match_value || "");
      setInteractionType(editingGoal.interaction_type || "click");
      setConversionWindow(String(editingGoal.conversion_window_days || 30));
      setMonetaryValue(String(editingGoal.monetary_value || ""));
    } else {
      resetForm();
    }
  }, [editingGoal, open]);

  const resetForm = () => {
    setName("");
    setMatchType("contains");
    setMatchValue("");
    setInteractionType("click");
    setConversionWindow("30");
    setMonetaryValue("");
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Please enter a goal name");
      return;
    }
    if (!matchValue.trim()) {
      toast.error("Please enter a URL match value");
      return;
    }

    setSaving(true);
    try {
      const goalData = {
        website_id: websiteId,
        user_id: userId,
        name: name.trim(),
        match_type: matchType,
        match_value: matchValue.trim(),
        interaction_type: interactionType,
        conversion_window_days: parseInt(conversionWindow),
        monetary_value: monetaryValue ? parseFloat(monetaryValue) : 0,
      };

      if (editingGoal) {
        const { error } = await supabase
          .from("impact_goals")
          .update(goalData)
          .eq("id", editingGoal.id);
        if (error) throw error;
        toast.success("Goal updated successfully");
      } else {
        const { error } = await supabase
          .from("impact_goals")
          .insert(goalData);
        if (error) throw error;
        toast.success("Goal created successfully");
      }

      queryClient.invalidateQueries({ queryKey: ["impact-goals"] });
      onClose();
    } catch (error: any) {
      console.error("Error saving goal:", error);
      toast.error(error.message || "Failed to save goal");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{editingGoal ? "Edit Goal" : "Create Conversion Goal"}</DialogTitle>
          <DialogDescription>
            Define a URL-based goal to track when visitors convert after interacting with a notification.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="goal-name">Goal Name</Label>
            <Input
              id="goal-name"
              placeholder="e.g., Purchase, Signup, Contact Form"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>URL Match Type</Label>
              <Select value={matchType} onValueChange={(v) => setMatchType(v as "exact" | "contains")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="contains">Contains</SelectItem>
                  <SelectItem value="exact">Exact Match</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="match-value">URL Pattern</Label>
              <Input
                id="match-value"
                placeholder="/thank-you"
                value={matchValue}
                onChange={(e) => setMatchValue(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Attribution Interaction</Label>
            <Select value={interactionType} onValueChange={(v) => setInteractionType(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="click">Click Only</SelectItem>
                <SelectItem value="hover">Hover Only</SelectItem>
                <SelectItem value="click_or_hover">Click or Hover</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Which notification interactions count toward this goal
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Conversion Window</Label>
              <Select value={conversionWindow} onValueChange={setConversionWindow}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="60">60 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="monetary-value">Monetary Value (Optional)</Label>
              <Input
                id="monetary-value"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={monetaryValue}
                onChange={(e) => setMonetaryValue(e.target.value)}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : editingGoal ? "Update Goal" : "Create Goal"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
