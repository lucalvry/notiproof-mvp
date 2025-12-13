import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Check, X, Zap, TrendingUp, Users, Target, Sparkles, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Plan {
  id: string;
  name: string;
  price_monthly: number;
  price_yearly: number;
  max_websites: number;
  max_events_per_month: number | null;
  storage_limit_bytes: number;
  video_max_duration_seconds: number;
  can_remove_branding?: boolean;
  custom_domain_enabled?: boolean;
  has_white_label?: boolean;
  has_api?: boolean;
}

const formatStorage = (bytes: number): string => {
  if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(0)}GB storage`;
  return `${(bytes / 1048576).toFixed(0)}MB storage`;
};

const formatVideoDuration = (seconds: number): string => {
  if (seconds >= 60) return `${Math.floor(seconds / 60)}min video recording`;
  return `${seconds}sec video recording`;
};

const generatePlanFeatures = (plan: Plan): string[] => {
  const features: string[] = [];
  
  // Limits (the differentiators)
  features.push(`${plan.max_websites} website${plan.max_websites > 1 ? 's' : ''}`);
  features.push(plan.max_events_per_month 
    ? `${(plan.max_events_per_month / 1000).toFixed(0)}K views/month`
    : 'Unlimited views');
  features.push(formatStorage(plan.storage_limit_bytes));
  features.push(formatVideoDuration(plan.video_max_duration_seconds));
  
  // Global features (all plans)
  features.push("All 38+ integrations");
  features.push("All campaign templates");
  features.push("Unlimited testimonials & forms");
  features.push("Wall of Testimonials builder");
  features.push("AI analysis & insights");
  
  // Premium features based on plan
  if (plan.can_remove_branding) features.push("Remove NotiProof branding");
  if (plan.custom_domain_enabled) features.push("Custom domain for forms");
  if (plan.has_api) features.push("API & Webhook access");
  if (plan.has_white_label) features.push("White label mode");
  
  return features;
};

export default function Pricing() {
  const navigate = useNavigate();
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');

  const { data: allPlans = [], isLoading } = useQuery({
    queryKey: ['pricing-plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .gt('price_monthly', 0) // Exclude Free plan
        .order('price_monthly');

      if (error) throw error;
      return data as Plan[];
    },
  });

  // Feature comparison table with new structure
  const featureComparison = [
    {
      category: "Usage Limits (The Differentiators)",
      features: [
        { name: "Websites", free: "1", starter: "3", standard: "5", pro: "10", business: "20" },
        { name: "Monthly Views", free: "1K", starter: "10K", standard: "45K", pro: "100K", business: "Unlimited" },
        { name: "Storage", free: "100MB", starter: "1GB", standard: "5GB", pro: "20GB", business: "100GB" },
        { name: "Video Recording", free: "30sec", starter: "3min", standard: "3min", pro: "5min", business: "5min" },
      ]
    },
    {
      category: "Global Features (Available to ALL Plans)",
      features: [
        { name: "All 38+ Integrations", all: true, tooltip: "Stripe, Shopify, GA4, WooCommerce, and 34+ more" },
        { name: "All Campaign Templates", all: true, tooltip: "Every template unlocked from day one" },
        { name: "Unlimited Testimonials", all: true, tooltip: "Collect as many testimonials as you need" },
        { name: "Unlimited Forms", all: true, tooltip: "Create unlimited testimonial collection forms" },
        { name: "Wall of Testimonials Builder", all: true, tooltip: "Beautiful testimonial showcase pages" },
        { name: "AI Testimonial Analysis", all: true, tooltip: "Automatic sentiment analysis and insights" },
        { name: "Testimonial Tags & Search", all: true, tooltip: "Organize and find testimonials easily" },
        { name: "Testimonial Widgets", all: true, tooltip: "Embed testimonials anywhere on your site" },
      ]
    },
    {
      category: "Premium Features",
      features: [
        { name: "Remove NotiProof Branding", free: false, starter: true, standard: true, pro: true, business: true },
        { name: "Custom Domain for Forms", free: false, starter: true, standard: true, pro: true, business: true },
        { name: "API Access", free: false, starter: false, standard: true, pro: true, business: true },
        { name: "Webhooks", free: false, starter: false, standard: true, pro: true, business: true },
        { name: "White Label", free: false, starter: false, standard: "Partial", pro: "Full", business: "Full" },
        { name: "A/B Testing", free: false, starter: false, standard: false, pro: true, business: true },
      ]
    },
    {
      category: "Team & Support",
      features: [
        { name: "Team Seats", free: "1", starter: "1 + buy more", standard: "1 + buy more", pro: "1 + buy more", business: "1 + buy more", tooltip: "$3/month per additional seat" },
        { name: "Support Level", free: "Basic Email", starter: "Standard", standard: "Priority", pro: "Priority + Chat", business: "24/7 + Manager" },
      ]
    }
  ];

  const handleSelectPlan = (plan: any) => {
    // All plans now go to plan selection (no more Free)
    navigate('/select-plan');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      {/* Hero Section */}
      <div className="border-b bg-background/95 backdrop-blur">
        <div className="container max-w-7xl mx-auto px-4 py-16 text-center">
          <Badge className="mb-4">Simple, Transparent Pricing</Badge>
          <h1 className="text-5xl font-bold mb-4">
            Everything You Need to Build Trust
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            All plans include unlimited integrations, templates, and testimonials. Upgrade for more capacity and advanced features.
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
            const features = generatePlanFeatures(plan);

            return (
              <Card 
                key={plan.id} 
                className={`relative ${isPopular ? 'border-primary shadow-lg scale-105' : ''}`}
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
                  <p className="text-xs text-muted-foreground mt-1">
                    14-day free trial
                  </p>
                </CardHeader>

                <CardContent className="space-y-4">
                  <ul className="space-y-2 min-h-[200px]">
                    {features.slice(0, 8).map((feature: string, idx: number) => (
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
                    Start 14-Day Trial
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* What Makes Us Different */}
        <div className="mb-16">
          <div className="text-center mb-8">
            <Badge className="mb-4" variant="outline">
              <Sparkles className="h-3 w-3 mr-1" />
              Why NotiProof?
            </Badge>
            <h2 className="text-3xl font-bold">No Feature Paywalls on Core Functionality</h2>
            <p className="text-muted-foreground mt-2">
              Every plan gets full access to integrations, templates, and testimonial features
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <Zap className="h-8 w-8 text-primary mb-2" />
                <CardTitle>All 38+ Integrations</CardTitle>
                <CardDescription>
                  Free plan included. Connect to Stripe, Shopify, GA4, WooCommerce, and 34+ more platforms from day one.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Target className="h-8 w-8 text-primary mb-2" />
                <CardTitle>All Campaign Templates</CardTitle>
                <CardDescription>
                  Every template unlocked. No artificial limits on creativity. Build beautiful campaigns on any plan.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Users className="h-8 w-8 text-primary mb-2" />
                <CardTitle>Unlimited Testimonials</CardTitle>
                <CardDescription>
                  Collect unlimited testimonials and create unlimited forms. AI analysis included for everyone.
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
              <TooltipProvider>
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
                          {section.features.map((feature: any, idx) => (
                            <tr key={idx} className="border-b last:border-0">
                              <td className="py-3 px-4 flex items-center gap-2">
                                {feature.name}
                                {feature.tooltip && (
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <Info className="h-3 w-3 text-muted-foreground" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p className="text-xs max-w-xs">{feature.tooltip}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                              </td>
                              {feature.all ? (
                                <td colSpan={5} className="text-center py-3 px-4">
                                  <Check className="h-5 w-5 text-success mx-auto" />
                                </td>
                              ) : (
                                <>
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
                                </>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {sectionIdx < featureComparison.length - 1 && <Separator className="mt-6" />}
                  </div>
                ))}
              </TooltipProvider>
            </CardContent>
          </Card>
        </div>

        {/* Add-ons Section */}
        <div className="mb-16">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-2">Flexible Add-ons</h2>
            <p className="text-muted-foreground">
              Need more? Add extra capacity to any plan
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Extra Team Seats</CardTitle>
                <CardDescription>Add collaborators to your account</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-3xl font-bold">$3</span>
                  <span className="text-muted-foreground">/seat/month</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  or $30/seat/year (save 17%)
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Extra Storage</CardTitle>
                <CardDescription>Add more space for videos and images</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  <li className="flex justify-between text-sm">
                    <span>+5GB storage</span>
                    <span className="font-semibold">$3/mo</span>
                  </li>
                  <li className="flex justify-between text-sm">
                    <span>+20GB storage</span>
                    <span className="font-semibold">$7/mo</span>
                  </li>
                  <li className="flex justify-between text-sm">
                    <span>+50GB storage</span>
                    <span className="font-semibold">$12/mo</span>
                  </li>
                  <li className="flex justify-between text-sm">
                    <span>+100GB storage</span>
                    <span className="font-semibold">$19/mo</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* CTA Section */}
        <Card className="text-center bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
          <CardContent className="p-12">
            <Sparkles className="h-12 w-12 text-primary mx-auto mb-4" />
            <h2 className="text-3xl font-bold mb-4">Ready to Boost Your Conversions?</h2>
            <p className="text-lg text-muted-foreground mb-6 max-w-2xl mx-auto">
              Start with everything included. Upgrade as you grow. No hidden limits on features.
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