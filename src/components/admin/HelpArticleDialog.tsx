import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface HelpArticleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  article: any;
  onSuccess: () => void;
}

export function HelpArticleDialog({
  open,
  onOpenChange,
  article,
  onSuccess,
}: HelpArticleDialogProps) {
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    excerpt: "",
    content: "",
    category_id: "",
    tags: "",
    video_url: "",
    video_type: "youtube",
    is_published: false,
    is_featured: false,
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (article) {
      setFormData({
        title: article.title || "",
        slug: article.slug || "",
        excerpt: article.excerpt || "",
        content: article.content || "",
        category_id: article.category_id || "",
        tags: article.tags?.join(", ") || "",
        video_url: article.video_url || "",
        video_type: article.video_type || "youtube",
        is_published: article.is_published || false,
        is_featured: article.is_featured || false,
      });
    } else {
      setFormData({
        title: "",
        slug: "",
        excerpt: "",
        content: "",
        category_id: "",
        tags: "",
        video_url: "",
        video_type: "youtube",
        is_published: false,
        is_featured: false,
      });
    }
  }, [article, open]);

  const fetchCategories = async () => {
    const { data, error } = await (supabase as any)
      .from("help_article_categories")
      .select("*")
      .order("name");

    if (!error && data) {
      setCategories(data);
    }
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const slug = formData.slug || generateSlug(formData.title);
      const tags = formData.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const articleData = {
        ...formData,
        slug,
        tags,
        author_id: user.id,
      };

      if (article) {
        const { error } = await supabase
          .from("help_articles")
          .update(articleData)
          .eq("id", article.id);

        if (error) throw error;
        toast.success("Article updated");
      } else {
        const { error } = await supabase
          .from("help_articles")
          .insert(articleData);

        if (error) throw error;
        toast.success("Article created");
      }

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving article:", error);
      toast.error("Failed to save article");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{article ? "Edit Article" : "Create Article"}</DialogTitle>
          <DialogDescription>
            Fill in the article details below
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              placeholder="Article title"
            />
          </div>

          <div className="space-y-2">
            <Label>Slug (URL)</Label>
            <Input
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              placeholder="article-slug"
            />
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            <Select
              value={formData.category_id}
              onValueChange={(value) =>
                setFormData({ ...formData, category_id: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Excerpt</Label>
            <Textarea
              value={formData.excerpt}
              onChange={(e) =>
                setFormData({ ...formData, excerpt: e.target.value })
              }
              placeholder="Brief description"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Content</Label>
            <Textarea
              value={formData.content}
              onChange={(e) =>
                setFormData({ ...formData, content: e.target.value })
              }
              placeholder="Article content (supports HTML)"
              rows={10}
            />
          </div>

          <div className="space-y-2">
            <Label>Tags (comma-separated)</Label>
            <Input
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              placeholder="getting-started, setup, advanced"
            />
          </div>

          <div className="space-y-2">
            <Label>Video URL (optional)</Label>
            <Input
              value={formData.video_url}
              onChange={(e) =>
                setFormData({ ...formData, video_url: e.target.value })
              }
              placeholder="https://youtube.com/embed/..."
            />
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center space-x-2">
              <Switch
                checked={formData.is_published}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_published: checked })
                }
              />
              <Label>Published</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                checked={formData.is_featured}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_featured: checked })
                }
              />
              <Label>Featured</Label>
            </div>
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {article ? "Update Article" : "Create Article"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
