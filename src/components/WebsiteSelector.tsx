import { useState } from 'react';
import { Plus, Globe, ChevronDown, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useWebsiteContext } from '@/contexts/WebsiteContext';
import { useWebsites } from '@/hooks/useWebsites';
import { AddWebsiteDialog } from './AddWebsiteDialog';
import { EditWebsiteDialog } from './EditWebsiteDialog';
import { WebsiteVerificationStatus } from './WebsiteVerificationStatus';

export const WebsiteSelector = () => {
  const { selectedWebsite, setSelectedWebsite } = useWebsiteContext();
  const { websites } = useWebsites();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);

  if (!selectedWebsite && websites.length === 0) {
    return (
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAddDialog(true)}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Website
        </Button>
        <AddWebsiteDialog open={showAddDialog} onOpenChange={setShowAddDialog} />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="flex items-center gap-2 max-w-[200px]">
            <Globe className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">{selectedWebsite?.name || 'Select Website'}</span>
            <ChevronDown className="h-4 w-4 flex-shrink-0" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[250px]">
          {websites.map((website) => (
            <DropdownMenuItem
              key={website.id}
              onClick={() => setSelectedWebsite(website)}
              className="flex items-center justify-between p-3"
            >
              <div className="flex flex-col gap-1">
                <span className="font-medium">{website.name}</span>
                <span className="text-sm text-muted-foreground">{website.domain}</span>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Badge variant={website.is_verified ? 'default' : 'secondary'} className="text-xs">
                  {website.is_verified ? 'Verified' : 'Unverified'}
                </Badge>
                <span className="text-xs text-muted-foreground capitalize">
                  {website.business_type}
                </span>
              </div>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setShowAddDialog(true)}
            className="flex items-center gap-2 text-primary"
          >
            <Plus className="h-4 w-4" />
            Add New Website
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      
      {selectedWebsite && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowEditDialog(true)}
          className="flex items-center gap-2"
        >
          <Settings className="h-4 w-4" />
        </Button>
      )}
      
      <AddWebsiteDialog open={showAddDialog} onOpenChange={setShowAddDialog} />
      <EditWebsiteDialog 
        open={showEditDialog} 
        onOpenChange={setShowEditDialog}
        website={selectedWebsite}
      />
    </div>
  );
};