import { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Check, Sparkles, AlertCircle, RefreshCw, ChevronDown } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import logoImage from "@/assets/NotiProof_Logo.png";

interface Plan {
  id: string;
  name: string;
  price_monthly: number;
  price_yearly: number;
  max_websites: number;
  max_events_per_month: number | null;
  storage_limit_bytes: number;
  video_max_duration_seconds: number;
  can_remove_branding?: boolean;
  custom_domain_enabled?: boolean;
  has_white_label?: boolean;
  has_api?: boolean;
  stripe_price_id_monthly?: string;
  stripe_price_id_yearly?: string;
}

const formatStorage = (bytes: number): string => {
  if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(0)}GB`;
  return `${(bytes / 1048576).toFixed(0)}MB`;
};

const formatVideoDuration = (seconds: number): string => {
  if (seconds >= 60) return `${Math.floor(seconds / 60)}min`;
  return `${seconds}sec`;
};

const generatePlanFeatures = (plan: Plan): string[] => {
  const features: string[] = [];
  
  const websiteLabel = plan.max_websites >= 999 ? 'Unlimited websites' : `${plan.max_websites} website${plan.max_websites > 1 ? 's' : ''}`;
  features.push(websiteLabel);
  features.push(plan.max_events_per_month 
    ? `${(plan.max_events_per_month / 1000).toFixed(0)}K views/mo`
    : 'Unlimited views'
  );
  features.push("All 38+ integrations");
  features.push("All templates");
  features.push("Unlimited testimonials");
  
  return features;
};

export default function SelectPlan() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<any>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [loading, setLoading] = useState(false);
  const [processingPlanId, setProcessingPlanId] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<{ message: string; planId: string } | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  
  const searchParams = new URLSearchParams(location.search);
  const isRetry = searchParams.get('retry') === 'true';
  const subscriptionId = searchParams.get('subscription_id');
  const isReactivate = searchParams.get('reactivate') === 'true';
  const highlightPlanId = searchParams.get('plan');
  const billingParam = searchParams.get('billing');

  useEffect(() => {
    if (billingParam === 'yearly') {
      setBillingPeriod('yearly');
    }
  }, [billingParam]);

  useEffect(() => {
    const loadPlans = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        toast.error("Please create an account first");
        navigate('/register');
        return;
      }

      setUser(session.user);

      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('price_monthly') as { data: Plan[] | null; error: any };

      if (error) {
        toast.error('Failed to load plans');
        return;
      }

      setPlans(data || []);
    };

    loadPlans();
  }, [navigate]);

  const handleSelectFreePlan = async () => {
    setLoading(true);
    try {
      const freePlan = plans.find(p => p.price_monthly === 0);
      if (!freePlan) {
        toast.error("Free plan not available");
        return;
      }

      await supabase
        .from('user_subscriptions')
        .insert({
          user_id: user.id,
          plan_id: freePlan.id,
          status: 'free',
        });

      toast.success("Welcome to NotiProof! Your free plan is active.");
      navigate("/websites");
    } catch (error: any) {
      toast.error(error.message || "Failed to activate free plan");
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = async (plan: Plan, isRetryAttempt = false) => {
    if (!isRetryAttempt) {
      setErrorDetails(null);
      setRetryCount(0);
    }
    
    setProcessingPlanId(plan.id);
    setLoading(true);

    try {
      const priceId = billingPeriod === 'monthly' 
        ? plan.stripe_price_id_monthly 
        : plan.stripe_price_id_yearly;

      if (!priceId) {
        throw new Error("This plan is not available for checkout. Please contact support.");
      }

      const loadingToast = toast.loading(
        isRetryAttempt ? "Retrying checkout..." : "Preparing secure checkout..."
      );

      const { data, error } = await supabase.functions.invoke('create-stripe-checkout', {
        body: {
          priceId,
          billingPeriod,
          customerEmail: user.email,
          customerName: user.user_metadata?.full_name || user.email,
          userId: user.id,
          returnUrl: window.location.origin,
          isRetry: isRetryAttempt || isReactivate,
          existingSubscriptionId: subscriptionId || null,
        },
      });

      toast.dismiss(loadingToast);

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Failed to create checkout session');
      }

      if (data?.error) {
        throw new Error(data.reason || data.error);
      }

      if (data?.url) {
        toast.success("Redirecting to checkout...", { duration: 2000 });
        setTimeout(() => {
          window.location.assign(data.url);
        }, 500);
      } else {
        throw new Error('No checkout URL returned. Please try again.');
      }

    } catch (error: any) {
      console.error('Error starting checkout:', error);
      
      const isRetryable = 
        error.message?.includes('timeout') ||
        error.message?.includes('network') ||
        error.message?.includes('ECONNRESET') ||
        error.message?.includes('503') ||
        retryCount < 2;
      
      let userMessage = "We couldn't complete your request.";
      
      if (error.message?.includes('Stripe')) {
        userMessage = "There was an issue with the payment system.";
      } else if (error.message?.includes('network') || error.message?.includes('timeout')) {
        userMessage = "Connection issue detected.";
      } else if (error.message?.includes('not available')) {
        userMessage = error.message;
      }
      
      setErrorDetails({ message: userMessage, planId: plan.id });
      toast.error(userMessage + (isRetryable ? " Please try again." : ""));
      
      if (isRetryable && retryCount < 2) {
        const delay = Math.min(1000 * Math.pow(2, retryCount), 4000);
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          handleCheckout(plan, true);
        }, delay);
        toast.info(`Retrying automatically in ${delay / 1000}s...`, { duration: delay });
      }
    } finally {
      setLoading(false);
      setProcessingPlanId(null);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const paidPlans = plans.filter(p => p.price_monthly > 0);
  const planOrder = ['Starter', 'Standard', 'Professional'];
  const sortedPaidPlans = [...paidPlans].sort((a, b) => planOrder.indexOf(a.name) - planOrder.indexOf(b.name));

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <img src={logoImage} alt="NotiProof" className="h-8" />
          </Link>
          {user && (
            <Button variant="outline" size="sm" onClick={handleLogout}>
              Logout
            </Button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="container max-w-6xl mx-auto p-8">
        {/* Retry/Reactivate Alert */}
        {(isRetry || isReactivate) && (
          <Alert className="mb-6 border-warning bg-warning/10">
            <AlertCircle className="h-4 w-4 text-warning" />
            <AlertDescription>
              {isRetry ? (
                <span>
                  <strong>Payment Incomplete:</strong> Your previous payment didn't complete. 
                  Please try again to activate your subscription.
                </span>
              ) : (
                <span>
                  <strong>Welcome Back:</strong> Select a plan to reactivate your subscription.
                </span>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Error Alert */}
        {errorDetails && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>{errorDetails.message}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const plan = plans.find(p => p.id === errorDetails.planId);
                  if (plan) handleCheckout(plan);
                }}
                disabled={loading}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Loading State */}
        {plans.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
            <p className="text-muted-foreground">Loading plans...</p>
          </div>
        ) : (
          <>
            <div className="text-center mb-12">
              <div className="flex items-center justify-center gap-2 mb-4">
                <Sparkles className="h-8 w-8 text-primary" />
                <h1 className="text-4xl font-bold">Choose Your Plan</h1>
              </div>
              <p className="text-lg text-muted-foreground">
                Start free or pick a plan that fits your needs.
              </p>
            </div>

            {/* Free Plan Option */}
            <Card className="p-6 mb-8 border-dashed">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h3 className="text-xl font-bold">Free Plan</h3>
                  <p className="text-muted-foreground text-sm">
                    1 website • 5K views/mo • All integrations • No credit card required
                  </p>
                </div>
                <Button variant="outline" onClick={handleSelectFreePlan} disabled={loading}>
                  Start Free
                </Button>
              </div>
            </Card>

            <div className="flex items-center justify-center gap-4 mb-8">
              <Label htmlFor="billing-toggle">Monthly</Label>
              <Switch
                id="billing-toggle"
                checked={billingPeriod === 'yearly'}
                onCheckedChange={(checked) => setBillingPeriod(checked ? 'yearly' : 'monthly')}
              />
              <Label htmlFor="billing-toggle">
                Yearly <span className="text-success">(Save 17%)</span>
              </Label>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {sortedPaidPlans.map((plan) => {
                const price = billingPeriod === 'monthly' ? plan.price_monthly : plan.price_yearly;
                const isPopular = plan.name === 'Standard';
                const isHighlighted = highlightPlanId === plan.id;
                const features = generatePlanFeatures(plan);

                return (
                  <Card 
                    key={plan.id} 
                    className={`relative p-6 ${isPopular || isHighlighted ? 'border-primary ring-2 ring-primary/20' : ''}`}
                  >
                    {isPopular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <span className="bg-primary text-primary-foreground text-xs px-3 py-1 rounded-full">
                          Most Popular
                        </span>
                      </div>
                    )}

                    <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>

                    <div className="mb-4">
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold">${price}</span>
                        <span className="text-muted-foreground">
                          /{billingPeriod === 'monthly' ? 'mo' : 'yr'}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Billed {billingPeriod}
                      </p>
                    </div>

                    <ul className="space-y-2 mb-6">
                      {features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm">
                          <Check className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <Button
                      className="w-full"
                      variant={isPopular || isHighlighted ? 'default' : 'outline'}
                      onClick={() => handleCheckout(plan)}
                      disabled={loading}
                    >
                      {processingPlanId === plan.id ? (
                        <span className="flex items-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                          Processing...
                        </span>
                      ) : (
                        'Get Started'
                      )}
                    </Button>
                  </Card>
                );
              })}
            </div>

            {/* Compare Features */}
            <Collapsible className="mt-12">
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full">
                  <ChevronDown className="h-4 w-4 mr-2" />
                  Compare All Features
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-6">
                <Card className="p-6">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4 font-semibold">Feature</th>
                          {sortedPaidPlans.map(plan => (
                            <th key={plan.id} className={`text-center py-3 px-4 font-semibold ${plan.name === 'Standard' ? 'bg-primary/5' : ''}`}>
                              {plan.name}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b bg-muted/30">
                          <td className="py-3 px-4 font-medium" colSpan={sortedPaidPlans.length + 1}>Limits</td>
                        </tr>
                        <tr className="border-b">
                          <td className="py-3 px-4">Websites</td>
                          {sortedPaidPlans.map(plan => (
                            <td key={plan.id} className={`text-center py-3 px-4 ${plan.name === 'Standard' ? 'bg-primary/5' : ''}`}>
                              {plan.max_websites >= 999 ? 'Unlimited' : plan.max_websites}
                            </td>
                          ))}
                        </tr>
                        <tr className="border-b">
                          <td className="py-3 px-4">Monthly Views</td>
                          {sortedPaidPlans.map(plan => (
                            <td key={plan.id} className={`text-center py-3 px-4 ${plan.name === 'Standard' ? 'bg-primary/5' : ''}`}>
                              {plan.max_events_per_month 
                                ? `${(plan.max_events_per_month / 1000).toFixed(0)}K`
                                : 'Unlimited'
                              }
                            </td>
                          ))}
                        </tr>
                        <tr className="border-b">
                          <td className="py-3 px-4">Storage</td>
                          {sortedPaidPlans.map(plan => (
                            <td key={plan.id} className={`text-center py-3 px-4 ${plan.name === 'Standard' ? 'bg-primary/5' : ''}`}>
                              {formatStorage(plan.storage_limit_bytes)}
                            </td>
                          ))}
                        </tr>
                        <tr className="border-b">
                          <td className="py-3 px-4">Video Recording</td>
                          {sortedPaidPlans.map(plan => (
                            <td key={plan.id} className={`text-center py-3 px-4 ${plan.name === 'Standard' ? 'bg-primary/5' : ''}`}>
                              {formatVideoDuration(plan.video_max_duration_seconds)}
                            </td>
                          ))}
                        </tr>
                        
                        <tr className="border-b bg-muted/30">
                          <td className="py-3 px-4 font-medium" colSpan={sortedPaidPlans.length + 1}>Premium Features</td>
                        </tr>
                        <tr className="border-b">
                          <td className="py-3 px-4">Remove Branding</td>
                          {sortedPaidPlans.map(plan => (
                            <td key={plan.id} className={`text-center py-3 px-4 ${plan.name === 'Standard' ? 'bg-primary/5' : ''}`}>
                              {plan.can_remove_branding ? <Check className="h-4 w-4 text-success mx-auto" /> : '—'}
                            </td>
                          ))}
                        </tr>
                        <tr className="border-b">
                          <td className="py-3 px-4">Custom Domain</td>
                          {sortedPaidPlans.map(plan => (
                            <td key={plan.id} className={`text-center py-3 px-4 ${plan.name === 'Standard' ? 'bg-primary/5' : ''}`}>
                              {plan.custom_domain_enabled ? <Check className="h-4 w-4 text-success mx-auto" /> : '—'}
                            </td>
                          ))}
                        </tr>
                        <tr className="border-b">
                          <td className="py-3 px-4">API & Webhooks</td>
                          {sortedPaidPlans.map(plan => (
                            <td key={plan.id} className={`text-center py-3 px-4 ${plan.name === 'Standard' ? 'bg-primary/5' : ''}`}>
                              {plan.has_api ? <Check className="h-4 w-4 text-success mx-auto" /> : '—'}
                            </td>
                          ))}
                        </tr>
                        <tr className="border-b">
                          <td className="py-3 px-4">White Label</td>
                          {sortedPaidPlans.map(plan => (
                            <td key={plan.id} className={`text-center py-3 px-4 ${plan.name === 'Standard' ? 'bg-primary/5' : ''}`}>
                              {plan.has_white_label ? <Check className="h-4 w-4 text-success mx-auto" /> : '—'}
                            </td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </Card>
              </CollapsibleContent>
            </Collapsible>
          </>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 mt-16">
        <div className="container py-8 px-4 text-center">
          <p className="text-sm text-muted-foreground mb-4">
            💳 Payments are securely processed by Stripe.
          </p>
          <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground">
            <span>🔒 Secure Checkout</span>
            <span>❌ Cancel Anytime</span>
            <span>💰 Money-back Guarantee</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
