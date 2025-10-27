import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

  const [plans] = useState<Plan[]>([
    {
      id: "free",
      name: "Free",
      price: 0,
      features: ["1 website", "Basic analytics", "5,000 notifications/month"],
      activeUsers: 0,
    },
    {
      id: "starter",
      name: "Starter",
      price: 29,
      features: ["3 websites", "Advanced analytics", "50,000 notifications/month"],
      activeUsers: 0,
    },
    {
      id: "pro",
      name: "Pro",
      price: 79,
      features: ["10 websites", "Full analytics", "250,000 notifications/month"],
      activeUsers: 0,
    },
    {
      id: "enterprise",
      name: "Enterprise",
      price: 199,
      features: ["Unlimited websites", "Custom analytics", "Unlimited notifications"],
      activeUsers: 0,
    },
  ]);

  useEffect(() => {
    if (!authLoading) {
      fetchBillingStats();
    }
  }, [authLoading]);

  const fetchBillingStats = async () => {
    try {
      // TODO: Integrate with Stripe for real billing data
      // For now, calculating from profiles count
      const { count: totalUsers } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      setStats({
        totalRevenue: 0,
        activeSubscriptions: 0,
        churnRate: 0,
        mrr: 0,
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
      trend: "Stripe integration pending",
    },
    {
      title: "Monthly Recurring Revenue",
      value: `$${stats.mrr.toLocaleString()}`,
      icon: TrendingUp,
      description: "Current MRR",
      trend: "Stripe integration pending",
    },
    {
      title: "Active Subscriptions",
      value: stats.activeSubscriptions,
      icon: Users,
      description: "Paying customers",
      trend: "Stripe integration pending",
    },
    {
      title: "Churn Rate",
      value: `${stats.churnRate.toFixed(1)}%`,
      icon: CreditCard,
      description: "Monthly churn",
      trend: "Stripe integration pending",
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
            <Button disabled>Create New Plan</Button>
          </div>
        </CardHeader>
        <CardContent>
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
              {plans.map((plan) => (
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
                      <Button size="sm" variant="ghost" disabled>
                        Edit
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
          <CardTitle>Revenue Over Time</CardTitle>
          <CardDescription>Stripe integration required for revenue tracking</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            Chart placeholder - Stripe integration required
          </div>
        </CardContent>
      </Card>
    </div>
  );
}