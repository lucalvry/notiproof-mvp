import { TestimonialCSVImport } from '@/components/testimonials/TestimonialCSVImport';
import { useState, useEffect } from 'react';
import { useWebsites } from '@/hooks/useWebsites';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle2, XCircle, Star, Search, Filter, Loader2, Eye, ArrowLeft, Home } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TemplatePreview } from '@/components/templates/TemplatePreview';
import { useNavigate } from 'react-router-dom';
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
  author_avatar_url: string | null;
  rating: number;
  message: string;
  status: string;
  source: string;
  created_at: string;
  metadata: any;
}

export default function TestimonialModeration() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string>();
  const { websites } = useWebsites(userId);
  const currentWebsite = websites?.[0]; // Use first website for now
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, []);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRating, setFilterRating] = useState('all');
  const [filterSource, setFilterSource] = useState('all');
  const [activeTab, setActiveTab] = useState('pending');
  const [previewTestimonial, setPreviewTestimonial] = useState<Testimonial | null>(null);

  useEffect(() => {
    if (currentWebsite?.id) {
      fetchTestimonials();
    }
  }, [currentWebsite, activeTab]);

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
      setTestimonials(data || []);
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

  const filteredTestimonials = testimonials.filter(t => {
    const matchesSearch = t.author_name.toLowerCase().includes(search.toLowerCase()) ||
                         t.message.toLowerCase().includes(search.toLowerCase());
    const matchesRating = filterRating === 'all' || t.rating === parseInt(filterRating);
    const matchesSource = filterSource === 'all' || t.source === filterSource;
    return matchesSearch && matchesRating && matchesSource;
  });

  const counts = {
    pending: testimonials.filter(t => t.status === 'pending').length,
    approved: testimonials.filter(t => t.status === 'approved').length,
    rejected: testimonials.filter(t => t.status === 'rejected').length,
  };

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

        <Select value={filterSource} onValueChange={setFilterSource}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            <SelectItem value="form">Form</SelectItem>
            <SelectItem value="import">Import</SelectItem>
            <SelectItem value="api">API</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
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
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div>
                          <h3 className="font-semibold">{testimonial.author_name}</h3>
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
                      <p className="text-xs text-muted-foreground">
                        Submitted {new Date(testimonial.created_at).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="flex gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setPreviewTestimonial(testimonial)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {testimonial.status === 'pending' && (
                        <>
                          <Button
                            variant="default"
                            size="icon"
                            onClick={() => updateStatus(testimonial.id, 'approved')}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="icon"
                            onClick={() => updateStatus(testimonial.id, 'rejected')}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      {testimonial.status === 'approved' && (
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => updateStatus(testimonial.id, 'rejected')}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      )}
                      {testimonial.status === 'rejected' && (
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => updateStatus(testimonial.id, 'approved')}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

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
              <div 
                className="bg-muted/30 rounded-lg p-6"
                dangerouslySetInnerHTML={{
                  __html: `
                    <div class="noti-card testimonial">
                      <div class="noti-header">
                        ${previewTestimonial.author_avatar_url ? `<img src="${previewTestimonial.author_avatar_url}" class="noti-avatar">` : ''}
                        <div>
                          <strong>${previewTestimonial.author_name}</strong>
                          <div class="noti-rating">${'★'.repeat(previewTestimonial.rating)}${'☆'.repeat(5 - previewTestimonial.rating)}</div>
                        </div>
                      </div>
                      <div class="noti-body">
                        <p>${previewTestimonial.message}</p>
                      </div>
                    </div>
                  `
                }}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
