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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CreditCard, Infinity } from "lucide-react";

interface Plan {
  id: string;
  name: string;
  price_monthly: number | null;
}

interface AssignPlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
  currentPlanName?: string | null;
  onSuccess: () => void;
}

export function AssignPlanDialog({
  open,
  onOpenChange,
  userId,
  userName,
  currentPlanName,
  onSuccess,
}: AssignPlanDialogProps) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  const [durationDays, setDurationDays] = useState(30);
  const [isLifetime, setIsLifetime] = useState(false);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchPlans();
    }
  }, [open]);

  const fetchPlans = async () => {
    const { data, error } = await supabase
      .from("subscription_plans")
      .select("id, name, price_monthly")
      .eq("is_active", true)
      .order("price_monthly", { ascending: true });

    if (error) {
      console.error("Error fetching plans:", error);
      toast.error("Failed to load plans");
      return;
    }

    setPlans(data || []);
    if (data && data.length > 0 && !selectedPlanId) {
      setSelectedPlanId(data[0].id);
    }
  };

  const selectedPlan = plans.find((p) => p.id === selectedPlanId);
  const isLtdPlan = selectedPlan?.name?.toLowerCase() === "ltd";
  const endDate = isLifetime ? null : new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);

  // Auto-check lifetime when LTD plan is selected
  useEffect(() => {
    if (isLtdPlan) {
      setIsLifetime(true);
    }
  }, [isLtdPlan]);

  const handleAssignPlan = async () => {
    if (!selectedPlanId) {
      toast.error("Please select a plan");
      return;
    }

    if (!isLifetime && durationDays <= 0) {
      toast.error("Duration must be greater than 0");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-user-actions", {
        body: {
          action: "assign-plan",
          userId,
          planId: selectedPlanId,
          durationDays: isLifetime ? null : durationDays,
          isLifetime,
          reason: reason.trim() || undefined,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const durationText = isLifetime ? "lifetime access" : `${durationDays} days`;
      toast.success(`Assigned ${selectedPlan?.name} plan to ${userName} for ${durationText}`);
      onSuccess();
      onOpenChange(false);
      
      // Reset form
      setReason("");
      setDurationDays(30);
      setIsLifetime(false);
    } catch (error: any) {
      console.error("Error assigning plan:", error);
      toast.error(error.message || "Failed to assign plan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Assign Plan
          </DialogTitle>
          <DialogDescription>
            Manually assign a subscription plan to {userName}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {currentPlanName && (
            <div className="text-sm text-muted-foreground">
              Current plan: <strong className="text-foreground">{currentPlanName}</strong>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="plan">Select Plan</Label>
            <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a plan" />
              </SelectTrigger>
              <SelectContent>
                {plans.map((plan) => (
                  <SelectItem key={plan.id} value={plan.id}>
                    {plan.name} {plan.price_monthly ? `($${plan.price_monthly}/mo)` : "(Free)"}
                    {plan.name.toLowerCase() === "ltd" && " 🎫"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox 
              id="lifetime" 
              checked={isLifetime}
              onCheckedChange={(checked) => setIsLifetime(checked === true)}
            />
            <Label 
              htmlFor="lifetime" 
              className="flex items-center gap-2 cursor-pointer text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              <Infinity className="h-4 w-4" />
              Lifetime Access (no expiry)
            </Label>
          </div>

          {!isLifetime && (
            <div className="space-y-2">
              <Label htmlFor="duration">Duration (days)</Label>
              <Input
                id="duration"
                type="number"
                min={1}
                max={365}
                value={durationDays}
                onChange={(e) => setDurationDays(parseInt(e.target.value) || 0)}
                placeholder="Enter number of days"
              />
              <p className="text-xs text-muted-foreground">
                Common: 30 (1 month), 90 (3 months), 365 (1 year)
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="reason">Reason (optional)</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., LTD Purchase, Promotional offer, Customer support case #123"
              rows={2}
            />
          </div>

          <div className="rounded-lg bg-muted p-3 space-y-1">
            <p className="text-sm">
              Plan: <strong className="text-primary">{selectedPlan?.name || "None selected"}</strong>
              {isLtdPlan && <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">LTD</span>}
            </p>
            <p className="text-sm">
              {isLifetime ? (
                <span className="flex items-center gap-1">
                  Duration: <strong className="text-primary flex items-center gap-1"><Infinity className="h-4 w-4" /> Lifetime</strong>
                </span>
              ) : (
                <>
                  Expires:{" "}
                  <strong className="text-primary">
                    {endDate?.toLocaleDateString("en-US", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </strong>
                </>
              )}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleAssignPlan} disabled={loading || !selectedPlanId || (!isLifetime && durationDays <= 0)}>
            {loading ? "Assigning..." : "Assign Plan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}