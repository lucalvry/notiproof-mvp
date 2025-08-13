import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Star, Download, Search, Filter, Upload, Heart, TrendingUp, Crown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface MarketplaceTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  template_config: any;
  style_config: any;
  display_rules: any;
  preview_image?: string;
  download_count: number;
  rating_average: number;
  rating_count: number;
  is_featured: boolean;
  price_cents: number;
  created_by: string;
  created_at: string;
}

interface TemplateRating {
  rating: number;
  review?: string;
}

const categories = [
  { value: 'all', label: 'All Categories' },
  { value: 'ecommerce', label: 'E-commerce' },
  { value: 'saas', label: 'SaaS' },
  { value: 'education', label: 'Education' },
  { value: 'nonprofit', label: 'Non-Profit' },
  { value: 'agency', label: 'Agency' },
  { value: 'blog', label: 'Blog/Content' },
  { value: 'general', label: 'General' }
];

export const TemplateMarketplace = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [templates, setTemplates] = useState<MarketplaceTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('featured');
  const [showUploadModal, setShowUploadModal] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, [selectedCategory, sortBy]);

  const loadTemplates = async () => {
    try {
      // Temporarily use mock data until Supabase types are updated
      const mockTemplates = [
        {
          id: '1',
          name: 'E-commerce Purchase Popup',
          description: 'Show recent purchases to boost social proof and increase conversions',
          category: 'ecommerce',
          tags: ['purchase', 'social proof', 'conversion'],
          template_config: {},
          style_config: { position: 'bottom-right', color: '#10B981' },
          display_rules: { show_duration_ms: 5000 },
          download_count: 1250,
          rating_average: 4.8,
          rating_count: 86,
          is_featured: true,
          price_cents: 0,
          created_by: 'notiproof-team',
          created_at: new Date().toISOString()
        },
        {
          id: '2',
          name: 'SaaS Signup Notifications',
          description: 'Display recent signups and trial conversions for SaaS platforms',
          category: 'saas',
          tags: ['signup', 'saas', 'growth'],
          template_config: {},
          style_config: { position: 'bottom-left', color: '#3B82F6' },
          display_rules: { show_duration_ms: 6000 },
          download_count: 890,
          rating_average: 4.6,
          rating_count: 52,
          is_featured: false,
          price_cents: 0,
          created_by: 'community',
          created_at: new Date().toISOString()
        }
      ];
      
      setTemplates(mockTemplates);
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (template: MarketplaceTemplate) => {
    if (!profile) {
      toast({
        title: "Authentication required",
        description: "Please log in to download templates",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Template downloaded!",
      description: `${template.name} has been added to your widgets.`,
    });
  };

  const handleRating = async (templateId: string, rating: number, review?: string) => {
    if (!profile) return;

    toast({
      title: "Rating submitted",
      description: "Thank you for your feedback!",
    });
  };

  const filteredTemplates = templates.filter(template =>
    template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const TemplateCard = ({ template }: { template: MarketplaceTemplate }) => (
    <Card className="group hover:shadow-lg transition-all duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <CardTitle className="text-lg group-hover:text-primary transition-colors">
                {template.name}
              </CardTitle>
              {template.is_featured && (
                <Crown className="h-4 w-4 text-yellow-500" />
              )}
              {template.price_cents === 0 && (
                <Badge variant="secondary">Free</Badge>
              )}
            </div>
            <CardDescription className="line-clamp-2">
              {template.description}
            </CardDescription>
          </div>
        </div>

        <div className="flex flex-wrap gap-1 mt-2">
          {template.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
          {template.tags.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{template.tags.length - 3} more
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Preview Area */}
        <div className="relative bg-muted rounded-lg p-6 min-h-[120px] overflow-hidden">
          <div className="absolute bottom-4 right-4 p-3 bg-background border rounded-lg shadow-lg max-w-xs">
            <div className="text-sm">
              🛒 Template Preview: {template.name}
            </div>
          </div>
          <div className="text-center text-muted-foreground text-xs">
            Template Preview
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <Star className="h-3 w-3 text-yellow-500" />
              <span>{template.rating_average?.toFixed(1) || 'N/A'}</span>
              <span className="text-muted-foreground">({template.rating_count})</span>
            </div>
            <div className="flex items-center gap-1">
              <Download className="h-3 w-3 text-muted-foreground" />
              <span>{template.download_count}</span>
            </div>
          </div>
          <Badge variant="outline" className="text-xs">
            {template.category}
          </Badge>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button 
            className="flex-1"
            onClick={() => handleDownload(template)}
          >
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
          <Button 
            variant="outline"
            size="icon"
            onClick={() => handleRating(template.id, 5)}
          >
            <Heart className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Template Marketplace</h1>
          <p className="text-muted-foreground">
            Discover and download community-created templates
          </p>
        </div>
        <Button onClick={() => setShowUploadModal(true)}>
          <Upload className="h-4 w-4 mr-2" />
          Upload Template
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Discover Templates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search templates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.value} value={category.value}>
                    {category.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="featured">Featured</SelectItem>
                <SelectItem value="popular">Most Popular</SelectItem>
                <SelectItem value="rating">Highest Rated</SelectItem>
                <SelectItem value="newest">Newest</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Templates Grid */}
      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-muted rounded w-full"></div>
              </CardHeader>
              <CardContent>
                <div className="h-32 bg-muted rounded mb-4"></div>
                <div className="h-10 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => (
            <TemplateCard key={template.id} template={template} />
          ))}
        </div>
      )}

      {!loading && filteredTemplates.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <div className="text-muted-foreground mb-4">
              No templates found matching your criteria
            </div>
            <Button variant="outline" onClick={() => {
              setSearchTerm('');
              setSelectedCategory('all');
            }}>
              Clear Filters
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};