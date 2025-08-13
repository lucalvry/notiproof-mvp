import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Laptop, Wrench, GraduationCap, Building, FileText, Heart, Calendar } from 'lucide-react';

interface CampaignPreset {
  id: string;
  name: string;
  industry: string;
  icon: React.ReactNode;
  description: string;
  templates: string[];
  defaultSettings: {
    notificationTypes: string[];
    displayRules: any;
    styleConfig: any;
  };
  tags: string[];
}

const campaignPresets: CampaignPreset[] = [
  {
    id: 'ecommerce-sales',
    name: 'E-commerce Sales Booster',
    industry: 'E-commerce',
    icon: <ShoppingCart className="h-5 w-5" />,
    description: 'Drive more sales with purchase notifications, low stock alerts, and cart abandonment reminders',
    templates: ['notification-popup', 'urgency-timer', 'social-proof'],
    defaultSettings: {
      notificationTypes: ['purchase', 'stock-alert', 'cart-abandonment'],
      displayRules: {
        show_duration_ms: 6000,
        interval_ms: 10000,
        max_per_page: 3,
        triggers: { min_time_on_page_ms: 5000, exit_intent: true }
      },
      styleConfig: { position: 'bottom-right', color: '#10B981' }
    },
    tags: ['High Converting', 'Popular']
  },
  {
    id: 'saas-signups',
    name: 'SaaS Signup Accelerator',
    industry: 'SaaS',
    icon: <Laptop className="h-5 w-5" />,
    description: 'Increase signups with live user activity, trial conversions, and feature highlights',
    templates: ['live-activity', 'notification-popup', 'testimonial-popup'],
    defaultSettings: {
      notificationTypes: ['signup', 'trial-conversion', 'feature-usage'],
      displayRules: {
        show_duration_ms: 5000,
        interval_ms: 12000,
        max_per_page: 4,
        triggers: { min_time_on_page_ms: 3000, scroll_depth_pct: 25 }
      },
      styleConfig: { position: 'bottom-left', color: '#3B82F6' }
    },
    tags: ['SaaS Optimized', 'Trial Focused']
  },
  {
    id: 'service-bookings',
    name: 'Service Booking Engine',
    industry: 'Service Business',
    icon: <Wrench className="h-5 w-5" />,
    description: 'Boost bookings with recent appointments, availability alerts, and customer testimonials',
    templates: ['notification-popup', 'testimonial-popup', 'urgency-timer'],
    defaultSettings: {
      notificationTypes: ['booking', 'consultation', 'testimonial'],
      displayRules: {
        show_duration_ms: 7000,
        interval_ms: 15000,
        max_per_page: 2,
        triggers: { min_time_on_page_ms: 4000 }
      },
      styleConfig: { position: 'top-right', color: '#F59E0B' }
    },
    tags: ['Local Business', 'Appointment Based']
  },
  {
    id: 'education-enrollment',
    name: 'Course Enrollment Maximizer',
    industry: 'Education',
    icon: <GraduationCap className="h-5 w-5" />,
    description: 'Increase course enrollments with student achievements, course popularity, and limited spots',
    templates: ['notification-popup', 'social-proof', 'urgency-timer'],
    defaultSettings: {
      notificationTypes: ['enrollment', 'course-completion', 'achievement'],
      displayRules: {
        show_duration_ms: 8000,
        interval_ms: 20000,
        max_per_page: 3,
        triggers: { min_time_on_page_ms: 6000, scroll_depth_pct: 50 }
      },
      styleConfig: { position: 'bottom-left', color: '#8B5CF6' }
    },
    tags: ['Education', 'Course Sales']
  },
  {
    id: 'agency-leads',
    name: 'Agency Lead Generator',
    industry: 'Agency',
    icon: <Building className="h-5 w-5" />,
    description: 'Generate more leads with client success stories, consultation bookings, and case studies',
    templates: ['testimonial-popup', 'notification-popup', 'live-activity'],
    defaultSettings: {
      notificationTypes: ['consultation', 'case-study-view', 'client-success'],
      displayRules: {
        show_duration_ms: 6000,
        interval_ms: 18000,
        max_per_page: 2,
        triggers: { min_time_on_page_ms: 5000, scroll_depth_pct: 30 }
      },
      styleConfig: { position: 'top-left', color: '#EF4444' }
    },
    tags: ['B2B Focused', 'Lead Generation']
  },
  {
    id: 'content-engagement',
    name: 'Content Engagement Booster',
    industry: 'Content/Blog',
    icon: <FileText className="h-5 w-5" />,
    description: 'Increase engagement with popular posts, newsletter signups, and reader activity',
    templates: ['live-activity', 'notification-popup', 'social-proof'],
    defaultSettings: {
      notificationTypes: ['newsletter-signup', 'popular-post', 'reader-activity'],
      displayRules: {
        show_duration_ms: 4000,
        interval_ms: 25000,
        max_per_page: 1,
        triggers: { scroll_depth_pct: 70 }
      },
      styleConfig: { position: 'bottom-right', color: '#06B6D4' }
    },
    tags: ['Content Marketing', 'Engagement']
  },
  {
    id: 'nonprofit-donations',
    name: 'Nonprofit Donation Driver',
    industry: 'Non-Profit',
    icon: <Heart className="h-5 w-5" />,
    description: 'Increase donations with recent contributions, impact stories, and urgency campaigns',
    templates: ['notification-popup', 'testimonial-popup', 'urgency-timer'],
    defaultSettings: {
      notificationTypes: ['donation', 'impact-story', 'volunteer-signup'],
      displayRules: {
        show_duration_ms: 9000,
        interval_ms: 30000,
        max_per_page: 2,
        triggers: { min_time_on_page_ms: 8000, scroll_depth_pct: 40 }
      },
      styleConfig: { position: 'bottom-left', color: '#EC4899' }
    },
    tags: ['Nonprofit', 'Impact Driven']
  },
  {
    id: 'event-registration',
    name: 'Event Registration Accelerator',
    industry: 'Events',
    icon: <Calendar className="h-5 w-5" />,
    description: 'Boost registrations with live attendee counts, early bird alerts, and speaker announcements',
    templates: ['urgency-timer', 'live-activity', 'notification-popup'],
    defaultSettings: {
      notificationTypes: ['registration', 'attendee-count', 'speaker-announcement'],
      displayRules: {
        show_duration_ms: 7000,
        interval_ms: 12000,
        max_per_page: 4,
        triggers: { min_time_on_page_ms: 3000, exit_intent: true }
      },
      styleConfig: { position: 'top-right', color: '#F97316' }
    },
    tags: ['Events', 'Time Sensitive']
  }
];

interface CampaignPresetsProps {
  onSelectPreset: (preset: CampaignPreset) => void;
}

export const CampaignPresets = ({ onSelectPreset }: CampaignPresetsProps) => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Industry Campaign Presets</h2>
        <p className="text-muted-foreground">
          Choose a pre-configured campaign optimized for your industry to get started quickly
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {campaignPresets.map((preset) => (
          <Card key={preset.id} className="group cursor-pointer transition-all hover:shadow-lg hover:border-primary/50">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  {preset.icon}
                </div>
                <div>
                  <CardTitle className="text-base group-hover:text-primary transition-colors">
                    {preset.name}
                  </CardTitle>
                  <div className="text-sm text-muted-foreground">{preset.industry}</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {preset.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <CardDescription className="text-sm">
                {preset.description}
              </CardDescription>
              
              <div>
                <div className="text-sm font-medium mb-2">Included Templates:</div>
                <div className="flex flex-wrap gap-1">
                  {preset.templates.map((template) => (
                    <Badge key={template} variant="outline" className="text-xs">
                      {template.replace('-', ' ')}
                    </Badge>
                  ))}
                </div>
              </div>

              <Button 
                className="w-full" 
                variant="outline"
                onClick={() => onSelectPreset(preset)}
              >
                Use This Preset
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};