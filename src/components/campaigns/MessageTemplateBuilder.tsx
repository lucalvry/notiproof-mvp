import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Sparkles, Copy, RotateCcw } from "lucide-react";
import { toast } from "sonner";

interface MessageTemplateBuilderProps {
  dataSource: string;
  campaignType: string;
  value: string;
  onChange: (value: string) => void;
}

export function MessageTemplateBuilder({
  dataSource,
  campaignType,
  value,
  onChange,
}: MessageTemplateBuilderProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  // Get default templates based on campaign type
  const getDefaultTemplates = () => {
    const templates: Record<string, string[]> = {
      'recent-purchase': [
        '{{user_name}} from {{location}} just purchased {{product_name}}!',
        'Someone in {{location}} bought {{product_name}}',
        '🎉 {{user_name}} just made a purchase!',
      ],
      'visitor-counter': [
        '{{count}} people are viewing this page right now',
        '{{count}} active visitors on {{page_name}}',
        '👀 {{count}} people browsing this site',
      ],
      'new-signup': [
        '{{user_name}} from {{location}} just signed up!',
        'New signup: {{user_name}} joined moments ago',
        '🎉 {{user_name}} just created an account!',
      ],
      'contact-form': [
        '{{user_name}} just submitted a contact request',
        'New form submission from {{user_name}}',
        '📝 {{user_name}} from {{location}} contacted us',
      ],
      'newsletter-signups': [
        '{{user_name}} subscribed to our newsletter',
        'New subscriber: {{user_name}} from {{location}}',
        '📧 {{user_name}} joined our mailing list',
      ],
    };

    return templates[campaignType] || [
      '{{user_name}} just completed an action',
      'Someone from {{location}} engaged with your site',
      'New activity: {{event_type}}',
    ];
  };

  const templates = getDefaultTemplates();

  const handleTemplateSelect = (template: string) => {
    onChange(template);
    toast.success('Template applied!');
  };

  const handleCopy = () => {
    if (value) {
      navigator.clipboard.writeText(value);
      toast.success('Template copied to clipboard');
    }
  };

  const handleReset = () => {
    onChange('');
    toast.info('Template cleared');
  };

  return (
    <div className="space-y-4">
      {/* Suggested Templates */}
      <div className="space-y-2">
        <p className="text-sm font-medium">Quick Templates</p>
        <div className="grid gap-2">
          {templates.map((template, index) => (
            <Card
              key={index}
              className="p-3 cursor-pointer transition-all hover:shadow-md hover:border-primary/50"
              onClick={() => handleTemplateSelect(template)}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-mono flex-1">{template}</p>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTemplateSelect(template);
                  }}
                >
                  Use
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Custom Template Input */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Custom Template</p>
          <div className="flex gap-2">
            {value && (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCopy}
                  className="h-7 px-2"
                >
                  <Copy className="h-3 w-3 mr-1" />
                  Copy
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleReset}
                  className="h-7 px-2"
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Clear
                </Button>
              </>
            )}
          </div>
        </div>
        <Textarea
          placeholder="Enter your custom message template..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className="font-mono text-sm"
        />
        <p className="text-xs text-muted-foreground">
          Use variables like {'{'}{'{'} user_name {'}'}{'}'}, {'{'}{'{'} location {'}'}{'}'}, {'{'}{'{'} product_name {'}'}{'}'}
        </p>
      </div>

      {/* Live Preview */}
      {value && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Preview</p>
          <Card className="p-3 bg-muted/50">
            <p className="text-sm">
              {value
                .replace(/\{\{user_name\}\}/g, 'John Doe')
                .replace(/\{\{location\}\}/g, 'New York')
                .replace(/\{\{product_name\}\}/g, 'Premium Plan')
                .replace(/\{\{count\}\}/g, '12')
                .replace(/\{\{page_name\}\}/g, 'Home Page')
                .replace(/\{\{event_type\}\}/g, 'Purchase')}
            </p>
          </Card>
        </div>
      )}
    </div>
  );
}
