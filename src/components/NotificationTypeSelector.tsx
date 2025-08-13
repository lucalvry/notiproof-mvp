import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Star, ShoppingCart, MessageSquare, Download, Calendar, Users, Zap, Gift, TrendingUp } from 'lucide-react';

interface NotificationType {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  category: 'social-proof' | 'urgency' | 'engagement' | 'conversion';
  examples: string[];
  isPremium?: boolean;
}

const notificationTypes: NotificationType[] = [
  {
    id: 'recent-purchase',
    name: 'Recent Purchase',
    description: 'Show recent customer purchases to build trust',
    icon: <ShoppingCart className="h-4 w-4" />,
    category: 'social-proof',
    examples: [
      'John from New York just purchased Pro Plan',
      'Sarah M. bought Premium Course 2 minutes ago',
      'Someone from London purchased Starter Kit'
    ]
  },
  {
    id: 'signup-notification',
    name: 'New Signup',
    description: 'Display new user registrations and sign-ups',
    icon: <Users className="h-4 w-4" />,
    category: 'social-proof',
    examples: [
      'Welcome! 3 people joined in the last hour',
      'Mike from California just signed up',
      'New member from Germany joined today'
    ]
  },
  {
    id: 'review-testimonial',
    name: 'Reviews & Testimonials',
    description: 'Showcase customer reviews and testimonials',
    icon: <Star className="h-4 w-4" />,
    category: 'social-proof',
    examples: [
      '"Amazing product!" - 5 stars from Emma',
      'Lisa rated us 5/5 stars ⭐⭐⭐⭐⭐',
      '"Best service ever" - David K.'
    ]
  },
  {
    id: 'live-visitors',
    name: 'Live Visitor Count',
    description: 'Show how many people are currently viewing',
    icon: <TrendingUp className="h-4 w-4" />,
    category: 'social-proof',
    examples: [
      '12 people are viewing this page right now',
      '156 visitors in the last hour',
      'Join 2,847 others exploring our site'
    ]
  },
  {
    id: 'limited-offer',
    name: 'Limited Time Offer',
    description: 'Create urgency with time-sensitive deals',
    icon: <Zap className="h-4 w-4" />,
    category: 'urgency',
    examples: [
      '⏰ 50% off ends in 2 hours!',
      'Last chance: Sale ends at midnight',
      'Only 3 hours left for early bird pricing'
    ]
  },
  {
    id: 'stock-alert',
    name: 'Low Stock Alert',
    description: 'Show limited inventory to encourage action',
    icon: <Gift className="h-4 w-4" />,
    category: 'urgency',
    examples: [
      'Only 3 items left in stock!',
      'Hurry! Last 5 available',
      'Limited quantity remaining'
    ]
  },
  {
    id: 'download-notification',
    name: 'Recent Download',
    description: 'Display recent file or resource downloads',
    icon: <Download className="h-4 w-4" />,
    category: 'engagement',
    examples: [
      'Free guide downloaded 47 times today',
      'Alex just downloaded the pricing sheet',
      'New: 12 people downloaded our ebook'
    ]
  },
  {
    id: 'booking-appointment',
    name: 'Recent Booking',
    description: 'Show recent appointments or reservations',
    icon: <Calendar className="h-4 w-4" />,
    category: 'conversion',
    examples: [
      'Demo booked for tomorrow at 2 PM',
      'Maria scheduled a consultation',
      '5 appointments booked this week'
    ]
  },
  {
    id: 'contact-form',
    name: 'Contact Submission',
    description: 'Display recent contact form submissions',
    icon: <MessageSquare className="h-4 w-4" />,
    category: 'engagement',
    examples: [
      'New inquiry from potential customer',
      'Quote request from Boston company',
      'Support ticket submitted'
    ]
  },
  {
    id: 'milestone-celebration',
    name: 'Milestone Celebration',
    description: 'Celebrate company achievements and milestones',
    icon: <CheckCircle className="h-4 w-4" />,
    category: 'social-proof',
    examples: [
      '🎉 We just reached 10,000 customers!',
      'Milestone: 1 million downloads achieved',
      'Celebrating 5 years in business!'
    ],
    isPremium: true
  }
];

const categories = [
  { id: 'all', name: 'All Types', color: 'default' },
  { id: 'social-proof', name: 'Social Proof', color: 'blue' },
  { id: 'urgency', name: 'Urgency', color: 'red' },
  { id: 'engagement', name: 'Engagement', color: 'green' },
  { id: 'conversion', name: 'Conversion', color: 'purple' }
] as const;

interface NotificationTypeSelectorProps {
  selectedTypes: string[];
  onSelectionChange: (types: string[]) => void;
  maxSelections?: number;
}

export const NotificationTypeSelector = ({ 
  selectedTypes, 
  onSelectionChange, 
  maxSelections = 3 
}: NotificationTypeSelectorProps) => {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [previewType, setPreviewType] = useState<string | null>(null);

  const filteredTypes = activeCategory === 'all' 
    ? notificationTypes 
    : notificationTypes.filter(type => type.category === activeCategory);

  const toggleSelection = (typeId: string) => {
    if (selectedTypes.includes(typeId)) {
      onSelectionChange(selectedTypes.filter(id => id !== typeId));
    } else if (selectedTypes.length < maxSelections) {
      onSelectionChange([...selectedTypes, typeId]);
    }
  };

  const getCategoryColor = (category: string) => {
    const categoryConfig = categories.find(c => c.id === category);
    return categoryConfig?.color || 'default';
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Choose Notification Types</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Select up to {maxSelections} types that match your business goals. 
          {selectedTypes.length > 0 && ` (${selectedTypes.length}/${maxSelections} selected)`}
        </p>
        
        {/* Category Filters */}
        <div className="flex flex-wrap gap-2 mb-4">
          {categories.map((category) => (
            <Button
              key={category.id}
              variant={activeCategory === category.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveCategory(category.id)}
            >
              {category.name}
            </Button>
          ))}
        </div>
      </div>

      {/* Notification Types Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {filteredTypes.map((type) => {
          const isSelected = selectedTypes.includes(type.id);
          const isDisabled = !isSelected && selectedTypes.length >= maxSelections;
          
          return (
            <Card 
              key={type.id}
              className={`cursor-pointer transition-all duration-200 ${
                isSelected 
                  ? 'ring-2 ring-primary border-primary bg-primary/5' 
                  : isDisabled
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:shadow-md hover:border-primary/50'
              }`}
              onClick={() => !isDisabled && toggleSelection(type.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'
                    }`}>
                      {type.icon}
                    </div>
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        {type.name}
                        {type.isPremium && (
                          <Badge variant="secondary" className="text-xs">
                            Premium
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription className="text-sm">
                        {type.description}
                      </CardDescription>
                    </div>
                  </div>
                  {isSelected && (
                    <CheckCircle className="h-5 w-5 text-primary" />
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  <Badge 
                    variant="outline" 
                    className={`text-xs`}
                  >
                    {categories.find(c => c.id === type.category)?.name}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                {/* Preview Examples */}
                <div className="space-y-2">
                  <div className="text-xs font-medium text-muted-foreground">Examples:</div>
                  <div className="space-y-1">
                    {type.examples.slice(0, 2).map((example, index) => (
                      <div 
                        key={index}
                        className="text-xs bg-muted/50 p-2 rounded border-l-2 border-primary/30"
                      >
                        {example}
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {selectedTypes.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="text-muted-foreground mb-2">No notification types selected</div>
              <div className="text-sm text-muted-foreground">
                Choose notification types that align with your business goals
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};