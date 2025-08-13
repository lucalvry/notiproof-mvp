import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { CalendarIcon, Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CreateEventFormProps {
  widgetId: string;
  onEventCreated: () => void;
  onCancel: () => void;
}

const eventTypes = [
  { value: 'signup', label: 'User Signup', icon: '👤' },
  { value: 'purchase', label: 'Purchase', icon: '🛒' },
  { value: 'review', label: 'Review', icon: '⭐' },
  { value: 'download', label: 'Download', icon: '📥' },
  { value: 'subscription', label: 'Subscription', icon: '💎' },
  { value: 'booking', label: 'Booking', icon: '📅' },
  { value: 'contact', label: 'Contact Form', icon: '📧' },
  { value: 'view', label: 'Page View', icon: '👁️' },
  { value: 'custom', label: 'Custom Event', icon: '🎯' }
];

const locations = [
  'New York, NY', 'Los Angeles, CA', 'Chicago, IL', 'Houston, TX', 'Phoenix, AZ',
  'Philadelphia, PA', 'San Antonio, TX', 'San Diego, CA', 'Dallas, TX', 'San Jose, CA',
  'London, UK', 'Paris, France', 'Berlin, Germany', 'Tokyo, Japan', 'Sydney, Australia',
  'Toronto, Canada', 'Mumbai, India', 'São Paulo, Brazil', 'Mexico City, Mexico'
];

export const CreateEventForm = ({ widgetId, onEventCreated, onCancel }: CreateEventFormProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState<Date>();
  const [customFields, setCustomFields] = useState<{ key: string; value: string }[]>([]);
  
  const [formData, setFormData] = useState({
    eventType: '',
    customerName: '',
    customerLocation: '',
    message: '',
    amount: '',
    productName: '',
    customEventName: ''
  });

  const addCustomField = () => {
    setCustomFields([...customFields, { key: '', value: '' }]);
  };

  const removeCustomField = (index: number) => {
    setCustomFields(customFields.filter((_, i) => i !== index));
  };

  const updateCustomField = (index: number, field: 'key' | 'value', value: string) => {
    const updated = [...customFields];
    updated[index][field] = value;
    setCustomFields(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.eventType) return;

    setLoading(true);
    try {
      const eventData: any = {
        customer_name: formData.customerName || 'Anonymous',
        location: formData.customerLocation,
        timestamp: date || new Date(),
        type: formData.eventType === 'custom' ? formData.customEventName : formData.eventType
      };

      // Add type-specific data
      if (formData.eventType === 'purchase' || formData.eventType === 'subscription') {
        eventData.amount = parseFloat(formData.amount) || 0;
        eventData.product_name = formData.productName;
      }

      if (formData.message) {
        eventData.message = formData.message;
      }

      // Add custom fields
      if (customFields.length > 0) {
        const customData: any = {};
        customFields.forEach(field => {
          if (field.key && field.value) {
            customData[field.key] = field.value;
          }
        });
        if (Object.keys(customData).length > 0) {
          eventData.custom_data = customData;
        }
      }

      const { error } = await supabase
        .from('events')
        .insert({
          widget_id: widgetId,
          event_type: formData.eventType === 'custom' ? formData.customEventName : formData.eventType,
          event_data: eventData,
          views: 0,
          clicks: 0
        });

      if (error) throw error;

      toast({
        title: "Event created",
        description: "Your event has been added successfully!",
      });

      onEventCreated();
    } catch (error) {
      console.error('Error creating event:', error);
      toast({
        title: "Error",
        description: "Failed to create event",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedEventType = eventTypes.find(type => type.value === formData.eventType);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Manual Event</CardTitle>
        <CardDescription>
          Add a custom event to display in your widget notifications
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="eventType">Event Type</Label>
            <Select 
              value={formData.eventType} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, eventType: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select event type" />
              </SelectTrigger>
              <SelectContent>
                {eventTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex items-center gap-2">
                      <span>{type.icon}</span>
                      <span>{type.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {formData.eventType === 'custom' && (
            <div>
              <Label htmlFor="customEventName">Custom Event Name</Label>
              <Input
                id="customEventName"
                value={formData.customEventName}
                onChange={(e) => setFormData(prev => ({ ...prev, customEventName: e.target.value }))}
                placeholder="e.g., Demo Request, Webinar Registration"
                required
              />
            </div>
          )}

          <div>
            <Label htmlFor="customerName">Customer Name</Label>
            <Input
              id="customerName"
              value={formData.customerName}
              onChange={(e) => setFormData(prev => ({ ...prev, customerName: e.target.value }))}
              placeholder="e.g., John D., Sarah M., Anonymous"
            />
          </div>

          <div>
            <Label htmlFor="customerLocation">Customer Location</Label>
            <Select 
              value={formData.customerLocation} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, customerLocation: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select location" />
              </SelectTrigger>
              <SelectContent>
                {locations.map((location) => (
                  <SelectItem key={location} value={location}>
                    {location}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {(formData.eventType === 'purchase' || formData.eventType === 'subscription') && (
            <>
              <div>
                <Label htmlFor="amount">Amount ($)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                  placeholder="99.99"
                />
              </div>
              <div>
                <Label htmlFor="productName">Product/Service Name</Label>
                <Input
                  id="productName"
                  value={formData.productName}
                  onChange={(e) => setFormData(prev => ({ ...prev, productName: e.target.value }))}
                  placeholder="e.g., Pro Plan, Premium Course"
                />
              </div>
            </>
          )}

          <div>
            <Label htmlFor="message">Custom Message (Optional)</Label>
            <Textarea
              id="message"
              value={formData.message}
              onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
              placeholder="Add a custom message to display with this event"
              rows={3}
            />
          </div>

          <div>
            <Label>Event Date & Time</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : "Select date (defaults to now)"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Custom Fields</Label>
              <Button type="button" variant="outline" size="sm" onClick={addCustomField}>
                <Plus className="h-4 w-4 mr-1" />
                Add Field
              </Button>
            </div>
            {customFields.map((field, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <Input
                  placeholder="Field name"
                  value={field.key}
                  onChange={(e) => updateCustomField(index, 'key', e.target.value)}
                />
                <Input
                  placeholder="Field value"
                  value={field.value}
                  onChange={(e) => updateCustomField(index, 'value', e.target.value)}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => removeCustomField(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={loading || !formData.eventType}>
              {loading ? 'Creating...' : 'Create Event'}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};