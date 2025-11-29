import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useWebsites, Website } from "@/hooks/useWebsites";
import { supabase } from "@/integrations/supabase/client";

interface WebsiteContextType {
  currentWebsite: Website | null;
  setCurrentWebsite: (website: Website | null) => void;
  websites: Website[];
  isLoading: boolean;
}

const WebsiteContext = createContext<WebsiteContextType | undefined>(undefined);

export const WebsiteProvider = ({ children }: { children: ReactNode }) => {
  const [userId, setUserId] = useState<string>();
  const [userIdLoading, setUserIdLoading] = useState(true);
  const { websites, isLoading: websitesLoading } = useWebsites(userId);
  const [currentWebsite, setCurrentWebsiteState] = useState<Website | null>(null);

  // Combined loading state includes both user ID and websites
  const isLoading = userIdLoading || websitesLoading;

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id);
      setUserIdLoading(false);
    });
  }, []);

  // Load selected website from localStorage when websites are loaded
  useEffect(() => {
    if (!websitesLoading && websites.length > 0) {
      const savedWebsiteId = localStorage.getItem("selectedWebsiteId");
      
      if (savedWebsiteId) {
        const savedWebsite = websites.find(w => w.id === savedWebsiteId);
        if (savedWebsite) {
          setCurrentWebsiteState(savedWebsite);
          return;
        }
      }
      
      // Default to first website if no saved selection or saved website not found
      setCurrentWebsiteState(websites[0]);
      localStorage.setItem("selectedWebsiteId", websites[0].id);
    }
  }, [websites, websitesLoading]);

  const setCurrentWebsite = (website: Website | null) => {
    setCurrentWebsiteState(website);
    if (website) {
      localStorage.setItem("selectedWebsiteId", website.id);
    } else {
      localStorage.removeItem("selectedWebsiteId");
    }
  };

  return (
    <WebsiteContext.Provider
      value={{
        currentWebsite,
        setCurrentWebsite,
        websites,
        isLoading,
      }}
    >
      {children}
    </WebsiteContext.Provider>
  );
};

export const useWebsiteContext = () => {
  const context = useContext(WebsiteContext);
  if (context === undefined) {
    throw new Error("useWebsiteContext must be used within a WebsiteProvider");
  }
  return context;
};
