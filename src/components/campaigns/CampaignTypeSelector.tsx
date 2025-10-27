import { ShoppingCart, Users, Trophy, MessageSquare, Zap, Upload } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface CampaignType {
  id: string;
  title: string;
  description: string;
  example: string;
  icon: React.ReactNode;
  category: string;
}

const CAMPAIGN_TYPES: CampaignType[] = [
  {
    id: "recent-purchase",
    title: "Recent Purchase",
    description: "Show real-time purchase notifications",
    example: "Sarah from London just bought Cozy Hoodie",
    icon: <ShoppingCart className="h-6 w-6" />,
    category: "E-commerce",
  },
  {
    id: "low-stock",
    title: "Low Stock Alert",
    description: "Create urgency with inventory levels",
    example: "Only 3 left in stock! Hurry before it's gone",
    icon: <Zap className="h-6 w-6" />,
    category: "E-commerce",
  },
  {
    id: "visitor-counter",
    title: "Visitor Counter",
    description: "Display current viewer count",
    example: "12 people are viewing this product right now",
    icon: <Users className="h-6 w-6" />,
    category: "E-commerce",
  },
  {
    id: "new-signup",
    title: "New Signup",
    description: "Showcase recent user registrations",
    example: "John from NYC just signed up • 2 minutes ago",
    icon: <Users className="h-6 w-6" />,
    category: "SaaS/Agency",
  },
  {
    id: "milestone",
    title: "Milestone Proof",
    description: "Highlight achievements and milestones",
    example: "🎉 We just reached 10,000 happy customers!",
    icon: <Trophy className="h-6 w-6" />,
    category: "SaaS/Agency",
  },
  {
    id: "testimonial",
    title: "Customer Testimonial",
    description: "Display rotating customer reviews",
    example: "\"This product changed my business!\" - Mike S.",
    icon: <MessageSquare className="h-6 w-6" />,
    category: "SaaS/Agency",
  },
  {
    id: "custom-event",
    title: "Custom Event",
    description: "Track any custom action or event",
    example: "Someone just downloaded the free guide",
    icon: <Zap className="h-6 w-6" />,
    category: "Generic",
  },
  {
    id: "manual-upload",
    title: "Manual Upload",
    description: "Upload your own data via CSV",
    example: "Display curated messages from your data",
    icon: <Upload className="h-6 w-6" />,
    category: "Generic",
  },
];

interface CampaignTypeSelectorProps {
  selectedType: string;
  onSelect: (type: string) => void;
}

export function CampaignTypeSelector({ selectedType, onSelect }: CampaignTypeSelectorProps) {
  const categories = ["E-commerce", "SaaS/Agency", "Generic"];

  return (
    <div className="space-y-8">
      {categories.map((category) => (
        <div key={category}>
          <h3 className="text-lg font-semibold mb-4">{category}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {CAMPAIGN_TYPES.filter((type) => type.category === category).map((type) => (
              <Card
                key={type.id}
                className={cn(
                  "cursor-pointer transition-all hover:shadow-md",
                  selectedType === type.id && "ring-2 ring-primary"
                )}
                onClick={() => onSelect(type.id)}
              >
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                      {type.icon}
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-base">{type.title}</CardTitle>
                      <CardDescription className="text-sm">{type.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground italic bg-muted p-3 rounded-md">
                    {type.example}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
