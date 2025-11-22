import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Save, Eye, Settings2 } from 'lucide-react';
import { LiveFormPreview } from './LiveFormPreview';
import { FormConfigPanel } from './FormConfigPanel';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface FormBuilderLayoutProps {
  formId: string;
  initialData: any;
  onSave?: () => void;
  onClose?: () => void;
}

export function FormBuilderLayout({ formId, initialData, onSave, onClose }: FormBuilderLayoutProps) {
  const [formName, setFormName] = useState(initialData?.name || 'Untitled Form');
  const [formConfig, setFormConfig] = useState(initialData || {
    form_type: 'classic',
    pages_config: {
      sequence: ['rating', 'welcome', 'message', 'about_you', 'thank_you'],
    },
    questions: [],
    settings: {
      negative_feedback_enabled: true,
      private_feedback_enabled: false,
      consent_required: true,
      allow_media_uploads: true,
    },
    reward_config: {
      enabled: false,
      type: 'coupon',
      value: '',
    },
  });
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  const handleSave = async () => {
    if (!formName.trim()) {
      toast.error('Please enter a form name');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('testimonial_forms')
        .update({
          name: formName,
          form_type: formConfig.form_type,
          pages_config: formConfig.pages_config,
          reward_config: formConfig.reward_config,
          negative_feedback_enabled: formConfig.settings?.negative_feedback_enabled || false,
          private_feedback_enabled: formConfig.settings?.private_feedback_enabled || false,
          consent_required: formConfig.settings?.consent_required || true,
          form_config: formConfig.settings || {},
        })
        .eq('id', formId);

      if (error) throw error;

      // Save questions
      if (formConfig.questions && formConfig.questions.length > 0) {
        // Delete existing questions
        await supabase
          .from('testimonial_form_questions')
          .delete()
          .eq('form_id', formId);

        // Insert new questions
        const questionsToInsert = formConfig.questions.map((q: any, index: number) => ({
          form_id: formId,
          question_text: q.text,
          question_type: q.type,
          is_required: q.is_required,
          sort_order: index,
          options: q.options || [],
        }));

        await supabase
          .from('testimonial_form_questions')
          .insert(questionsToInsert);
      } else {
        // Delete all questions if array is empty
        await supabase
          .from('testimonial_form_questions')
          .delete()
          .eq('form_id', formId);
      }

      toast.success('Form saved successfully');
      onSave?.();
    } catch (error) {
      console.error('Error saving form:', error);
      toast.error('Failed to save form');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="border-b bg-card px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4 flex-1">
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
            >
              ← Back
            </Button>
          )}
          <Input
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            className="text-lg font-semibold max-w-md border-none bg-transparent focus-visible:ring-0"
            placeholder="Enter form name"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPreviewMode(!previewMode)}
          >
            <Eye className="h-4 w-4 mr-2" />
            {previewMode ? 'Edit Mode' : 'Preview Mode'}
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving}
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Preview */}
        <div className="w-2/3 bg-muted/30 p-6 overflow-y-auto">
          <div className="max-w-2xl mx-auto">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Live Preview</h2>
                <p className="text-sm text-muted-foreground">
                  See how your form looks to respondents
                </p>
              </div>
              {previewMode && (
                <div className="px-3 py-1 bg-primary/10 text-primary text-xs rounded-full">
                  Interactive Preview
                </div>
              )}
            </div>
            <LiveFormPreview
              config={formConfig}
              previewMode={previewMode}
            />
          </div>
        </div>

        {/* Right: Config Panel */}
        <div className="w-1/3 border-l bg-background overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <Settings2 className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Configuration</h2>
            </div>
            <FormConfigPanel
              config={formConfig}
              onChange={setFormConfig}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
