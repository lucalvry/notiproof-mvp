import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FORM_TEMPLATES } from '@/lib/testimonialTemplates';
import { Check } from 'lucide-react';

interface FormTemplateSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelect: (templateId: string) => void;
}

export function FormTemplateSelector({ open, onClose, onSelect }: FormTemplateSelectorProps) {
  const handleSelect = (templateId: string) => {
    onSelect(templateId);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Choose a Form Template</DialogTitle>
          <DialogDescription>
            Select a template to get started, or create a custom form
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 mt-4">
          {Object.entries(FORM_TEMPLATES).map(([id, template]) => (
            <Card
              key={id}
              className="cursor-pointer hover:border-primary transition-colors"
              onClick={() => handleSelect(id)}
            >
              <CardHeader>
                <CardTitle className="text-lg">{template.name}</CardTitle>
                <CardDescription>{template.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <p className="font-medium">Includes:</p>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>✓ {template.pages.length} pages</li>
                    <li>✓ {template.questions.length} custom questions</li>
                    {template.settings.allow_media_uploads && (
                      <li>✓ Media uploads (image + video)</li>
                    )}
                    {template.settings.negative_feedback_enabled && (
                      <li>✓ Negative feedback handling</li>
                    )}
                  </ul>
                </div>
                <Button className="w-full mt-4" size="sm">
                  <Check className="h-4 w-4 mr-2" />
                  Use This Template
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
