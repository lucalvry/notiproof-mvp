import React, { createContext, useContext, useEffect, useState } from 'react';
import { useWebsites } from '@/hooks/useWebsites';

interface WebsiteContextValue {
  selectedWebsite: any;
  isLoading: boolean;
  isSwitching: boolean;
  setSelectedWebsite: (website: any) => void;
}

const WebsiteContext = createContext<WebsiteContextValue | undefined>(undefined);

export const useWebsiteContext = () => {
  const context = useContext(WebsiteContext);
  if (!context) {
    throw new Error('useWebsiteContext must be used within a WebsiteProvider');
  }
  return context;
};

export const WebsiteProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { websites, selectedWebsite, setSelectedWebsite: setWebsite, loading } = useWebsites();
  const [isSwitching, setIsSwitching] = useState(false);
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);

  // Detect when website is switching to show immediate loading state
  useEffect(() => {
    const currentId = selectedWebsite?.id || null;
    if (lastSelectedId !== null && lastSelectedId !== currentId) {
      setIsSwitching(true);
      // Clear switching state after a brief moment to allow data loading
      const timer = setTimeout(() => setIsSwitching(false), 100);
      return () => clearTimeout(timer);
    }
    setLastSelectedId(currentId);
  }, [selectedWebsite?.id, lastSelectedId]);

  const handleWebsiteChange = (website: any) => {
    setIsSwitching(true);
    setWebsite(website);
  };

  const value: WebsiteContextValue = {
    selectedWebsite,
    isLoading: loading,
    isSwitching,
    setSelectedWebsite: handleWebsiteChange,
  };

  return (
    <WebsiteContext.Provider value={value}>
      {children}
    </WebsiteContext.Provider>
  );
};