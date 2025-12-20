import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Check, Zap, Clock, Shield, X, User, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { toast as sonnerToast } from "sonner";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import logo from "@/assets/NotiProof_Logo.png";

const STRIPE_PAYMENT_LINK = "https://buy.stripe.com/28E8wO5LZdsQ6ZLe64bsc00";

const LTD_FEATURES = [
  { text: "3 websites", included: true },
  { text: "25,000 events per month", included: true },
  { text: "5GB media storage", included: true },
  { text: "3-minute video recordings", included: true },
  { text: "Custom domains for forms", included: true },
  { text: "Remove NotiProof branding", included: true },
  { text: "Advanced analytics", included: true },
  { text: "Unlimited testimonials & forms", included: true },
];

const LAUNCH_INTEGRATIONS = [
  "Testimonials",
  "Visitors Pulse",
  "Form Capture",
  "Smart Announcement",
  "WooCommerce",
];

type AccountType = 'individual' | 'organization';

export default function LTDCheckout() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Registration form state
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accountType, setAccountType] = useState<AccountType>('individual');
  const [organizationName, setOrganizationName] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser(data.user);
        setEmail(data.user.email || "");
        const userName = data.user.user_metadata?.full_name || data.user.user_metadata?.name || "";
        if (userName) setFullName(userName);
      }
      setIsCheckingAuth(false);
    });
  }, []);

  const redirectToStripePayment = (userId: string, userEmail: string) => {
    const paymentUrl = new URL(STRIPE_PAYMENT_LINK);
    paymentUrl.searchParams.set("client_reference_id", userId);
    paymentUrl.searchParams.set("prefilled_email", userEmail);
    window.location.href = paymentUrl.toString();
  };

  const handleCheckout = async () => {
    // For logged-in users, just redirect to Stripe
    if (user) {
      if (!fullName.trim()) {
        toast({
          title: "Name required",
          description: "Please enter your name to continue.",
          variant: "destructive",
        });
        return;
      }
      setIsLoading(true);
      redirectToStripePayment(user.id, user.email || email);
      return;
    }

    // For new users, create account first then redirect
    if (!fullName.trim() || !email.trim() || !password) {
      toast({
        title: "Required fields",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 8) {
      toast({
        title: "Password too short",
        description: "Password must be at least 8 characters.",
        variant: "destructive",
      });
      return;
    }

    if (accountType === 'organization' && !organizationName.trim()) {
      toast({
        title: "Organization name required",
        description: "Please enter your organization name.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data: authData, error: signupError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password: password,
        options: {
          data: {
            full_name: fullName.trim(),
            account_type: accountType,
            organization_name: accountType === 'organization' ? organizationName.trim() : null,
          },
        },
      });

      if (signupError) {
        console.error("Signup error:", signupError);
        
        if (
          signupError.message.includes('already registered') ||
          signupError.message.includes('User already registered') ||
          signupError.status === 422
        ) {
          sonnerToast.error(
            <div className="flex flex-col gap-1">
              <span>This email is already registered.</span>
              <Link to="/login?returnTo=/ltd" className="text-primary underline font-semibold">
                Click here to log in instead
              </Link>
            </div>,
            { duration: 6000 }
          );
          setIsLoading(false);
          return;
        }
        
        throw new Error(signupError.message);
      }

      if (!authData.user) {
        throw new Error("Failed to create account");
      }

      // Account created successfully, redirect to Stripe
      sonnerToast.success("Account created! Redirecting to checkout...");
      redirectToStripePayment(authData.user.id, email.trim().toLowerCase());

    } catch (error: any) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };


  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container max-w-6xl py-12 px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="mb-6">
            <img src={logo} alt="NotiProof" className="h-10 mx-auto" />
          </div>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary font-medium text-sm mb-6">
            <Zap className="h-4 w-4" />
            Limited Time Offer
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            NotiProof Lifetime Deal
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Get lifetime access to NotiProof for a one-time payment. 
            No monthly fees. No annual renewals. Just pay once and use forever.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 items-start">
          {/* Features Card */}
          <Card className="border-2">
            <CardHeader>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-bold">$79</span>
                <span className="text-muted-foreground line-through text-xl">$228/yr</span>
              </div>
              <CardDescription className="text-base">
                One-time payment • Lifetime access
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {LTD_FEATURES.map((feature, index) => (
                  <div key={index} className="flex items-center gap-3">
                    {feature.included ? (
                      <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                    ) : (
                      <X className="h-5 w-5 text-muted-foreground/50 flex-shrink-0" />
                    )}
                    <span className={feature.included ? "" : "text-muted-foreground/50"}>
                      {feature.text}
                    </span>
                  </div>
                ))}
              </div>

              {/* Integrations */}
              <div className="mt-6 p-4 bg-primary/5 rounded-lg">
                <div className="text-sm font-medium mb-3">Launch integrations included:</div>
                <div className="flex flex-wrap gap-2">
                  {LAUNCH_INTEGRATIONS.map((integration) => (
                    <span key={integration} className="px-2 py-1 bg-background rounded text-sm">
                      {integration}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  More integrations and features will be added over time—you'll get them all!
                </p>
              </div>

              <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2 text-sm font-medium mb-2">
                  <Shield className="h-4 w-4 text-primary" />
                  Fair Use Policy
                </div>
                <p className="text-sm text-muted-foreground">
                  This LTD is intended for personal or small business use. 
                  Limits apply: 3 websites, 25K events/month, 5GB storage.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Checkout Form */}
          <Card className="border-2 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                {user ? "Complete Your Purchase" : "Create Account & Get Lifetime Access"}
              </CardTitle>
              <CardDescription>
                {user 
                  ? `Logged in as ${user.email}` 
                  : "Limited spots available. Create your account to claim your lifetime access."
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {user ? (
                /* Logged-in user flow */
                <>
                  <div className="space-y-2">
                    <Label>Email address</Label>
                    <Input
                      type="email"
                      value={email}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="name">Name <span className="text-destructive">*</span></Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="Your name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      disabled={isLoading}
                      required
                    />
                  </div>

                  <Button
                    className="w-full h-12 text-lg"
                    onClick={handleCheckout}
                    disabled={isLoading || !fullName.trim()}
                  >
                    {isLoading ? (
                      "Redirecting to checkout..."
                    ) : (
                      <>
                        Get Lifetime Access for $79
                        <Zap className="ml-2 h-5 w-5" />
                      </>
                    )}
                  </Button>
                </>
              ) : (
                /* New user registration + checkout flow */
                <>
                  {/* Account Type Selection */}
                  <div className="space-y-2">
                    <Label>Account Type</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        type="button"
                        variant={accountType === 'individual' ? 'default' : 'outline'}
                        onClick={() => setAccountType('individual')}
                        className="h-16 flex-col gap-1"
                        disabled={isLoading}
                      >
                        <User className="h-4 w-4" />
                        <span className="font-medium text-sm">Individual</span>
                      </Button>
                      <Button
                        type="button"
                        variant={accountType === 'organization' ? 'default' : 'outline'}
                        onClick={() => setAccountType('organization')}
                        className="h-16 flex-col gap-1"
                        disabled={isLoading}
                      >
                        <Building2 className="h-4 w-4" />
                        <span className="font-medium text-sm">Organization</span>
                      </Button>
                    </div>
                  </div>

                  {accountType === 'organization' && (
                    <div className="space-y-2">
                      <Label htmlFor="orgName">Organization Name <span className="text-destructive">*</span></Label>
                      <Input
                        id="orgName"
                        type="text"
                        placeholder="Acme Inc."
                        value={organizationName}
                        onChange={(e) => setOrganizationName(e.target.value)}
                        disabled={isLoading}
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name <span className="text-destructive">*</span></Label>
                    <Input
                      id="fullName"
                      type="text"
                      placeholder="John Doe"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email <span className="text-destructive">*</span></Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password <span className="text-destructive">*</span></Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Min. 8 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>

                  <Button
                    className="w-full h-12 text-lg"
                    onClick={handleCheckout}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      "Creating account..."
                    ) : (
                      <>
                        Get Lifetime Access for $79
                        <Zap className="ml-2 h-5 w-5" />
                      </>
                    )}
                  </Button>

                  <div className="text-center text-sm text-muted-foreground">
                    Already have an account?{" "}
                    <Link to="/login?returnTo=/ltd" className="text-primary hover:underline">
                      Log in
                    </Link>
                  </div>
                </>
              )}

              <p className="text-xs text-center text-muted-foreground">
                Secure payment powered by Stripe. 
                You'll be redirected to complete payment.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Trust badges */}
        <div className="mt-12 text-center">
          <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Secure payment
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4" />
              Instant access
            </div>
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              No recurring fees
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
