import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Edit, Trash2, Eye, ThumbsUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { HelpArticleDialog } from "@/components/admin/HelpArticleDialog";

interface Article {
  id: string;
  title: string;
  slug: string;
  is_published: boolean;
  is_featured: boolean;
  view_count: number;
  helpful_count: number;
  created_at: string;
  help_article_categories?: { name: string };
}

export default function AdminHelpArticles() {
  const { loading: authLoading } = useAdminAuth();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);

  useEffect(() => {
    if (!authLoading) {
      fetchArticles();
    }
  }, [authLoading]);

  const fetchArticles = async () => {
    try {
      setLoading(true);
      
      // Fetch articles and categories separately
      const [articlesResult, categoriesResult] = await Promise.all([
        supabase
          .from("help_articles")
          .select("*")
          .order("created_at", { ascending: false }),
        (supabase as any)
          .from("help_article_categories")
          .select("*")
      ]);

      if (articlesResult.error) throw articlesResult.error;
      
      // Map category names to articles
      const articlesWithCategories = (articlesResult.data || []).map((article: any) => ({
        ...article,
        help_article_categories: (categoriesResult.data as any[])?.find(
          (cat: any) => cat.id === article.category_id
        ) || null
      })) as Article[];

      setArticles(articlesWithCategories);
    } catch (error) {
      console.error("Error fetching articles:", error);
      toast.error("Failed to load articles");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this article?")) return;

    try {
      const { error } = await supabase
        .from("help_articles")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Article deleted");
      fetchArticles();
    } catch (error) {
      console.error("Error deleting article:", error);
      toast.error("Failed to delete article");
    }
  };

  const handleTogglePublish = async (article: Article) => {
    try {
      const { error } = await supabase
        .from("help_articles")
        .update({ is_published: !article.is_published })
        .eq("id", article.id);

      if (error) throw error;

      toast.success(
        article.is_published ? "Article unpublished" : "Article published"
      );
      fetchArticles();
    } catch (error) {
      console.error("Error toggling publish:", error);
      toast.error("Failed to update article");
    }
  };

  const handleEdit = (article: Article) => {
    setSelectedArticle(article);
    setDialogOpen(true);
  };

  const handleCreate = () => {
    setSelectedArticle(null);
    setDialogOpen(true);
  };

  const filteredArticles = articles.filter((article) =>
    article.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (authLoading || loading) {
    return <div className="flex items-center justify-center h-full">Loading...</div>;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Help Articles</h1>
          <p className="text-muted-foreground">
            Manage knowledge base articles for users
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          New Article
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Articles</CardTitle>
          <CardDescription>
            <Input
              placeholder="Search articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Views</TableHead>
                <TableHead>Helpful</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredArticles.map((article) => (
                <TableRow key={article.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{article.title}</span>
                      {article.is_featured && (
                        <Badge variant="secondary">Featured</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {article.help_article_categories?.name || "—"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={article.is_published ? "default" : "secondary"}
                    >
                      {article.is_published ? "Published" : "Draft"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1">
                      <Eye className="h-4 w-4" />
                      {article.view_count}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1">
                      <ThumbsUp className="h-4 w-4" />
                      {article.helpful_count}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(article)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleTogglePublish(article)}
                      >
                        {article.is_published ? "Unpublish" : "Publish"}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(article.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <HelpArticleDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        article={selectedArticle}
        onSuccess={fetchArticles}
      />
    </div>
  );
}
