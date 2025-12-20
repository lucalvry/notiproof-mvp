import { useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

import logo from "@/assets/NotiProof_Logo.png";

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get("returnTo");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (!data.user) throw new Error("Login failed");

      toast.success("Logged in successfully!");

      // If returnTo is set, redirect there
      if (returnTo) {
        navigate(returnTo);
        return;
      }

      // Check subscription status intelligently
      const { data: subscriptions } = await supabase
        .from('user_subscriptions')
        .select('id, status, plan_id')
        .eq('user_id', data.user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      const subscription = subscriptions?.[0];
      
      if (!subscription) {
        // No subscription at all - first time user
        toast.info("Please select a plan to continue");
        navigate('/select-plan');
      } else if (['active', 'trialing', 'past_due'].includes(subscription.status)) {
        // Active subscription - proceed to dashboard
        navigate("/websites");
      } else if (['incomplete', 'incomplete_expired'].includes(subscription.status)) {
        // Payment failed but can be retried
        toast.error("Your payment didn't complete. Please try again.");
        navigate(`/select-plan?retry=true&subscription_id=${subscription.id}`);
      } else if (subscription.status === 'canceled' || subscription.status === 'cancelled') {
        // Cancelled subscription - offer reactivation
        toast.info("Your subscription was cancelled. Select a plan to reactivate.");
        navigate(`/select-plan?reactivate=true`);
      } else {
        // Unknown status - redirect to select plan
        toast.info("Please complete your subscription setup");
        navigate('/select-plan');
      }
    } catch (error: any) {
      console.error("Login error:", error);
      if (error.message?.includes("Invalid login credentials")) {
        toast.error("Invalid email or password");
      } else {
        toast.error(error.message || "Failed to login");
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
            <CardTitle className="text-2xl">Welcome back</CardTitle>
            <CardDescription>Sign in to your NotiProof account</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
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
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link
                  to="/forgot-password"
                  className="text-sm text-primary hover:underline"
                >
                  Forgot?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Link to={returnTo ? `/register?returnTo=${encodeURIComponent(returnTo)}` : "/register"} className="text-primary hover:underline">
                Create an account
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
