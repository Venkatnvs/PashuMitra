import { Link, useLocation } from "react-router-dom";
import { Home, Utensils, BarChart3, Plus, Microscope } from "lucide-react";
import { cn } from "@/lib/utils";
import { MainLogo } from "@/constants/images";

const MainLayout = ({ children }) => {
  const location = useLocation();
  
  const navItems = [
    { name: "Injection", path: "/", icon: Home },
    { name: "Disease", path: "/disease", icon: Microscope },
    { name: "Feed", path: "/feed", icon: Utensils },
    { name: "Count", path: "/count", icon: BarChart3 },
  ];

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background border-b shadow-sm">
        <div className="container flex items-center justify-between h-12 px-4">
          <Link to="/" className="flex items-center gap-1 py-1">
            <img src={MainLogo} alt="PashuMitra" className="w-10 h-10 rounded-md shadow-sm" />
            <h1 className="text-xl font-bold text-primary">PashuMitra</h1>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container px-4 py-4">
        {children}
      </main>

      {/* Bottom Navigation */}
      <div className="sticky bottom-0 z-10 bg-background border-t">
        <nav className="container flex items-center justify-around h-14">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || 
              (item.path === "/" && location.pathname === "/");
            
            return (
              <Link
                key={item.name}
                to={item.path}
                className={cn(
                  "flex flex-col items-center justify-center w-full h-full",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                <Icon className="w-6 h-6 mb-1" />
                <span className="text-xs">{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
};

export default MainLayout; 