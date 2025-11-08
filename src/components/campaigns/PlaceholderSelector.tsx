import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface PlaceholderSelectorProps {
  dataSource: string;
  selected: string[];
  onSelect: (placeholders: string[]) => void;
}

export function PlaceholderSelector({
  dataSource,
  selected,
  onSelect,
}: PlaceholderSelectorProps) {
  // Get available placeholders based on data source
  const getAvailablePlaceholders = (): Array<{ key: string; label: string; example: string }> => {
    const baseVariables = [
      { key: 'user_name', label: 'User Name', example: 'John Doe' },
      { key: 'location', label: 'Location', example: 'New York, USA' },
      { key: 'timestamp', label: 'Timestamp', example: '5 minutes ago' },
    ];

    const dataSourceVariables: Record<string, Array<{ key: string; label: string; example: string }>> = {
      shopify: [
        { key: 'product_name', label: 'Product Name', example: 'Premium Headphones' },
        { key: 'product_price', label: 'Price', example: '$99.99' },
        { key: 'order_id', label: 'Order ID', example: '#1234' },
      ],
      stripe: [
        { key: 'plan_name', label: 'Plan Name', example: 'Pro Plan' },
        { key: 'amount', label: 'Amount', example: '$29/month' },
        { key: 'customer_email', label: 'Email', example: 'user@example.com' },
      ],
      ga4: [
        { key: 'page_name', label: 'Page Name', example: 'Homepage' },
        { key: 'visitor_count', label: 'Visitor Count', example: '12' },
        { key: 'time_on_page', label: 'Time Spent', example: '3m 24s' },
      ],
      typeform: [
        { key: 'form_name', label: 'Form Name', example: 'Contact Form' },
        { key: 'response_count', label: 'Response Count', example: '245' },
      ],
      calendly: [
        { key: 'event_type', label: 'Event Type', example: 'Discovery Call' },
        { key: 'scheduled_time', label: 'Scheduled Time', example: 'Tomorrow at 2pm' },
      ],
      mailchimp: [
        { key: 'email', label: 'Email', example: 'subscriber@example.com' },
        { key: 'list_name', label: 'List Name', example: 'Newsletter' },
      ],
      instagram: [
        { key: 'post_type', label: 'Post Type', example: 'Image' },
        { key: 'likes_count', label: 'Likes', example: '234' },
        { key: 'caption', label: 'Caption', example: 'New product launch!' },
      ],
      webhook: [
        { key: 'event_type', label: 'Event Type', example: 'Custom Event' },
        { key: 'custom_field', label: 'Custom Field', example: 'Dynamic value' },
      ],
    };

    return [...baseVariables, ...(dataSourceVariables[dataSource] || [])];
  };

  const placeholders = getAvailablePlaceholders();

  const togglePlaceholder = (key: string) => {
    if (selected.includes(key)) {
      onSelect(selected.filter((p) => p !== key));
    } else {
      onSelect([...selected, key]);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-2">
        {placeholders.map((placeholder) => {
          const isSelected = selected.includes(placeholder.key);
          
          return (
            <Card
              key={placeholder.key}
              className={cn(
                "p-3 cursor-pointer transition-all hover:shadow-md",
                isSelected && "border-primary bg-primary/5"
              )}
              onClick={() => togglePlaceholder(placeholder.key)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium">{placeholder.label}</p>
                    {isSelected && (
                      <Check className="h-4 w-4 text-primary flex-shrink-0" />
                    )}
                  </div>
                  <Badge variant="outline" className="font-mono text-xs mb-1">
                    {'{'}{'{'}{placeholder.key}{'}'}{'}'} 
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-1">
                    e.g., "{placeholder.example}"
                  </p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {selected.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Selected Variables ({selected.length})</p>
          <div className="flex flex-wrap gap-2">
            {selected.map((key) => {
              const placeholder = placeholders.find((p) => p.key === key);
              return (
                <Badge
                  key={key}
                  variant="secondary"
                  className="cursor-pointer hover:bg-destructive/10"
                  onClick={() => togglePlaceholder(key)}
                >
                  {placeholder?.label}
                  <span className="ml-1">×</span>
                </Badge>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
