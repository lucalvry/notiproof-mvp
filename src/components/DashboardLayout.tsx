import { Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { DashboardSidebar } from '@/components/DashboardSidebar';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { HelpButton } from '@/components/help/HelpButton';
import { InteractiveTour } from '@/components/help/InteractiveTour';
import { useHelp } from '@/contexts/HelpContext';
import { tours } from '@/data/tours';

export const DashboardLayout = () => {
  const { signOut, profile } = useAuth();
  const { activeTour } = useHelp();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <DashboardSidebar />
        
        <div className="flex-1 flex flex-col">
          <header className="h-16 border-b bg-background flex items-center justify-between px-6">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
              <Logo />
            </div>
            
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                Welcome, {profile?.name}
              </span>
              <HelpButton />
              <Button
                variant="outline"
                size="sm"
                onClick={signOut}
                className="gap-2"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </header>
          
          <main className="flex-1 p-6">
            <Outlet />
          </main>
        </div>
        
        {/* Interactive Tour */}
        {activeTour && tours[activeTour] && (
          <InteractiveTour 
            tour={tours[activeTour]} 
            isActive={!!activeTour} 
          />
        )}
      </div>
    </SidebarProvider>
  );
};