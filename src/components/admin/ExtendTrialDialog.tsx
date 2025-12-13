import { useState } from "react";
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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Calendar, Clock } from "lucide-react";

interface ExtendTrialDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
  currentTrialEnd?: string | null;
  onSuccess: () => void;
}

export function ExtendTrialDialog({
  open,
  onOpenChange,
  userId,
  userName,
  currentTrialEnd,
  onSuccess,
}: ExtendTrialDialogProps) {
  const [daysToAdd, setDaysToAdd] = useState(7);
  const [loading, setLoading] = useState(false);

  const currentEndDate = currentTrialEnd ? new Date(currentTrialEnd) : null;
  const newEndDate = currentEndDate
    ? new Date(currentEndDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000)
    : new Date(Date.now() + daysToAdd * 24 * 60 * 60 * 1000);

  const handleExtendTrial = async () => {
    if (daysToAdd <= 0) {
      toast.error("Days to add must be greater than 0");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-user-actions", {
        body: {
          action: "extend-trial",
          userId,
          daysToAdd,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(`Extended trial by ${daysToAdd} days for ${userName}`);
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error extending trial:", error);
      toast.error(error.message || "Failed to extend trial");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Extend Trial Period
          </DialogTitle>
          <DialogDescription>
            Add more days to {userName}'s trial period.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {currentTrialEnd && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>
                Current trial ends:{" "}
                <strong className="text-foreground">
                  {new Date(currentTrialEnd).toLocaleDateString()}
                </strong>
              </span>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="daysToAdd">Days to add</Label>
            <Input
              id="daysToAdd"
              type="number"
              min={1}
              max={365}
              value={daysToAdd}
              onChange={(e) => setDaysToAdd(parseInt(e.target.value) || 0)}
              placeholder="Enter number of days"
            />
          </div>

          <div className="rounded-lg bg-muted p-3">
            <p className="text-sm">
              New trial end date:{" "}
              <strong className="text-primary">
                {newEndDate.toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </strong>
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleExtendTrial} disabled={loading || daysToAdd <= 0}>
            {loading ? "Extending..." : `Extend by ${daysToAdd} days`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
