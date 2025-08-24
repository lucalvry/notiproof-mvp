import { useState, useEffect } from 'react';
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
import { CalendarIcon, Plus, X, Sparkles, RefreshCw, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { EnhancedLocationInput } from '@/components/ui/enhanced-location-input';
import { LocationService } from '@/services/locationService';
import { MessageGenerationService } from '@/services/messageGenerationService';

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

// Enhanced location data will be managed by the EnhancedLocationInput component

export const CreateEventForm = ({ widgetId, onEventCreated, onCancel }: CreateEventFormProps) => {
  // DEPRECATED: Manual event creation is discouraged. Use natural integrations and quick-wins instead.
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState<Date>();
  const [customFields, setCustomFields] = useState<{ key: string; value: string }[]>([]);
  const [locationData, setLocationData] = useState<any>(null);
  const [generatedMessage, setGeneratedMessage] = useState<string>('');
  const [messageVariations, setMessageVariations] = useState<string[]>([]);
  const [showMessageGenerator, setShowMessageGenerator] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    eventType: '',
    customerName: '',
    customerLocation: '',
    message: '',
    amount: '',
    productName: '',
    customEventName: ''
  });

  // Auto-detect location for anonymous events
  useEffect(() => {
    const detectLocation = async () => {
      try {
        const detected = await LocationService.detectIPLocation();
        if (detected && !formData.customerLocation) {
          const formattedLocation = LocationService.formatLocation(detected);
          setFormData(prev => ({ ...prev, customerLocation: formattedLocation }));
          setLocationData(detected);
        }
      } catch (error) {
        console.warn('Auto location detection failed:', error);
      }
    };

    // Only auto-detect if no location is already set
    if (!formData.customerLocation) {
      detectLocation();
    }
  }, []);

  // Load user profile for business type context
  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('business_type')
            .eq('id', user.id)
            .single();
          setUserProfile(profile);
        }
      } catch (error) {
        console.warn('Failed to load user profile:', error);
      }
    };

    loadUserProfile();
  }, []);

  // Generate smart message when form data changes
  useEffect(() => {
    if (formData.eventType && userProfile?.business_type) {
      generateSmartMessage();
    }
  }, [formData.eventType, formData.customerName, formData.customerLocation, formData.productName, formData.amount, userProfile]);

  const generateSmartMessage = () => {
    if (!formData.eventType || !userProfile?.business_type) return;

    const messageContext = {
      businessType: userProfile.business_type as any,
      eventType: (formData.eventType === 'custom' ? 'conversion' : formData.eventType) as any,
      data: {
        name: formData.customerName || undefined,
        location: formData.customerLocation || undefined,
        product: formData.productName || (formData.eventType === 'custom' ? formData.customEventName : undefined),
        amount: formData.amount ? parseFloat(formData.amount) : undefined,
        service: formData.productName || undefined,
      }
    };

    // Generate main message
    const mainMessage = MessageGenerationService.generateMessage(messageContext);
    setGeneratedMessage(mainMessage);

    // Generate variations
    const variations = MessageGenerationService.generateVariations(messageContext, 3);
    setMessageVariations(variations);

    // Auto-set if message is empty
    if (!formData.message) {
      setFormData(prev => ({ ...prev, message: mainMessage }));
    }
  };

  const useGeneratedMessage = (message: string) => {
    setFormData(prev => ({ ...prev, message }));
    setShowMessageGenerator(false);
  };

  const refreshMessageSuggestions = () => {
    generateSmartMessage();
  };

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
        type: formData.eventType === 'custom' ? formData.customEventName : formData.eventType,
        // Enhanced location data
        geo: locationData ? {
          country: locationData.country,
          country_code: locationData.country_code,
          region: locationData.region,
          city: locationData.city,
          timezone: locationData.timezone,
          coordinates: locationData.latitude && locationData.longitude ? {
            lat: locationData.latitude,
            lng: locationData.longitude
          } : undefined
        } : undefined
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
          user_name: formData.customerName || 'Anonymous',
          user_location: formData.customerLocation,
          message_template: formData.message,
          source: 'manual',
          status: 'approved',
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
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-yellow-600" />
          Create Manual Event (Deprecated)
        </CardTitle>
        <CardDescription>
          ⚠️ Manual events are discouraged. Use integrations for natural events and quick-win templates for warm-up content.
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

          <EnhancedLocationInput
            value={formData.customerLocation}
            onChange={(value, data) => {
              setFormData(prev => ({ ...prev, customerLocation: value }));
              if (data) {
                setLocationData(data);
              }
            }}
            placeholder="Enter customer location..."
            enableIPDetection={true}
            showPopularLocations={true}
          />

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

          <div className="space-y-4">
            {/* Smart Message Generator */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label htmlFor="message">Message</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowMessageGenerator(!showMessageGenerator)}
                    className="text-xs"
                  >
                    <Sparkles className="h-3 w-3 mr-1" />
                    Smart Generate
                  </Button>
                  {generatedMessage && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={refreshMessageSuggestions}
                      className="text-xs"
                    >
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Refresh
                    </Button>
                  )}
                </div>
              </div>

              {showMessageGenerator && (
                <Card className="mb-4 border-blue-200 bg-blue-50/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Smart Message Suggestions</CardTitle>
                    <CardDescription className="text-xs">
                      AI-generated messages based on your business type and event data
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-2">
                    {messageVariations.map((variation, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-white rounded border">
                        <span className="text-sm flex-1">{variation}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => useGeneratedMessage(variation)}
                          className="text-xs ml-2"
                        >
                          Use This
                        </Button>
                      </div>
                    ))}
                    {messageVariations.length === 0 && (
                      <div className="text-sm text-muted-foreground text-center py-4">
                        Fill in more details above to get smart message suggestions
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              <Textarea
                id="message"
                value={formData.message}
                onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                placeholder="Message will be auto-generated or enter your custom message..."
                rows={3}
              />
              
              {generatedMessage && formData.message !== generatedMessage && (
                <div className="text-xs text-muted-foreground mt-1">
                  💡 Suggestion: {generatedMessage}
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    onClick={() => useGeneratedMessage(generatedMessage)}
                    className="text-xs h-auto p-0 ml-2"
                  >
                    Use suggestion
                  </Button>
                </div>
              )}
            </div>
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