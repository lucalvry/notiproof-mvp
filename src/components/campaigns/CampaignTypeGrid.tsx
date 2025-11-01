import { useState } from "react";
import { 
  ShoppingCart, Users, Trophy, MessageSquare, Zap, Upload, Camera, 
  Calendar, Headphones, Newspaper, TrendingUp, Heart, Award, 
  CreditCard, DollarSign, Shield, GraduationCap, Package, Star, 
  Eye, Clock, UserPlus, Rocket, FileText, Download, Share2
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface CampaignType {
  id: string;
  title: string;
  description: string;
  example: string;
  icon: React.ReactNode;
  category: string;
  recommended?: boolean;
}

const CAMPAIGN_TYPES: CampaignType[] = [
  // E-commerce (8 types)
  { id: "recent-purchase", title: "Recent Purchase", description: "Show real-time purchase notifications", example: "Sarah from London just bought Wireless Headphones", icon: <ShoppingCart className="h-5 w-5" />, category: "ecommerce" },
  { id: "cart-additions", title: "Cart Additions", description: "Display when items are added to cart", example: "3 people added this to cart in the last hour", icon: <Package className="h-5 w-5" />, category: "ecommerce" },
  { id: "product-reviews", title: "Product Reviews", description: "Showcase customer testimonials", example: "★★★★★ 'Amazing quality!' - Michael R.", icon: <Star className="h-5 w-5" />, category: "ecommerce", recommended: true },
  { id: "low-stock", title: "Low Stock Alert", description: "Create urgency with inventory levels", example: "Only 5 left in stock! Hurry before it's gone", icon: <Zap className="h-5 w-5" />, category: "ecommerce", recommended: true },
  { id: "visitor-counter", title: "Visitor Counter", description: "Display current viewer count", example: "12 people are viewing this product right now", icon: <Eye className="h-5 w-5" />, category: "ecommerce" },
  { id: "recently-viewed", title: "Recently Viewed", description: "Show recent product views", example: "Emma from NYC viewed this 5 minutes ago", icon: <Clock className="h-5 w-5" />, category: "ecommerce" },
  { id: "wishlist-additions", title: "Wishlist Additions", description: "Display wishlist activity", example: "Added to 47 wishlists today", icon: <Heart className="h-5 w-5" />, category: "ecommerce" },
  { id: "flash-sale", title: "Flash Sale Timer", description: "Countdown timer for limited offers", example: "Sale ends in 2 hours 34 minutes!", icon: <TrendingUp className="h-5 w-5" />, category: "ecommerce" },
  
  // SaaS (5 types)
  { id: "new-signup", title: "New Signup", description: "Showcase recent user registrations", example: "John from Austin just signed up", icon: <UserPlus className="h-5 w-5" />, category: "saas", recommended: true },
  { id: "trial-starts", title: "Trial Starts", description: "Display new trial activations", example: "Alex started a free trial 3 minutes ago", icon: <Rocket className="h-5 w-5" />, category: "saas" },
  { id: "upgrade-events", title: "Upgrade Events", description: "Show plan upgrades", example: "Sarah upgraded to Pro Plan", icon: <TrendingUp className="h-5 w-5" />, category: "saas", recommended: true },
  { id: "feature-releases", title: "Feature Releases", description: "Announce new features", example: "🚀 New feature: Advanced Analytics is now live!", icon: <Trophy className="h-5 w-5" />, category: "saas" },
  { id: "user-milestones", title: "User Milestones", description: "Celebrate user achievements", example: "Mike completed his first project", icon: <Award className="h-5 w-5" />, category: "saas" },
  
  // Services (4 types)
  { id: "new-bookings", title: "New Bookings", description: "Display appointment bookings", example: "Jennifer booked a consultation for tomorrow", icon: <Calendar className="h-5 w-5" />, category: "services", recommended: true },
  { id: "service-requests", title: "Service Requests", description: "Show incoming service requests", example: "Someone from Chicago requested a quote", icon: <MessageSquare className="h-5 w-5" />, category: "services" },
  { id: "appointments", title: "Appointments", description: "Display scheduled meetings", example: "David scheduled a meeting for next week", icon: <Calendar className="h-5 w-5" />, category: "services" },
  { id: "contact-form", title: "Contact Form", description: "Show form submissions", example: "New inquiry from London received", icon: <FileText className="h-5 w-5" />, category: "services" },
  
  // Content (3 types)
  { id: "newsletter-signups", title: "Newsletter Signups", description: "Display new subscribers", example: "Emma subscribed to our newsletter", icon: <Users className="h-5 w-5" />, category: "content" },
  { id: "content-downloads", title: "Content Downloads", description: "Show resource downloads", example: "Michael downloaded the free guide", icon: <Download className="h-5 w-5" />, category: "content", recommended: true },
  { id: "blog-comments", title: "Blog Comments", description: "Display comment activity", example: "5 new comments on latest article", icon: <MessageSquare className="h-5 w-5" />, category: "content" },
  
  // Social (3 types)
  { id: "social-shares", title: "Social Shares", description: "Show social media activity", example: "Article shared on Twitter 24 times today", icon: <Share2 className="h-5 w-5" />, category: "social" },
  { id: "community-joins", title: "Community Joins", description: "Display new members", example: "Alex joined the community", icon: <Users className="h-5 w-5" />, category: "social" },
  { id: "custom-event", title: "Custom Event", description: "Track any custom action", example: "Someone just completed a custom action", icon: <Zap className="h-5 w-5" />, category: "social" },
];

interface CampaignTypeGridProps {
  selectedType?: string;
  onSelect: (type: string) => void;
  businessType?: string;
}

export function CampaignTypeGrid({ selectedType, onSelect, businessType }: CampaignTypeGridProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  const filteredTypes = CAMPAIGN_TYPES.filter((type) => {
    const matchesSearch = 
      type.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      type.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeTab === "all" || type.category === activeTab;
    return matchesSearch && matchesCategory;
  });

  const getCategoryCount = (category: string) => {
    return CAMPAIGN_TYPES.filter(t => t.category === category).length;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Input
          placeholder="Search campaign types..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm"
        />
        <span className="text-sm text-muted-foreground">
          {filteredTypes.length} {filteredTypes.length === 1 ? 'type' : 'types'}
        </span>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="all">All ({CAMPAIGN_TYPES.length})</TabsTrigger>
          <TabsTrigger value="ecommerce">E-commerce ({getCategoryCount('ecommerce')})</TabsTrigger>
          <TabsTrigger value="saas">SaaS ({getCategoryCount('saas')})</TabsTrigger>
          <TabsTrigger value="services">Services ({getCategoryCount('services')})</TabsTrigger>
          <TabsTrigger value="content">Content ({getCategoryCount('content')})</TabsTrigger>
          <TabsTrigger value="social">Social ({getCategoryCount('social')})</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {filteredTypes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground">No campaign types found</p>
              <p className="text-sm text-muted-foreground mt-1">Try adjusting your search</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredTypes.map((type) => (
                <Card
                  key={type.id}
                  className={cn(
                    "cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02]",
                    selectedType === type.id && "ring-2 ring-primary shadow-lg"
                  )}
                  onClick={() => onSelect(type.id)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10 text-primary">
                          {type.icon}
                        </div>
                        <div className="flex-1">
                          <CardTitle className="text-sm leading-tight">{type.title}</CardTitle>
                        </div>
                      </div>
                      {type.recommended && (
                        <Badge variant="secondary" className="text-xs">
                          Popular
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-3">
                    <CardDescription className="text-xs line-clamp-2">
                      {type.description}
                    </CardDescription>
                    <div className="text-xs text-muted-foreground italic bg-muted/50 p-2.5 rounded-md border">
                      "{type.example}"
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
