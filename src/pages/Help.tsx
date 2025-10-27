import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, BookOpen, Video, TrendingUp, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  view_count: number;
  helpful_count: number;
  video_url?: string;
  tags?: string[];
  category_id?: string;
}

interface Category {
  id: string;
  name: string;
  description?: string;
  article_count: number;
}

export default function Help() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [featuredArticles, setFeaturedArticles] = useState<Article[]>([]);
  const [popularArticles, setPopularArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHelpData();
  }, []);

  const fetchHelpData = async () => {
    try {
      setLoading(true);

      // Fetch featured articles
      const { data: featured, error: featuredError } = await supabase
        .from("help_articles")
        .select("*")
        .eq("is_published", true)
        .eq("is_featured", true)
        .order("sort_order", { ascending: true })
        .limit(3);

      if (featuredError) throw featuredError;
      setFeaturedArticles(featured || []);

      // Fetch popular articles
      const { data: popular, error: popularError } = await supabase
        .from("help_articles")
        .select("*")
        .eq("is_published", true)
        .order("view_count", { ascending: false })
        .limit(5);

      if (popularError) throw popularError;
      setPopularArticles(popular || []);

      // Fetch categories with article counts
      const { data: cats, error: catsError } = await (supabase as any)
        .from("help_article_categories")
        .select("*")
        .order("sort_order", { ascending: true });

      if (catsError) throw catsError;

      // Get article counts for each category
      const categoriesWithCounts: Category[] = await Promise.all(
        (cats || []).map(async (cat: any) => {
          const { count } = await supabase
            .from("help_articles")
            .select("*", { count: "exact", head: true })
            .eq("category_id", cat.id)
            .eq("is_published", true);

          return {
            id: cat.id as string,
            name: cat.name as string,
            description: cat.description as string | undefined,
            article_count: count || 0,
          };
        })
      );

      setCategories(categoriesWithCounts);
    } catch (error) {
      console.error("Error fetching help data:", error);
      toast.error("Failed to load help content");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    navigate(`/help/search?q=${encodeURIComponent(searchQuery)}`);
  };

  const handleArticleClick = (article: Article) => {
    navigate(`/help/article/${article.slug}`);
  };

  const handleCategoryClick = (categoryId: string) => {
    navigate(`/help/category/${categoryId}`);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full">Loading...</div>;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">How can we help you?</h1>
        <p className="text-lg text-muted-foreground">
          Search our knowledge base for answers and tutorials
        </p>
        
        {/* Search */}
        <div className="max-w-2xl mx-auto">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search for articles..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>
            <Button onClick={handleSearch}>Search</Button>
          </div>
        </div>
      </div>

      {/* Featured Articles */}
      {featuredArticles.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Star className="h-6 w-6 text-yellow-500" />
            Featured Articles
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            {featuredArticles.map((article) => (
              <Card
                key={article.id}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => handleArticleClick(article)}
              >
                <CardHeader>
                  <CardTitle className="flex items-start justify-between">
                    <span className="line-clamp-2">{article.title}</span>
                    {article.video_url && (
                      <Video className="h-5 w-5 text-primary flex-shrink-0 ml-2" />
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="line-clamp-3">
                    {article.excerpt}
                  </CardDescription>
                  <div className="flex gap-2 mt-4">
                    {article.tags?.slice(0, 2).map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Categories */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <BookOpen className="h-6 w-6" />
          Browse by Category
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <Card
              key={category.id}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => handleCategoryClick(category.id)}
            >
              <CardHeader>
                <CardTitle>{category.name}</CardTitle>
                <CardDescription>{category.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">
                  {category.article_count} {category.article_count === 1 ? "article" : "articles"}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Popular Articles */}
      {popularArticles.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <TrendingUp className="h-6 w-6" />
            Popular Articles
          </h2>
          <div className="space-y-2">
            {popularArticles.map((article) => (
              <Card
                key={article.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handleArticleClick(article)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{article.title}</CardTitle>
                      <CardDescription className="line-clamp-2 mt-2">
                        {article.excerpt}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground ml-4">
                      <span>{article.view_count} views</span>
                      <span>{article.helpful_count} helpful</span>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
