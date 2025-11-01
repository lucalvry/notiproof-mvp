import { useState } from "react";
import { 
  ShoppingCart, 
  Users, 
  Zap, 
  MessageSquare,
  Trophy,
  Heart,
  Calendar,
  FileText,
  Share2,
  Download,
  TrendingUp,
  Eye,
  Star,
  Clock,
  Rocket,
  Package,
  UserPlus,
  Award,
  BookOpen,
  CreditCard
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface CampaignType {
  id: string;
  title: string;
  description: string;
  example: string;
  icon: React.ReactNode;
  category: "all" | "ecommerce" | "saas" | "services" | "custom";
  recommended?: string[];
}

const CAMPAIGN_TYPES: CampaignType[] = [
  // E-commerce (8 types)
  {
    id: "recent-purchase",
    title: "Recent Purchases",
    description: "Show real-time purchase notifications",
    example: "Sarah from London just bought Wireless Headphones",
    icon: <ShoppingCart className="h-5 w-5" />,
    category: "ecommerce",
    recommended: ["ecommerce", "retail"]
  },
  {
    id: "cart-additions",
    title: "Cart Additions",
    description: "Display when items are added to cart",
    example: "3 people added this to cart in the last hour",
    icon: <Package className="h-5 w-5" />,
    category: "ecommerce",
    recommended: ["ecommerce"]
  },
  {
    id: "product-reviews",
    title: "Product Reviews",
    description: "Showcase customer testimonials",
    example: "★★★★★ 'Amazing quality!' - Michael R.",
    icon: <Star className="h-5 w-5" />,
    category: "ecommerce",
    recommended: ["ecommerce"]
  },
  {
    id: "low-stock",
    title: "Low Stock Alert",
    description: "Create urgency with inventory levels",
    example: "Only 5 left in stock! Hurry before it's gone",
    icon: <Zap className="h-5 w-5" />,
    category: "ecommerce",
    recommended: ["ecommerce"]
  },
  {
    id: "visitor-counter",
    title: "Visitor Counter",
    description: "Display current viewer count",
    example: "12 people viewing this product right now",
    icon: <Eye className="h-5 w-5" />,
    category: "ecommerce",
    recommended: ["ecommerce", "saas"]
  },
  {
    id: "recently-viewed",
    title: "Recently Viewed",
    description: "Show recent product views",
    example: "Emma from NYC viewed this 5 minutes ago",
    icon: <Clock className="h-5 w-5" />,
    category: "ecommerce",
    recommended: ["ecommerce"]
  },
  {
    id: "wishlist-additions",
    title: "Wishlist Additions",
    description: "Display wishlist activity",
    example: "Added to 47 wishlists today",
    icon: <Heart className="h-5 w-5" />,
    category: "ecommerce",
    recommended: ["ecommerce"]
  },
  {
    id: "flash-sale",
    title: "Flash Sale Timer",
    description: "Countdown timer for limited offers",
    example: "Sale ends in 2 hours 34 minutes!",
    icon: <TrendingUp className="h-5 w-5" />,
    category: "ecommerce",
    recommended: ["ecommerce"]
  },

  // SaaS/Software (5 types)
  {
    id: "new-signup",
    title: "New Signups",
    description: "Showcase recent user registrations",
    example: "John from Austin just signed up",
    icon: <UserPlus className="h-5 w-5" />,
    category: "saas",
    recommended: ["saas", "software"]
  },
  {
    id: "trial-starts",
    title: "Trial Starts",
    description: "Display new trial activations",
    example: "Alex started a free trial 3 minutes ago",
    icon: <Rocket className="h-5 w-5" />,
    category: "saas",
    recommended: ["saas"]
  },
  {
    id: "upgrade-events",
    title: "Upgrade Events",
    description: "Show plan upgrades",
    example: "Sarah upgraded to Pro Plan",
    icon: <TrendingUp className="h-5 w-5" />,
    category: "saas",
    recommended: ["saas"]
  },
  {
    id: "feature-releases",
    title: "Feature Releases",
    description: "Announce new features",
    example: "🚀 New feature: Advanced Analytics is now live!",
    icon: <Trophy className="h-5 w-5" />,
    category: "saas",
    recommended: ["saas", "software"]
  },
  {
    id: "user-milestones",
    title: "User Milestones",
    description: "Celebrate user achievements",
    example: "Mike completed his first project",
    icon: <Award className="h-5 w-5" />,
    category: "saas",
    recommended: ["saas"]
  },

  // Services/Booking (4 types)
  {
    id: "new-bookings",
    title: "New Bookings",
    description: "Display appointment bookings",
    example: "Jennifer booked a consultation for tomorrow",
    icon: <Calendar className="h-5 w-5" />,
    category: "services",
    recommended: ["services", "consulting"]
  },
  {
    id: "service-requests",
    title: "Service Requests",
    description: "Show incoming service requests",
    example: "Someone from Chicago requested a quote",
    icon: <MessageSquare className="h-5 w-5" />,
    category: "services",
    recommended: ["services"]
  },
  {
    id: "appointments",
    title: "Appointments",
    description: "Display scheduled meetings",
    example: "David scheduled a meeting for next week",
    icon: <Calendar className="h-5 w-5" />,
    category: "services",
    recommended: ["services", "consulting"]
  },
  {
    id: "contact-form",
    title: "Contact Form Submissions",
    description: "Show form submissions",
    example: "New inquiry from London received",
    icon: <FileText className="h-5 w-5" />,
    category: "services",
    recommended: ["services", "agency"]
  },

  // Content/Media (3 types)
  {
    id: "newsletter-signups",
    title: "Newsletter Signups",
    description: "Display new subscribers",
    example: "Emma subscribed to our newsletter",
    icon: <Users className="h-5 w-5" />,
    category: "custom",
    recommended: ["media", "blog"]
  },
  {
    id: "content-downloads",
    title: "Content Downloads",
    description: "Show resource downloads",
    example: "Michael downloaded the free guide",
    icon: <Download className="h-5 w-5" />,
    category: "custom",
    recommended: ["media", "education"]
  },
  {
    id: "blog-comments",
    title: "Blog Comments",
    description: "Display comment activity",
    example: "5 new comments on latest article",
    icon: <MessageSquare className="h-5 w-5" />,
    category: "custom",
    recommended: ["blog", "media"]
  },

  // Social/Community (3 types)
  {
    id: "social-shares",
    title: "Social Shares",
    description: "Show social media activity",
    example: "Article shared on Twitter 24 times today",
    icon: <Share2 className="h-5 w-5" />,
    category: "custom",
    recommended: ["media", "blog"]
  },
  {
    id: "community-joins",
    title: "Community Joins",
    description: "Display new members",
    example: "Alex joined the community",
    icon: <Users className="h-5 w-5" />,
    category: "custom",
    recommended: ["community", "saas"]
  },
  {
    id: "custom-event",
    title: "Custom Events",
    description: "Track any custom action",
    example: "Fully customizable for any use case",
    icon: <Zap className="h-5 w-5" />,
    category: "custom",
    recommended: ["all"]
  },
];

interface CampaignTypeGridProps {
  selectedType: string;
  onSelect: (typeId: string) => void;
  businessType?: string;
}

export function CampaignTypeGrid({ selectedType, onSelect, businessType }: CampaignTypeGridProps) {
  const [activeTab, setActiveTab] = useState<"all" | "ecommerce" | "saas" | "services" | "custom">("all");

  const filteredTypes = activeTab === "all" 
    ? CAMPAIGN_TYPES 
    : CAMPAIGN_TYPES.filter(t => t.category === activeTab);

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="ecommerce">E-commerce</TabsTrigger>
          <TabsTrigger value="saas">SaaS</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="custom">Custom</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredTypes.map((type) => {
              const isRecommended = businessType && type.recommended?.includes(businessType);
              
              return (
                <Card
                  key={type.id}
                  className={cn(
                    "cursor-pointer transition-all hover:shadow-md hover:border-primary/50",
                    selectedType === type.id && "ring-2 ring-primary border-primary"
                  )}
                  onClick={() => onSelect(type.id)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start gap-3">
                      <div className="rounded-lg bg-primary/10 p-2 text-primary">
                        {type.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <CardTitle className="text-base">{type.title}</CardTitle>
                          {isRecommended && (
                            <Badge variant="secondary" className="text-xs">
                              Recommended
                            </Badge>
                          )}
                        </div>
                        <CardDescription className="text-sm mt-1">
                          {type.description}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="text-xs text-muted-foreground italic bg-muted/50 p-2 rounded">
                      "{type.example}"
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
