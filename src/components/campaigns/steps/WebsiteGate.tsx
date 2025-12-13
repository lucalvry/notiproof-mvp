import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Globe, CheckCircle2, AlertCircle, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface WebsiteGateProps {
  selectedWebsiteId: string | null;
  onWebsiteSelect: (websiteId: string) => void;
}

interface Website {
  id: string;
  name: string;
  domain: string;
  is_verified: boolean;
}

export function WebsiteGate({ selectedWebsiteId, onWebsiteSelect }: WebsiteGateProps) {
  const [websites, setWebsites] = useState<Website[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchWebsites();
  }, []);

  async function fetchWebsites() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('websites')
        .select('id, name, domain, is_verified')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWebsites(data || []);

      // Auto-select if only one website
      if (data && data.length === 1 && !selectedWebsiteId) {
        onWebsiteSelect(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching websites:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleAddWebsite = () => {
    navigate('/websites');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-sm text-muted-foreground">Loading websites...</div>
      </div>
    );
  }

  if (websites.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Globe className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Websites Added</h3>
          <p className="text-sm text-muted-foreground mb-6">
            Add your first website to create notifications
          </p>
          <Button onClick={handleAddWebsite}>
            <Plus className="h-4 w-4 mr-2" />
            Add Website
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Select Website</h3>
        <p className="text-sm text-muted-foreground">
          Choose which website this notification will run on
        </p>
      </div>

      {!selectedWebsiteId && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please select a website to continue
          </AlertDescription>
        </Alert>
      )}

      {selectedWebsiteId && (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            Website selected. Continue to choose integrations.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {websites.map(website => (
          <Card
            key={website.id}
            className={`cursor-pointer transition-all ${
              selectedWebsiteId === website.id
                ? 'ring-2 ring-primary'
                : 'hover:border-primary/50'
            }`}
            onClick={() => onWebsiteSelect(website.id)}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Globe className="h-5 w-5 mt-0.5 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium truncate">{website.name}</p>
                    {selectedWebsiteId === website.id && (
                      <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate mb-2">
                    {website.domain}
                  </p>
                  <Badge variant={website.is_verified ? 'default' : 'secondary'} className="text-xs">
                    {website.is_verified ? 'Verified' : 'Unverified'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-center">
        <Button variant="outline" size="sm" onClick={handleAddWebsite}>
          <Plus className="h-4 w-4 mr-2" />
          Add Another Website
        </Button>
      </div>
    </div>
  );
}
