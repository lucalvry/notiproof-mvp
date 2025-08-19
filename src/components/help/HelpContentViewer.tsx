import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ThumbsUp, ThumbsDown, Eye, Clock, Tag } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { VideoPlayer } from './VideoPlayer';
import { HelpArticleFeedback } from './HelpArticleFeedback';
import { useToast } from '@/hooks/use-toast';

interface HelpArticle {
  id: string;
  title: string;
  content: string;
  excerpt?: string;
  video_url?: string;
  video_type?: string;
  featured_image_url?: string;
  view_count: number;
  helpful_count: number;
  tags?: string[];
  created_at: string;
  updated_at: string;
  category?: {
    name: string;
    slug: string;
  };
}

interface HelpContentViewerProps {
  slug: string;
  onClose?: () => void;
}

export const HelpContentViewer = ({ slug, onClose }: HelpContentViewerProps) => {
  const [article, setArticle] = useState<HelpArticle | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasViewed, setHasViewed] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchArticle();
  }, [slug]);

  const fetchArticle = async () => {
    try {
      const { data, error } = await supabase
        .from('help_articles')
        .select(`
          *,
          help_categories (
            name,
            slug
          )
        `)
        .eq('slug', slug)
        .eq('is_published', true)
        .single();

      if (error) throw error;

      setArticle({
        ...data,
        category: data.help_categories
      });

      // Track view if not already viewed in this session
      if (!hasViewed) {
        await trackView(data.id);
        setHasViewed(true);
      }
    } catch (error) {
      console.error('Error fetching article:', error);
      toast({
        title: "Error",
        description: "Failed to load article",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const trackView = async (articleId: string) => {
    try {
      // Insert view record
      await supabase
        .from('help_article_views')
        .insert({
          article_id: articleId,
          user_agent: navigator.userAgent
        });

      // Increment view count
      await supabase.rpc('increment_article_view_count', {
        article_uuid: articleId
      });
    } catch (error) {
      console.error('Error tracking view:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <Card className="max-w-4xl mx-auto">
        <CardContent className="p-8">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded mb-4"></div>
            <div className="h-4 bg-muted rounded mb-2"></div>
            <div className="h-4 bg-muted rounded mb-2"></div>
            <div className="h-4 bg-muted rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!article) {
    return (
      <Card className="max-w-4xl mx-auto">
        <CardContent className="p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">Article Not Found</h2>
          <p className="text-muted-foreground mb-4">
            The article you're looking for could not be found.
          </p>
          {onClose && (
            <Button onClick={onClose}>
              Back to Help Center
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between mb-4">
            {article.category && (
              <Badge variant="secondary">
                {article.category.name}
              </Badge>
            )}
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose}>
                ← Back
              </Button>
            )}
          </div>
          
          <h1 className="text-3xl font-bold mb-4">{article.title}</h1>
          
          {article.excerpt && (
            <p className="text-lg text-muted-foreground mb-4">
              {article.excerpt}
            </p>
          )}

          {/* Metadata */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Eye className="h-4 w-4" />
              {article.view_count} views
            </div>
            <div className="flex items-center gap-1">
              <ThumbsUp className="h-4 w-4" />
              {article.helpful_count} helpful
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              Updated {formatDate(article.updated_at)}
            </div>
          </div>

          {/* Tags */}
          {article.tags && article.tags.length > 0 && (
            <div className="flex items-center gap-2 mt-4">
              <Tag className="h-4 w-4 text-muted-foreground" />
              <div className="flex gap-2">
                {article.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardHeader>
      </Card>

      {/* Featured Image */}
      {article.featured_image_url && (
        <Card>
          <CardContent className="p-0">
            <img
              src={article.featured_image_url}
              alt={article.title}
              className="w-full h-64 object-cover rounded-lg"
            />
          </CardContent>
        </Card>
      )}

      {/* Video */}
      {article.video_url && (
        <Card>
          <CardContent className="p-6">
            <VideoPlayer
              url={article.video_url}
              type={article.video_type as 'youtube' | 'vimeo' | 'direct'}
              title={article.title}
            />
          </CardContent>
        </Card>
      )}

      {/* Content */}
      <Card>
        <CardContent className="p-8">
          <div 
            className="prose prose-lg max-w-none"
            dangerouslySetInnerHTML={{ __html: article.content }}
          />
        </CardContent>
      </Card>

      {/* Feedback */}
      <Card>
        <CardContent className="p-6">
          <Separator className="mb-6" />
          <HelpArticleFeedback articleId={article.id} />
        </CardContent>
      </Card>
    </div>
  );
};