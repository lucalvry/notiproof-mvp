import { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Globe, Filter, CheckCircle, XCircle } from 'lucide-react';
import { useWebsites } from '@/hooks/useWebsites';

interface WebsiteAnalyticsFilterProps {
  selectedWebsiteId?: string;
  onWebsiteChange: (websiteId: string | null) => void;
  showVerificationStatus?: boolean;
  className?: string;
}

export const WebsiteAnalyticsFilter = ({ 
  selectedWebsiteId, 
  onWebsiteChange, 
  showVerificationStatus = true,
  className = "" 
}: WebsiteAnalyticsFilterProps) => {
  const { websites, loading } = useWebsites();
  const [selectedWebsite, setSelectedWebsite] = useState<string | null>(selectedWebsiteId || null);

  useEffect(() => {
    if (selectedWebsiteId !== selectedWebsite) {
      setSelectedWebsite(selectedWebsiteId || null);
    }
  }, [selectedWebsiteId]);

  const handleWebsiteChange = (websiteId: string | null) => {
    setSelectedWebsite(websiteId);
    onWebsiteChange(websiteId);
  };

  const getWebsiteStats = () => {
    const total = websites.length;
    const verified = websites.filter(w => w.is_verified).length;
    const unverified = total - verified;
    
    return { total, verified, unverified };
  };

  const stats = getWebsiteStats();
  const currentWebsite = websites.find(w => w.id === selectedWebsite);

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div className="animate-pulse">
            <div className="h-4 bg-muted rounded w-32 mb-2"></div>
            <div className="h-8 bg-muted rounded w-48"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filter by Website</span>
          </div>
          {showVerificationStatus && (
            <div className="flex items-center gap-2 text-xs">
              <Badge variant="outline" className="text-green-600">
                <CheckCircle className="h-3 w-3 mr-1" />
                {stats.verified} Verified
              </Badge>
              {stats.unverified > 0 && (
                <Badge variant="outline" className="text-amber-600">
                  <XCircle className="h-3 w-3 mr-1" />
                  {stats.unverified} Unverified
                </Badge>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Select value={selectedWebsite || "all"} onValueChange={(value) => handleWebsiteChange(value === "all" ? null : value)}>
            <SelectTrigger className="min-w-[200px]">
              <SelectValue>
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {selectedWebsite 
                      ? currentWebsite?.name || "Unknown Website"
                      : "All Websites"
                    }
                  </span>
                </div>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <span>All Websites ({stats.total})</span>
                </div>
              </SelectItem>
              {websites.map((website) => (
                <SelectItem key={website.id} value={website.id}>
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium">{website.name}</div>
                        <div className="text-xs text-muted-foreground">{website.domain}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      {website.is_verified ? (
                        <CheckCircle className="h-3 w-3 text-green-600" />
                      ) : (
                        <XCircle className="h-3 w-3 text-amber-600" />
                      )}
                      <Badge 
                        variant={website.is_verified ? "default" : "secondary"} 
                        className="text-xs"
                      >
                        {website.is_verified ? "Verified" : "Unverified"}
                      </Badge>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedWebsite && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleWebsiteChange(null)}
            >
              Clear Filter
            </Button>
          )}
        </div>

        {currentWebsite && showVerificationStatus && !currentWebsite.is_verified && (
          <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded border">
            <XCircle className="h-3 w-3 inline mr-1" />
            This website is not verified. Analytics may include unfiltered data.
          </div>
        )}
      </CardContent>
    </Card>
  );
};