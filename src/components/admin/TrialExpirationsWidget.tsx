import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { Clock, ChevronDown, ChevronUp, Calendar, Mail, CreditCard, RefreshCw, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { ExtendTrialDialog } from "./ExtendTrialDialog";
import { AssignPlanDialog } from "./AssignPlanDialog";
import { format } from "date-fns";

interface TrialExpiringUser {
  subscription_id: string;
  user_id: string;
  name: string;
  email: string;
  plan_name: string;
  trial_end: string;
  days_until_expiry: number;
}

export function TrialExpirationsWidget() {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(true);
  const [extendDialogOpen, setExtendDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<TrialExpiringUser | null>(null);
  const [sendingReminder, setSendingReminder] = useState<string | null>(null);

  const { data: expiringUsers, isLoading, refetch } = useQuery({
    queryKey: ["trial-expirations"],
    queryFn: async (): Promise<TrialExpiringUser[]> => {
      // Get trialing subscriptions expiring within 7 days
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

      const { data: subscriptions, error } = await supabase
        .from("user_subscriptions")
        .select(`
          id,
          user_id,
          trial_end,
          plan:subscription_plans(name)
        `)
        .eq("status", "trialing")
        .not("trial_end", "is", null)
        .lte("trial_end", sevenDaysFromNow.toISOString())
        .order("trial_end", { ascending: true });

      if (error) throw error;
      if (!subscriptions || subscriptions.length === 0) return [];

      // Get user details via edge function
      const { data: usersData, error: usersError } = await supabase.functions.invoke(
        "admin-user-actions",
        { body: { action: "list-users" } }
      );

      if (usersError) throw usersError;

      const usersMap = new Map<string, { email: string; name: string }>(
        usersData?.users?.map((u: { id: string; email: string; name: string }) => [u.id, { email: u.email, name: u.name }]) || []
      );

      return subscriptions.map((sub) => {
        const user = usersMap.get(sub.user_id) || { email: "Unknown", name: "Unknown" };
        const trialEnd = new Date(sub.trial_end!);
        const now = new Date();
        const diffTime = trialEnd.getTime() - now.getTime();
        const daysUntilExpiry = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return {
          subscription_id: sub.id,
          user_id: sub.user_id,
          name: user.name,
          email: user.email,
          plan_name: (sub.plan as any)?.name || "Trial",
          trial_end: sub.trial_end!,
          days_until_expiry: daysUntilExpiry,
        };
      });
    },
    refetchInterval: 60000, // Refresh every minute
  });

  const getUrgencyBadge = (days: number) => {
    if (days <= 0) {
      return <Badge variant="destructive">Expired</Badge>;
    }
    if (days === 1) {
      return <Badge variant="destructive">1 day left</Badge>;
    }
    if (days <= 3) {
      return <Badge className="bg-orange-500 hover:bg-orange-600">{days} days left</Badge>;
    }
    return <Badge className="bg-yellow-500 hover:bg-yellow-600">{days} days left</Badge>;
  };

  const handleExtendTrial = (user: TrialExpiringUser) => {
    setSelectedUser(user);
    setExtendDialogOpen(true);
  };

  const handleAssignPlan = (user: TrialExpiringUser) => {
    setSelectedUser(user);
    setAssignDialogOpen(true);
  };

  const handleSendReminder = async (user: TrialExpiringUser) => {
    setSendingReminder(user.user_id);
    try {
      const { error } = await supabase.functions.invoke("admin-user-actions", {
        body: {
          action: "send-trial-reminder",
          userId: user.user_id,
          daysRemaining: user.days_until_expiry,
        },
      });

      if (error) throw error;
      toast.success(`Reminder sent to ${user.email}`);
    } catch (error: any) {
      console.error("Error sending reminder:", error);
      toast.error(error.message || "Failed to send reminder");
    } finally {
      setSendingReminder(null);
    }
  };

  const handleSuccess = () => {
    refetch();
    queryClient.invalidateQueries({ queryKey: ["subscription-metrics"] });
  };

  const expiringCount = expiringUsers?.length || 0;
  const urgentCount = expiringUsers?.filter((u) => u.days_until_expiry <= 3).length || 0;

  return (
    <>
      <Card>
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-orange-100 p-2">
                  <Clock className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <CardTitle className="flex items-center gap-2">
                    Upcoming Trial Expirations
                    {expiringCount > 0 && (
                      <Badge variant="outline" className="ml-2">
                        {expiringCount} user{expiringCount !== 1 ? "s" : ""}
                      </Badge>
                    )}
                    {urgentCount > 0 && (
                      <Badge variant="destructive" className="ml-1">
                        {urgentCount} urgent
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription>Trials expiring in the next 7 days</CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => refetch()}
                  disabled={isLoading}
                >
                  <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                </Button>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="icon">
                    {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </CollapsibleTrigger>
              </div>
            </div>
          </CardHeader>

          <CollapsibleContent>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : expiringCount === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Calendar className="h-12 w-12 text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">No trials expiring in the next 7 days</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expiringUsers?.map((user) => (
                      <TableRow key={user.subscription_id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{user.name}</div>
                            <div className="text-sm text-muted-foreground">{user.email}</div>
                          </div>
                        </TableCell>
                        <TableCell>{user.plan_name}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            {format(new Date(user.trial_end), "MMM d, yyyy")}
                          </div>
                        </TableCell>
                        <TableCell>{getUrgencyBadge(user.days_until_expiry)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleExtendTrial(user)}
                              title="Extend Trial"
                            >
                              <Clock className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleAssignPlan(user)}
                              title="Assign Plan"
                            >
                              <CreditCard className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSendReminder(user)}
                              disabled={sendingReminder === user.user_id}
                              title="Send Reminder"
                            >
                              {sendingReminder === user.user_id ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                              ) : (
                                <Mail className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {selectedUser && (
        <>
          <ExtendTrialDialog
            open={extendDialogOpen}
            onOpenChange={setExtendDialogOpen}
            userId={selectedUser.user_id}
            userName={selectedUser.name}
            currentTrialEnd={selectedUser.trial_end}
            onSuccess={handleSuccess}
          />
          <AssignPlanDialog
            open={assignDialogOpen}
            onOpenChange={setAssignDialogOpen}
            userId={selectedUser.user_id}
            userName={selectedUser.name}
            currentPlanName={selectedUser.plan_name}
            onSuccess={handleSuccess}
          />
        </>
      )}
    </>
  );
}
