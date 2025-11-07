import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Check, X, Zap, TrendingUp, Users, Target, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface Plan {
  id: string;
  name: string;
  price_monthly: number;
  price_yearly: number;
  max_websites: number;
  max_events_per_month: number;
  features: string[];
}

export default function Pricing() {
  const navigate = useNavigate();
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['pricing-plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('price_monthly');

      if (error) throw error;
      return data as Plan[];
    },
  });

  // Free tier (not in database)
  const freePlan = {
    name: "Free",
    price_monthly: 0,
    price_yearly: 0,
    max_websites: 1,
    max_events_per_month: 1000,
    features: [
      "1 website",
      "1,000 views/month",
      "3 campaign templates",
      "2 integrations (GA4 + 1 more)",
      "Basic analytics",
      "Community support"
    ]
  };

  const allPlans = [freePlan, ...plans];

  const featureComparison = [
    {
      category: "Core Features",
      features: [
        { name: "Websites", free: "1", starter: "1", standard: "3", pro: "10", business: "20" },
        { name: "Monthly Views", free: "1K", starter: "10K", standard: "45K", pro: "100K", business: "Unlimited" },
        { name: "Campaign Templates", free: "3", starter: "10", standard: "20", pro: "Unlimited", business: "Unlimited" },
        { name: "Integrations", free: "2", starter: "5", standard: "15", pro: "38+", business: "38+" },
      ]
    },
    {
      category: "Advanced Features",
      features: [
        { name: "A/B Testing", free: false, starter: false, standard: false, pro: true, business: true },
        { name: "Team Collaboration", free: false, starter: false, standard: "3 members", pro: "10 members", business: "Unlimited" },
        { name: "White Label", free: false, starter: false, standard: false, pro: false, business: true },
        { name: "Custom Branding", free: false, starter: false, standard: false, pro: true, business: true },
        { name: "API Access", free: false, starter: false, standard: false, pro: false, business: true },
        { name: "Advanced Analytics", free: false, starter: "Basic", standard: "Standard", pro: "Advanced", business: "Advanced + AI" },
        { name: "Priority Support", free: false, starter: false, standard: true, pro: true, business: "24/7" },
      ]
    }
  ];

  const competitors = [
    {
      name: "Fomo",
      pricing: "$19-199/mo",
      integrations: "20+",
      abTesting: true,
      teamFeatures: "Pro+",
      websiteLimit: "1-10",
      highlight: false
    },
    {
      name: "Proof",
      pricing: "$79-299/mo",
      integrations: "30+",
      abTesting: false,
      teamFeatures: "Limited",
      websiteLimit: "5-25",
      highlight: false
    },
    {
      name: "NotiProof",
      pricing: "$0-380/mo",
      integrations: "38+",
      abTesting: true,
      teamFeatures: "All Plans",
      websiteLimit: "1-20",
      highlight: true
    },
    {
      name: "TrustPulse",
      pricing: "$29-239/mo",
      integrations: "15+",
      abTesting: false,
      teamFeatures: "Pro+",
      websiteLimit: "1-5",
      highlight: false
    },
    {
      name: "Nudgify",
      pricing: "$9-149/mo",
      integrations: "10+",
      abTesting: false,
      teamFeatures: "Limited",
      websiteLimit: "1-3",
      highlight: false
    }
  ];

  const handleSelectPlan = (plan: any) => {
    if (plan.name === "Free") {
      navigate('/register');
    } else {
      navigate('/select-plan');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      {/* Hero Section */}
      <div className="border-b bg-background/95 backdrop-blur">
        <div className="container max-w-7xl mx-auto px-4 py-16 text-center">
          <Badge className="mb-4">Transparent Pricing</Badge>
          <h1 className="text-5xl font-bold mb-4">
            Plans That Grow With Your Business
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Start free. Scale as you grow. No hidden fees.
          </p>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-4 mb-4">
            <Label htmlFor="billing-toggle" className={billingPeriod === 'monthly' ? 'font-semibold' : ''}>
              Monthly
            </Label>
            <Switch
              id="billing-toggle"
              checked={billingPeriod === 'yearly'}
              onCheckedChange={(checked) => setBillingPeriod(checked ? 'yearly' : 'monthly')}
            />
            <Label htmlFor="billing-toggle" className={billingPeriod === 'yearly' ? 'font-semibold' : ''}>
              Yearly <span className="text-success ml-1">(Save 20%)</span>
            </Label>
          </div>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="container max-w-7xl mx-auto px-4 py-12">
        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-6 mb-16">
          {allPlans.map((plan, index) => {
            const price = billingPeriod === 'monthly' ? plan.price_monthly : plan.price_yearly;
            const isPopular = plan.name === 'Pro';
            const isFree = plan.name === 'Free';

            return (
              <Card 
                key={index} 
                className={`relative ${isPopular ? 'border-primary shadow-lg scale-105' : ''} ${isFree ? 'border-accent' : ''}`}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground">Most Popular</Badge>
                  </div>
                )}

                <CardHeader>
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <div className="flex items-baseline gap-1 mt-4">
                    <span className="text-4xl font-bold">${price}</span>
                    <span className="text-muted-foreground">
                      /{billingPeriod === 'monthly' ? 'mo' : 'yr'}
                    </span>
                  </div>
                  {!isFree && (
                    <p className="text-xs text-muted-foreground mt-1">
                      14-day free trial
                    </p>
                  )}
                </CardHeader>

                <CardContent className="space-y-4">
                  <ul className="space-y-2 min-h-[200px]">
                    {plan.features.map((feature: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    className="w-full"
                    variant={isPopular ? 'default' : 'outline'}
                    onClick={() => handleSelectPlan(plan)}
                  >
                    {isFree ? 'Start Free' : 'Start Trial'}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Unique Advantages */}
        <div className="mb-16">
          <div className="text-center mb-8">
            <Badge className="mb-4" variant="outline">
              <Sparkles className="h-3 w-3 mr-1" />
              Why NotiProof?
            </Badge>
            <h2 className="text-3xl font-bold">What Makes Us Different</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <Zap className="h-8 w-8 text-primary mb-2" />
                <CardTitle>38+ Integrations</CardTitle>
                <CardDescription>
                  More integrations than any competitor. Connect to Stripe, Shopify, GA4, WooCommerce, and 34+ more platforms.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Target className="h-8 w-8 text-primary mb-2" />
                <CardTitle>Built-in A/B Testing</CardTitle>
                <CardDescription>
                  Optimize conversion rates with powerful A/B testing included in Pro and Business plans. No extra tools needed.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Users className="h-8 w-8 text-primary mb-2" />
                <CardTitle>Team Collaboration</CardTitle>
                <CardDescription>
                  Invite team members, manage permissions, and collaborate seamlessly across all your campaigns.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>

        {/* Feature Comparison Table */}
        <div className="mb-16">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-2">Compare All Features</h2>
            <p className="text-muted-foreground">
              See exactly what's included in each plan
            </p>
          </div>

          <Card>
            <CardContent className="p-6">
              {featureComparison.map((section, sectionIdx) => (
                <div key={sectionIdx} className="mb-8 last:mb-0">
                  <h3 className="text-lg font-semibold mb-4">{section.category}</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4 font-medium">Feature</th>
                          <th className="text-center py-3 px-4 font-medium">Free</th>
                          <th className="text-center py-3 px-4 font-medium">Starter</th>
                          <th className="text-center py-3 px-4 font-medium">Standard</th>
                          <th className="text-center py-3 px-4 font-medium bg-primary/5">Pro</th>
                          <th className="text-center py-3 px-4 font-medium">Business</th>
                        </tr>
                      </thead>
                      <tbody>
                        {section.features.map((feature, idx) => (
                          <tr key={idx} className="border-b last:border-0">
                            <td className="py-3 px-4">{feature.name}</td>
                            <td className="text-center py-3 px-4">
                              {typeof feature.free === 'boolean' ? (
                                feature.free ? <Check className="h-4 w-4 text-success mx-auto" /> : <X className="h-4 w-4 text-muted-foreground mx-auto" />
                              ) : (
                                feature.free
                              )}
                            </td>
                            <td className="text-center py-3 px-4">
                              {typeof feature.starter === 'boolean' ? (
                                feature.starter ? <Check className="h-4 w-4 text-success mx-auto" /> : <X className="h-4 w-4 text-muted-foreground mx-auto" />
                              ) : (
                                feature.starter
                              )}
                            </td>
                            <td className="text-center py-3 px-4">
                              {typeof feature.standard === 'boolean' ? (
                                feature.standard ? <Check className="h-4 w-4 text-success mx-auto" /> : <X className="h-4 w-4 text-muted-foreground mx-auto" />
                              ) : (
                                feature.standard
                              )}
                            </td>
                            <td className="text-center py-3 px-4 bg-primary/5">
                              {typeof feature.pro === 'boolean' ? (
                                feature.pro ? <Check className="h-4 w-4 text-success mx-auto" /> : <X className="h-4 w-4 text-muted-foreground mx-auto" />
                              ) : (
                                <span className="font-semibold">{feature.pro}</span>
                              )}
                            </td>
                            <td className="text-center py-3 px-4">
                              {typeof feature.business === 'boolean' ? (
                                feature.business ? <Check className="h-4 w-4 text-success mx-auto" /> : <X className="h-4 w-4 text-muted-foreground mx-auto" />
                              ) : (
                                feature.business
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {sectionIdx < featureComparison.length - 1 && <Separator className="mt-6" />}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Competitor Comparison */}
        <div className="mb-16">
          <div className="text-center mb-8">
            <Badge className="mb-4" variant="outline">
              <TrendingUp className="h-3 w-3 mr-1" />
              Market Comparison
            </Badge>
            <h2 className="text-3xl font-bold mb-2">How We Stack Up</h2>
            <p className="text-muted-foreground">
              See how NotiProof compares to the competition
            </p>
          </div>

          <Card>
            <CardContent className="p-6">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium">Platform</th>
                      <th className="text-center py-3 px-4 font-medium">Pricing</th>
                      <th className="text-center py-3 px-4 font-medium">Integrations</th>
                      <th className="text-center py-3 px-4 font-medium">A/B Testing</th>
                      <th className="text-center py-3 px-4 font-medium">Team Features</th>
                      <th className="text-center py-3 px-4 font-medium">Websites</th>
                    </tr>
                  </thead>
                  <tbody>
                    {competitors.map((competitor, idx) => (
                      <tr 
                        key={idx} 
                        className={`border-b last:border-0 ${competitor.highlight ? 'bg-primary/5' : ''}`}
                      >
                        <td className="py-3 px-4 font-semibold">
                          {competitor.highlight && <Badge className="mr-2" variant="default">Us</Badge>}
                          {competitor.name}
                        </td>
                        <td className="text-center py-3 px-4">{competitor.pricing}</td>
                        <td className="text-center py-3 px-4">
                          <span className={competitor.highlight ? 'font-semibold text-primary' : ''}>
                            {competitor.integrations}
                          </span>
                        </td>
                        <td className="text-center py-3 px-4">
                          {competitor.abTesting ? (
                            <Check className="h-4 w-4 text-success mx-auto" />
                          ) : (
                            <X className="h-4 w-4 text-muted-foreground mx-auto" />
                          )}
                        </td>
                        <td className="text-center py-3 px-4">{competitor.teamFeatures}</td>
                        <td className="text-center py-3 px-4">{competitor.websiteLimit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* CTA Section */}
        <Card className="text-center bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
          <CardContent className="p-12">
            <Sparkles className="h-12 w-12 text-primary mx-auto mb-4" />
            <h2 className="text-3xl font-bold mb-4">Ready to Boost Your Conversions?</h2>
            <p className="text-lg text-muted-foreground mb-6 max-w-2xl mx-auto">
              Join thousands of businesses using NotiProof to build trust and increase sales with social proof.
            </p>
            <div className="flex gap-4 justify-center">
              <Button size="lg" onClick={() => navigate('/register')}>
                Start Free Today
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate('/help')}>
                Talk to Sales
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
