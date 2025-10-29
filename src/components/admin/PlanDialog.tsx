import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logAdminAction } from "@/lib/auditLog";

interface PlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan?: any;
  onSuccess: () => void;
}

export function PlanDialog({ open, onOpenChange, plan, onSuccess }: PlanDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    price_monthly: 0,
    price_yearly: 0,
    max_websites: 1,
    max_events_per_month: 1000,
    features: "",
    is_active: true,
  });

  useEffect(() => {
    if (plan) {
      setFormData({
        name: plan.name || "",
        price_monthly: plan.price_monthly || 0,
        price_yearly: plan.price_yearly || 0,
        max_websites: plan.max_websites || 1,
        max_events_per_month: plan.max_events_per_month || 1000,
        features: Array.isArray(plan.features) ? plan.features.join("\n") : "",
        is_active: plan.is_active ?? true,
      });
    } else {
      setFormData({
        name: "",
        price_monthly: 0,
        price_yearly: 0,
        max_websites: 1,
        max_events_per_month: 1000,
        features: "",
        is_active: true,
      });
    }
  }, [plan, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const features = formData.features
        .split("\n")
        .map(f => f.trim())
        .filter(f => f.length > 0);

      const planData = {
        name: formData.name,
        price_monthly: formData.price_monthly,
        price_yearly: formData.price_yearly,
        max_websites: formData.max_websites,
        max_events_per_month: formData.max_events_per_month,
        features,
        is_active: formData.is_active,
      };

      if (plan) {
        // Update existing plan
        const { error } = await supabase
          .from("subscription_plans")
          .update(planData)
          .eq("id", plan.id);

        if (error) throw error;

        await logAdminAction({
          action: "update_subscription_plan",
          resourceType: "subscription_plan",
          resourceId: plan.id,
          details: { plan_name: formData.name },
        });

        toast.success("Plan updated successfully");
      } else {
        // Create new plan
        const { error } = await supabase
          .from("subscription_plans")
          .insert([planData]);

        if (error) throw error;

        await logAdminAction({
          action: "create_subscription_plan",
          resourceType: "subscription_plan",
          details: { plan_name: formData.name },
        });

        toast.success("Plan created successfully");
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error saving plan:", error);
      toast.error(error.message || "Failed to save plan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{plan ? "Edit Plan" : "Create New Plan"}</DialogTitle>
            <DialogDescription>
              {plan ? "Update the subscription plan details" : "Create a new subscription plan"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Plan Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Starter"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price_monthly">Monthly Price ($)</Label>
                <Input
                  id="price_monthly"
                  type="number"
                  min="0"
                  value={formData.price_monthly}
                  onChange={(e) => setFormData({ ...formData, price_monthly: Number(e.target.value) })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price_yearly">Yearly Price ($)</Label>
                <Input
                  id="price_yearly"
                  type="number"
                  min="0"
                  value={formData.price_yearly}
                  onChange={(e) => setFormData({ ...formData, price_yearly: Number(e.target.value) })}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="max_websites">Max Websites</Label>
                <Input
                  id="max_websites"
                  type="number"
                  min="1"
                  value={formData.max_websites}
                  onChange={(e) => setFormData({ ...formData, max_websites: Number(e.target.value) })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="max_events">Max Events/Month</Label>
                <Input
                  id="max_events"
                  type="number"
                  min="100"
                  step="100"
                  value={formData.max_events_per_month}
                  onChange={(e) => setFormData({ ...formData, max_events_per_month: Number(e.target.value) })}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="features">Features (one per line)</Label>
              <Textarea
                id="features"
                value={formData.features}
                onChange={(e) => setFormData({ ...formData, features: e.target.value })}
                placeholder="Unlimited widgets&#10;Advanced analytics&#10;Priority support"
                rows={5}
                required
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label htmlFor="is_active">Active (visible to users)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : plan ? "Update Plan" : "Create Plan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}