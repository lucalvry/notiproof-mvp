import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { TestimonialCollectionForm } from '@/components/testimonials/TestimonialCollectionForm';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

export default function TestimonialCollection() {
  const { slug } = useParams<{ slug: string }>();
  const [formConfig, setFormConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function loadForm() {
      if (!slug) {
        setError(true);
        setLoading(false);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from('testimonial_forms')
          .select('*')
          .eq('slug', slug)
          .eq('is_active', true)
          .single();

        if (fetchError || !data) {
          console.error('Error fetching form:', fetchError);
          setError(true);
        } else {
          setFormConfig(data);
        }
      } catch (err) {
        console.error('Error loading form:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    }

    loadForm();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !formConfig) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Form Not Found</h1>
          <p className="text-muted-foreground">This testimonial form is invalid or has been disabled</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <TestimonialCollectionForm
          websiteId={formConfig.website_id}
          formId={formConfig.id}
          formConfig={formConfig.form_config}
          welcomeMessage={formConfig.welcome_message}
          thankYouMessage={formConfig.thank_you_message}
          showCompanyFields={formConfig.form_config?.show_company_fields || false}
        />
      </div>
    </div>
  );
}
