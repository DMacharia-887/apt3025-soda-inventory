import { AppSidebar } from "@/components/layout/AppSidebar";
import { Toaster } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";
import { ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut } from "lucide-react";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user, userRole, signOut } = useAuth();

  const getRoleDisplayName = (role: string | null) => {
    switch (role) {
      case 'loan_officer':
        return 'Loan Officer';
      case 'credit_manager':
        return 'Credit Manager';
      case 'admin':
        return 'Administrator';
      default:
        return 'User';
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="min-h-screen flex w-full bg-background">
      <AppSidebar />
      
      <div className="flex-1 flex flex-col">
        <header className="h-16 flex items-center justify-between border-b bg-card px-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">SK</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-primary">SmartKopa</h1>
              <p className="text-xs text-muted-foreground">Credit Intelligence</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium">
                {user?.user_metadata?.full_name || user?.email || 'User'}
              </p>
              <p className="text-xs text-muted-foreground">
                {getRoleDisplayName(userRole)}
              </p>
            </div>
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <span className="text-primary font-semibold">
                {getInitials(user?.user_metadata?.full_name || user?.email || 'U')}
              </span>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleSignOut}
              className="gap-2"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </header>
        
        <main className="flex-1 p-6 bg-muted/20">
          {children}
        </main>
      </div>
      
      <Toaster />
    </div>
  );
}