import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlanDialog } from "@/components/admin/PlanDialog";
import { Search, Plus, Edit } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DollarSign, TrendingUp, Users, CreditCard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface PlanStats {
  totalRevenue: number;
  activeSubscriptions: number;
  churnRate: number;
  mrr: number;
}

interface Plan {
  id: string;
  name: string;
  price: number;
  features: string[];
  activeUsers: number;
}

export default function AdminBilling() {
  const { loading: authLoading } = useAdminAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<PlanStats>({
    totalRevenue: 0,
    activeSubscriptions: 0,
    churnRate: 0,
    mrr: 0,
  });

  const [plans, setPlans] = useState<Plan[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [planFilter, setPlanFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);

  useEffect(() => {
    if (!authLoading) {
      fetchBillingStats();
    }
  }, [authLoading]);

  const fetchBillingStats = async () => {
    try {
      // Load ALL plans (including inactive) for historical data
      const { data: plansData } = await supabase
        .from("subscription_plans")
        .select("*")
        .order("price_monthly", { ascending: true });

      // Get ALL subscriptions for complete picture
      const { data: allSubscriptions } = await supabase
        .from("user_subscriptions")
        .select("*, subscription_plans(*)");

      // Filter active subscriptions for MRR calculation
      const activeSubscriptions = allSubscriptions?.filter((s: any) => s.status === 'active') || [];
      const trialingSubscriptions = allSubscriptions?.filter((s: any) => s.status === 'trialing') || [];
      const pastDueSubscriptions = allSubscriptions?.filter((s: any) => s.status === 'past_due') || [];

      // Calculate MRR from active subscriptions only
      const mrr = activeSubscriptions.reduce((sum, sub: any) => {
        return sum + (sub.subscription_plans?.price_monthly || 0);
      }, 0);

      // Calculate MRR at risk (past due + trialing expiring soon)
      const mrrAtRisk = pastDueSubscriptions.reduce((sum, sub: any) => {
        return sum + (sub.subscription_plans?.price_monthly || 0);
      }, 0);

      // Calculate churn (cancelled in last 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const { count: churnedCount } = await supabase
        .from("user_subscriptions")
        .select("*", { count: "exact", head: true })
        .eq("status", "cancelled")
        .gte("updated_at", thirtyDaysAgo.toISOString());

      const totalActiveAndTrialing = activeSubscriptions.length + trialingSubscriptions.length;
      const churnRate = totalActiveAndTrialing > 0
        ? ((churnedCount || 0) / totalActiveAndTrialing) * 100 
        : 0;

      // Calculate total revenue (sum of all paid subscriptions)
      const { data: allPaidSubs } = await supabase
        .from("user_subscriptions")
        .select("subscription_plans(price_monthly), created_at, current_period_end")
        .neq("status", "cancelled");

      const totalRevenue = allPaidSubs?.reduce((sum, sub: any) => {
        // Calculate months active and sum
        const createdAt = new Date(sub.created_at);
        const periodEnd = sub.current_period_end ? new Date(sub.current_period_end) : new Date();
        const monthsActive = Math.max(1, Math.ceil((periodEnd.getTime() - createdAt.getTime()) / (30 * 24 * 60 * 60 * 1000)));
        return sum + (sub.subscription_plans?.price_monthly || 0) * monthsActive;
      }, 0) || 0;

      // Count users per plan (including all statuses)
      const plansWithUsers = await Promise.all(
        (plansData || []).map(async (plan: any) => {
          const { count: activeCount } = await supabase
            .from("user_subscriptions")
            .select("*", { count: "exact", head: true })
            .eq("plan_id", plan.id)
            .eq("status", "active");

          const { count: trialingCount } = await supabase
            .from("user_subscriptions")
            .select("*", { count: "exact", head: true })
            .eq("plan_id", plan.id)
            .eq("status", "trialing");

          const { count: pastDueCount } = await supabase
            .from("user_subscriptions")
            .select("*", { count: "exact", head: true })
            .eq("plan_id", plan.id)
            .eq("status", "past_due");
          
          return {
            id: plan.id,
            name: plan.name,
            price: plan.price_monthly,
            features: Array.isArray(plan.features) ? plan.features as string[] : [],
            activeUsers: activeCount || 0,
            trialingUsers: trialingCount || 0,
            pastDueUsers: pastDueCount || 0,
            isActive: plan.is_active,
          };
        })
      );

      setPlans(plansWithUsers);
      setStats({
        totalRevenue,
        activeSubscriptions: activeSubscriptions.length,
        churnRate,
        mrr,
      });
    } catch (error) {
      console.error("Error fetching billing stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return <div className="flex items-center justify-center h-full">Loading...</div>;
  }

  const statCards = [
    {
      title: "Total Revenue",
      value: `$${stats.totalRevenue.toLocaleString()}`,
      icon: DollarSign,
      description: "All-time revenue",
      trend: stats.totalRevenue > 0 ? "From active subscriptions" : "No revenue yet",
    },
    {
      title: "Monthly Recurring Revenue",
      value: `$${stats.mrr.toLocaleString()}`,
      icon: TrendingUp,
      description: "Current MRR",
      trend: stats.mrr > 0 ? `$${stats.mrr}/month` : "No active MRR",
    },
    {
      title: "Active Subscriptions",
      value: stats.activeSubscriptions,
      icon: Users,
      description: "Paying customers",
      trend: `${stats.activeSubscriptions} active`,
    },
    {
      title: "Churn Rate",
      value: `${stats.churnRate.toFixed(1)}%`,
      icon: CreditCard,
      description: "Monthly churn",
      trend: stats.churnRate < 5 ? "Healthy" : "Above target",
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Billing & Plans</h1>
        <p className="text-muted-foreground">Manage subscription plans and billing</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
                <p className="text-xs text-muted-foreground mt-2">{stat.trend}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Plans Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Subscription Plans</CardTitle>
              <CardDescription>Plan distribution across users</CardDescription>
            </div>
            <Button onClick={() => {
              setSelectedPlan(null);
              setPlanDialogOpen(true);
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Create New Plan
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search plans..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Plans</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plan Name</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Features</TableHead>
                <TableHead>Active Users</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plans
                .filter(plan => {
                  const matchesSearch = plan.name.toLowerCase().includes(searchQuery.toLowerCase());
                  const matchesStatus = statusFilter === "all" || 
                    (statusFilter === "active" && plan.activeUsers > 0) ||
                    (statusFilter === "inactive" && plan.activeUsers === 0);
                  return matchesSearch && matchesStatus;
                })
                .map((plan) => (
                <TableRow key={plan.id}>
                  <TableCell className="font-medium">{plan.name}</TableCell>
                  <TableCell>
                    {plan.price === 0 ? (
                      <Badge variant="secondary">Free</Badge>
                    ) : (
                      `$${plan.price}/month`
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {plan.features.slice(0, 2).map((feature, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {feature}
                        </Badge>
                      ))}
                      {plan.features.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{plan.features.length - 2} more
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{plan.activeUsers}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => {
                          setSelectedPlan(plan);
                          setPlanDialogOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Revenue Chart Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Overview</CardTitle>
          <CardDescription>
            {stats.totalRevenue > 0 
              ? `Total: $${stats.totalRevenue.toLocaleString()} | MRR: $${stats.mrr.toLocaleString()}`
              : "No revenue data yet"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stats.activeSubscriptions > 0 ? (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">Active Subscriptions</p>
                  <p className="text-2xl font-bold">{stats.activeSubscriptions}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Average Revenue Per User</p>
                  <p className="text-2xl font-bold">
                    ${stats.activeSubscriptions > 0 
                      ? (stats.mrr / stats.activeSubscriptions).toFixed(2) 
                      : '0'}
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                Note: Detailed revenue charts available with Stripe integration
              </p>
            </div>
          ) : (
            <div className="h-[150px] flex items-center justify-center text-muted-foreground">
              <p>No active subscriptions yet</p>
            </div>
          )}
        </CardContent>
      </Card>

      <PlanDialog
        open={planDialogOpen}
        onOpenChange={setPlanDialogOpen}
        plan={selectedPlan}
        onSuccess={fetchBillingStats}
      />
    </div>
  );
}