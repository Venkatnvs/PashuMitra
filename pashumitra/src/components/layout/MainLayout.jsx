import { Link, useLocation } from "react-router-dom";
import { Home, Utensils, BarChart3, Plus, Microscope, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { MainLogo } from "@/constants/images";
import { useEffect, useState } from "react";

const MainLayout = ({ children }) => {
  const location = useLocation();
  
  const navItems = [
    { name: "Injection", path: "/", icon: Home },
    { name: "Disease", path: "/disease", icon: Microscope },
    { name: "Feed", path: "/feed", icon: Utensils },
    { name: "Count", path: "/count", icon: BarChart3 },
  ];

  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "light" || saved === "dark") return saved;
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    return prefersDark ? "dark" : "light";
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background border-b shadow-sm">
        <div className="container flex items-center justify-between h-12 px-4">
          <Link to="/" className="flex items-center gap-1 py-1">
            <img src={MainLogo} alt="PashuMitra" className="w-10 h-10 rounded-md shadow-sm" />
            <h1 className="text-xl font-bold text-primary">PashuMitra</h1>
          </Link>
          <button
            onClick={toggleTheme}
            className="inline-flex items-center justify-center rounded-md h-8 w-8 border hover:bg-muted transition-colors"
            aria-label="Toggle theme"
            title="Toggle theme"
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </button>
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