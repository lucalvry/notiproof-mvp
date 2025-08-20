import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Search, Filter, Trash2, Copy, Upload, Download, Eye, Sparkles, RefreshCw, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useSmartMessages } from '@/hooks/useSmartMessages';
import { MessageGenerationService } from '@/services/messageGenerationService';
import { NotificationTypeService } from '@/services/notificationTypeService';

interface Event {
  id: string;
  event_type: string;
  event_data: any;
  widget_id: string;
  created_at: string;
  flagged: boolean;
  views: number | null;
  clicks: number | null;
  user_name: string | null;
  user_location: string | null;
  page_url: string | null;
  message_template: string | null;
  business_type: string | null;
  source: string | null;
  status: string | null;
  expires_at: string | null;
  variant_id: string | null;
  ip: string | null;
  user_agent: string | null;
}

interface Widget {
  id: string;
  name: string;
  status: string;
}

const businessTypes = [
  { value: 'saas', label: 'SaaS' },
  { value: 'ecommerce', label: 'E-commerce' },
  { value: 'services', label: 'Services' },
  { value: 'events', label: 'Events' },
  { value: 'blog', label: 'Blog/Content' },
  { value: 'marketing_agency', label: 'Marketing Agency' },
  { value: 'ngo', label: 'Non-profit' },
  { value: 'education', label: 'Education' }
];

const eventTypes = [
  { value: 'purchase', label: 'Purchase' },
  { value: 'signup', label: 'Signup' },
  { value: 'review', label: 'Review' },
  { value: 'download', label: 'Download' },
  { value: 'subscription', label: 'Subscription' },
  { value: 'booking', label: 'Booking' },
  { value: 'contact', label: 'Contact' },
  { value: 'view', label: 'View' },
  { value: 'conversion', label: 'Conversion' },
  { value: 'visitor', label: 'Visitor' }
];

export default function EnhancedEventsManager() {
  const [events, setEvents] = useState<Event[]>([]);
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWidget, setSelectedWidget] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedBusinessType, setSelectedBusinessType] = useState<string>('saas');
  const [previewEvent, setPreviewEvent] = useState<any>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const { toast } = useToast();

  // Enhanced create form state
  const [formData, setFormData] = useState({
    eventType: '',
    customerName: '',
    customerLocation: '',
    message: '',
    amount: '',
    productName: '',
    businessType: 'saas'
  });

  const {
    currentMessage,
    variations,
    validation,
    isGenerating,
    generateMessages,
    selectMessage,
    refreshMessages,
    getRecommendedFields
  } = useSmartMessages({
    businessType: formData.businessType,
    eventType: formData.eventType,
    data: {
      name: formData.customerName,
      location: formData.customerLocation,
      product: formData.productName,
      amount: formData.amount ? parseFloat(formData.amount) : undefined
    },
    autoGenerate: true
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (currentMessage && !formData.message) {
      setFormData(prev => ({ ...prev, message: currentMessage }));
    }
  }, [currentMessage]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const { data: widgetsData, error: widgetsError } = await supabase
        .from('widgets')
        .select('id, name, status')
        .eq('status', 'active');

      if (widgetsError) throw widgetsError;
      setWidgets(widgetsData || []);

      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (eventsError) throw eventsError;
      setEvents(eventsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load events and widgets',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const getSmartDefaults = (businessType: string, eventType: string) => {
    const recommendations = MessageGenerationService.getRecommendedFields(businessType, eventType);
    
    const defaults: any = {
      customerName: '',
      customerLocation: '',
      productName: '',
      amount: ''
    };

    // Set smart defaults based on business type
    switch (businessType) {
      case 'ecommerce':
        defaults.productName = eventType === 'purchase' ? 'Premium Product' : '';
        defaults.amount = eventType === 'purchase' ? '99.99' : '';
        break;
      case 'saas':
        defaults.productName = eventType === 'signup' ? 'Free Trial' : eventType === 'subscription' ? 'Pro Plan' : '';
        defaults.amount = eventType === 'subscription' ? '29.99' : '';
        break;
      case 'services':
        defaults.productName = eventType === 'booking' ? 'Consultation' : '';
        break;
      case 'education':
        defaults.productName = eventType === 'signup' ? 'Course Enrollment' : '';
        break;
    }

    return defaults;
  };

  const handleBusinessTypeChange = (businessType: string) => {
    setFormData(prev => ({ ...prev, businessType }));
    setSelectedBusinessType(businessType);
    
    // Apply smart defaults when business type changes
    if (formData.eventType) {
      const smartDefaults = getSmartDefaults(businessType, formData.eventType);
      setFormData(prev => ({ ...prev, ...smartDefaults }));
    }
  };

  const handleEventTypeChange = (eventType: string) => {
    setFormData(prev => ({ ...prev, eventType }));
    
    // Apply smart defaults when event type changes
    const smartDefaults = getSmartDefaults(formData.businessType, eventType);
    setFormData(prev => ({ ...prev, ...smartDefaults }));
  };

  const generatePreview = () => {
    if (!formData.eventType || !formData.businessType) return null;

    const messageContext = {
      businessType: formData.businessType as any,
      eventType: formData.eventType as any,
      data: {
        name: formData.customerName || 'Anonymous',
        location: formData.customerLocation || 'Unknown Location',
        product: formData.productName || 'Product',
        amount: formData.amount ? parseFloat(formData.amount) : undefined
      }
    };

    const message = formData.message || MessageGenerationService.generateMessage(messageContext);
    
    return {
      message,
      icon: getEventIcon(formData.eventType),
      timestamp: new Date(),
      eventType: formData.eventType,
      businessType: formData.businessType
    };
  };

  const getEventIcon = (eventType: string) => {
    const icons: { [key: string]: string } = {
      purchase: '🛒',
      signup: '👤',
      review: '⭐',
      download: '📥',
      subscription: '💎',
      booking: '📅',
      contact: '📧',
      view: '👁️',
      conversion: '🎯',
      visitor: '🌐'
    };
    return icons[eventType] || '🔔';
  };

  const createEvent = async () => {
    try {
      if (!formData.eventType || widgets.length === 0) {
        toast({
          title: 'Validation Error',
          description: 'Please select an event type and ensure you have widgets available',
          variant: 'destructive'
        });
        return;
      }

      const widgetId = widgets[0].id; // Use first available widget
      const eventData = {
        customer_name: formData.customerName || 'Anonymous',
        location: formData.customerLocation,
        product_name: formData.productName,
        amount: formData.amount ? parseFloat(formData.amount) : undefined,
        timestamp: new Date().toISOString(),
        business_type: formData.businessType
      };

      const { error } = await supabase
        .from('events')
        .insert({
          widget_id: widgetId,
          event_type: formData.eventType,
          event_data: eventData,
          user_name: formData.customerName || 'Anonymous',
          user_location: formData.customerLocation,
          message_template: formData.message,
          business_type: formData.businessType as any, // Cast to allow all business types
          source: 'manual',
          status: 'approved'
        });

      if (error) throw error;

      toast({
        title: 'Event Created',
        description: 'Your event has been successfully created',
      });

      setShowCreateForm(false);
      loadData();
      
      // Reset form
      setFormData({
        eventType: '',
        customerName: '',
        customerLocation: '',
        message: '',
        amount: '',
        productName: '',
        businessType: 'saas'
      });
    } catch (error) {
      console.error('Error creating event:', error);
      toast({
        title: 'Error',
        description: 'Failed to create event',
        variant: 'destructive'
      });
    }
  };

  const duplicateEvent = async (event: Event) => {
    try {
        const { error } = await supabase
          .from('events')
          .insert({
            widget_id: event.widget_id,
            event_type: event.event_type,
            event_data: event.event_data,
            user_name: event.user_name,
            user_location: event.user_location,
            message_template: event.message_template,
            business_type: event.business_type as any, // Cast to allow all business types
            source: 'manual' as any, // Cast to allow all source types
            status: 'approved'
          });

      if (error) throw error;

      toast({
        title: 'Event Duplicated',
        description: 'Event has been successfully duplicated',
      });

      loadData();
    } catch (error) {
      console.error('Error duplicating event:', error);
      toast({
        title: 'Error',
        description: 'Failed to duplicate event',
        variant: 'destructive'
      });
    }
  };

  const deleteEvent = async (eventId: string) => {
    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId);

      if (error) throw error;

      toast({
        title: 'Event Deleted',
        description: 'Event has been successfully deleted',
      });

      loadData();
    } catch (error) {
      console.error('Error deleting event:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete event',
        variant: 'destructive'
      });
    }
  };

  const handleBulkImport = async () => {
    if (!csvFile) {
      toast({
        title: 'No File Selected',
        description: 'Please select a CSV file to import',
        variant: 'destructive'
      });
      return;
    }

    try {
      const text = await csvFile.text();
      const lines = text.split('\n');
      const headers = lines[0].split(',').map(h => h.trim());
      
      if (!headers.includes('event_type') || !headers.includes('message')) {
        toast({
          title: 'Invalid CSV Format',
          description: 'CSV must include event_type and message columns',
          variant: 'destructive'
        });
        return;
      }

      const eventsToImport = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        if (values.length >= headers.length && values[0]) {
          const eventData: any = {};
          headers.forEach((header, index) => {
            eventData[header] = values[index] || '';
          });

          eventsToImport.push({
            widget_id: widgets[0]?.id || '',
            event_type: eventData.event_type,
            event_data: eventData,
            user_name: eventData.user_name || 'Anonymous',
            user_location: eventData.user_location || '',
            message_template: eventData.message,
            business_type: selectedBusinessType as any, // Cast to allow all business types
            source: 'manual' as any, // Cast to allow all source types
            status: 'approved'
          });
        }
      }

      if (eventsToImport.length > 0) {
        const { error } = await supabase
          .from('events')
          .insert(eventsToImport);

        if (error) throw error;

        toast({
          title: 'Bulk Import Complete',
          description: `Successfully imported ${eventsToImport.length} events`,
        });

        setShowBulkImport(false);
        setCsvFile(null);
        loadData();
      }
    } catch (error) {
      console.error('Error importing events:', error);
      toast({
        title: 'Import Error',
        description: 'Failed to import events from CSV',
        variant: 'destructive'
      });
    }
  };

  const exportToCSV = () => {
    const csvContent = [
      ['Event Type', 'User Name', 'Location', 'Message', 'Business Type', 'Created At', 'Views', 'Clicks'].join(','),
      ...events.map(event => [
        event.event_type,
        event.user_name || '',
        event.user_location || '',
        event.message_template || '',
        event.business_type || '',
        event.created_at,
        event.views || 0,
        event.clicks || 0
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'events_export.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const filteredEvents = events.filter(event => {
    const matchesSearch = searchTerm === '' || 
      event.event_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (event.message_template || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesWidget = selectedWidget === 'all' || event.widget_id === selectedWidget;
    const matchesType = selectedType === 'all' || event.event_type === selectedType;
    
    return matchesSearch && matchesWidget && matchesType;
  });

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading events...</div>
        </div>
      </div>
    );
  }

  const preview = generatePreview();
  const recommendedFields = getRecommendedFields();

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Enhanced Events Manager</h1>
          <p className="text-muted-foreground">Manage events with smart defaults and preview</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportToCSV} variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          <Button onClick={() => setShowBulkImport(true)} variant="outline" className="gap-2">
            <Upload className="h-4 w-4" />
            Bulk Import
          </Button>
          <Button onClick={() => setShowCreateForm(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Create Event
          </Button>
        </div>
      </div>

      {/* Bulk Import Dialog */}
      <Dialog open={showBulkImport} onOpenChange={setShowBulkImport}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Import Events</DialogTitle>
            <DialogDescription>
              Import events from a CSV file. Required columns: event_type, message
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="csv-file">CSV File</Label>
              <Input
                id="csv-file"
                type="file"
                accept=".csv"
                onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
              />
            </div>
            <div>
              <Label htmlFor="business-type-import">Business Type for Imported Events</Label>
              <Select value={selectedBusinessType} onValueChange={setSelectedBusinessType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {businessTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="text-sm text-muted-foreground">
              CSV Format Example:<br/>
              event_type,message,user_name,user_location<br/>
              purchase,"John bought Pro Plan","John D.","New York"
            </div>
            <div className="flex gap-2">
              <Button onClick={handleBulkImport} disabled={!csvFile}>
                Import Events
              </Button>
              <Button variant="outline" onClick={() => setShowBulkImport(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Enhanced Create Form */}
      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Smart Event Creator
            </CardTitle>
            <CardDescription>
              Create events with AI-powered smart defaults and live preview
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="create" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="create">Create Event</TabsTrigger>
                <TabsTrigger value="preview">Live Preview</TabsTrigger>
              </TabsList>
              
              <TabsContent value="create" className="space-y-4">
                {/* Business Context Selection */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="business-type">Business Type</Label>
                    <Select value={formData.businessType} onValueChange={handleBusinessTypeChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {businessTypes.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="event-type">Event Type</Label>
                    <Select value={formData.eventType} onValueChange={handleEventTypeChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select event type" />
                      </SelectTrigger>
                      <SelectContent>
                        {eventTypes.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            <div className="flex items-center gap-2">
                              <span>{getEventIcon(type.value)}</span>
                              <span>{type.label}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Smart Defaults Fields */}
                {recommendedFields && (
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="text-sm font-medium mb-2">Recommended fields for {formData.businessType} - {formData.eventType}:</h4>
                    <div className="text-xs text-muted-foreground space-y-1">
                      {recommendedFields.required.length > 0 && (
                        <div>Required: {recommendedFields.required.join(', ')}</div>
                      )}
                      {recommendedFields.optional.length > 0 && (
                        <div>Optional: {recommendedFields.optional.join(', ')}</div>
                      )}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="customer-name">Customer Name</Label>
                    <Input
                      id="customer-name"
                      value={formData.customerName}
                      onChange={(e) => setFormData(prev => ({ ...prev, customerName: e.target.value }))}
                      placeholder="e.g., John D., Sarah M."
                    />
                  </div>

                  <div>
                    <Label htmlFor="customer-location">Location</Label>
                    <Input
                      id="customer-location"
                      value={formData.customerLocation}
                      onChange={(e) => setFormData(prev => ({ ...prev, customerLocation: e.target.value }))}
                      placeholder="e.g., New York, San Francisco"
                    />
                  </div>
                </div>

                {(formData.eventType === 'purchase' || formData.eventType === 'subscription') && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="product-name">Product/Service</Label>
                      <Input
                        id="product-name"
                        value={formData.productName}
                        onChange={(e) => setFormData(prev => ({ ...prev, productName: e.target.value }))}
                        placeholder="e.g., Pro Plan, Course"
                      />
                    </div>

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
                  </div>
                )}

                {/* Smart Message Generation */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label htmlFor="message">Message</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={refreshMessages}
                      disabled={isGenerating}
                      className="gap-2"
                    >
                      <RefreshCw className={`h-3 w-3 ${isGenerating ? 'animate-spin' : ''}`} />
                      Refresh
                    </Button>
                  </div>

                  <Textarea
                    id="message"
                    value={formData.message}
                    onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                    placeholder="AI-generated message will appear here..."
                    rows={3}
                  />

                  {variations.length > 0 && (
                    <div className="mt-2 space-y-2">
                      <Label className="text-xs">Suggestions:</Label>
                      {variations.slice(0, 3).map((variation, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, message: variation }))}
                          className="block w-full text-left text-xs p-2 bg-gray-50 hover:bg-gray-100 rounded border"
                        >
                          {variation}
                        </button>
                      ))}
                    </div>
                  )}

                  {validation && !validation.isValid && (
                    <div className="mt-2 text-xs text-amber-600">
                      Missing: {validation.missingRequired.join(', ')}
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button onClick={createEvent} disabled={!formData.eventType}>
                    Create Event
                  </Button>
                  <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                    Cancel
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="preview" className="space-y-4">
                {preview ? (
                  <div className="space-y-4">
                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg">
                      <h4 className="font-medium mb-2">Widget Preview</h4>
                      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 max-w-sm">
                        <div className="flex items-start gap-3">
                          <div className="text-2xl">{preview.icon}</div>
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900">
                              {preview.message}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {preview.timestamp.toLocaleTimeString()}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-sm text-muted-foreground space-y-1">
                      <div><strong>Event Type:</strong> {preview.eventType}</div>
                      <div><strong>Business Type:</strong> {preview.businessType}</div>
                      <div><strong>Message Length:</strong> {preview.message.length} characters</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Select an event type to see preview
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Filter Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filter Events
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="search">Search</Label>
              <Input
                id="search"
                placeholder="Search events..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="widget">Widget</Label>
              <Select value={selectedWidget} onValueChange={setSelectedWidget}>
                <SelectTrigger>
                  <SelectValue placeholder="All widgets" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All widgets</SelectItem>
                  {widgets.map(widget => (
                    <SelectItem key={widget.id} value={widget.id}>
                      {widget.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="type">Event Type</Label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  {eventTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button 
                variant="outline" 
                onClick={loadData}
                className="w-full"
              >
                Refresh
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Events Table */}
      <Card>
        <CardHeader>
          <CardTitle>Events ({filteredEvents.length})</CardTitle>
          <CardDescription>All notification events with bulk operations</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredEvents.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No events found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Stats</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEvents.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span>{getEventIcon(event.event_type)}</span>
                        <Badge variant="outline">{event.event_type}</Badge>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-md">
                      <div className="truncate">{event.message_template || 'No message'}</div>
                      {event.business_type && (
                        <div className="text-xs text-muted-foreground">{event.business_type}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div>{event.user_name || 'Anonymous'}</div>
                      {event.user_location && (
                        <div className="text-xs text-muted-foreground">{event.user_location}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>Views: {event.views || 0}</div>
                        <div>Clicks: {event.clicks || 0}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPreviewEvent(event)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => duplicateEvent(event)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteEvent(event.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={!!previewEvent} onOpenChange={() => setPreviewEvent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Event Preview</DialogTitle>
            <DialogDescription>
              How this event appears in the widget
            </DialogDescription>
          </DialogHeader>
          {previewEvent && (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg">
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                  <div className="flex items-start gap-3">
                    <div className="text-2xl">{getEventIcon(previewEvent.event_type)}</div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">
                        {previewEvent.message_template || `${previewEvent.user_name || 'Someone'} performed a ${previewEvent.event_type}`}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {new Date(previewEvent.created_at).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="text-sm space-y-2">
                <div><strong>Type:</strong> {previewEvent.event_type}</div>
                <div><strong>Business Type:</strong> {previewEvent.business_type || 'Not specified'}</div>
                <div><strong>Source:</strong> {previewEvent.source}</div>
                <div><strong>Status:</strong> {previewEvent.status}</div>
                <div><strong>Performance:</strong> {previewEvent.views || 0} views, {previewEvent.clicks || 0} clicks</div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}