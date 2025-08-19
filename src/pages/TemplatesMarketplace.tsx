import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Download, Star, Eye, Filter, Grid3X3, List } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Template {
  id: string;
  name: string;
  description: string | null;
  template_name: string;
  style_config: any;
  display_rules: any;
  preview_image: string | null;
  is_public: boolean;
  is_featured: boolean;
  downloads_count: number;
  created_by: string;
  created_at: string;
  category: {
    id: string;
    name: string;
  } | null;
  tags: Array<{
    id: string;
    name: string;
  }>;
  creator: {
    name: string;
  };
}

interface Category {
  id: string;
  name: string;
  description: string | null;
}

interface Tag {
  id: string;
  name: string;
}

const TemplatesMarketplace: React.FC = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('featured');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    loadData();
  }, [selectedCategory, selectedTag, sortBy]);

  const loadData = async () => {
    try {
      const [templatesResult, categoriesResult, tagsResult] = await Promise.all([
        loadTemplates(),
        loadCategories(),
        loadTags()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "Failed to load templates",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async () => {
    let query = (supabase as any)
      .from('widget_templates')
      .select(`
        *,
        category:template_categories(id, name),
        tags:widget_template_tags(tag:template_tags(id, name)),
        creator:profiles(name)
      `)
      .eq('is_public', true);

    if (selectedCategory !== 'all') {
      query = query.eq('category_id', selectedCategory);
    }

    if (sortBy === 'featured') {
      query = query.order('is_featured', { ascending: false });
    } else if (sortBy === 'downloads') {
      query = query.order('downloads_count', { ascending: false });
    } else if (sortBy === 'newest') {
      query = query.order('created_at', { ascending: false });
    }

    const { data, error } = await query;
    if (error) throw error;

    // Filter by tag if selected
    let filteredData = data || [];
    if (selectedTag !== 'all') {
      filteredData = filteredData.filter((template: any) =>
        template.tags.some((tagRel: any) => tagRel.tag?.id === selectedTag)
      );
    }

    // Filter by search term
    if (searchTerm) {
      filteredData = filteredData.filter((template: any) =>
        template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setTemplates(filteredData);
  };

  const loadCategories = async () => {
    const { data, error } = await (supabase as any)
      .from('template_categories')
      .select('*')
      .order('name');

    if (error) throw error;
    setCategories(data || []);
  };

  const loadTags = async () => {
    const { data, error } = await (supabase as any)
      .from('template_tags')
      .select('*')
      .order('name');

    if (error) throw error;
    setTags(data || []);
  };

  const importTemplate = async (template: Template) => {
    try {
      // Create new widget from template
      const { data: newWidget, error } = await (supabase as any)
        .from('widgets')
        .insert({
          name: `${template.name} (Imported)`,
          template_name: template.template_name,
          style_config: template.style_config,
          display_rules: template.display_rules,
          user_id: profile?.id,
          status: 'draft'
        })
        .select()
        .single();

      if (error) throw error;

      // Increment download count
      await (supabase as any)
        .from('widget_templates')
        .update({ 
          downloads_count: template.downloads_count + 1 
        })
        .eq('id', template.id);

      toast({
        title: "Success",
        description: "Template imported successfully",
        action: (
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => window.location.href = `/widgets/${newWidget.id}/edit`}
          >
            Edit Widget
          </Button>
        ),
      });

      loadTemplates(); // Refresh to update download count
    } catch (error) {
      console.error('Error importing template:', error);
      toast({
        title: "Error",
        description: "Failed to import template",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-muted rounded animate-pulse" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <div className="h-48 bg-muted rounded-t animate-pulse" />
              <CardHeader className="space-y-3">
                <div className="h-6 bg-muted rounded animate-pulse" />
                <div className="h-4 bg-muted rounded animate-pulse" />
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Templates Marketplace</h1>
          <p className="text-muted-foreground">
            Discover and import beautiful widget templates created by the community
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <Grid3X3 className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedTag} onValueChange={setSelectedTag}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Tag" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tags</SelectItem>
            {tags.map((tag) => (
              <SelectItem key={tag.id} value={tag.id}>
                {tag.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="featured">Featured</SelectItem>
            <SelectItem value="downloads">Most Downloaded</SelectItem>
            <SelectItem value="newest">Newest</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Templates Grid/List */}
      {templates.length === 0 ? (
        <Card>
          <CardHeader className="text-center">
            <CardTitle>No templates found</CardTitle>
            <CardDescription>
              Try adjusting your filters or search term.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className={viewMode === 'grid' 
          ? "grid gap-6 md:grid-cols-2 lg:grid-cols-3" 
          : "space-y-4"
        }>
          {templates.map((template) => (
            <Card key={template.id} className={viewMode === 'list' ? "flex" : ""}>
              {template.preview_image && (
                <div className={viewMode === 'list' ? "w-48 flex-shrink-0" : "h-48"}>
                  <img
                    src={template.preview_image}
                    alt={template.name}
                    className={`object-cover w-full h-full ${
                      viewMode === 'list' ? 'rounded-l' : 'rounded-t'
                    }`}
                  />
                </div>
              )}
              
              <div className="flex-1">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <CardTitle className="text-lg">{template.name}</CardTitle>
                        {template.is_featured && (
                          <Badge variant="default">
                            <Star className="h-3 w-3 mr-1" />
                            Featured
                          </Badge>
                        )}
                      </div>
                      <CardDescription>{template.description}</CardDescription>
                      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                        <span>by {template.creator?.name}</span>
                        <span>•</span>
                        <span className="flex items-center">
                          <Download className="h-3 w-3 mr-1" />
                          {template.downloads_count}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-4">
                    {/* Tags */}
                    <div className="flex flex-wrap gap-1">
                      {template.category && (
                        <Badge variant="secondary">{template.category.name}</Badge>
                      )}
                      {template.tags.map((tagRel) => (
                        <Badge key={tagRel.id} variant="outline">
                          {tagRel.name}
                        </Badge>
                      ))}
                    </div>
                    
                    {/* Actions */}
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        onClick={() => importTemplate(template)}
                        className="flex-1"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Import
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        asChild
                      >
                        <Link to={`/templates/${template.id}/preview`}>
                          <Eye className="h-4 w-4 mr-2" />
                          Preview
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default TemplatesMarketplace;