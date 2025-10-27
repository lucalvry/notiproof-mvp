import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface Plan {
  id: string;
  name: string;
  price_monthly: number;
  price_yearly: number;
  features: string[];
  max_websites: number;
  max_events_per_month: number | null;
}

interface Subscription {
  id: string;
  plan_id: string;
  status: string;
  current_period_end: string;
  subscription_plans: Plan;
}

export default function Billing() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<Subscription | null>(null);

  useEffect(() => {
    loadBillingData();
  }, []);

  const loadBillingData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }

      // Load available plans
      const { data: plansData, error: plansError } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("is_active", true)
        .order("price_monthly", { ascending: true });

      if (plansError) throw plansError;
      
      // Transform the data to match our Plan interface
      const transformedPlans: Plan[] = (plansData || []).map(plan => ({
        id: plan.id,
        name: plan.name,
        price_monthly: plan.price_monthly,
        price_yearly: plan.price_yearly,
        features: (Array.isArray(plan.features) ? plan.features : []) as string[],
        max_websites: plan.max_websites,
        max_events_per_month: plan.max_events_per_month,
      }));
      
      setPlans(transformedPlans);

      // Load user's current subscription
      const { data: subData, error: subError } = await supabase
        .from("user_subscriptions")
        .select(`
          *,
          subscription_plans (*)
        `)
        .eq("user_id", user.id)
        .eq("status", "active")
        .single();

      if (subError && subError.code !== 'PGRST116') {
        throw subError;
      }

      // Transform subscription data if it exists
      if (subData) {
        const transformedSub: Subscription = {
          id: subData.id,
          plan_id: subData.plan_id,
          status: subData.status,
          current_period_end: subData.current_period_end,
          subscription_plans: {
            id: subData.subscription_plans.id,
            name: subData.subscription_plans.name,
            price_monthly: subData.subscription_plans.price_monthly,
            price_yearly: subData.subscription_plans.price_yearly,
            features: (Array.isArray(subData.subscription_plans.features) 
              ? subData.subscription_plans.features 
              : []) as string[],
            max_websites: subData.subscription_plans.max_websites,
            max_events_per_month: subData.subscription_plans.max_events_per_month,
          }
        };
        setCurrentSubscription(transformedSub);
      }
    } catch (error: any) {
      console.error("Error loading billing data:", error);
      toast.error("Failed to load billing information");
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = (planId: string, planName: string) => {
    // TODO: Implement Stripe checkout
    toast.info(`Stripe integration pending. Selected: ${planName} plan`);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(price);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading billing information...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Billing & Plans</h1>
        <p className="text-muted-foreground">
          Manage your subscription and billing information
        </p>
      </div>

      {/* Current Plan */}
      {currentSubscription ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Current Plan: {currentSubscription.subscription_plans.name}</CardTitle>
                <CardDescription>
                  You're currently on the {currentSubscription.subscription_plans.name} plan
                </CardDescription>
              </div>
              <Badge className="bg-success text-success-foreground">
                {currentSubscription.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Next billing date</span>
              <span className="font-medium">
                {new Date(currentSubscription.current_period_end).toLocaleDateString()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Amount</span>
              <span className="font-medium">
                {formatPrice(currentSubscription.subscription_plans.price_monthly)} / month
              </span>
            </div>
            <Button variant="outline" className="w-full gap-2" disabled>
              <CreditCard className="h-4 w-4" />
              Update Payment Method (Stripe integration pending)
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>No Active Subscription</CardTitle>
            <CardDescription>
              Choose a plan below to get started
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* Plans Grid */}
      <div>
        <h2 className="mb-4 text-2xl font-bold">Available Plans</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {plans.map((plan, index) => {
            const isCurrentPlan = currentSubscription?.plan_id === plan.id;
            const isPopular = index === 1; // Middle plan is popular
            
            return (
              <Card key={plan.id} className={isPopular ? "border-primary shadow-lg" : ""}>
                {isPopular && (
                  <div className="flex justify-center">
                    <Badge className="rounded-b-lg rounded-t-none">Most Popular</Badge>
                  </div>
                )}
                <CardHeader>
                  <CardTitle>{plan.name}</CardTitle>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">{formatPrice(plan.price_monthly)}</span>
                    <span className="text-muted-foreground"> / month</span>
                  </div>
                  <CardDescription>
                    {plan.max_websites} {plan.max_websites === 1 ? "Website" : "Websites"} • 
                    {plan.max_events_per_month 
                      ? ` ${(plan.max_events_per_month / 1000).toFixed(0)}K views`
                      : " Unlimited views"
                    }
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    {(plan.features as string[]).map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-success" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full"
                    variant={isCurrentPlan ? "outline" : "default"}
                    disabled={isCurrentPlan}
                    onClick={() => handleUpgrade(plan.id, plan.name)}
                  >
                    {isCurrentPlan ? "Current Plan" : "Upgrade"}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Billing History */}
      <Card>
        <CardHeader>
          <CardTitle>Billing History</CardTitle>
          <CardDescription>
            View your past invoices and payments (Stripe integration required)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {currentSubscription ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Billing history will be available once Stripe integration is complete</p>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No billing history available</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
