import { useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PasswordInput } from "@/components/ui/password-input";
import { PasswordStrengthMeter, evaluatePasswordStrength } from "@/components/ui/password-strength";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { User, Building2, Shield, BarChart3, Zap } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import logo from "@/assets/NotiProof_Logo.png";

type AccountType = "individual" | "organization";

export default function Register() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get("returnTo");
  const planParam = searchParams.get("plan");
  const billingParam = searchParams.get("billing");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accountType, setAccountType] = useState<AccountType>("individual");
  const [organizationName, setOrganizationName] = useState("");
  const [loading, setLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!agreedToTerms) {
      toast.error("Please agree to the Terms of Service and Privacy Policy");
      return;
    }

    if (!fullName || !email || !password) {
      toast.error("Please fill in all fields");
      return;
    }

    const { score } = evaluatePasswordStrength(password);
    if (score < 3) {
      toast.error("Please choose a stronger password (at least Fair strength)");
      return;
    }

    if (accountType === "organization" && !organizationName.trim()) {
      toast.error("Please enter your organization name");
      return;
    }

    setLoading(true);

    try {
      const { data: authData, error: signupError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            account_type: accountType,
            organization_name:
              accountType === "organization" ? organizationName.trim() : null,
          },
        },
      });

      if (signupError) {
        console.error("Signup error:", signupError);

        if (
          signupError.message.includes("already registered") ||
          signupError.message.includes("User already registered") ||
          signupError.status === 422
        ) {
          toast.error(
            <div className="flex flex-col gap-1">
              <span>This email is already registered.</span>
              <Link
                to={
                  returnTo
                    ? `/login?returnTo=${encodeURIComponent(returnTo)}`
                    : "/login"
                }
                className="text-primary underline font-semibold"
              >
                Click here to log in instead
              </Link>
            </div>,
            { duration: 6000 },
          );
          setLoading(false);
          return;
        }

        throw new Error(signupError.message);
      }

      if (!authData.user) {
        throw new Error("Failed to create account");
      }

      toast.success("Account created successfully!");
      await new Promise((resolve) => setTimeout(resolve, 500));

      if (returnTo) {
        navigate(returnTo);
        return;
      }

      // If user selected the free plan, auto-create free subscription
      if (planParam === 'free') {
        try {
          // Look up the Free plan
          const { data: freePlan } = await supabase
            .from('subscription_plans')
            .select('id')
            .eq('name', 'Free')
            .eq('is_active', true)
            .single();

          if (freePlan) {
            await supabase
              .from('user_subscriptions')
              .insert({
                user_id: authData.user.id,
                plan_id: freePlan.id,
                status: 'free',
              });

            toast.success("Welcome to NotiProof! Your free plan is active.");
            navigate("/websites");
            return;
          }
        } catch (err) {
          console.error("Error creating free subscription:", err);
        }
      }

      // For paid plans, navigate to select-plan with plan context
      if (planParam && planParam !== 'free') {
        navigate(`/select-plan?plan=${planParam}${billingParam ? `&billing=${billingParam}` : ''}`);
      } else {
        navigate("/select-plan");
      }
    } catch (error: any) {
      console.error("Error creating account:", error);
      toast.error(error.message || "Failed to create account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const isFreeFlow = planParam === 'free';

  return (
    <div className="flex min-h-screen">
      {/* Branding Panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-gradient-to-br from-primary via-primary/90 to-primary/70 p-12 text-primary-foreground">
        <div>
          <a href="https://notiproof.com" target="_blank" rel="noopener noreferrer">
            <img src={logo} alt="NotiProof" className="h-10 brightness-0 invert" />
          </a>
        </div>

        <div className="space-y-6">
          <h1 className="text-4xl font-bold leading-tight">
            Start converting more visitors in minutes.
          </h1>
          <p className="text-lg text-primary-foreground/80 max-w-md">
            {isFreeFlow
              ? "Get started for free — no credit card required. Upgrade anytime."
              : "Join thousands of businesses using NotiProof to boost conversions, build trust, and grow revenue."}
          </p>

          <div className="grid grid-cols-2 gap-4 pt-4">
            {[
              { icon: BarChart3, stat: "32%", desc: "Avg. conversion lift" },
              { icon: Shield, stat: "10K+", desc: "Websites powered" },
              { icon: Zap, stat: "5 min", desc: "Setup time" },
              { icon: Shield, stat: "Free", desc: "Forever plan" },
            ].map((item, i) => (
              <div
                key={i}
                className="rounded-lg bg-primary-foreground/10 p-4 backdrop-blur-sm"
              >
                <item.icon className="h-5 w-5 mb-2 text-primary-foreground/70" />
                <p className="text-2xl font-bold">{item.stat}</p>
                <p className="text-sm text-primary-foreground/70">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-sm text-primary-foreground/50">
          © {new Date().getFullYear()} NotiProof. All rights reserved.
        </p>
      </div>

      {/* Form Panel */}
      <div className="flex flex-1 items-center justify-center p-6 sm:p-10 bg-background">
        <Card className="w-full max-w-md border-0 shadow-none sm:border sm:shadow-sm">
          <CardHeader className="space-y-3 text-center sm:text-left">
            <div className="lg:hidden mx-auto sm:mx-0">
              <a href="https://notiproof.com" target="_blank" rel="noopener noreferrer">
                <img src={logo} alt="NotiProof" className="h-10" />
              </a>
            </div>
            <CardTitle className="text-2xl">Create Your Account</CardTitle>
            <CardDescription>
              {isFreeFlow
                ? "Start free — no credit card required"
                : "Get started with NotiProof today"}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleRegister} className="space-y-4">
              {/* Account Type */}
              <div className="space-y-2">
                <Label>Account Type</Label>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant={accountType === "individual" ? "default" : "outline"}
                    onClick={() => setAccountType("individual")}
                    className="h-20 flex-col gap-1"
                    disabled={loading}
                  >
                    <User className="h-5 w-5" />
                    <span className="font-medium">Individual</span>
                    <span className="text-xs opacity-70">Personal use</span>
                  </Button>
                  <Button
                    type="button"
                    variant={accountType === "organization" ? "default" : "outline"}
                    onClick={() => setAccountType("organization")}
                    className="h-20 flex-col gap-1"
                    disabled={loading}
                  >
                    <Building2 className="h-5 w-5" />
                    <span className="font-medium">Organization</span>
                    <span className="text-xs opacity-70">Team access</span>
                  </Button>
                </div>
              </div>

              {accountType === "organization" && (
                <div className="space-y-2">
                  <Label htmlFor="orgName">Organization Name</Label>
                  <Input
                    id="orgName"
                    type="text"
                    placeholder="Acme Inc."
                    value={organizationName}
                    onChange={(e) => setOrganizationName(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  disabled={loading}
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
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <PasswordInput
                  id="password"
                  placeholder="Create a strong password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
                <PasswordStrengthMeter password={password} />
              </div>

              <div className="flex items-start space-x-2">
                <Checkbox
                  id="terms"
                  checked={agreedToTerms}
                  onCheckedChange={(checked) => setAgreedToTerms(checked === true)}
                  disabled={loading}
                  className="mt-0.5"
                />
                <label htmlFor="terms" className="text-sm text-muted-foreground leading-snug cursor-pointer">
                  I agree to the{" "}
                  <a href="https://notiproof.com/terms-of-service/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Terms of Service</a>
                  {" "}and{" "}
                  <a href="https://notiproof.com/privacy-policy/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Privacy Policy</a>
                </label>
              </div>

              <Button type="submit" className="w-full" disabled={loading || !agreedToTerms}>
                {loading
                  ? "Creating Account..."
                  : isFreeFlow
                    ? "Create Free Account"
                    : "Create Account & Choose Plan"}
              </Button>

              <div className="text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link
                  to={
                    returnTo
                      ? `/login?returnTo=${encodeURIComponent(returnTo)}`
                      : "/login"
                  }
                  className="text-primary hover:underline font-medium"
                >
                  Log in
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
