import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, CreditCard } from "lucide-react";
import { toast } from "sonner";

export default function Billing() {
  const currentPlan = "Pro";
  
  const plans = [
    {
      name: "Starter",
      price: "$29",
      sites: 1,
      views: "10,000",
      features: ["1 Website", "10K monthly views", "Basic analytics", "Email support"],
    },
    {
      name: "Pro",
      price: "$79",
      sites: 10,
      views: "100,000",
      features: ["10 Websites", "100K monthly views", "Advanced analytics", "Priority support", "Custom branding"],
      popular: true,
    },
    {
      name: "Business",
      price: "$199",
      sites: 20,
      views: "Unlimited",
      features: ["20 Websites", "Unlimited views", "Advanced analytics", "24/7 support", "Custom branding", "API access"],
    },
  ];

  const handleUpgrade = (planName: string) => {
    toast.success(`Redirecting to checkout for ${planName} plan...`);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Billing & Plans</h1>
        <p className="text-muted-foreground">
          Manage your subscription and billing information
        </p>
      </div>

      {/* Current Plan */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Current Plan: {currentPlan}</CardTitle>
              <CardDescription>
                You're currently on the {currentPlan} plan
              </CardDescription>
            </div>
            <Badge className="bg-success text-success-foreground">Active</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Next billing date</span>
            <span className="font-medium">April 1, 2025</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Amount</span>
            <span className="font-medium">$79.00 / month</span>
          </div>
          <Button variant="outline" className="w-full gap-2">
            <CreditCard className="h-4 w-4" />
            Update Payment Method
          </Button>
        </CardContent>
      </Card>

      {/* Plans Grid */}
      <div>
        <h2 className="mb-4 text-2xl font-bold">Available Plans</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {plans.map((plan) => (
            <Card key={plan.name} className={plan.popular ? "border-primary shadow-lg" : ""}>
              {plan.popular && (
                <div className="flex justify-center">
                  <Badge className="rounded-b-lg rounded-t-none">Most Popular</Badge>
                </div>
              )}
              <CardHeader>
                <CardTitle>{plan.name}</CardTitle>
                <div className="mt-4">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground"> / month</span>
                </div>
                <CardDescription>
                  {plan.sites} {plan.sites === 1 ? "Website" : "Websites"} • {plan.views} views
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-success" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full"
                  variant={plan.name === currentPlan ? "outline" : "default"}
                  disabled={plan.name === currentPlan}
                  onClick={() => handleUpgrade(plan.name)}
                >
                  {plan.name === currentPlan ? "Current Plan" : "Upgrade"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Billing History */}
      <Card>
        <CardHeader>
          <CardTitle>Billing History</CardTitle>
          <CardDescription>
            View your past invoices and payments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { date: "Mar 1, 2025", amount: "$79.00", status: "Paid" },
              { date: "Feb 1, 2025", amount: "$79.00", status: "Paid" },
              { date: "Jan 1, 2025", amount: "$79.00", status: "Paid" },
            ].map((invoice) => (
              <div key={invoice.date} className="flex items-center justify-between border-b pb-3 last:border-0">
                <div>
                  <p className="font-medium">{invoice.date}</p>
                  <p className="text-sm text-muted-foreground">{currentPlan} Plan</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-medium">{invoice.amount}</span>
                  <Badge variant="outline" className="bg-success/10 text-success">
                    {invoice.status}
                  </Badge>
                  <Button variant="ghost" size="sm">Download</Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
