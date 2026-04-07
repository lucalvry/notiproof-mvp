import { useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PasswordInput } from "@/components/ui/password-input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Shield, BarChart3, Zap } from "lucide-react";
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

      const { data: isSuperAdmin } = await supabase.rpc('is_superadmin', {
        _user_id: data.user.id,
      });

      if (isSuperAdmin) {
        toast.success("Welcome back!");
        navigate(returnTo || "/websites");
        return;
      }

      toast.success("Logged in successfully!");

      if (returnTo) {
        navigate(returnTo);
        return;
      }

      const { data: subscriptions } = await supabase
        .from('user_subscriptions')
        .select('id, status, plan_id')
        .eq('user_id', data.user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      const subscription = subscriptions?.[0];

      if (!subscription) {
        toast.info("Please select a plan to continue");
        navigate('/select-plan');
      } else if (['active', 'trialing', 'past_due', 'lifetime', 'free'].includes(subscription.status)) {
        navigate("/websites");
      } else if (['incomplete', 'incomplete_expired'].includes(subscription.status)) {
        toast.error("Your payment didn't complete. Please try again.");
        navigate(`/select-plan?retry=true&subscription_id=${subscription.id}`);
      } else if (subscription.status === 'canceled' || subscription.status === 'cancelled') {
        toast.info("Your subscription was cancelled. Select a plan to reactivate.");
        navigate(`/select-plan?reactivate=true`);
      } else {
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
    <div className="flex min-h-screen">
      {/* Branding Panel – hidden on mobile */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-gradient-to-br from-primary via-primary/90 to-primary/70 p-12 text-primary-foreground">
        <div>
          <img src={logo} alt="NotiProof" className="h-10 brightness-0 invert" />
        </div>

        <div className="space-y-6">
          <h1 className="text-4xl font-bold leading-tight">
            Turn visitors into customers with real-time social proof.
          </h1>
          <p className="text-lg text-primary-foreground/80 max-w-md">
            Join thousands of businesses using NotiProof to boost conversions, build trust, and grow revenue.
          </p>

          <div className="grid grid-cols-2 gap-4 pt-4">
            {[
              { icon: BarChart3, stat: "32%", desc: "Avg. conversion lift" },
              { icon: Shield, stat: "10K+", desc: "Websites powered" },
              { icon: Zap, stat: "<1s", desc: "Notification speed" },
              { icon: Shield, stat: "99.9%", desc: "Uptime guarantee" },
            ].map((item, i) => (
              <div key={i} className="rounded-lg bg-primary-foreground/10 p-4 backdrop-blur-sm">
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
              <img src={logo} alt="NotiProof" className="h-10" />
            </div>
            <CardTitle className="text-2xl">Welcome back</CardTitle>
            <CardDescription>Sign in to your NotiProof account</CardDescription>
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
                <PasswordInput
                  id="password"
                  placeholder="Enter your password"
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
                <Link to="/register" className="text-primary hover:underline font-medium">
                  Create an account
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
