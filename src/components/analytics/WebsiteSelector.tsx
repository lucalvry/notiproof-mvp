import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Globe } from "lucide-react";
import { useWebsites } from "@/hooks/useWebsites";

interface WebsiteSelectorProps {
  userId: string;
  value?: string;
  onValueChange: (value: string) => void;
}

export function WebsiteSelector({ userId, value, onValueChange }: WebsiteSelectorProps) {
  const { websites, isLoading } = useWebsites(userId);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 h-10 px-3 border rounded-md bg-muted animate-pulse">
        <Globe className="h-4 w-4" />
        <span className="text-sm">Loading...</span>
      </div>
    );
  }

  if (!websites || websites.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <Globe className="h-4 w-4 text-muted-foreground" />
      <Select value={value || 'all'} onValueChange={onValueChange}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="All Websites" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Websites</SelectItem>
          {websites.map((website) => (
            <SelectItem key={website.id} value={website.id}>
              {website.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
