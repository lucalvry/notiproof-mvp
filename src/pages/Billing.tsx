import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Check, CreditCard, Sparkles, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useLocation } from "react-router-dom";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface Plan {
  id: string;
  name: string;
  price_monthly: number;
  price_yearly: number;
  features: string[];
  max_websites: number;
  max_events_per_month: number | null;
  stripe_price_id_monthly?: string | null;
  stripe_price_id_yearly?: string | null;
  stripe_product_id?: string | null;
}

interface Subscription {
  id: string;
  plan_id: string;
  status: string;
  current_period_end: string;
  trial_start?: string | null;
  trial_end?: string | null;
  subscription_plans: Plan;
}

export default function Billing() {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<Subscription | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [processingPlanId, setProcessingPlanId] = useState<string | null>(null);

  useEffect(() => {
    loadBillingData();
    
    // Check for checkout success/cancel in URL
    const params = new URLSearchParams(location.search);
    const sessionId = params.get('session_id');
    
    if (params.get('success') === 'true' && sessionId) {
      verifyStripeSession(sessionId);
    } else if (params.get('canceled') === 'true') {
      toast.info('Checkout canceled. You can try again anytime.');
    }
  }, [location]);

  const verifyStripeSession = async (sessionId: string) => {
    try {
      toast.loading('Verifying your subscription...');
      
      const { data: { session } } = await supabase.auth.getSession();
      
      const { data, error } = await supabase.functions.invoke('verify-stripe-session', {
        body: { sessionId },
        headers: session?.access_token ? {
          Authorization: `Bearer ${session.access_token}`,
        } : {},
      });

      toast.dismiss();

      if (error || !data?.verified) {
        console.error('Verification error:', error || data);
        toast.error('Failed to verify subscription. Please contact support.');
        return;
      }

      toast.success(`✅ ${data.planName} subscription activated!`);
      
      // Reload billing data to show updated subscription
      await loadBillingData();
      
      // Clean up URL
      window.history.replaceState({}, '', '/billing');
    } catch (error) {
      console.error('Error verifying session:', error);
      toast.dismiss();
      toast.error('Failed to verify subscription');
    }
  };

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
        stripe_price_id_monthly: plan.stripe_price_id_monthly,
        stripe_price_id_yearly: plan.stripe_price_id_yearly,
        stripe_product_id: plan.stripe_product_id,
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
        .in("status", ["active", "trialing", "past_due"])
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
          trial_start: subData.trial_start,
          trial_end: subData.trial_end,
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

  const handleUpgrade = async (planId: string, planName: string) => {
    setProcessingPlanId(planId);
    try {
      const plan = plans.find(p => p.id === planId);
      if (!plan) {
        toast.error("Plan not found");
        return;
      }

      // Get Stripe price ID based on billing period
      const priceId = billingPeriod === 'monthly' 
        ? plan.stripe_price_id_monthly 
        : plan.stripe_price_id_yearly;

      if (!priceId) {
        toast.error("This plan is not available for purchase online. Please contact sales.");
        return;
      }

      // Call edge function to create checkout session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        toast.error("Please log in to continue");
        navigate("/login");
        return;
      }

      // Get current user info
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        toast.error("User email not found");
        return;
      }

      toast.loading("Preparing checkout...");

      const response = await supabase.functions.invoke('create-stripe-checkout', {
        body: { 
          priceId,
          billingPeriod,
          customerEmail: user.email,
          customerName: user.user_metadata?.full_name || user.email.split('@')[0],
          returnUrl: window.location.origin
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) {
        console.error("Checkout error:", response.error);
        toast.dismiss();
        toast.error("Failed to start checkout process");
        return;
      }

      // Redirect to Stripe Checkout
      if (response.data?.url) {
        toast.dismiss();
        toast.success("Redirecting to checkout...");
        window.location.assign(response.data.url);
      } else {
        toast.dismiss();
        toast.error("Failed to get checkout URL");
      }
    } catch (error: any) {
      console.error("Error creating checkout:", error);
      toast.error("Failed to start checkout");
    } finally {
      setProcessingPlanId(null);
    }
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

      {/* Trial Status Banner */}
      {currentSubscription && currentSubscription.status === 'trialing' && currentSubscription.trial_end && (
        <Alert className="border-success">
          <Sparkles className="h-4 w-4" />
          <AlertTitle>🎉 Free Trial Active</AlertTitle>
          <AlertDescription>
            Your trial ends on{' '}
            <strong>
              {new Date(currentSubscription.trial_end).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </strong>
            . After that, you'll be charged{' '}
            <strong>{formatPrice(currentSubscription.subscription_plans.price_monthly)}/month</strong>.
            <br />
            <span className="text-xs text-muted-foreground mt-2 block">
              Your payment method on file will be automatically charged. Cancel anytime before trial ends to avoid charges.
            </span>
          </AlertDescription>
        </Alert>
      )}

      {/* Trial Expiring Soon Warning */}
      {currentSubscription && currentSubscription.status === 'trialing' && currentSubscription.trial_end && (() => {
        const daysLeft = Math.ceil(
          (new Date(currentSubscription.trial_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );
        
        if (daysLeft <= 7) {
          return (
            <Alert variant={daysLeft <= 3 ? "destructive" : "default"}>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Trial Ending Soon</AlertTitle>
              <AlertDescription>
                Your trial ends in <strong>{daysLeft} day{daysLeft !== 1 ? 's' : ''}</strong>.
                You'll be charged {formatPrice(currentSubscription.subscription_plans.price_monthly)} on{' '}
                {new Date(currentSubscription.trial_end).toLocaleDateString()}.
              </AlertDescription>
            </Alert>
          );
        }
        return null;
      })()}

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
            {/* Only show billing info for paid plans */}
            {currentSubscription.subscription_plans.price_monthly > 0 ? (
              <>
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
              </>
            ) : (
              <div className="rounded-lg bg-muted p-4 text-center">
                <p className="text-sm text-muted-foreground">
                  You're on the Free plan. Upgrade to unlock more features and higher limits!
                </p>
              </div>
            )}
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
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold">Available Plans</h2>
          <div className="flex items-center gap-3">
            <span className={`text-sm ${billingPeriod === 'monthly' ? 'font-semibold' : 'text-muted-foreground'}`}>
              Monthly
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBillingPeriod(billingPeriod === 'monthly' ? 'yearly' : 'monthly')}
              className="relative h-8 w-14 rounded-full p-0"
            >
              <div className={`absolute h-6 w-6 rounded-full bg-primary transition-all ${
                billingPeriod === 'yearly' ? 'left-7' : 'left-1'
              }`} />
            </Button>
            <span className={`text-sm ${billingPeriod === 'yearly' ? 'font-semibold' : 'text-muted-foreground'}`}>
              Yearly <Badge variant="secondary" className="ml-1">Save 20%</Badge>
            </span>
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {plans.filter(plan => plan.name !== 'Free').map((plan, index) => {
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
                    <span className="text-4xl font-bold">
                      {formatPrice(billingPeriod === 'monthly' ? plan.price_monthly : plan.price_yearly)}
                    </span>
                    <span className="text-muted-foreground">
                      {billingPeriod === 'monthly' ? ' / month' : ' / year'}
                    </span>
                  </div>
                  {billingPeriod === 'yearly' && (
                    <div className="text-sm text-muted-foreground">
                      {formatPrice(plan.price_yearly / 12)} per month
                    </div>
                  )}
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
                    disabled={isCurrentPlan || processingPlanId === plan.id}
                    onClick={() => handleUpgrade(plan.id, plan.name)}
                  >
                    {processingPlanId === plan.id 
                      ? "Processing..." 
                      : isCurrentPlan 
                        ? "Current Plan" 
                        : currentSubscription?.status === 'trialing'
                          ? "Switch Plan"
                          : "Upgrade"
                    }
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
