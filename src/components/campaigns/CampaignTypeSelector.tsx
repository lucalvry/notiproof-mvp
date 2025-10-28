import { ShoppingCart, Users, Trophy, MessageSquare, Zap, Upload, Camera, Calendar, Headphones, Newspaper, TrendingUp, Heart, Award, CreditCard, DollarSign, Shield, GraduationCap } from "lucide-react";
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
  // E-commerce
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
  // SaaS/Agency
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
  // Music & Photography
  {
    id: "portfolio-showcase",
    title: "Portfolio Showcase",
    description: "Display recent work or bookings",
    example: "Jessica just booked a wedding shoot for June 2024",
    icon: <Camera className="h-6 w-6" />,
    category: "Music & Photography",
  },
  {
    id: "event-booking",
    title: "Event Bookings",
    description: "Show concert tickets or session bookings",
    example: "Michael from Austin just booked a portrait session",
    icon: <Calendar className="h-6 w-6" />,
    category: "Music & Photography",
  },
  {
    id: "stream-listener",
    title: "Stream/Listener Count",
    description: "Display current listeners or viewers",
    example: "127 people are listening to your latest album",
    icon: <Headphones className="h-6 w-6" />,
    category: "Music & Photography",
  },
  // News & Media
  {
    id: "breaking-news",
    title: "Breaking News Alert",
    description: "Highlight urgent news updates",
    example: "🔴 BREAKING: Major announcement just published",
    icon: <Newspaper className="h-6 w-6" />,
    category: "News & Media",
  },
  {
    id: "trending-article",
    title: "Trending Articles",
    description: "Show most-read content",
    example: "1.2K people reading: 'Tech Industry Trends 2024'",
    icon: <TrendingUp className="h-6 w-6" />,
    category: "News & Media",
  },
  {
    id: "live-readers",
    title: "Live Reader Count",
    description: "Display active readers on site",
    example: "345 readers online now",
    icon: <Users className="h-6 w-6" />,
    category: "News & Media",
  },
  // NGO & Non-Profit
  {
    id: "donation-notification",
    title: "Recent Donations",
    description: "Show supporter contributions",
    example: "Sarah from Seattle just donated $50 to clean water",
    icon: <Heart className="h-6 w-6" />,
    category: "NGO & Non-Profit",
  },
  {
    id: "impact-milestone",
    title: "Impact Milestones",
    description: "Celebrate goals achieved",
    example: "🎉 We've provided 10,000 meals this month!",
    icon: <Award className="h-6 w-6" />,
    category: "NGO & Non-Profit",
  },
  {
    id: "volunteer-signup",
    title: "Volunteer Sign-ups",
    description: "Show community engagement",
    example: "James just signed up to volunteer at our food drive",
    icon: <Users className="h-6 w-6" />,
    category: "NGO & Non-Profit",
  },
  // Finance & Fintech
  {
    id: "account-signup",
    title: "Account Openings",
    description: "Display new user registrations",
    example: "Mike from Chicago just opened a savings account",
    icon: <CreditCard className="h-6 w-6" />,
    category: "Finance & Fintech",
  },
  {
    id: "transaction-volume",
    title: "Transaction Activity",
    description: "Show platform usage anonymously",
    example: "$2.4M in transactions processed today",
    icon: <DollarSign className="h-6 w-6" />,
    category: "Finance & Fintech",
  },
  {
    id: "security-trust",
    title: "Security & Trust",
    description: "Highlight security features",
    example: "Bank-level encryption • Trusted by 50K+ users",
    icon: <Shield className="h-6 w-6" />,
    category: "Finance & Fintech",
  },
  // Education & E-Learning
  {
    id: "course-enrollment",
    title: "Course Enrollments",
    description: "Show student registrations",
    example: "Emma from London just enrolled in 'Web Development'",
    icon: <GraduationCap className="h-6 w-6" />,
    category: "Education & E-Learning",
  },
  {
    id: "completion-milestone",
    title: "Course Completions",
    description: "Celebrate student achievements",
    example: "🎓 David just completed 'Advanced Python'",
    icon: <Award className="h-6 w-6" />,
    category: "Education & E-Learning",
  },
  {
    id: "live-students",
    title: "Active Learners",
    description: "Display current online students",
    example: "234 students learning right now",
    icon: <Users className="h-6 w-6" />,
    category: "Education & E-Learning",
  },
  // Generic
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
  const categories = [
    "E-commerce",
    "SaaS/Agency",
    "Music & Photography",
    "News & Media",
    "NGO & Non-Profit",
    "Finance & Fintech",
    "Education & E-Learning",
    "Generic"
  ];

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
