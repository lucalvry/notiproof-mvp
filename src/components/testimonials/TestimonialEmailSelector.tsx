import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, ArrowRight, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

interface TestimonialForm {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  created_at: string;
}

interface TestimonialEmailSelectorProps {
  websiteId: string;
}

export function TestimonialEmailSelector({ websiteId }: TestimonialEmailSelectorProps) {
  const [forms, setForms] = useState<TestimonialForm[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadForms();
  }, [websiteId]);

  async function loadForms() {
    try {
      const { data, error } = await supabase
        .from('testimonial_forms')
        .select('id, name, slug, is_active, created_at')
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (forms.length === 0) {
    return (
      <div className="text-center py-12">
        <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Forms Available</h3>
        <p className="text-muted-foreground mb-4">
          Create a testimonial form first to configure email templates
        </p>
        <Button onClick={() => navigate('/testimonials/builder')}>
          Create Form
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Select a form to configure invitation and thank you email templates
      </p>
      
      <div className="grid gap-4 md:grid-cols-2">
        {forms.map((form) => (
          <Card key={form.id} className="hover:border-primary transition-colors">
            <CardHeader>
              <CardTitle className="text-lg">{form.name}</CardTitle>
              <CardDescription>
                Created {new Date(form.created_at).toLocaleDateString()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                className="w-full"
                onClick={() => navigate(`/testimonials/email/${form.id}`)}
              >
                <Mail className="h-4 w-4 mr-2" />
                Configure Email Templates
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
