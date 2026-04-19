import { Link, useLocation } from "@tanstack/react-router";
import { Home, Sprout, Plus, Settings as SettingsIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Tab = {
  to: "/" | "/add" | "/inventory" | "/settings";
  label: string;
  icon: typeof Home;
  primary?: boolean;
};

const tabs: Tab[] = [
  { to: "/", label: "Today", icon: Home },
  { to: "/inventory", label: "Plants", icon: Sprout },
  { to: "/add", label: "Add", icon: Plus, primary: true },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
];

export function BottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-md items-stretch justify-around">
        {tabs.map(({ to, label, icon: Icon, primary }) => {
          const active = location.pathname === to;
          if (primary) {
            return (
              <Link
                key={to}
                to={to}
                aria-label={label}
                className="flex flex-1 items-center justify-center py-2"
              >
                <span
                  className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-full text-primary-foreground shadow-[var(--shadow-card)] transition-transform",
                    active && "scale-110",
                  )}
                  style={{ background: "var(--gradient-hero)" }}
                >
                  <Icon className="h-6 w-6" />
                </span>
              </Link>
            );
          }
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-1 py-3 text-xs font-medium transition-colors",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className={cn("h-5 w-5", active && "scale-110 transition-transform")} />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
