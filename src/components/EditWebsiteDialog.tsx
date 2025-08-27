import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useWebsites, Website } from '@/hooks/useWebsites';
import { toast } from 'sonner';

interface EditWebsiteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  website: Website | null;
}

interface WebsiteForm {
  name: string;
  domain: string;
  business_type: 'ecommerce' | 'saas' | 'services' | 'events' | 'blog' | 'marketing_agency' | 'ngo' | 'education';
}

export const EditWebsiteDialog = ({ open, onOpenChange, website }: EditWebsiteDialogProps) => {
  const { updateWebsite } = useWebsites();
  const [loading, setLoading] = useState(false);
  
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<WebsiteForm>();

  const businessType = watch('business_type');

  // Reset form when website changes
  useEffect(() => {
    if (website) {
      reset({
        name: website.name,
        domain: website.domain,
        business_type: website.business_type as any
      });
    }
  }, [website, reset]);

  const onSubmit = async (data: WebsiteForm) => {
    if (!website) return;
    
    setLoading(true);
    try {
      const updatedWebsite = await updateWebsite(website.id, data);
      if (updatedWebsite) {
        toast.success('Website updated successfully!');
        onOpenChange(false);
      } else {
        toast.error('Failed to update website. Please try again.');
      }
    } catch (error) {
      toast.error('An error occurred while updating the website.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Website</DialogTitle>
          <DialogDescription>
            Update your website information and settings.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Website Name</Label>
            <Input
              id="name"
              {...register('name', { required: 'Website name is required' })}
              placeholder="My Awesome Website"
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="domain">Domain</Label>
            <Input
              id="domain"
              {...register('domain', { 
                required: 'Domain is required',
                pattern: {
                  value: /^[a-zA-Z0-9]([a-zA-Z0-9-]{1,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{1,61}[a-zA-Z0-9])?)*$/,
                  message: 'Please enter a valid domain'
                }
              })}
              placeholder="example.com"
            />
            {errors.domain && (
              <p className="text-sm text-destructive">{errors.domain.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Business Type</Label>
            <Select
              value={businessType}
              onValueChange={(value) => setValue('business_type', value as any)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select business type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ecommerce">E-commerce</SelectItem>
                <SelectItem value="saas">SaaS</SelectItem>
                <SelectItem value="services">Services</SelectItem>
                <SelectItem value="events">Events</SelectItem>
                <SelectItem value="blog">Blog/Content</SelectItem>
                <SelectItem value="marketing_agency">Marketing Agency</SelectItem>
                <SelectItem value="ngo">Non-Profit</SelectItem>
                <SelectItem value="education">Education</SelectItem>
              </SelectContent>
            </Select>
            {errors.business_type && (
              <p className="text-sm text-destructive">{errors.business_type.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Updating...' : 'Update Website'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};