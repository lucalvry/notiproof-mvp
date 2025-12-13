import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Chrome, User, Building2 } from "lucide-react";
import logo from "@/assets/NotiProof_Logo.png";

type AccountType = 'individual' | 'organization';

export default function Register() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accountType, setAccountType] = useState<AccountType>('individual');
  const [organizationName, setOrganizationName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName || !email || !password) {
      toast.error("Please fill in all fields");
      return;
    }

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    if (accountType === 'organization' && !organizationName.trim()) {
      toast.error("Please enter your organization name");
      return;
    }

    setLoading(true);

    try {
      // Create account with account type metadata
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
          toast.error(
            <div className="flex flex-col gap-1">
              <span>This email is already registered.</span>
              <Link to="/login" className="text-primary underline font-semibold">
                Click here to log in instead
              </Link>
            </div>,
            { duration: 6000 }
          );
          setLoading(false);
          return;
        }
        
        throw new Error(signupError.message);
      }

      if (!authData.user) {
        throw new Error("Failed to create account");
      }

      toast.success("Account created! Choose your plan to start your free trial.");
      await new Promise(resolve => setTimeout(resolve, 500));
      navigate("/select-plan");

    } catch (error: any) {
      console.error("Error creating account:", error);
      toast.error(error.message || "Failed to create account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/select-plan`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      });

      if (error) throw error;
    } catch (error: any) {
      toast.error(error.message || "Failed to sign up with Google");
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
            <CardTitle className="text-2xl">Create Your Account</CardTitle>
            <CardDescription>
              Start your 14-day free trial - no credit card required yet
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleGoogleSignup}
          >
            <Chrome className="mr-2 h-4 w-4" />
            Continue with Google
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with email
              </span>
            </div>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            {/* Account Type Selection */}
            <div className="space-y-2">
              <Label>Account Type</Label>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant={accountType === 'individual' ? 'default' : 'outline'}
                  onClick={() => setAccountType('individual')}
                  className="h-20 flex-col gap-1"
                  disabled={loading}
                >
                  <User className="h-5 w-5" />
                  <span className="font-medium">Individual</span>
                  <span className="text-xs opacity-70">Personal use</span>
                </Button>
                <Button
                  type="button"
                  variant={accountType === 'organization' ? 'default' : 'outline'}
                  onClick={() => setAccountType('organization')}
                  className="h-20 flex-col gap-1"
                  disabled={loading}
                >
                  <Building2 className="h-5 w-5" />
                  <span className="font-medium">Organization</span>
                  <span className="text-xs opacity-70">Team access</span>
                </Button>
              </div>
            </div>

            {/* Organization Name (shown only for organization accounts) */}
            {accountType === 'organization' && (
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

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating Account..." : "Create Account & Choose Plan"}
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link to="/login" className="text-primary hover:underline">
                Log in
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
