import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Check } from "lucide-react";
import logo from "@/assets/NotiProof_Logo.png";

interface Plan {
  id: string;
  name: string;
  price_monthly: number;
  price_yearly: number;
  max_websites: number;
  max_events_per_month: number | null;
  features: string[];
}

export default function Signup() {
  const navigate = useNavigate();
  const [step, setStep] = useState<"account" | "plan">("account");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedPlan, setSelectedPlan] = useState("");
  const [loading, setLoading] = useState(false);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("is_active", true)
        .order("price_monthly", { ascending: true });

      if (error) throw error;

      const transformedPlans: Plan[] = (data || []).map(plan => ({
        id: plan.id,
        name: plan.name,
        price_monthly: plan.price_monthly,
        price_yearly: plan.price_yearly,
        max_websites: plan.max_websites,
        max_events_per_month: plan.max_events_per_month,
        features: (Array.isArray(plan.features) ? plan.features : []) as string[],
      }));

      setPlans(transformedPlans);
      
      // Auto-select Free plan if available
      const freePlan = transformedPlans.find(p => p.price_monthly === 0);
      if (freePlan) {
        setSelectedPlan(freePlan.id);
      }
    } catch (error: any) {
      console.error("Error loading plans:", error);
      toast.error("Failed to load subscription plans");
    } finally {
      setPlansLoading(false);
    }
  };

  const handleAccountSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep("plan");
  };

  const handlePlanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Sign up the user with Supabase
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/websites`,
          data: {
            full_name: fullName,
          }
        }
      });

      if (error) throw error;

      if (!data.user) throw new Error("Failed to create account");

      // Get the Free plan (auto-assign for all new users)
      const { data: freePlan, error: freePlanError } = await supabase
        .from('subscription_plans')
        .select('id')
        .eq('name', 'Free')
        .eq('is_active', true)
        .single();

      if (freePlanError || !freePlan) {
        console.error("Failed to fetch Free plan:", freePlanError);
        throw new Error("Failed to set up your account. Please contact support.");
      }

      // Create Free plan subscription for new user
      const { error: subError } = await supabase
        .from('user_subscriptions')
        .insert({
          user_id: data.user.id,
          plan_id: freePlan.id,
          status: 'active',
          current_period_start: new Date().toISOString(),
          current_period_end: null, // Free plan never expires
        });

      if (subError) {
        console.error("Failed to create subscription:", subError);
        throw new Error("Failed to set up your subscription. Please contact support.");
      }

      toast.success("Account created successfully!");
      navigate("/websites");
    } catch (error: any) {
      console.error("Signup error:", error);
      if (error.message?.includes("already registered")) {
        toast.error("This email is already registered. Please sign in.");
      } else {
        toast.error(error.message || "Failed to create account");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto">
            <img src={logo} alt="NotiProof" className="h-12" />
          </div>
          <div>
            <CardTitle className="text-2xl">Create your account</CardTitle>
            <CardDescription>
              {step === "account" ? "Get started with NotiProof" : "Choose your plan"}
            </CardDescription>
          </div>
        </CardHeader>

        {step === "account" ? (
          <form onSubmit={handleAccountSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Min. 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button type="submit" className="w-full">
                Continue
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link to="/login" className="text-primary hover:underline">
                  Sign in
                </Link>
              </p>
            </CardFooter>
          </form>
        ) : (
          <form onSubmit={handlePlanSubmit}>
            <CardContent className="space-y-4">
              {plansLoading ? (
                <div className="py-8 text-center text-muted-foreground">
                  Loading plans...
                </div>
              ) : (
                <RadioGroup value={selectedPlan} onValueChange={setSelectedPlan}>
                  {plans.map((plan) => {
                    const isFree = plan.price_monthly === 0;
                    const isPopular = plan.name === "Pro";
                    
                    return (
                      <div
                        key={plan.id}
                        className={`relative flex items-start space-x-3 rounded-lg border p-4 hover:bg-accent/5 ${
                          isPopular ? "border-primary" : ""
                        }`}
                      >
                        {isPopular && (
                          <div className="absolute -top-2 right-3">
                            <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                              Popular
                            </span>
                          </div>
                        )}
                        <RadioGroupItem value={plan.id} id={plan.id} className="mt-1" />
                        <Label
                          htmlFor={plan.id}
                          className="flex flex-1 cursor-pointer flex-col space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-semibold">{plan.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {plan.max_websites} {plan.max_websites === 1 ? "website" : "websites"} • 
                                {plan.max_events_per_month 
                                  ? ` ${(plan.max_events_per_month / 1000).toFixed(0)}K views/mo`
                                  : " Unlimited views"
                                }
                              </p>
                            </div>
                            <span className="text-lg font-bold">
                              {isFree ? "Free" : `$${plan.price_monthly}/mo`}
                            </span>
                          </div>
                          {plan.features.length > 0 && (
                            <ul className="space-y-1">
                              {plan.features.slice(0, 3).map((feature, idx) => (
                                <li key={idx} className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <Check className="h-3 w-3 text-success" />
                                  {feature}
                                </li>
                              ))}
                            </ul>
                          )}
                        </Label>
                      </div>
                    );
                  })}
                </RadioGroup>
              )}
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Creating account..." : "Create account"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => setStep("account")}
              >
                Back
              </Button>
            </CardFooter>
          </form>
        )}
      </Card>
    </div>
  );
}
