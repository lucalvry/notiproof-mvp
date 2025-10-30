import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/NotiProof_Logo.png";
import { CheckCircle2 } from "lucide-react";

export default function CompleteSignup() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [signupData, setSignupData] = useState<any>(null);

  useEffect(() => {
    const verifyPayment = async () => {
      if (!sessionId) {
        toast.error("Invalid payment session");
        navigate("/get-started");
        return;
      }

      // Get pending signup data
      const pendingData = localStorage.getItem("pendingSignup");
      if (!pendingData) {
        toast.error("Session expired. Please start again.");
        navigate("/get-started");
        return;
      }

      try {
        const data = JSON.parse(pendingData);
        
        // Fetch the Stripe session to get customer ID
        try {
          const { data: sessionData, error: sessionError } = await supabase.functions.invoke(
            'verify-stripe-session',
            { body: { sessionId } }
          );
          
          if (!sessionError && sessionData?.stripeCustomerId) {
            data.stripeCustomerId = sessionData.stripeCustomerId;
          }
        } catch (err) {
          console.error('Failed to fetch session details:', err);
        }
        
        setSignupData(data);
        setVerifying(false);
      } catch (error) {
        toast.error("Invalid session data");
        navigate("/get-started");
      }
    };

    verifyPayment();
  }, [sessionId, navigate]);

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password || !confirmPassword) {
      toast.error("Please fill in all fields");
      return;
    }

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      // Create Supabase account
      const { data: authData, error: signupError } = await supabase.auth.signUp({
        email: signupData.email,
        password: password,
        options: {
          data: {
            full_name: signupData.fullName,
          },
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (signupError) {
        console.error("Signup error:", signupError);
        throw new Error(signupError.message);
      }

      if (!authData.user) {
        throw new Error("Failed to create account");
      }

      // Link user to their Stripe subscription (from pending checkout)
      try {
        const { error: linkError } = await supabase
          .from('user_subscriptions')
          .update({ user_id: authData.user.id })
          .eq('stripe_customer_id', signupData.stripeCustomerId)
          .is('user_id', null);
        
        if (linkError) {
          console.error('Failed to link subscription:', linkError);
          // Don't fail the signup, just log it
        } else {
          console.log('Successfully linked subscription to user');
        }
      } catch (linkErr) {
        console.error('Exception linking subscription:', linkErr);
      }

      // Clear pending signup data
      localStorage.removeItem("pendingSignup");

      // Show success message
      toast.success("Account created successfully!");
      
      // If email confirmation is required
      if (!authData.session) {
        toast.info("Please check your email to verify your account", {
          duration: 5000,
        });
      }

      // Redirect to dashboard
      setTimeout(() => {
        navigate("/dashboard");
      }, 1500);

    } catch (error: any) {
      console.error("Error creating account:", error);
      
      if (error.message?.includes("already registered")) {
        toast.error("This email is already registered. Redirecting to login...");
        setTimeout(() => navigate("/login"), 2000);
      } else {
        toast.error(error.message || "Failed to create account. Please contact support.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <img src={logo} alt="NotiProof" className="h-12" />
            </div>
            <CardTitle>Verifying Payment...</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto">
            <img src={logo} alt="NotiProof" className="h-12" />
          </div>
          <div className="flex items-center justify-center gap-2 text-success">
            <CheckCircle2 className="h-6 w-6" />
            <span className="font-semibold">Payment Successful!</span>
          </div>
          <div>
            <CardTitle className="text-2xl">Create Your Password</CardTitle>
            <CardDescription>
              Complete your account setup for {signupData?.email}
            </CardDescription>
          </div>
        </CardHeader>

        <form onSubmit={handleCreateAccount}>
          <CardContent className="space-y-4">
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
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                disabled={loading}
              />
            </div>

            <div className="bg-success/10 text-success text-sm p-3 rounded-md">
              <p className="font-semibold mb-1">Your 14-day free trial is active!</p>
              <p className="text-xs">You won't be charged until the trial ends.</p>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating Account..." : "Complete Setup & Access Dashboard"}
            </Button>
          </CardContent>
        </form>
      </Card>
    </div>
  );
}
