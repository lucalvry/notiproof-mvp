import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Star, Upload, Loader2, CheckCircle2, X, Image as ImageIcon, Video as VideoIcon, Camera } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const testimonialSchema = z.object({
  author_name: z.string().min(2, 'Name must be at least 2 characters'),
  author_email: z.string().email('Invalid email').optional().or(z.literal('')),
  rating: z.number().min(1).max(5),
  message: z.string().min(10, 'Message must be at least 10 characters'),
  author_company: z.string().optional(),
  author_position: z.string().optional(),
});

type TestimonialFormData = z.infer<typeof testimonialSchema>;

interface TestimonialCollectionFormProps {
  websiteId: string;
  formId?: string;
  formConfig?: any;
  welcomeMessage?: string;
  thankYouMessage?: string;
  onSuccess?: () => void;
  showCompanyFields?: boolean;
}

export function TestimonialCollectionForm({
  websiteId,
  formId,
  formConfig,
  welcomeMessage,
  thankYouMessage,
  onSuccess,
  showCompanyFields = false,
}: TestimonialCollectionFormProps) {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);

  const form = useForm<TestimonialFormData>({
    resolver: zodResolver(testimonialSchema),
    defaultValues: {
      author_name: '',
      author_email: '',
      rating: 5,
      message: '',
      author_company: '',
      author_position: '',
    },
  });

  const currentRating = form.watch('rating');

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image must be less than 5MB');
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Video must be less than 10MB');
        return;
      }
      setVideoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setVideoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const file = new File([blob], 'recorded-video.webm', { type: 'video/webm' });
        setVideoFile(file);
        setVideoPreview(URL.createObjectURL(blob));
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setRecording(true);
    } catch (error) {
      toast.error('Failed to access camera. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && recording) {
      mediaRecorder.stop();
      setRecording(false);
      setMediaRecorder(null);
    }
  };

  const uploadFile = async (file: File, type: 'image' | 'video'): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${websiteId}/${type}s/${fileName}`;

      const { error: uploadError, data } = await supabase.storage
        .from('testimonials')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('testimonials')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error(`Error uploading ${type}:`, error);
      toast.error(`Failed to upload ${type}`);
      return null;
    }
  };

  async function onSubmit(data: TestimonialFormData) {
    setSubmitting(true);
    try {
      let imageUrl: string | null = null;
      let videoUrl: string | null = null;

      // Upload image if present
      if (imageFile) {
        imageUrl = await uploadFile(imageFile, 'image');
      }

      // Upload video if present
      if (videoFile) {
        videoUrl = await uploadFile(videoFile, 'video');
      }

      const { error } = await supabase.from('testimonials').insert({
        website_id: websiteId,
        source: 'form',
        author_name: data.author_name,
        author_email: data.author_email || null,
        rating: data.rating,
        message: data.message,
        image_url: imageUrl,
        video_url: videoUrl,
        metadata: {
          form_id: formId,
          company: data.author_company,
          position: data.author_position,
        },
        status: 'pending',
      });

      if (error) throw error;

      setSubmitted(true);
      toast.success('Thank you for your testimonial!');
      onSuccess?.();
    } catch (error) {
      console.error('Error submitting testimonial:', error);
      toast.error('Failed to submit testimonial');
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <Card className="p-8 text-center">
        <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-4" />
        <h3 className="text-2xl font-semibold mb-2">Thank You!</h3>
        <p className="text-muted-foreground">
          {thankYouMessage || 'Your testimonial has been submitted and is pending review.'}
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">
          {formConfig?.title || 'Share Your Experience'}
        </h2>
        <p className="text-muted-foreground">
          {welcomeMessage || "We'd love to hear about your experience with our product"}
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="rating"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Rating *</FormLabel>
                <FormControl>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <button
                        key={rating}
                        type="button"
                        onClick={() => field.onChange(rating)}
                        onMouseEnter={() => setHoveredRating(rating)}
                        onMouseLeave={() => setHoveredRating(0)}
                        className="transition-transform hover:scale-110"
                      >
                        <Star
                          className={`h-8 w-8 ${
                            rating <= (hoveredRating || currentRating)
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-muted-foreground'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="message"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Your Testimonial *</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Tell us about your experience..."
                    className="min-h-[120px]"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="author_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Your Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="author_email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email (Optional)</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="john@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {showCompanyFields && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="author_company"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Company Name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="author_position"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Position (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="CEO" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}

          {/* Media Upload Section */}
          <div className="space-y-4 border-t pt-6">
            <h3 className="font-semibold text-sm">Add Media (Optional)</h3>
            
            {/* Image Upload */}
            <div className="space-y-2">
              <Label htmlFor="image-upload" className="text-sm">Upload Image</Label>
              {!imagePreview ? (
                <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition-colors cursor-pointer">
                  <input
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <label htmlFor="image-upload" className="cursor-pointer">
                    <ImageIcon className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Click to upload image (max 5MB)
                    </p>
                  </label>
                </div>
              ) : (
                <div className="relative">
                  <img src={imagePreview} alt="Preview" className="w-full h-48 object-cover rounded-lg" />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={() => {
                      setImageFile(null);
                      setImagePreview(null);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* Video Upload */}
            <div className="space-y-2">
              <Label className="text-sm">Upload or Record Video</Label>
              {!videoPreview ? (
                <div className="space-y-2">
                  <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition-colors cursor-pointer">
                    <input
                      id="video-upload"
                      type="file"
                      accept="video/*"
                      onChange={handleVideoUpload}
                      className="hidden"
                    />
                    <label htmlFor="video-upload" className="cursor-pointer">
                      <VideoIcon className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        Click to upload video (max 10MB)
                      </p>
                    </label>
                  </div>
                  <div className="text-center">
                    <span className="text-xs text-muted-foreground">or</span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={recording ? stopRecording : startRecording}
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    {recording ? 'Stop Recording' : 'Record Video'}
                  </Button>
                </div>
              ) : (
                <div className="relative">
                  <video src={videoPreview} controls className="w-full h-48 rounded-lg bg-black" />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={() => {
                      setVideoFile(null);
                      setVideoPreview(null);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Testimonial'
            )}
          </Button>
        </form>
      </Form>
    </Card>
  );
}
