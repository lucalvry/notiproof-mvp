import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Lightbulb } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface EventTemplateCreatorProps {
  onTemplateCreated?: (template: any) => void;
}

export const EventTemplateCreator = ({ onTemplateCreated }: EventTemplateCreatorProps) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    eventType: "",
    messageTemplate: "",
    category: "",
    placeholders: [] as string[],
    icon: "📝",
    colorClass: "text-blue-600",
    locationPlaceholder: "City, State"
  });
  const [newPlaceholder, setNewPlaceholder] = useState("");

  const handleAddPlaceholder = () => {
    if (newPlaceholder.trim() && !formData.placeholders.includes(newPlaceholder.trim())) {
      setFormData(prev => ({
        ...prev,
        placeholders: [...prev.placeholders, newPlaceholder.trim()]
      }));
      setNewPlaceholder("");
    }
  };

  const handleRemovePlaceholder = (placeholder: string) => {
    setFormData(prev => ({
      ...prev,
      placeholders: prev.placeholders.filter(p => p !== placeholder)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setIsCreating(true);
    try {
      const templateData = {
        user_id: profile.id,
        name: formData.name,
        description: formData.description,
        event_type: formData.eventType,
        message_template: formData.messageTemplate,
        category: formData.category,
        placeholders: formData.placeholders,
        business_context: {
          icon: formData.icon,
          colorClass: formData.colorClass,
          locationPlaceholder: formData.locationPlaceholder
        },
        is_public: false, // User templates are private by default
        status: 'active'
      };

      // For now, we'll just show success and call the callback
      // In a real implementation, you'd save this to a custom_templates table
      console.log('Creating template:', templateData);
      
      toast({
        title: "Template created!",
        description: `${formData.name} template has been created successfully.`,
      });

      if (onTemplateCreated) {
        onTemplateCreated({
          id: `custom-${Date.now()}`,
          ...templateData,
          businessContext: templateData.business_context
        });
      }

      // Reset form
      setFormData({
        name: "",
        description: "",
        eventType: "",
        messageTemplate: "",
        category: "",
        placeholders: [],
        icon: "📝",
        colorClass: "text-blue-600",
        locationPlaceholder: "City, State"
      });

    } catch (error) {
      console.error('Error creating template:', error);
      toast({
        title: "Error",
        description: "Failed to create template. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const eventTypeOptions = [
    { value: 'purchase', label: 'Purchase' },
    { value: 'signup', label: 'Signup' },
    { value: 'booking', label: 'Booking' },
    { value: 'download', label: 'Download' },
    { value: 'view', label: 'View' },
    { value: 'engagement', label: 'Engagement' },
    { value: 'conversion', label: 'Conversion' },
    { value: 'social', label: 'Social Action' },
    { value: 'review', label: 'Review' },
    { value: 'subscription', label: 'Subscription' }
  ];

  const iconOptions = [
    "🛒", "🎯", "📅", "📧", "⭐", "🚀", "💡", "📱", "💳", "🎉",
    "📊", "🏆", "💰", "🔔", "📈", "✨", "🎪", "📝", "🎭", "🌟"
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Lightbulb className="h-5 w-5" />
          <span>Create Custom Template</span>
        </CardTitle>
        <CardDescription>
          Build your own event template for specific use cases
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="template-name">Template Name</Label>
              <Input
                id="template-name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., VIP Purchase"
                required
              />
            </div>
            <div>
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                placeholder="e.g., E-commerce"
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Brief description of when to use this template"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="event-type">Event Type</Label>
              <Select 
                value={formData.eventType}
                onValueChange={(value) => setFormData(prev => ({ ...prev, eventType: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select event type" />
                </SelectTrigger>
                <SelectContent>
                  {eventTypeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="icon">Icon</Label>
              <Select 
                value={formData.icon}
                onValueChange={(value) => setFormData(prev => ({ ...prev, icon: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {iconOptions.map((icon) => (
                    <SelectItem key={icon} value={icon}>
                      <span className="text-lg">{icon}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="message-template">Message Template</Label>
            <Textarea
              id="message-template"
              value={formData.messageTemplate}
              onChange={(e) => setFormData(prev => ({ ...prev, messageTemplate: e.target.value }))}
              placeholder="e.g., {customer_name} from {location} just purchased {product_name} for ${amount}"
              required
              rows={3}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Use curly braces for placeholders like {"{customer_name}"}, {"{location}"}, etc.
            </p>
          </div>

          <div>
            <Label>Placeholders</Label>
            <div className="flex space-x-2 mb-2">
              <Input
                value={newPlaceholder}
                onChange={(e) => setNewPlaceholder(e.target.value)}
                placeholder="e.g., customer_name"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddPlaceholder())}
              />
              <Button type="button" onClick={handleAddPlaceholder} size="sm">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.placeholders.map((placeholder) => (
                <Badge key={placeholder} variant="secondary" className="flex items-center space-x-1">
                  <span>{placeholder}</span>
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => handleRemovePlaceholder(placeholder)}
                  />
                </Badge>
              ))}
            </div>
          </div>

          <Button type="submit" disabled={isCreating} className="w-full">
            {isCreating ? "Creating..." : "Create Template"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};