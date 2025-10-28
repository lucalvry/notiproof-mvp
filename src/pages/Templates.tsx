import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Star, Download, Eye, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { NotificationPreview } from "@/components/templates/NotificationPreview";

interface Template {
  id: string;
  name: string;
  description: string | null;
  category: string;
  preview_image?: string | null;
  template_config: any;
  style_config: any;
  download_count: number;
  rating_average: number | null;
  rating_count: number;
  category_name?: string;
}

export default function Templates() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [categories, setCategories] = useState<string[]>(["All"]);
  const [isLoading, setIsLoading] = useState(true);
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setIsLoading(true);
      const { data: templatesData, error: templatesError } = await supabase
        .from('marketplace_templates')
        .select('*')
        .eq('is_public', true)
        .order('download_count', { ascending: false });

      if (templatesError) throw templatesError;

      const { data: categoriesData, error: categoriesError } = await supabase
        .from('template_categories')
        .select('id, name')
        .order('name');

      if (categoriesError) throw categoriesError;

      // Map category IDs to names
      const categoryMap = new Map(
        categoriesData?.map(c => [c.id, c.name]) || []
      );

      const templatesWithCategories = (templatesData || []).map(t => ({
        ...t,
        category_name: categoryMap.get(t.category) || 'General'
      }));

      setTemplates(templatesWithCategories);
      setCategories(["All", ...(categoriesData?.map(c => c.name) || [])]);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.error("Failed to load templates");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredTemplates = templates.filter((template) => {
    const matchesSearch =
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (template.description && template.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory =
      selectedCategory === "All" || template.category_name === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleUseTemplate = (template: Template) => {
    navigate(`/campaigns?template=${template.id}`);
    toast.success(`Template "${template.name}" selected`);
  };

  const handlePreview = (template: Template) => {
    setPreviewTemplate(template);
    setPreviewDialogOpen(true);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Template Marketplace</h1>
        <p className="text-muted-foreground">
          Choose from pre-built templates to quickly launch your campaigns
        </p>
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2">
          {categories.map((category) => (
            <Button
              key={category}
              variant={selectedCategory === category ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(category)}
            >
              {category}
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredTemplates.map((template) => (
          <Card key={template.id} className="group hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                  <Badge variant="secondary" className="mt-2">
                    {template.category_name || 'General'}
                  </Badge>
                </div>
                <div className="flex items-center gap-1 text-sm">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-medium">{template.rating_average?.toFixed(1) || 'N/A'}</span>
                  <span className="text-xs text-muted-foreground">({template.rating_count || 0})</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <CardDescription>{template.description}</CardDescription>

              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="text-xs">
                  {typeof template.template_config === 'string' ? JSON.parse(template.template_config).position : template.template_config?.position || 'bottom-left'}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {typeof template.template_config === 'string' ? JSON.parse(template.template_config).animation : template.template_config?.animation || 'slide'}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {template.download_count} downloads
                </Badge>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => handlePreview(template)}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Preview
                </Button>
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={() => handleUseTemplate(template)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Use Template
                </Button>
              </div>
            </CardContent>
          </Card>
          ))}
        </div>
      )}

      {!isLoading && filteredTemplates.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Search className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No templates found</h3>
            <p className="text-sm text-muted-foreground text-center">
              Try adjusting your search or category filters
            </p>
          </CardContent>
        </Card>
      )}

      {/* Preview Dialog */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-4xl h-[600px]">
          <DialogHeader>
            <DialogTitle>Template Preview: {previewTemplate?.name}</DialogTitle>
          </DialogHeader>
          {previewTemplate && <NotificationPreview template={previewTemplate} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
