import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  BookOpen, 
  Star, 
  Eye, 
  ChevronRight, 
  Grid3X3, 
  List,
  Filter,
  ArrowLeft
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface HelpCategory {
  id: string;
  name: string;
  description?: string;
  slug: string;
  sort_order: number;
  article_count?: number;
}

interface HelpArticle {
  id: string;
  title: string;
  excerpt?: string;
  slug: string;
  is_featured: boolean;
  view_count: number;
  helpful_count: number;
  tags?: string[];
  created_at: string;
}

interface HelpCategoryBrowserProps {
  onArticleClick: (slug: string) => void;
  selectedCategory?: string;
  onCategoryChange?: (slug: string | null) => void;
}

export const HelpCategoryBrowser = ({ 
  onArticleClick, 
  selectedCategory, 
  onCategoryChange 
}: HelpCategoryBrowserProps) => {
  const [categories, setCategories] = useState<HelpCategory[]>([]);
  const [articles, setArticles] = useState<HelpArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [articlesLoading, setArticlesLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'recent' | 'popular' | 'helpful'>('recent');
  const { toast } = useToast();

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (selectedCategory) {
      fetchArticlesByCategory(selectedCategory);
    } else {
      fetchFeaturedArticles();
    }
  }, [selectedCategory, sortBy]);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('help_categories')
        .select(`
          *,
          help_articles (count)
        `)
        .eq('is_active', true)
        .order('sort_order');

      if (error) throw error;

      const categoriesWithCount = data.map(category => ({
        ...category,
        article_count: category.help_articles?.[0]?.count || 0
      }));

      setCategories(categoriesWithCount);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast({
        title: "Error",
        description: "Failed to load categories",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchArticlesByCategory = async (categorySlug: string) => {
    setArticlesLoading(true);
    
    try {
      let query = supabase
        .from('help_articles')
        .select(`
          id,
          title,
          excerpt,
          slug,
          is_featured,
          view_count,
          helpful_count,
          tags,
          created_at,
          help_categories!inner (slug)
        `)
        .eq('is_published', true)
        .eq('help_categories.slug', categorySlug);

      // Apply sorting
      switch (sortBy) {
        case 'popular':
          query = query.order('view_count', { ascending: false });
          break;
        case 'helpful':
          query = query.order('helpful_count', { ascending: false });
          break;
        case 'recent':
        default:
          query = query.order('created_at', { ascending: false });
          break;
      }

      const { data, error } = await query;

      if (error) throw error;
      setArticles(data || []);
    } catch (error) {
      console.error('Error fetching articles:', error);
      toast({
        title: "Error",
        description: "Failed to load articles",
        variant: "destructive"
      });
    } finally {
      setArticlesLoading(false);
    }
  };

  const fetchFeaturedArticles = async () => {
    setArticlesLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('help_articles')
        .select('*')
        .eq('is_published', true)
        .eq('is_featured', true)
        .order('view_count', { ascending: false })
        .limit(8);

      if (error) throw error;
      setArticles(data || []);
    } catch (error) {
      console.error('Error fetching featured articles:', error);
      toast({
        title: "Error",
        description: "Failed to load featured articles",
        variant: "destructive"
      });
    } finally {
      setArticlesLoading(false);
    }
  };

  const handleCategoryClick = (categorySlug: string) => {
    onCategoryChange?.(categorySlug);
  };

  const handleBackToCategories = () => {
    onCategoryChange?.(null);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-6 bg-muted rounded mb-2"></div>
              <div className="h-4 bg-muted rounded w-2/3"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Show categories view
  if (!selectedCategory) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-2">Browse by Category</h2>
          <p className="text-muted-foreground">
            Find the help you need organized by topic
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((category) => (
            <Card 
              key={category.id}
              className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-[1.02]"
              onClick={() => handleCategoryClick(category.slug)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{category.name}</CardTitle>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  {category.description}
                </p>
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="text-xs">
                    {category.article_count} articles
                  </Badge>
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Featured Articles */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Star className="h-5 w-5 text-primary" />
            <h3 className="text-xl font-semibold">Featured Articles</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {articles.map((article) => (
              <Card 
                key={article.id}
                className="cursor-pointer hover:shadow-md transition-all duration-200"
                onClick={() => onArticleClick(article.slug)}
              >
                <CardContent className="p-4">
                  <h4 className="font-medium mb-2">{article.title}</h4>
                  {article.excerpt && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {article.excerpt}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      {article.view_count}
                    </div>
                    <span>{formatDate(article.created_at)}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Show articles in selected category
  const currentCategory = categories.find(c => c.slug === selectedCategory);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Button 
            variant="ghost" 
            onClick={handleBackToCategories}
            className="mb-2 p-0 h-auto text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Categories
          </Button>
          <h2 className="text-2xl font-bold">{currentCategory?.name}</h2>
          {currentCategory?.description && (
            <p className="text-muted-foreground">{currentCategory.description}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Sort options */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'recent' | 'popular' | 'helpful')}
            className="text-sm border rounded px-2 py-1 bg-background"
          >
            <option value="recent">Most Recent</option>
            <option value="popular">Most Popular</option>
            <option value="helpful">Most Helpful</option>
          </select>

          {/* View mode toggle */}
          <div className="flex border rounded">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="rounded-r-none"
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="rounded-l-none"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Articles */}
      {articlesLoading ? (
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-6 bg-muted rounded mb-2"></div>
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : articles.length > 0 ? (
        <div className={
          viewMode === 'grid' 
            ? "grid grid-cols-1 md:grid-cols-2 gap-4"
            : "space-y-4"
        }>
          {articles.map((article) => (
            <Card 
              key={article.id}
              className="cursor-pointer hover:shadow-md transition-all duration-200"
              onClick={() => onArticleClick(article.slug)}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-medium text-lg">{article.title}</h3>
                  {article.is_featured && (
                    <Star className="h-4 w-4 text-primary flex-shrink-0 ml-2" />
                  )}
                </div>
                
                {article.excerpt && (
                  <p className="text-muted-foreground mb-3 line-clamp-2">
                    {article.excerpt}
                  </p>
                )}

                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      {article.view_count} views
                    </div>
                    <span>{formatDate(article.created_at)}</span>
                  </div>
                  
                  {article.tags && article.tags.length > 0 && (
                    <div className="flex gap-1">
                      {article.tags.slice(0, 2).map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Articles Found</h3>
            <p className="text-muted-foreground">
              No articles are available in this category yet.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};