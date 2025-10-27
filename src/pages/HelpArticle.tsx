import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ThumbsUp, ThumbsDown, Eye, ArrowLeft, Video } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function HelpArticle() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [article, setArticle] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<boolean | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  useEffect(() => {
    if (slug) {
      fetchArticle();
    }
  }, [slug]);

  const fetchArticle = async () => {
    try {
      setLoading(true);

      const { data: articleData, error: articleError } = await supabase
        .from("help_articles")
        .select("*")
        .eq("slug", slug)
        .eq("is_published", true)
        .single();

      if (articleError) throw articleError;

      // Fetch category if article has one
      let categoryData = null;
      if (articleData.category_id) {
        const { data: cat } = await (supabase as any)
          .from("help_article_categories")
          .select("name")
          .eq("id", articleData.category_id)
          .single();
        categoryData = cat;
      }

      setArticle({
        ...articleData,
        help_article_categories: categoryData
      });

      // Increment view count
      await supabase.rpc("increment_article_view_count", {
        article_uuid: articleData.id,
      });

      // Track view
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("help_article_views").insert({
        article_id: articleData.id,
        user_id: user?.id || null,
      });
    } catch (error) {
      console.error("Error fetching article:", error);
      toast.error("Article not found");
      navigate("/help");
    } finally {
      setLoading(false);
    }
  };

  const handleFeedback = async (isHelpful: boolean) => {
    try {
      setSubmittingFeedback(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast.error("Please log in to provide feedback");
        return;
      }

      const { error } = await supabase
        .from("help_article_feedback")
        .upsert({
          article_id: article.id,
          user_id: user.id,
          is_helpful: isHelpful,
          feedback_text: feedbackText || null,
        }, {
          onConflict: "article_id,user_id",
        });

      if (error) throw error;

      setFeedback(isHelpful);
      toast.success("Thank you for your feedback!");

      // Update helpful count
      await supabase.rpc("update_article_helpful_count", {
        article_uuid: article.id,
      });
    } catch (error) {
      console.error("Error submitting feedback:", error);
      toast.error("Failed to submit feedback");
    } finally {
      setSubmittingFeedback(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full">Loading...</div>;
  }

  if (!article) {
    return null;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Back Button */}
      <Button variant="ghost" onClick={() => navigate("/help")}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Help Center
      </Button>

      {/* Article Header */}
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <h1 className="text-4xl font-bold">{article.title}</h1>
          {article.video_url && (
            <Badge variant="secondary" className="ml-4">
              <Video className="h-3 w-3 mr-1" />
              Video
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Eye className="h-4 w-4" />
            {article.view_count} views
          </span>
          {article.help_article_categories && (
            <Badge variant="outline">{article.help_article_categories.name}</Badge>
          )}
          {article.tags?.map((tag: string) => (
            <Badge key={tag} variant="secondary">
              {tag}
            </Badge>
          ))}
        </div>
      </div>

      <Separator />

      {/* Video */}
      {article.video_url && (
        <Card>
          <CardContent className="pt-6">
            <div className="aspect-video">
              {article.video_type === "youtube" ? (
                <iframe
                  src={article.video_url}
                  className="w-full h-full rounded-lg"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <video
                  src={article.video_url}
                  controls
                  className="w-full h-full rounded-lg"
                />
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Article Content */}
      <Card>
        <CardContent className="pt-6">
          <div
            className="prose prose-slate dark:prose-invert max-w-none 
                       prose-headings:font-bold prose-headings:text-foreground
                       prose-h1:text-3xl prose-h1:mb-4
                       prose-h2:text-2xl prose-h2:mt-8 prose-h2:mb-4
                       prose-h3:text-xl prose-h3:mt-6 prose-h3:mb-3
                       prose-p:text-muted-foreground prose-p:leading-7 prose-p:mb-4
                       prose-ul:my-4 prose-ul:list-disc prose-ul:pl-6
                       prose-ol:my-4 prose-ol:list-decimal prose-ol:pl-6
                       prose-li:text-muted-foreground prose-li:mb-2
                       prose-strong:text-foreground prose-strong:font-semibold
                       prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm
                       prose-pre:bg-muted prose-pre:p-4 prose-pre:rounded-lg prose-pre:overflow-x-auto
                       prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:pl-4 prose-blockquote:italic
                       prose-a:text-primary prose-a:underline prose-a:underline-offset-2
                       prose-img:rounded-lg prose-img:shadow-md"
            dangerouslySetInnerHTML={{ __html: article.content }}
          />
        </CardContent>
      </Card>

      {/* Feedback Section */}
      <Card>
        <CardHeader>
          <CardTitle>Was this article helpful?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button
              variant={feedback === true ? "default" : "outline"}
              onClick={() => handleFeedback(true)}
              disabled={submittingFeedback || feedback !== null}
            >
              <ThumbsUp className="h-4 w-4 mr-2" />
              Yes, helpful
            </Button>
            <Button
              variant={feedback === false ? "destructive" : "outline"}
              onClick={() => handleFeedback(false)}
              disabled={submittingFeedback || feedback !== null}
            >
              <ThumbsDown className="h-4 w-4 mr-2" />
              Not helpful
            </Button>
          </div>

          {feedback !== null && (
            <div className="space-y-2">
              <Textarea
                placeholder="Tell us more about your experience (optional)"
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                rows={3}
              />
              <Button
                onClick={() => handleFeedback(feedback)}
                disabled={submittingFeedback}
                size="sm"
              >
                Submit Additional Feedback
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
