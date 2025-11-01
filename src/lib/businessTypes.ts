import { Database } from "@/integrations/supabase/types";
import { 
  ShoppingCart, 
  Laptop, 
  Briefcase, 
  FileText, 
  GraduationCap,
  Heart,
  Home,
  Building,
  Store,
  Dumbbell,
  Sparkles,
  UtensilsCrossed,
  Plane,
  Landmark,
  Cpu,
  Users,
  Megaphone,
  Calendar,
  HandHeart,
  Car,
  Factory,
  Tv,
  Scale
} from "lucide-react";
import { z } from "zod";

// Import business type from database schema
export type BusinessType = Database['public']['Enums']['business_type'];

// Metadata interface for each business type
export interface BusinessTypeMetadata {
  value: BusinessType;
  label: string;
  icon: string;
  description: string;
  category: 'commerce' | 'services' | 'local' | 'professional' | 'creative' | 'social';
  popularTemplates: string[];
  keywords: string[];
  isPopular?: boolean;
}

// Complete metadata for all 23 business types
export const BUSINESS_TYPES_METADATA: BusinessTypeMetadata[] = [
  // Commerce
  {
    value: 'ecommerce',
    label: 'E-Commerce',
    icon: 'ShoppingCart',
    description: 'Online stores and marketplaces',
    category: 'commerce',
    popularTemplates: ['purchase', 'cart_abandonment', 'product_view'],
    keywords: ['shop', 'store', 'buy', 'sell', 'cart', 'checkout', 'shopify', 'woocommerce'],
    isPopular: true,
  },
  {
    value: 'retail',
    label: 'Retail',
    icon: 'Store',
    description: 'Physical retail stores',
    category: 'commerce',
    popularTemplates: ['purchase', 'signup', 'visit'],
    keywords: ['retail', 'shop', 'store', 'brick', 'mortar'],
  },
  {
    value: 'automotive',
    label: 'Automotive',
    icon: 'Car',
    description: 'Car dealerships and automotive services',
    category: 'commerce',
    popularTemplates: ['booking', 'purchase', 'inquiry'],
    keywords: ['car', 'auto', 'vehicle', 'dealer', 'garage'],
  },
  // Services
  {
    value: 'saas',
    label: 'SaaS',
    icon: 'Laptop',
    description: 'Software as a Service platforms',
    category: 'services',
    popularTemplates: ['signup', 'trial_start', 'upgrade'],
    keywords: ['software', 'app', 'platform', 'cloud', 'subscription', 'saas'],
    isPopular: true,
  },
  {
    value: 'services',
    label: 'Services',
    icon: 'Briefcase',
    description: 'Professional and business services',
    category: 'services',
    popularTemplates: ['booking', 'inquiry', 'consultation'],
    keywords: ['service', 'professional', 'business', 'consultant'],
    isPopular: true,
  },
  {
    value: 'consulting',
    label: 'Consulting',
    icon: 'Users',
    description: 'Consulting and advisory services',
    category: 'services',
    popularTemplates: ['booking', 'inquiry', 'consultation'],
    keywords: ['consulting', 'consultant', 'advisor', 'expert', 'coach'],
  },
  {
    value: 'marketing_agency',
    label: 'Marketing Agency',
    icon: 'Megaphone',
    description: 'Digital marketing and advertising agencies',
    category: 'services',
    popularTemplates: ['signup', 'inquiry', 'booking'],
    keywords: ['marketing', 'agency', 'advertising', 'digital', 'seo', 'social'],
  },
  {
    value: 'technology',
    label: 'Technology',
    icon: 'Cpu',
    description: 'Technology companies and IT services',
    category: 'services',
    popularTemplates: ['signup', 'demo', 'inquiry'],
    keywords: ['tech', 'technology', 'it', 'software', 'hardware'],
  },
  // Local Business
  {
    value: 'hospitality',
    label: 'Hospitality',
    icon: 'Building',
    description: 'Hotels, restaurants, and hospitality',
    category: 'local',
    popularTemplates: ['booking', 'reservation', 'review'],
    keywords: ['hotel', 'restaurant', 'hospitality', 'accommodation', 'lodge'],
  },
  {
    value: 'fitness',
    label: 'Fitness',
    icon: 'Dumbbell',
    description: 'Gyms, fitness centers, and wellness',
    category: 'local',
    popularTemplates: ['signup', 'booking', 'membership'],
    keywords: ['gym', 'fitness', 'workout', 'exercise', 'health', 'wellness'],
  },
  {
    value: 'beauty',
    label: 'Beauty',
    icon: 'Sparkles',
    description: 'Salons, spas, and beauty services',
    category: 'local',
    popularTemplates: ['booking', 'appointment', 'review'],
    keywords: ['salon', 'spa', 'beauty', 'hair', 'nails', 'massage'],
  },
  {
    value: 'food_beverage',
    label: 'Food & Beverage',
    icon: 'UtensilsCrossed',
    description: 'Restaurants, cafes, and food services',
    category: 'local',
    popularTemplates: ['order', 'reservation', 'review'],
    keywords: ['restaurant', 'cafe', 'food', 'beverage', 'dining', 'takeout'],
  },
  {
    value: 'travel',
    label: 'Travel',
    icon: 'Plane',
    description: 'Travel agencies and tourism',
    category: 'local',
    popularTemplates: ['booking', 'inquiry', 'review'],
    keywords: ['travel', 'tourism', 'vacation', 'trip', 'tour', 'flight'],
  },
  // Professional
  {
    value: 'healthcare',
    label: 'Healthcare',
    icon: 'Heart',
    description: 'Medical and healthcare services',
    category: 'professional',
    popularTemplates: ['appointment', 'booking', 'inquiry'],
    keywords: ['health', 'medical', 'doctor', 'clinic', 'hospital', 'care'],
  },
  {
    value: 'real_estate',
    label: 'Real Estate',
    icon: 'Home',
    description: 'Property sales and real estate',
    category: 'professional',
    popularTemplates: ['inquiry', 'viewing', 'signup'],
    keywords: ['real estate', 'property', 'house', 'apartment', 'realtor'],
  },
  {
    value: 'finance',
    label: 'Finance',
    icon: 'Landmark',
    description: 'Financial services and banking',
    category: 'professional',
    popularTemplates: ['signup', 'application', 'consultation'],
    keywords: ['finance', 'bank', 'financial', 'investment', 'loan', 'insurance'],
  },
  {
    value: 'legal',
    label: 'Legal',
    icon: 'Scale',
    description: 'Law firms and legal services',
    category: 'professional',
    popularTemplates: ['consultation', 'inquiry', 'booking'],
    keywords: ['legal', 'law', 'attorney', 'lawyer', 'court'],
  },
  {
    value: 'manufacturing',
    label: 'Manufacturing',
    icon: 'Factory',
    description: 'Manufacturing and production',
    category: 'professional',
    popularTemplates: ['inquiry', 'order', 'quote'],
    keywords: ['manufacturing', 'factory', 'production', 'industrial'],
  },
  // Creative & Social
  {
    value: 'blog',
    label: 'Blog/Content',
    icon: 'FileText',
    description: 'Blogs and content platforms',
    category: 'creative',
    popularTemplates: ['signup', 'newsletter', 'comment'],
    keywords: ['blog', 'content', 'article', 'post', 'writer', 'journalism'],
    isPopular: true,
  },
  {
    value: 'media',
    label: 'Media',
    icon: 'Tv',
    description: 'Media and entertainment',
    category: 'creative',
    popularTemplates: ['signup', 'subscription', 'view'],
    keywords: ['media', 'entertainment', 'video', 'streaming', 'content'],
  },
  {
    value: 'events',
    label: 'Events',
    icon: 'Calendar',
    description: 'Event planning and management',
    category: 'creative',
    popularTemplates: ['registration', 'ticket', 'signup'],
    keywords: ['event', 'conference', 'meetup', 'workshop', 'seminar'],
  },
  {
    value: 'education',
    label: 'Education',
    icon: 'GraduationCap',
    description: 'Schools, courses, and e-learning',
    category: 'social',
    popularTemplates: ['signup', 'enrollment', 'course_completion'],
    keywords: ['education', 'school', 'course', 'learning', 'training', 'academy'],
    isPopular: true,
  },
  {
    value: 'ngo',
    label: 'Non-Profit/NGO',
    icon: 'HandHeart',
    description: 'Non-profit organizations',
    category: 'social',
    popularTemplates: ['donation', 'signup', 'volunteer'],
    keywords: ['nonprofit', 'ngo', 'charity', 'foundation', 'donation'],
  },
];

// Utility Functions

/**
 * Get all business types
 */
export function getAllBusinessTypes(): BusinessTypeMetadata[] {
  return BUSINESS_TYPES_METADATA;
}

/**
 * Get popular business types (for onboarding)
 */
export function getPopularBusinessTypes(): BusinessTypeMetadata[] {
  return BUSINESS_TYPES_METADATA.filter(type => type.isPopular);
}

/**
 * Get business type label
 */
export function getBusinessTypeLabel(value: BusinessType): string {
  const type = BUSINESS_TYPES_METADATA.find(t => t.value === value);
  return type?.label || value.replace(/_/g, ' ');
}

/**
 * Get business type icon name
 */
export function getBusinessTypeIcon(value: BusinessType): string {
  const type = BUSINESS_TYPES_METADATA.find(t => t.value === value);
  return type?.icon || 'Briefcase';
}

/**
 * Get business types grouped by category
 */
export function getBusinessTypesByCategory(): Record<string, BusinessTypeMetadata[]> {
  return BUSINESS_TYPES_METADATA.reduce((acc, type) => {
    if (!acc[type.category]) {
      acc[type.category] = [];
    }
    acc[type.category].push(type);
    return acc;
  }, {} as Record<string, BusinessTypeMetadata[]>);
}

/**
 * Validate if a string is a valid business type
 */
export function isValidBusinessType(value: string): value is BusinessType {
  return BUSINESS_TYPES_METADATA.some(type => type.value === value);
}

/**
 * Suggest business type based on domain/keywords
 */
export function suggestBusinessType(domain: string, description?: string): BusinessType | null {
  const searchText = `${domain} ${description || ''}`.toLowerCase();
  
  // Find the first business type that matches any keyword
  for (const type of BUSINESS_TYPES_METADATA) {
    if (type.keywords.some(keyword => searchText.includes(keyword))) {
      return type.value;
    }
  }
  
  return null;
}

/**
 * Get category label
 */
export function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    commerce: 'Commerce & Retail',
    services: 'Services & Software',
    local: 'Local Business',
    professional: 'Professional Services',
    creative: 'Creative & Media',
    social: 'Social & Education',
  };
  return labels[category] || category;
}

// Zod schema for validation
export const businessTypeSchema = z.enum([
  'ecommerce',
  'saas',
  'services',
  'blog',
  'education',
  'healthcare',
  'real_estate',
  'hospitality',
  'retail',
  'fitness',
  'beauty',
  'food_beverage',
  'travel',
  'finance',
  'technology',
  'consulting',
  'marketing_agency',
  'events',
  'ngo',
  'automotive',
  'manufacturing',
  'media',
  'legal',
] as const);
