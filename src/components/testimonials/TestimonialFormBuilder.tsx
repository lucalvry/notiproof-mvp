import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";

interface TestimonialFormBuilderProps {
  websiteId: string;
  onComplete: () => void;
  onCancel: () => void;
}

export function TestimonialFormBuilder({
  websiteId,
  onComplete,
  onCancel
}: TestimonialFormBuilderProps) {
  const [formName, setFormName] = useState("");
  const [thankYouMessage, setThankYouMessage] = useState("Thank you for your testimonial!");
  const [fields, setFields] = useState({
    name: true,
    email: true,
    company: true,
    position: true,
    rating: true,
    message: true,
    photo: false,
    video_url: false,
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!formName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a form name",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Generate slug from name
      const slug = formName.toLowerCase().replace(/[^a-z0-9]+/g, '-');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('testimonial_forms')
        .insert({
          user_id: user.id,
          website_id: websiteId,
          name: formName,
          slug,
          is_active: true,
          welcome_message: 'Share your experience with us!',
          thank_you_message: thankYouMessage,
          form_config: {
            fields,
            require_email_verification: false,
            allow_anonymous: false,
          },
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Form created successfully",
      });

      onComplete();
    } catch (error) {
      console.error('Error creating form:', error);
      toast({
        title: "Error",
        description: "Failed to create form",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">Form Name *</Label>
        <Input
          id="name"
          value={formName}
          onChange={(e) => setFormName(e.target.value)}
          placeholder="e.g., Customer Reviews, Product Feedback"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="thank-you">Thank You Message</Label>
        <Textarea
          id="thank-you"
          value={thankYouMessage}
          onChange={(e) => setThankYouMessage(e.target.value)}
          placeholder="Message shown after submission"
          rows={3}
        />
      </div>

      <div className="space-y-3">
        <Label>Form Fields</Label>
        <div className="space-y-2">
          {Object.entries(fields).map(([field, enabled]) => (
            <div key={field} className="flex items-center space-x-2">
              <Checkbox
                id={field}
                checked={enabled}
                onCheckedChange={(checked) =>
                  setFields({ ...fields, [field]: checked as boolean })
                }
              />
              <label
                htmlFor={field}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 capitalize"
              >
                {field.replace('_', ' ')}
              </label>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Creating...' : 'Create Form'}
        </Button>
      </div>
    </form>
  );
}
