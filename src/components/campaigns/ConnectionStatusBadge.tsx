import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useWebsiteContext } from "@/contexts/WebsiteContext";
import { CheckCircle2, Link2 } from "lucide-react";

interface ConnectionStatusBadgeProps {
  integrationType: string;
}

export function ConnectionStatusBadge({ integrationType }: ConnectionStatusBadgeProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const { currentWebsite } = useWebsiteContext();

  useEffect(() => {
    const checkConnection = async () => {
      if (!currentWebsite?.id) {
        setLoading(false);
        return;
      }

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        const { data } = await supabase
          .from('integration_connectors')
          .select('id, status')
          .eq('user_id', user.id)
          .eq('website_id', currentWebsite.id)
          .eq('integration_type', integrationType as any)
          .eq('status', 'active')
          .maybeSingle();

        setIsConnected(!!data);
      } catch (error) {
        console.error('Error checking connection:', error);
      } finally {
        setLoading(false);
      }
    };

    checkConnection();
  }, [integrationType, currentWebsite?.id]);

  if (loading) {
    return null;
  }

  if (isConnected) {
    return (
      <Badge variant="outline" className="bg-success/10 text-success border-success/20">
        <CheckCircle2 className="h-3 w-3 mr-1" />
        Connected
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
      <Link2 className="h-3 w-3 mr-1" />
      Connect Required
    </Badge>
  );
}
