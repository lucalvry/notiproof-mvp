import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Eye, 
  EyeOff, 
  Star, 
  BarChart3,
  FileText,
  Folder,
  Video,
  Save,
  X
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface HelpCategory {
  id: string;
  name: string;
  description?: string;
  slug: string;
  sort_order: number;
  is_active: boolean;
}

interface HelpArticle {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  category_id?: string;
  video_url?: string;
  video_type?: string;
  featured_image_url?: string;
  is_featured: boolean;
  is_published: boolean;
  view_count: number;
  helpful_count: number;
  tags?: string[];
  created_at: string;
  updated_at: string;
  help_categories?: {
    name: string;
  };
}

export const AdminHelpManager = () => {
  const [categories, setCategories] = useState<HelpCategory[]>([]);
  const [articles, setArticles] = useState<HelpArticle[]>([]);
  const [editingCategory, setEditingCategory] = useState<HelpCategory | null>(null);
  const [editingArticle, setEditingArticle] = useState<HelpArticle | null>(null);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [showArticleForm, setShowArticleForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { user, profile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (profile?.role === 'admin' || profile?.role === 'support') {
      fetchCategories();
      fetchArticles();
    }
  }, [profile]);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('help_categories')
        .select('*')
        .order('sort_order');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast({
        title: "Error",
        description: "Failed to load categories",
        variant: "destructive"
      });
    }
  };

  const fetchArticles = async () => {
    try {
      const { data, error } = await supabase
        .from('help_articles')
        .select(`
          *,
          help_categories (name)
        `)
        .order('created_at', { ascending: false });

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
      setLoading(false);
    }
  };

  const saveCategory = async (category: Partial<HelpCategory>) => {
    setSaving(true);
    
    try {
      if (editingCategory) {
        const { error } = await supabase
          .from('help_categories')
          .update(category)
          .eq('id', editingCategory.id);

        if (error) throw error;
        toast({ title: "Success", description: "Category updated successfully" });
      } else {
        const { error } = await supabase
          .from('help_categories')
          .insert({
            name: category.name!,
            slug: category.slug!,
            description: category.description,
            sort_order: category.sort_order || 0,
            is_active: category.is_active ?? true
          });

        if (error) throw error;
        toast({ title: "Success", description: "Category created successfully" });
      }

      setShowCategoryForm(false);
      setEditingCategory(null);
      fetchCategories();
    } catch (error) {
      console.error('Error saving category:', error);
      toast({
        title: "Error",
        description: "Failed to save category",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const saveArticle = async (article: Partial<HelpArticle>) => {
    setSaving(true);
    
    try {
      // Ensure required fields are present
      if (!article.title || !article.content) {
        throw new Error('Title and content are required');
      }

      const articleData = {
        ...article,
        author_id: user?.id,
        content: article.content, // Ensure content is always provided
        title: article.title,
        slug: article.slug || article.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
        is_featured: article.is_featured || false,
        is_published: article.is_published || false
      };

      if (editingArticle) {
        const { error } = await supabase
          .from('help_articles')
          .update(articleData)
          .eq('id', editingArticle.id);

        if (error) throw error;
        toast({ title: "Success", description: "Article updated successfully" });
      } else {
        const { error } = await supabase
          .from('help_articles')
          .insert(articleData);

        if (error) throw error;
        toast({ title: "Success", description: "Article created successfully" });
      }

      setShowArticleForm(false);
      setEditingArticle(null);
      fetchArticles();
    } catch (error) {
      console.error('Error saving article:', error);
      toast({
        title: "Error",
        description: "Failed to save article",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const deleteCategory = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category?')) return;

    try {
      const { error } = await supabase
        .from('help_categories')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast({ title: "Success", description: "Category deleted successfully" });
      fetchCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
      toast({
        title: "Error",
        description: "Failed to delete category",
        variant: "destructive"
      });
    }
  };

  const deleteArticle = async (id: string) => {
    if (!confirm('Are you sure you want to delete this article?')) return;

    try {
      const { error } = await supabase
        .from('help_articles')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast({ title: "Success", description: "Article deleted successfully" });
      fetchArticles();
    } catch (error) {
      console.error('Error deleting article:', error);
      toast({
        title: "Error",
        description: "Failed to delete article",
        variant: "destructive"
      });
    }
  };

  const toggleArticleStatus = async (id: string, field: 'is_published' | 'is_featured') => {
    try {
      const article = articles.find(a => a.id === id);
      if (!article) return;

      const { error } = await supabase
        .from('help_articles')
        .update({ [field]: !article[field] })
        .eq('id', id);

      if (error) throw error;
      
      fetchArticles();
    } catch (error) {
      console.error('Error updating article:', error);
      toast({
        title: "Error",
        description: "Failed to update article",
        variant: "destructive"
      });
    }
  };

  if (profile?.role !== 'admin' && profile?.role !== 'support') {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <h3 className="text-lg font-medium mb-2">Access Denied</h3>
          <p className="text-muted-foreground">
            You don't have permission to access the help content manager.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Help Content Manager</h1>
        <p className="text-muted-foreground">
          Manage help documentation, categories, and content
        </p>
      </div>

      <Tabs defaultValue="articles" className="space-y-6">
        <TabsList>
          <TabsTrigger value="articles" className="gap-2">
            <FileText className="h-4 w-4" />
            Articles
          </TabsTrigger>
          <TabsTrigger value="categories" className="gap-2">
            <Folder className="h-4 w-4" />
            Categories
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="articles" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Articles</h2>
            <Button onClick={() => setShowArticleForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Article
            </Button>
          </div>

          <div className="grid gap-4">
            {articles.map((article) => (
              <Card key={article.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-medium">{article.title}</h3>
                        {article.is_featured && (
                          <Star className="h-4 w-4 text-primary" />
                        )}
                        {article.video_url && (
                          <Video className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                        <span>{article.help_categories?.name || 'Uncategorized'}</span>
                        <span>{article.view_count} views</span>
                        <span>{article.helpful_count} helpful</span>
                        <span>
                          {new Date(article.updated_at).toLocaleDateString()}
                        </span>
                      </div>

                      <div className="flex gap-2">
                        <Badge 
                          variant={article.is_published ? "default" : "secondary"}
                        >
                          {article.is_published ? 'Published' : 'Draft'}
                        </Badge>
                        {article.tags?.map(tag => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleArticleStatus(article.id, 'is_published')}
                      >
                        {article.is_published ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleArticleStatus(article.id, 'is_featured')}
                      >
                        <Star className={`h-4 w-4 ${article.is_featured ? 'text-primary' : ''}`} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingArticle(article);
                          setShowArticleForm(true);
                        }}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteArticle(article.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Categories</h2>
            <Button onClick={() => setShowCategoryForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Category
            </Button>
          </div>

          <div className="grid gap-4">
            {categories.map((category) => (
              <Card key={category.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">{category.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {category.description}
                      </p>
                      <div className="flex items-center gap-4 mt-2">
                        <Badge 
                          variant={category.is_active ? "default" : "secondary"}
                        >
                          {category.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          Order: {category.sort_order}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingCategory(category);
                          setShowCategoryForm(true);
                        }}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteCategory(category.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold mb-4">Help Content Analytics</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-medium mb-2">Total Articles</h3>
                  <p className="text-3xl font-bold">{articles.length}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-medium mb-2">Published Articles</h3>
                  <p className="text-3xl font-bold">
                    {articles.filter(a => a.is_published).length}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-medium mb-2">Total Views</h3>
                  <p className="text-3xl font-bold">
                    {articles.reduce((sum, a) => sum + a.view_count, 0)}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Category Form Modal */}
      {showCategoryForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>
                {editingCategory ? 'Edit Category' : 'New Category'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <CategoryForm
                category={editingCategory}
                onSave={saveCategory}
                onCancel={() => {
                  setShowCategoryForm(false);
                  setEditingCategory(null);
                }}
                saving={saving}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Article Form Modal */}
      {showArticleForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>
                {editingArticle ? 'Edit Article' : 'New Article'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ArticleForm
                article={editingArticle}
                categories={categories}
                onSave={saveArticle}
                onCancel={() => {
                  setShowArticleForm(false);
                  setEditingArticle(null);
                }}
                saving={saving}
              />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

// Separate forms for better organization
const CategoryForm = ({ 
  category, 
  onSave, 
  onCancel, 
  saving 
}: {
  category: HelpCategory | null;
  onSave: (category: Partial<HelpCategory>) => void;
  onCancel: () => void;
  saving: boolean;
}) => {
  const [formData, setFormData] = useState({
    name: category?.name || '',
    description: category?.description || '',
    slug: category?.slug || '',
    sort_order: category?.sort_order || 0,
    is_active: category?.is_active ?? true
  });

  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  };

  const handleNameChange = (name: string) => {
    setFormData(prev => ({
      ...prev,
      name,
      slug: prev.slug || generateSlug(name)
    }));
  };

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      onSave(formData);
    }} className="space-y-4">
      <div>
        <label className="text-sm font-medium">Name</label>
        <Input
          value={formData.name}
          onChange={(e) => handleNameChange(e.target.value)}
          required
        />
      </div>
      
      <div>
        <label className="text-sm font-medium">Slug</label>
        <Input
          value={formData.slug}
          onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
          required
        />
      </div>
      
      <div>
        <label className="text-sm font-medium">Description</label>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          rows={3}
        />
      </div>
      
      <div>
        <label className="text-sm font-medium">Sort Order</label>
        <Input
          type="number"
          value={formData.sort_order}
          onChange={(e) => setFormData(prev => ({ ...prev, sort_order: parseInt(e.target.value) || 0 }))}
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="is_active"
          checked={formData.is_active}
          onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
        />
        <label htmlFor="is_active" className="text-sm font-medium">Active</label>
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          Save
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          <X className="h-4 w-4 mr-2" />
          Cancel
        </Button>
      </div>
    </form>
  );
};

const ArticleForm = ({ 
  article, 
  categories,
  onSave, 
  onCancel, 
  saving 
}: {
  article: HelpArticle | null;
  categories: HelpCategory[];
  onSave: (article: Partial<HelpArticle>) => void;
  onCancel: () => void;
  saving: boolean;
}) => {
  const [formData, setFormData] = useState({
    title: article?.title || '',
    slug: article?.slug || '',
    content: article?.content || '',
    excerpt: article?.excerpt || '',
    category_id: article?.category_id || '',
    video_url: article?.video_url || '',
    video_type: article?.video_type || 'youtube',
    featured_image_url: article?.featured_image_url || '',
    is_featured: article?.is_featured || false,
    is_published: article?.is_published || false,
    tags: article?.tags?.join(', ') || ''
  });

  const generateSlug = (title: string) => {
    return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  };

  const handleTitleChange = (title: string) => {
    setFormData(prev => ({
      ...prev,
      title,
      slug: prev.slug || generateSlug(title)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const articleData = {
      ...formData,
      tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean),
      category_id: formData.category_id || null
    };

    onSave(articleData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Title</label>
          <Input
            value={formData.title}
            onChange={(e) => handleTitleChange(e.target.value)}
            required
          />
        </div>
        
        <div>
          <label className="text-sm font-medium">Slug</label>
          <Input
            value={formData.slug}
            onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
            required
          />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium">Excerpt</label>
        <Textarea
          value={formData.excerpt}
          onChange={(e) => setFormData(prev => ({ ...prev, excerpt: e.target.value }))}
          rows={2}
          placeholder="Brief description of the article"
        />
      </div>

      <div>
        <label className="text-sm font-medium">Content</label>
        <Textarea
          value={formData.content}
          onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
          rows={10}
          required
          placeholder="Article content (supports Markdown)"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Category</label>
          <select
            value={formData.category_id}
            onChange={(e) => setFormData(prev => ({ ...prev, category_id: e.target.value }))}
            className="w-full border rounded px-3 py-2 bg-background"
          >
            <option value="">Select Category</option>
            {categories.map(category => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-medium">Tags (comma-separated)</label>
          <Input
            value={formData.tags}
            onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
            placeholder="tag1, tag2, tag3"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Video URL</label>
          <Input
            value={formData.video_url}
            onChange={(e) => setFormData(prev => ({ ...prev, video_url: e.target.value }))}
            placeholder="https://www.youtube.com/watch?v=..."
          />
        </div>

        <div>
          <label className="text-sm font-medium">Video Type</label>
          <select
            value={formData.video_type}
            onChange={(e) => setFormData(prev => ({ ...prev, video_type: e.target.value }))}
            className="w-full border rounded px-3 py-2 bg-background"
          >
            <option value="youtube">YouTube</option>
            <option value="vimeo">Vimeo</option>
            <option value="direct">Direct Link</option>
          </select>
        </div>
      </div>

      <div>
        <label className="text-sm font-medium">Featured Image URL</label>
        <Input
          value={formData.featured_image_url}
          onChange={(e) => setFormData(prev => ({ ...prev, featured_image_url: e.target.value }))}
          placeholder="https://example.com/image.jpg"
        />
      </div>

      <div className="flex gap-4">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="is_published"
            checked={formData.is_published}
            onChange={(e) => setFormData(prev => ({ ...prev, is_published: e.target.checked }))}
          />
          <label htmlFor="is_published" className="text-sm font-medium">Published</label>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="is_featured"
            checked={formData.is_featured}
            onChange={(e) => setFormData(prev => ({ ...prev, is_featured: e.target.checked }))}
          />
          <label htmlFor="is_featured" className="text-sm font-medium">Featured</label>
        </div>
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          Save Article
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          <X className="h-4 w-4 mr-2" />
          Cancel
        </Button>
      </div>
    </form>
  );
};