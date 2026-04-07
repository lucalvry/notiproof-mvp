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
  
  const websiteLabel = plan.max_websites >= 999 ? 'Unlimited websites' : `${plan.max_websites} website${plan.max_websites > 1 ? 's' : ''}`;
  features.push(websiteLabel);
  features.push(plan.max_events_per_month 
    ? `${(plan.max_events_per_month / 1000).toFixed(0)}K views/month`
    : 'Unlimited views');
  features.push(formatStorage(plan.storage_limit_bytes));
  features.push(formatVideoDuration(plan.video_max_duration_seconds));
  
  features.push("All 38+ integrations");
  features.push("All campaign templates");
  features.push("Unlimited testimonials & forms");
  
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
        .order('price_monthly');

      if (error) throw error;
      return data as Plan[];
    },
  });

  const featureComparison = [
    {
      category: "Usage Limits",
      features: [
        { name: "Websites", free: "1", starter: "3", standard: "Unlimited", professional: "Unlimited" },
        { name: "Monthly Views", free: "5K", starter: "30K", standard: "100K", professional: "400K" },
        { name: "Storage", free: "100MB", starter: "300MB", standard: "500MB", professional: "1GB" },
        { name: "Video Recording", free: "30sec", starter: "3min", standard: "5min", professional: "10min" },
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
      ]
    },
    {
      category: "Premium Features",
      features: [
        { name: "Remove NotiProof Branding", free: false, starter: true, standard: true, professional: true },
        { name: "Custom Domain for Forms", free: false, starter: false, standard: true, professional: true },
        { name: "API & Webhook Access", free: false, starter: false, standard: true, professional: true },
        { name: "White Label", free: false, starter: false, standard: false, professional: true },
        { name: "A/B Testing", free: false, starter: false, standard: false, professional: true },
        { name: "Advanced Targeting Rules", free: false, starter: false, standard: false, professional: true },
      ]
    },
    {
      category: "Support",
      features: [
        { name: "Support Level", free: "Community", starter: "Priority", standard: "Priority", professional: "Priority + Chat" },
      ]
    }
  ];

  const handleSelectPlan = (plan: Plan) => {
    if (plan.price_monthly === 0) {
      navigate('/register?plan=free');
    } else {
      navigate(`/register?plan=${plan.id}&billing=${billingPeriod}`);
    }
  };

  const planOrder = ['Free', 'Starter', 'Standard', 'Professional'];
  const sortedPlans = [...allPlans].sort((a, b) => planOrder.indexOf(a.name) - planOrder.indexOf(b.name));

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
            Start free, upgrade when you're ready. All plans include unlimited integrations, templates, and testimonials.
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
              Yearly <span className="text-success ml-1">(Save 17%)</span>
            </Label>
          </div>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="container max-w-7xl mx-auto px-4 py-12">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {sortedPlans.map((plan) => {
            const price = billingPeriod === 'monthly' ? plan.price_monthly : plan.price_yearly;
            const isPopular = plan.name === 'Standard';
            const isFree = plan.price_monthly === 0;
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
                    <span className="text-4xl font-bold">
                      {isFree ? 'Free' : `$${price}`}
                    </span>
                    {!isFree && (
                      <span className="text-muted-foreground">
                        /{billingPeriod === 'monthly' ? 'mo' : 'yr'}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {isFree ? 'No credit card required' : 'Billed ' + billingPeriod}
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
                    {isFree ? 'Start Free' : 'Get Started'}
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
                            <th className="text-center py-3 px-4 font-medium bg-primary/5">Standard</th>
                            <th className="text-center py-3 px-4 font-medium">Professional</th>
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
                                <td colSpan={4} className="text-center py-3 px-4">
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
                                  <td className="text-center py-3 px-4 bg-primary/5">
                                    {typeof feature.standard === 'boolean' ? (
                                      feature.standard ? <Check className="h-4 w-4 text-success mx-auto" /> : <X className="h-4 w-4 text-muted-foreground mx-auto" />
                                    ) : (
                                      <span className="font-semibold">{feature.standard}</span>
                                    )}
                                  </td>
                                  <td className="text-center py-3 px-4">
                                    {typeof feature.professional === 'boolean' ? (
                                      feature.professional ? <Check className="h-4 w-4 text-success mx-auto" /> : <X className="h-4 w-4 text-muted-foreground mx-auto" />
                                    ) : (
                                      feature.professional
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

        {/* CTA */}
        <div className="text-center py-16">
          <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
            Start with our Free plan — no credit card required. Upgrade anytime as your business grows.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Button size="lg" onClick={() => navigate('/register?plan=free')}>
              Start Free
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate('/login')}>
              Log In
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
