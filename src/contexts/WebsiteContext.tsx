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
    const getUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error) {
          console.warn('Auth error, clearing session:', error.message);
          // Clear invalid session - this handles "Invalid Refresh Token" errors
          await supabase.auth.signOut();
          setUserId(undefined);
        } else {
          setUserId(user?.id);
        }
      } catch (err) {
        console.error('Unexpected auth error:', err);
        setUserId(undefined);
      } finally {
        setUserIdLoading(false);
      }
    };

    getUser();

    // Listen for auth state changes to handle session refresh failures
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'TOKEN_REFRESHED') {
        setUserId(session?.user?.id);
      } else if (event === 'SIGNED_OUT') {
        setUserId(undefined);
        localStorage.removeItem("selectedWebsiteId");
      }
    });

    return () => subscription.unsubscribe();
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
