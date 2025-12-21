import { TestimonialCSVImport } from '@/components/testimonials/TestimonialCSVImport';
import { EditTestimonialDialog } from '@/components/testimonials/EditTestimonialDialog';
import { useState, useEffect } from 'react';
import { useWebsiteContext } from '@/contexts/WebsiteContext';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CheckCircle2, XCircle, Star, Search, Filter, Loader2, Eye, ArrowLeft, Home, Pencil, Trash2, Download, MoreVertical, CalendarIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TemplatePreview } from '@/components/templates/TemplatePreview';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

interface Testimonial {
  id: string;
  author_name: string;
  author_email: string | null;
  author_company?: string | null;
  author_position?: string | null;
  author_avatar_url: string | null;
  rating: number;
  message: string;
  status: string;
  source: string;
  avatar_url: string | null;
  video_url: string | null;
  created_at: string;
  metadata: any;
  form_id: string | null;
}

export default function TestimonialModeration() {
  const navigate = useNavigate();
  const { currentWebsite, isLoading: websitesLoading } = useWebsiteContext();
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRating, setFilterRating] = useState('all');
  const [filterSource, setFilterSource] = useState('all');
  const [filterMediaType, setFilterMediaType] = useState('all');
  const [filterForm, setFilterForm] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });
  const [activeTab, setActiveTab] = useState('pending');
  const [previewTestimonial, setPreviewTestimonial] = useState<Testimonial | null>(null);
  const [editTestimonial, setEditTestimonial] = useState<Testimonial | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [forms, setForms] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    if (currentWebsite?.id) {
      fetchTestimonials();
      fetchForms();
    }
  }, [currentWebsite, activeTab]);

  async function fetchForms() {
    if (!currentWebsite?.id) return;
    try {
      const { data, error } = await supabase
        .from('testimonial_forms')
        .select('id, name')
        .eq('website_id', currentWebsite.id)
        .order('name');

      if (error) throw error;
      setForms(data || []);
    } catch (error) {
      console.error('Error fetching forms:', error);
    }
  }

  async function fetchTestimonials() {
    if (!currentWebsite?.id) return;

    setLoading(true);
    try {
      let query = supabase
        .from('testimonials')
        .select('*')
        .eq('website_id', currentWebsite.id)
        .order('created_at', { ascending: false });

      if (activeTab !== 'all') {
        query = query.eq('status', activeTab);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Map image_url to avatar_url for backward compatibility
      const mappedData = (data || []).map(item => ({
        ...item,
        avatar_url: item.image_url || null,
      }));
      
      setTestimonials(mappedData as Testimonial[]);
    } catch (error) {
      console.error('Error fetching testimonials:', error);
      toast.error('Failed to load testimonials');
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(id: string, status: 'approved' | 'rejected') {
    try {
      const { error } = await supabase
        .from('testimonials')
        .update({ status })
        .eq('id', id);

      if (error) throw error;

      toast.success(`Testimonial ${status}`);
      fetchTestimonials();
    } catch (error) {
      console.error('Error updating testimonial:', error);
      toast.error('Failed to update testimonial');
    }
  }

  const filteredTestimonials = testimonials
    .filter(t => {
      const matchesSearch = t.author_name.toLowerCase().includes(search.toLowerCase()) ||
                           t.message.toLowerCase().includes(search.toLowerCase());
      const matchesRating = filterRating === 'all' || t.rating === parseInt(filterRating);
      const matchesSource = filterSource === 'all' || t.source === filterSource;
      const matchesForm = filterForm === 'all' || t.form_id === filterForm;
      
      // Media type filter
      const matchesMediaType = filterMediaType === 'all' || 
        (filterMediaType === 'text' && !t.avatar_url && !t.video_url) ||
        (filterMediaType === 'image' && t.avatar_url) ||
        (filterMediaType === 'video' && t.video_url);
      
      // Date range filter
      const matchesDateRange = (!dateRange.from || new Date(t.created_at) >= dateRange.from) &&
                               (!dateRange.to || new Date(t.created_at) <= dateRange.to);
      
      return matchesSearch && matchesRating && matchesSource && matchesMediaType && matchesForm && matchesDateRange;
    })
    .sort((a, b) => {
      if (sortBy === 'date') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === 'rating') return b.rating - a.rating;
      if (sortBy === 'name') return a.author_name.localeCompare(b.author_name);
      return 0;
    });

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredTestimonials.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredTestimonials.map(t => t.id)));
    }
  };

  const handleBulkAction = async (action: 'approve' | 'reject' | 'delete') => {
    if (selectedIds.size === 0) {
      toast.error('No testimonials selected');
      return;
    }

    try {
      const ids = Array.from(selectedIds);
      
      if (action === 'delete') {
        const { error } = await supabase
          .from('testimonials')
          .delete()
          .in('id', ids);
        
        if (error) throw error;
        toast.success(`Deleted ${ids.length} testimonial(s)`);
      } else {
        const { error } = await supabase
          .from('testimonials')
          .update({ status: action === 'approve' ? 'approved' : 'rejected' })
          .in('id', ids);
        
        if (error) throw error;
        toast.success(`${action === 'approve' ? 'Approved' : 'Rejected'} ${ids.length} testimonial(s)`);
      }

      setSelectedIds(new Set());
      fetchTestimonials();
    } catch (error) {
      console.error('Error performing bulk action:', error);
      toast.error('Failed to perform bulk action');
    }
  };

  const handleExportCSV = () => {
    const selectedTestimonials = filteredTestimonials.filter(t => selectedIds.has(t.id));
    const dataToExport = selectedTestimonials.length > 0 ? selectedTestimonials : filteredTestimonials;

    const csv = [
      ['Name', 'Email', 'Company', 'Position', 'Rating', 'Message', 'Status', 'Source', 'Created At'].join(','),
      ...dataToExport.map(t => [
        `"${t.author_name}"`,
        `"${t.author_email || ''}"`,
        `"${t.author_company || ''}"`,
        `"${t.author_position || ''}"`,
        t.rating,
        `"${t.message.replace(/"/g, '""')}"`,
        t.status,
        t.source,
        new Date(t.created_at).toISOString(),
      ].join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `testimonials-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast.success(`Exported ${dataToExport.length} testimonial(s)`);
  };

  const counts = {
    pending: testimonials.filter(t => t.status === 'pending').length,
    approved: testimonials.filter(t => t.status === 'approved').length,
    rejected: testimonials.filter(t => t.status === 'rejected').length,
  };

  if (websitesLoading) {
    return (
      <div className="container mx-auto py-8 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!currentWebsite) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <p className="text-muted-foreground">Please select a website first</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Breadcrumb Navigation */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard">
              <Home className="h-4 w-4" />
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/testimonials">
              Testimonials
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Moderation</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header with Back Button */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Testimonial Moderation</h1>
          <p className="text-muted-foreground">
            Review and approve testimonials for {currentWebsite.name}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => navigate('/testimonials')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Management
        </Button>
      </div>

      {/* CSV Import Section */}
      <TestimonialCSVImport 
        websiteId={currentWebsite.id} 
        onSuccess={fetchTestimonials}
      />

      {/* Enhanced Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search testimonials..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={filterRating} onValueChange={setFilterRating}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Rating" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Ratings</SelectItem>
            <SelectItem value="5">5 Stars</SelectItem>
            <SelectItem value="4">4 Stars</SelectItem>
            <SelectItem value="3">3 Stars</SelectItem>
            <SelectItem value="2">2 Stars</SelectItem>
            <SelectItem value="1">1 Star</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterMediaType} onValueChange={setFilterMediaType}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Media Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="text">Text Only</SelectItem>
            <SelectItem value="image">With Image</SelectItem>
            <SelectItem value="video">With Video</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterForm} onValueChange={setFilterForm}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Form" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Forms</SelectItem>
            {forms.map(form => (
              <SelectItem key={form.id} value={form.id}>{form.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Sort By" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date">Date</SelectItem>
            <SelectItem value="rating">Rating</SelectItem>
            <SelectItem value="name">Name</SelectItem>
          </SelectContent>
        </Select>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-[200px] justify-start text-left">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateRange.from ? (
                dateRange.to ? (
                  <>
                    {format(dateRange.from, "LLL dd")} - {format(dateRange.to, "LLL dd")}
                  </>
                ) : (
                  format(dateRange.from, "LLL dd, yyyy")
                )
              ) : (
                <span>Date Range</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={dateRange.from}
              selected={{ from: dateRange.from, to: dateRange.to }}
              onSelect={(range) => setDateRange({ from: range?.from, to: range?.to })}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>

        <Button variant="outline" onClick={handleExportCSV}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <Card className="p-4 bg-primary/5 border-primary/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">
                {selectedIds.size} testimonial(s) selected
              </span>
              <Button size="sm" variant="outline" onClick={() => setSelectedIds(new Set())}>
                Clear
              </Button>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => handleBulkAction('approve')}>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Approve
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleBulkAction('reject')}>
                <XCircle className="h-4 w-4 mr-2" />
                Reject
              </Button>
              <Button size="sm" variant="destructive" onClick={() => handleBulkAction('delete')}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="pending">
              Pending {counts.pending > 0 && <Badge className="ml-2">{counts.pending}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="approved">
              Approved {counts.approved > 0 && <Badge variant="secondary" className="ml-2">{counts.approved}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="rejected">
              Rejected {counts.rejected > 0 && <Badge variant="outline" className="ml-2">{counts.rejected}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>

          {filteredTestimonials.length > 0 && (
            <div className="flex items-center gap-2">
              <Checkbox
                checked={selectedIds.size === filteredTestimonials.length && filteredTestimonials.length > 0}
                onCheckedChange={toggleSelectAll}
              />
              <span className="text-sm text-muted-foreground">Select All</span>
            </div>
          )}
        </div>

        <TabsContent value={activeTab} className="mt-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredTestimonials.length === 0 ? (
            <Card className="p-12 text-center">
              <p className="text-muted-foreground">No testimonials found</p>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredTestimonials.map((testimonial) => (
                <Card key={testimonial.id} className="p-4">
                  <div className="flex items-start gap-4">
                    {/* Selection Checkbox */}
                    <Checkbox
                      checked={selectedIds.has(testimonial.id)}
                      onCheckedChange={() => toggleSelection(testimonial.id)}
                      className="mt-1"
                    />

                    {/* Avatar */}
                    {testimonial.author_avatar_url && (
                      <img 
                        src={testimonial.author_avatar_url} 
                        alt={testimonial.author_name}
                        className="h-12 w-12 rounded-full object-cover"
                      />
                    )}

                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div>
                          <h3 className="font-semibold">{testimonial.author_name}</h3>
                          {(testimonial.metadata?.company || testimonial.metadata?.position) && (
                            <p className="text-xs text-muted-foreground">
                              {testimonial.metadata?.position && testimonial.metadata?.company 
                                ? `${testimonial.metadata.position} at ${testimonial.metadata.company}`
                                : testimonial.metadata?.company || testimonial.metadata?.position
                              }
                            </p>
                          )}
                          {testimonial.author_email && (
                            <p className="text-xs text-muted-foreground">{testimonial.author_email}</p>
                          )}
                        </div>
                        <div className="flex">
                          {Array.from({ length: testimonial.rating }).map((_, i) => (
                            <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          ))}
                        </div>
                        <Badge variant="secondary">{testimonial.source}</Badge>
                        <Badge variant={
                          testimonial.status === 'approved' ? 'default' :
                          testimonial.status === 'rejected' ? 'destructive' :
                          'secondary'
                        }>
                          {testimonial.status}
                        </Badge>
                      </div>
                      <p className="text-sm mb-3">{testimonial.message}</p>
                      
                      {/* Video Player */}
                      {testimonial.video_url && (
                        <div className="mt-3 mb-3">
                          <video 
                            src={testimonial.video_url} 
                            controls
                            className="w-full max-w-md rounded-lg"
                            style={{ maxHeight: '300px' }}
                          />
                        </div>
                      )}
                      
                      <p className="text-xs text-muted-foreground">
                        Submitted {new Date(testimonial.created_at).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="flex gap-2 ml-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setPreviewTestimonial(testimonial)}>
                            <Eye className="h-4 w-4 mr-2" />
                            Preview
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setEditTestimonial(testimonial)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          {testimonial.status === 'pending' && (
                            <>
                              <DropdownMenuItem onClick={() => updateStatus(testimonial.id, 'approved')}>
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                Approve
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => updateStatus(testimonial.id, 'rejected')}>
                                <XCircle className="h-4 w-4 mr-2" />
                                Reject
                              </DropdownMenuItem>
                            </>
                          )}
                          {testimonial.status === 'approved' && (
                            <DropdownMenuItem onClick={() => updateStatus(testimonial.id, 'rejected')}>
                              <XCircle className="h-4 w-4 mr-2" />
                              Reject
                            </DropdownMenuItem>
                          )}
                          {testimonial.status === 'rejected' && (
                            <DropdownMenuItem onClick={() => updateStatus(testimonial.id, 'approved')}>
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                              Approve
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Preview Dialog */}
      {previewTestimonial && (
        <Dialog open={!!previewTestimonial} onOpenChange={() => setPreviewTestimonial(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Testimonial Preview</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="text-sm">
                <strong>How this will appear in campaigns:</strong>
              </div>
              <div className="bg-muted/30 rounded-lg p-6">
                <div className="flex items-start gap-4">
                  {previewTestimonial.author_avatar_url && (
                    <img 
                      src={previewTestimonial.author_avatar_url} 
                      alt={previewTestimonial.author_name}
                      className="h-16 w-16 rounded-full object-cover"
                    />
                  )}
                  <div className="flex-1">
                    <div className="mb-2">
                      <h3 className="font-semibold text-lg">{previewTestimonial.author_name}</h3>
                      {(previewTestimonial.metadata?.company || previewTestimonial.metadata?.position) && (
                        <p className="text-sm text-muted-foreground">
                          {previewTestimonial.metadata?.position && previewTestimonial.metadata?.company 
                            ? `${previewTestimonial.metadata.position} at ${previewTestimonial.metadata.company}`
                            : previewTestimonial.metadata?.company || previewTestimonial.metadata?.position
                          }
                        </p>
                      )}
                      <div className="flex mt-1">
                        {Array.from({ length: previewTestimonial.rating }).map((_, i) => (
                          <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                        ))}
                      </div>
                    </div>
                    <p className="text-sm mb-3">{previewTestimonial.message}</p>
                    {previewTestimonial.video_url && (
                      <div className="mt-4">
                        <video 
                          src={previewTestimonial.video_url} 
                          controls
                          className="w-full rounded-lg"
                          style={{ maxHeight: '400px' }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Dialog */}
      <EditTestimonialDialog
        testimonial={editTestimonial}
        open={!!editTestimonial}
        onOpenChange={(open) => !open && setEditTestimonial(null)}
        onSuccess={fetchTestimonials}
      />
    </div>
  );
}
