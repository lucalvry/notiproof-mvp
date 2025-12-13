import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Zap, Users, ShoppingCart, TrendingUp, Star, MessageSquare, Plug2, Sparkles, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getIntegrationMetadata, getAllIntegrations } from "@/lib/integrationMetadata";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";

interface QuickStartTemplate {
  id: string;
  name: string;
  description: string;
  icon: any;
  category: string;
  estimatedTime: string;
  features: string[];
  config: {
    campaignType: string;
    integrationPath: string;
    dataSource: string;
    messageTemplate: string;
    settings: Record<string, any>;
  };
}

const QUICK_START_TEMPLATES: QuickStartTemplate[] = [
  {
    id: "recent-signups",
    name: "Recent Sign-ups",
    description: "Show when people join your platform",
    icon: Users,
    category: "Conversion",
    estimatedTime: "2 min",
    features: ["Auto-sync", "Live updates", "Social proof"],
    config: {
      campaignType: "conversion",
      integrationPath: "demo",
      dataSource: "demo",
      messageTemplate: "{{name}} from {{location}} just signed up!",
      settings: {
        position: "bottom-left",
        animation: "slide",
        backgroundColor: "#10b981",
        textColor: "#ffffff",
      },
    },
  },
  {
    id: "visitors-pulse",
    name: "Visitors Pulse",
    description: "Display current visitor activity",
    icon: TrendingUp,
    category: "Activity",
    estimatedTime: "1 min",
    features: ["Real-time", "Page tracking", "Geo-location"],
    config: {
      campaignType: "visitor",
      integrationPath: "demo",
      dataSource: "demo",
      messageTemplate: "{{count}} people are viewing {{page}}",
      settings: {
        position: "bottom-right",
        animation: "fade",
        backgroundColor: "#667eea",
        textColor: "#ffffff",
      },
    },
  },
  {
    id: "recent-purchases",
    name: "Recent Purchases",
    description: "Highlight product sales in real-time",
    icon: ShoppingCart,
    category: "E-commerce",
    estimatedTime: "2 min",
    features: ["Revenue tracking", "Product names", "Urgency"],
    config: {
      campaignType: "purchase",
      integrationPath: "demo",
      dataSource: "demo",
      messageTemplate: "{{name}} just purchased {{product}}!",
      settings: {
        position: "bottom-left",
        animation: "slide",
        backgroundColor: "#f59e0b",
        textColor: "#ffffff",
      },
    },
  },
  {
    id: "customer-reviews",
    name: "Customer Reviews",
    description: "Display positive feedback and ratings",
    icon: Star,
    category: "Trust",
    estimatedTime: "3 min",
    features: ["5-star ratings", "Verified badges", "Testimonials"],
    config: {
      campaignType: "review",
      integrationPath: "demo",
      dataSource: "demo",
      messageTemplate: "{{name}} rated us ⭐⭐⭐⭐⭐",
      settings: {
        position: "bottom-right",
        animation: "bounce",
        backgroundColor: "#8b5cf6",
        textColor: "#ffffff",
      },
    },
  },
  {
    id: "form-submissions",
    name: "Form Submissions",
    description: "Show when forms are completed",
    icon: MessageSquare,
    category: "Leads",
    estimatedTime: "2 min",
    features: ["Lead generation", "Contact forms", "Engagement"],
    config: {
      campaignType: "conversion",
      integrationPath: "demo",
      dataSource: "demo",
      messageTemplate: "{{name}} just submitted a contact request",
      settings: {
        position: "top-right",
        animation: "slide",
        backgroundColor: "#06b6d4",
        textColor: "#ffffff",
      },
    },
  },
];

interface QuickStartSelectorProps {
  onSelect: (template: QuickStartTemplate) => void;
  showDataSourceSelector?: boolean;
  onDataSourceSelect?: (dataSource: string) => void;
}

export function QuickStartSelector({ 
  onSelect, 
  showDataSourceSelector = false,
  onDataSourceSelect 
}: QuickStartSelectorProps) {
  const [connectedIntegrations, setConnectedIntegrations] = useState<Set<string>>(new Set());
  const [showAllIntegrations, setShowAllIntegrations] = useState(false);

  // Fetch all integrations dynamically
  const allIntegrations = getAllIntegrations()
    .sort((a, b) => {
      if (b.popularityScore && a.popularityScore) {
        return b.popularityScore - a.popularityScore;
      }
      return (a.phase || 3) - (b.phase || 3);
    });

  // Display top 12 by default, or all if toggled
  const displayedIntegrations = showAllIntegrations 
    ? allIntegrations 
    : allIntegrations.slice(0, 12);

  // Quick start cards for instant templates
  const quickStartIntegrations = allIntegrations.slice(0, 8);

  // Check connection status for all integrations
  useEffect(() => {
    const fetchConnections = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const currentWebsiteId = localStorage.getItem('selectedWebsiteId');
      if (!currentWebsiteId) return;
      
      const { data } = await supabase
        .from('integration_connectors')
        .select('integration_type')
        .eq('user_id', user.id)
        .eq('website_id', currentWebsiteId)
        .eq('status', 'active');
      
      if (data) {
        setConnectedIntegrations(new Set(data.map(c => c.integration_type)));
      }
    };
    
    fetchConnections();
  }, []);

  // If showing data source selector, show redesigned integration-first view
  if (showDataSourceSelector && onDataSourceSelect) {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Plug2 className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-bold">Choose Your Data Source</h2>
          </div>
          <p className="text-muted-foreground">
            Connect an integration to automatically create your first notification
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
          {displayedIntegrations.map((integration) => {
            const Icon = integration.icon;
            const isConnected = connectedIntegrations.has(integration.key);
            
            return (
              <Card
                key={integration.key}
                className="cursor-pointer transition-all hover:shadow-lg hover:border-primary/50"
                onClick={() => onDataSourceSelect(integration.key)}
              >
                <CardContent className="p-6 text-center space-y-3">
                  <div className="flex justify-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{integration.displayName}</p>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {integration.description}
                    </p>
                  </div>
                  <Button 
                    size="sm" 
                    variant={isConnected ? "default" : "outline"} 
                    className="w-full"
                  >
                    {isConnected ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Connected
                      </>
                    ) : (
                      'Connect'
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {!showAllIntegrations && allIntegrations.length > 12 && (
          <div className="text-center">
            <Button 
              variant="outline" 
              onClick={() => setShowAllIntegrations(true)}
            >
              View All {allIntegrations.length} Integrations ▾
            </Button>
          </div>
        )}

        <div className="text-center">
          <Button 
            variant="ghost" 
            onClick={() => {
              const customTemplate = QUICK_START_TEMPLATES.find(t => t.id === 'custom-setup') || {
                id: "custom-setup",
                name: "Custom Setup",
                description: "Full control with step-by-step wizard",
                icon: Zap,
                category: "Advanced",
                estimatedTime: "5 min",
                features: [],
                config: { campaignType: "", integrationPath: "", dataSource: "", messageTemplate: "", settings: {} },
              };
              onSelect(customTemplate as QuickStartTemplate);
            }}
          >
            ← Back to Templates
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Sparkles className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">Choose Your Path</h2>
        </div>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Start with a ready-made template for instant results, or connect your integration to sync real data
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* LEFT: Instant Templates */}
        <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Instant Templates</CardTitle>
            </div>
            <CardDescription>Start showing notifications in 30 seconds with demo data</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {QUICK_START_TEMPLATES.slice(0, 4).map((template) => {
              const Icon = template.icon;
              return (
                <Card
                  key={template.id}
                  className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50 hover:scale-[1.02]"
                  onClick={() => onSelect(template)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 flex-shrink-0">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold text-sm truncate">{template.name}</p>
                          <Badge variant="secondary" className="text-xs flex-shrink-0">
                            {template.estimatedTime}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {template.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            <p className="text-xs text-center text-muted-foreground pt-2">
              ✨ Includes demo data • See results immediately
            </p>
          </CardContent>
        </Card>

        {/* RIGHT: Connect Integrations */}
        <Card className="border-2 border-success/20 bg-gradient-to-br from-success/5 to-transparent">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Plug2 className="h-5 w-5 text-success" />
              <CardTitle className="text-lg">Connect & Auto-Create</CardTitle>
            </div>
            <CardDescription>Connect an integration → We create your first notification automatically</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {quickStartIntegrations.map((integration) => {
                const Icon = integration.icon;
                const isConnected = connectedIntegrations.has(integration.key);
                
                return (
                  <Card
                    key={integration.key}
                    className="cursor-pointer transition-all hover:shadow-md hover:border-success/50 hover:scale-[1.02]"
                    onClick={() => {
                      if (onDataSourceSelect) {
                        onDataSourceSelect(integration.key);
                      }
                    }}
                  >
                    <CardContent className="p-3 text-center space-y-2">
                      <div className="flex justify-center relative">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-success/10">
                          <Icon className="h-4 w-4 text-success" />
                        </div>
                        {isConnected && (
                          <div className="absolute -top-1 -right-1">
                            <CheckCircle2 className="h-3 w-3 text-success fill-background" />
                          </div>
                        )}
                      </div>
                      <p className="font-semibold text-xs line-clamp-1">{integration.displayName}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            <p className="text-xs text-center text-muted-foreground pt-2">
              🔌 One-click connect • Auto-syncs forever
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="templates" className="w-full hidden">
        <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto">
          <TabsTrigger value="templates">Quick Templates</TabsTrigger>
          <TabsTrigger value="integrations">Connect Integration</TabsTrigger>
        </TabsList>
        
        <TabsContent value="templates" className="mt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {QUICK_START_TEMPLATES.map((template) => {
              const Icon = template.icon;

              return (
                <Card
                  key={template.id}
                  className="cursor-pointer transition-all hover:shadow-lg hover:border-primary/50"
                  onClick={() => onSelect(template)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {template.estimatedTime}
                      </Badge>
                    </div>
                    <CardTitle className="text-base">{template.name}</CardTitle>
                    <CardDescription className="text-sm">
                      {template.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <Badge variant="outline" className="text-xs">
                        {template.category}
                      </Badge>
                      <div className="space-y-1">
                        {template.features.map((feature, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                            <div className="h-1 w-1 rounded-full bg-primary" />
                            {feature}
                          </div>
                        ))}
                      </div>
                      <Button className="w-full mt-3">
                        Use Template
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="text-center mt-6">
            <p className="text-sm text-muted-foreground">
              ✨ All templates include demo data so you can see results immediately
            </p>
          </div>
        </TabsContent>

        <TabsContent value="integrations" className="mt-6">
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
            {allIntegrations.map((integration) => {
              const Icon = integration.icon;
              return (
                <Card
                  key={integration.key}
                  className="cursor-pointer transition-all hover:shadow-lg hover:border-primary/50"
                  onClick={() => {
                    if (onDataSourceSelect) {
                      onDataSourceSelect(integration.key);
                    }
                  }}
                >
                  <CardContent className="p-6 text-center space-y-3">
                    <div className="flex justify-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                        <Icon className="h-6 w-6 text-primary" />
                      </div>
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{integration.displayName}</p>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {integration.description}
                      </p>
                    </div>
                    <Button size="sm" variant="outline" className="w-full">
                      Connect & Create
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="text-center mt-6">
            <p className="text-sm text-muted-foreground">
              🔌 Connect once, auto-sync forever
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
