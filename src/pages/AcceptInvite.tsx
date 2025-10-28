import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import logo from "@/assets/NotiProof_Logo.png";

export default function AcceptInvite() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");
  const [loading, setLoading] = useState(true);
  const [invitation, setInvitation] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("Invalid invitation link");
      setLoading(false);
      return;
    }

    verifyInvitation();
  }, [token]);

  const verifyInvitation = async () => {
    try {
      const { data, error } = await supabase
        .from("team_invitations")
        .select("*, organizations(name)")
        .eq("token", token)
        .is("accepted_at", null)
        .gt("expires_at", new Date().toISOString())
        .single();

      if (error || !data) {
        setError("This invitation is invalid or has expired");
        return;
      }

      setInvitation(data);
    } catch (err) {
      console.error("Error verifying invitation:", err);
      setError("Failed to verify invitation");
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvitation = async () => {
    if (!invitation) return;

    setAccepting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast.error("Please sign in to accept this invitation");
        navigate(`/login?redirect=/accept-invite?token=${token}`);
        return;
      }

      // Add user to team_members
      const { error: memberError } = await supabase
        .from("team_members")
        .insert({
          organization_id: invitation.organization_id,
          user_id: user.id,
          role: invitation.role,
          invited_by: invitation.invited_by,
        });

      if (memberError) throw memberError;

      // Mark invitation as accepted
      const { error: updateError } = await supabase
        .from("team_invitations")
        .update({ accepted_at: new Date().toISOString() })
        .eq("id", invitation.id);

      if (updateError) throw updateError;

      toast.success("Invitation accepted! Welcome to the team.");
      navigate("/dashboard");
    } catch (err: any) {
      console.error("Error accepting invitation:", err);
      toast.error(err.message || "Failed to accept invitation");
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
          {error ? (
            <>
              <XCircle className="mx-auto h-12 w-12 text-destructive" />
              <CardTitle className="text-2xl">Invalid Invitation</CardTitle>
              <CardDescription>{error}</CardDescription>
            </>
          ) : (
            <>
              <CheckCircle2 className="mx-auto h-12 w-12 text-green-500" />
              <CardTitle className="text-2xl">You're Invited!</CardTitle>
              <CardDescription>
                You've been invited to join{" "}
                <strong>{invitation?.organizations?.name || "a team"}</strong> as a{" "}
                <strong>{invitation?.role}</strong>
              </CardDescription>
            </>
          )}
        </CardHeader>
        {!error && invitation && (
          <CardFooter className="flex flex-col space-y-4">
            <Button
              onClick={handleAcceptInvitation}
              disabled={accepting}
              className="w-full"
            >
              {accepting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Accepting...
                </>
              ) : (
                "Accept Invitation"
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/login")}
              className="w-full"
            >
              Sign In First
            </Button>
          </CardFooter>
        )}
        {error && (
          <CardFooter>
            <Button variant="outline" onClick={() => navigate("/")} className="w-full">
              Return Home
            </Button>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
