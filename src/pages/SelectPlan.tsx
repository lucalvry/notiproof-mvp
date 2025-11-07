import { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Check, Sparkles, AlertCircle, RefreshCw } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import logoImage from "@/assets/NotiProof_Logo.png";

interface UserData {
  fullName: string;
  email: string;
}

export default function SelectPlan() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [loading, setLoading] = useState(false);
  const [processingPlanId, setProcessingPlanId] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<{ message: string; planId: string } | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  
  // Check for retry/reactivate params
  const searchParams = new URLSearchParams(location.search);
  const isRetry = searchParams.get('retry') === 'true';
  const subscriptionId = searchParams.get('subscription_id');
  const isReactivate = searchParams.get('reactivate') === 'true';

  useEffect(() => {
    const loadPlans = async () => {
      // Use getSession for more reliable auth check
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        toast.error("Please create an account first");
        navigate('/register');
        return;
      }

      setUser(session.user);

      // Load plans (excluding Free plan which is now deleted)
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('price_monthly');

      if (error) {
        toast.error('Failed to load plans');
        return;
      }

      setPlans(data || []);
    };

    loadPlans();
  }, [navigate]);

  const handleStartTrial = async (plan: any, isRetry = false) => {
    // Clear previous error when starting new attempt
    if (!isRetry) {
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
        throw new Error("This plan is not available. Please contact support.");
      }

      const loadingToast = toast.loading(
        isRetry ? "Retrying checkout..." : "Preparing secure checkout..."
      );

      // Create Stripe checkout session with user already logged in
      const { data, error } = await supabase.functions.invoke('create-stripe-checkout', {
        body: {
          priceId,
          billingPeriod,
          customerEmail: user.email,
          customerName: user.user_metadata?.full_name || user.email,
          userId: user.id,
          returnUrl: window.location.origin,
          isRetry: isRetry || isReactivate,
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
        // Small delay to show success message
        setTimeout(() => {
          window.location.assign(data.url);
        }, 500);
      } else {
        throw new Error('No checkout URL returned. Please try again.');
      }

    } catch (error: any) {
      console.error('Error starting trial:', error);
      
      // Determine if error is retryable based on error type
      const isRetryable = 
        error.message?.includes('timeout') ||
        error.message?.includes('network') ||
        error.message?.includes('ECONNRESET') ||
        error.message?.includes('503') ||
        retryCount < 2;
      
      // User-friendly error messages
      let userMessage = "We couldn't complete your request.";
      
      if (error.message?.includes('Stripe')) {
        userMessage = "There was an issue with the payment system.";
      } else if (error.message?.includes('network') || error.message?.includes('timeout')) {
        userMessage = "Connection issue detected.";
      } else if (error.message?.includes('not available')) {
        userMessage = error.message;
      }
      
      setErrorDetails({
        message: userMessage,
        planId: plan.id
      });
      
      toast.error(userMessage + (isRetryable ? " Please try again." : ""));
      
      // Only auto-retry for transient errors (max 2 retries)
      if (isRetryable && retryCount < 2) {
        const delay = Math.min(1000 * Math.pow(2, retryCount), 4000);
        
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          handleStartTrial(plan, true);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      {/* Header with Logo */}
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

        {/* Error Alert with Retry */}
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
                  if (plan) {
                    handleStartTrial(plan);
                  }
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
                <h1 className="text-4xl font-bold">Start Your 14-Day Free Trial</h1>
              </div>
              <p className="text-lg text-muted-foreground">
                Choose your plan and start building social proof today.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Add your payment method now, but you won't be charged for 14 days.
              </p>
            </div>

            <div className="flex items-center justify-center gap-4 mb-8">
              <Label htmlFor="billing-toggle">Monthly</Label>
              <Switch
                id="billing-toggle"
                checked={billingPeriod === 'yearly'}
                onCheckedChange={(checked) => setBillingPeriod(checked ? 'yearly' : 'monthly')}
              />
              <Label htmlFor="billing-toggle">
                Yearly <span className="text-success">(Save 20%)</span>
              </Label>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {plans.map((plan) => {
            const price = billingPeriod === 'monthly' ? plan.price_monthly : plan.price_yearly;
            const isPopular = plan.name === 'Pro';

            return (
              <Card key={plan.id} className={`relative p-6 ${isPopular ? 'border-primary' : ''}`}>
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-primary text-primary-foreground text-xs px-3 py-1 rounded-full">
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="bg-success/10 text-success text-xs font-semibold px-3 py-1 rounded-full inline-block mb-4">
                  ✨ 14-Day Free Trial
                </div>

                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>

                <div className="mb-4">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold">${price}</span>
                    <span className="text-muted-foreground">
                      /{billingPeriod === 'monthly' ? 'mo' : 'yr'}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">after trial ends</p>
                </div>

                <ul className="space-y-2 mb-6">
                  <li className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                    <span>{plan.max_websites} website{plan.max_websites > 1 ? 's' : ''}</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                    <span>
                      {plan.max_events_per_month 
                        ? `${(plan.max_events_per_month / 1000).toFixed(0)}K views/mo`
                        : 'Unlimited views'
                      }
                    </span>
                  </li>
                  {plan.features?.slice(0, 3).map((feature: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  className="w-full"
                  variant={isPopular ? 'default' : 'outline'}
                  onClick={() => handleStartTrial(plan)}
                  disabled={loading}
                >
                  {processingPlanId === plan.id ? (
                    <span className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                      Processing...
                    </span>
                  ) : (
                    'Start Free Trial'
                  )}
                </Button>
              </Card>
            );
              })}
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 mt-16">
        <div className="container py-8 px-4 text-center">
          <p className="text-sm text-muted-foreground mb-4">
            💳 Your payment method will be securely stored by Stripe.<br />
            You can cancel anytime during your trial with no charge.
          </p>
          <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground">
            <span>🔒 Secure Checkout</span>
            <span>✅ No Charges for 14 Days</span>
            <span>❌ Cancel Anytime</span>
          </div>
        </div>
      </footer>
    </div>
  );
}