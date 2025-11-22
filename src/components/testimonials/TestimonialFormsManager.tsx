import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, ExternalLink, QrCode, Copy, Trash2, Eye, EyeOff, MessageSquare, Edit } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { ShareableLinks } from "./ShareableLinks";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface TestimonialForm {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  form_config: any;
  created_at: string;
  view_count?: number;
  submission_count?: number;
}

interface TestimonialFormsManagerProps {
  websiteId: string;
}

export function TestimonialFormsManager({ websiteId }: TestimonialFormsManagerProps) {
  const [forms, setForms] = useState<TestimonialForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedForm, setSelectedForm] = useState<TestimonialForm | null>(null);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadForms();
  }, [websiteId]);

  async function loadForms() {
    try {
      const { data, error } = await supabase
        .from('testimonial_forms')
        .select('*')
        .eq('website_id', websiteId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setForms(data || []);
    } catch (error) {
      console.error('Error loading forms:', error);
      toast({
        title: "Error",
        description: "Failed to load testimonial forms",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function toggleFormStatus(formId: string, isActive: boolean) {
    try {
      const { error } = await supabase
        .from('testimonial_forms')
        .update({ is_active: !isActive })
        .eq('id', formId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Form ${!isActive ? 'activated' : 'deactivated'}`,
      });

      loadForms();
    } catch (error) {
      console.error('Error toggling form:', error);
      toast({
        title: "Error",
        description: "Failed to update form status",
        variant: "destructive",
      });
    }
  }

  async function deleteForm(formId: string) {
    if (!confirm('Are you sure you want to delete this form?')) return;

    try {
      const { error } = await supabase
        .from('testimonial_forms')
        .delete()
        .eq('id', formId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Form deleted successfully",
      });

      loadForms();
    } catch (error) {
      console.error('Error deleting form:', error);
      toast({
        title: "Error",
        description: "Failed to delete form",
        variant: "destructive",
      });
    }
  }

  function handleShare(form: TestimonialForm) {
    setSelectedForm(form);
    setShowShareDialog(true);
  }

  if (loading) {
    return <div className="text-center py-8">Loading forms...</div>;
  }

  return (
    <>
      <div className="space-y-4">
        {forms.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Forms Yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first testimonial collection form
            </p>
            <Button onClick={() => navigate('/testimonials/builder')}>
              <Plus className="h-4 w-4 mr-2" />
              Create Form
            </Button>
          </div>
        ) : (
          <>
            <div className="flex justify-end">
              <Button onClick={() => navigate('/testimonials/builder')}>
                <Plus className="h-4 w-4 mr-2" />
                Create Form
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {forms.map((form) => (
                <Card key={form.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-lg">{form.name}</CardTitle>
                        <CardDescription>
                          Created {new Date(form.created_at).toLocaleDateString()}
                        </CardDescription>
                      </div>
                      <Badge variant={form.is_active ? "default" : "secondary"}>
                        {form.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </CardHeader>
                   <CardContent className="space-y-3">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Eye className="h-4 w-4" />
                        <span>{(form as any).view_count || 0} views</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MessageSquare className="h-4 w-4" />
                        <span>{form.submission_count || 0} submissions</span>
                      </div>
                    </div>

                    <div className="flex gap-2 flex-wrap">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/testimonials/builder/${form.id}`)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const url = `${window.location.origin}/collect/${form.slug}`;
                          window.open(url, '_blank');
                        }}
                      >
                        <ExternalLink className="h-4 w-4 mr-1" />
                        Preview
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleShare(form)}
                      >
                        <ExternalLink className="h-4 w-4 mr-1" />
                        Share
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleFormStatus(form.id, form.is_active)}
                      >
                        {form.is_active ? (
                          <><EyeOff className="h-4 w-4 mr-1" /> Deactivate</>
                        ) : (
                          <><Eye className="h-4 w-4 mr-1" /> Activate</>
                        )}
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteForm(form.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>

      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Share Form: {selectedForm?.name}</DialogTitle>
          </DialogHeader>
          {selectedForm && (
            <ShareableLinks
              formId={selectedForm.id}
              slug={selectedForm.slug}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
