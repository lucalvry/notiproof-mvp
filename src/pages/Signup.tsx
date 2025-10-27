import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/NotiProof_Logo.png";

const planOptions = [
  { id: "starter", name: "Starter", sites: 1, price: "Free" },
  { id: "pro", name: "Pro", sites: 10, price: "$29/mo" },
  { id: "business", name: "Business", sites: 20, price: "$99/mo" },
];

export default function Signup() {
  const navigate = useNavigate();
  const [step, setStep] = useState<"account" | "plan">("account");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedPlan, setSelectedPlan] = useState("starter");
  const [loading, setLoading] = useState(false);

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

      // Create subscription record
      const selectedPlanName = planOptions.find(p => p.id === selectedPlan)?.name;
      const { data: planData } = await supabase
        .from("subscription_plans")
        .select("id")
        .eq("name", selectedPlanName)
        .single();

      if (planData) {
        await supabase.from("user_subscriptions").insert({
          user_id: data.user.id,
          plan_id: planData.id,
          status: "active",
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        });
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
              <RadioGroup value={selectedPlan} onValueChange={setSelectedPlan}>
                {planOptions.map((plan) => (
                  <div
                    key={plan.id}
                    className="flex items-center space-x-3 rounded-lg border p-4 hover:bg-accent/5"
                  >
                    <RadioGroupItem value={plan.id} id={plan.id} />
                    <Label
                      htmlFor={plan.id}
                      className="flex flex-1 cursor-pointer items-center justify-between"
                    >
                      <div>
                        <p className="font-medium">{plan.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Up to {plan.sites} {plan.sites === 1 ? "site" : "sites"}
                        </p>
                      </div>
                      <span className="font-semibold">{plan.price}</span>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
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
