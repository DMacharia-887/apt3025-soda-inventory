import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  UserPlus,
  Users,
  FileCheck,
  BarChart3,
  Settings,
  TrendingUp,
  CheckCircle,
} from "lucide-react";
import { useAuth, UserRole } from "@/contexts/AuthContext";

const loanOfficerItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "New Credit Check", url: "/credit-check", icon: UserPlus },
  { title: "Borrowers", url: "/borrowers", icon: Users },
];

const creditManagerItems = [
  { title: "Applications", url: "/applications", icon: FileCheck },
  { title: "Approvals", url: "/approvals", icon: CheckCircle },
];

const adminItems = [
  { title: "System Settings", url: "/settings", icon: Settings },
  { title: "User Management", url: "/users", icon: Users },
];

export function AppSidebar() {
  const { userRole } = useAuth();
  
  const getNavClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
      isActive 
        ? "bg-primary text-primary-foreground" 
        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
    }`;

  const hasAccess = (allowedRoles: UserRole[]) => {
    return userRole && allowedRoles.includes(userRole);
  };

  return (
    <aside className="w-64 bg-card border-r border-border h-full">
      <div className="p-6 space-y-6">
        {/* Core Functions Section - All roles */}
        <div>
          <h3 className="text-primary font-semibold text-sm mb-3">
            Core Functions
          </h3>
          <nav className="space-y-1">
            {loanOfficerItems.map((item) => (
              <NavLink
                key={item.title}
                to={item.url}
                className={getNavClass}
                end={item.url === "/"}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                <span className="font-medium">{item.title}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Management Section - Credit Manager & Admin only */}
        {hasAccess(['credit_manager', 'admin']) && (
          <div>
            <h3 className="text-primary font-semibold text-sm mb-3">
              Management
            </h3>
            <nav className="space-y-1">
              {creditManagerItems.map((item) => (
                <NavLink
                  key={item.title}
                  to={item.url}
                  className={getNavClass}
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  <span className="font-medium">{item.title}</span>
                </NavLink>
              ))}
            </nav>
          </div>
        )}

        {/* Administration Section - Admin only */}
        {hasAccess(['admin']) && (
          <div>
            <h3 className="text-primary font-semibold text-sm mb-3">
              Administration
            </h3>
            <nav className="space-y-1">
              {adminItems.map((item) => (
                <NavLink
                  key={item.title}
                  to={item.url}
                  className={getNavClass}
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  <span className="font-medium">{item.title}</span>
                </NavLink>
              ))}
            </nav>
          </div>
        )}
      </div>
    </aside>
  );
}