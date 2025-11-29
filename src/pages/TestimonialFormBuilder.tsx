import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FormBuilderLayout } from '@/components/testimonials/builder/FormBuilderLayout';
import { FormTemplateSelector } from '@/components/testimonials/builder/FormTemplateSelector';
import { supabase } from '@/integrations/supabase/client';
import { FORM_TEMPLATES } from '@/lib/testimonialTemplates';
import { toast } from 'sonner';
import { useWebsiteContext } from '@/contexts/WebsiteContext';

export default function TestimonialFormBuilder() {
  const { formId } = useParams();
  const navigate = useNavigate();
  const { currentWebsite } = useWebsiteContext();
  const [formData, setFormData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);

  useEffect(() => {
    if (formId) {
      loadForm();
    } else {
      setShowTemplateSelector(true);
      setLoading(false);
    }
  }, [formId]);

  const loadForm = async () => {
    if (!formId) return;

    try {
      const { data, error } = await supabase
        .from('testimonial_forms')
        .select('*, testimonial_form_questions(*)')
        .eq('id', formId)
        .single();

      if (error) throw error;

      // Transform to builder format
      const transformed = {
        name: data.name,
        form_type: data.form_type,
        pages_config: data.pages_config || {
          sequence: ['rating', 'welcome', 'message', 'about_you', 'thank_you'],
        },
        questions: (data.testimonial_form_questions || [])
          .sort((a: any, b: any) => a.sort_order - b.sort_order)
          .map((q: any) => ({
            id: `q${q.sort_order + 1}`,
            text: q.question_text,
            type: q.question_type,
            is_required: q.is_required,
            options: q.options || [],
          })),
        settings: {
          negative_feedback_enabled: data.negative_feedback_enabled,
          private_feedback_enabled: data.private_feedback_enabled,
          consent_required: data.consent_required,
          allow_media_uploads: (data.form_config as any)?.allow_media_uploads ?? true,
        },
        reward_config: data.reward_config || {
          enabled: false,
          type: 'coupon',
          value: '',
        },
      };

      setFormData(transformed);
    } catch (error) {
      console.error('Error loading form:', error);
      toast.error('Failed to load form');
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateSelect = async (templateId: string) => {
    const template = FORM_TEMPLATES[templateId];
    if (!template) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Use currently selected website from context
      if (!currentWebsite) {
        toast.error('Please select a website first');
        navigate('/websites');
        return;
      }

      // Create new form
      const { data: newForm, error } = await supabase
        .from('testimonial_forms')
        .insert([{
          name: `${template.name} Form`,
          slug: `${templateId}-${Date.now()}`,
          user_id: user.id,
          website_id: currentWebsite.id,
          form_type: templateId,
          pages_config: { sequence: template.pages },
          negative_feedback_enabled: template.settings.negative_feedback_enabled,
          private_feedback_enabled: template.settings.private_feedback_enabled,
          consent_required: template.settings.consent_required,
          form_config: template.settings,
        }])
        .select()
        .single();

      if (error) throw error;

      // Insert questions
      if (template.questions.length > 0) {
        const questions = template.questions.map((q, index) => ({
          form_id: newForm.id,
          question_text: q.text,
          question_type: q.type,
          is_required: q.is_required,
          sort_order: index,
          options: q.options || [],
        }));

        await supabase.from('testimonial_form_questions').insert(questions);
      }

      toast.success('Form created successfully');
      navigate(`/testimonials/builder/${newForm.id}`);
    } catch (error) {
      console.error('Error creating form:', error);
      toast.error('Failed to create form');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  if (showTemplateSelector) {
    return (
      <FormTemplateSelector
        open={showTemplateSelector}
        onClose={() => navigate('/testimonials')}
        onSelect={handleTemplateSelect}
      />
    );
  }

  if (!formData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>Form not found</p>
      </div>
    );
  }

  return (
    <FormBuilderLayout
      formId={formId!}
      initialData={formData}
      onSave={() => {
        toast.success('Form saved');
        navigate('/testimonials');
      }}
      onClose={() => navigate('/testimonials')}
    />
  );
}
