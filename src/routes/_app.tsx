import { createFileRoute, Outlet, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect } from "react";
import { LogOut, Sparkles } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  const { user, loading: authLoading, signOut } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate({ to: "/login" });
    }
  }, [user, authLoading, navigate]);

  // Redirect new users (no family yet) to onboarding wizard
  useEffect(() => {
    if (authLoading || profileLoading || !user) return;
    if (!profile?.family_id && location.pathname !== "/welcome") {
      navigate({ to: "/welcome" });
    }
  }, [authLoading, profileLoading, user, profile?.family_id, location.pathname, navigate]);

  if (authLoading || profileLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-10 w-10 animate-pulse rounded-full bg-leaf-soft" />
      </div>
    );
  }

  if (!user) return null;

  const onWelcome = location.pathname === "/welcome";
  const showNav = !onWelcome && profile?.family_id;

  return (
    <div className={`min-h-screen bg-background ${showNav ? "pb-24" : ""}`}>
      <div className="mx-auto max-w-md">
        <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border/60 bg-background/80 px-4 py-3 backdrop-blur-xl">
          <div className="flex items-center gap-2">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg text-primary-foreground"
              style={{ background: "var(--gradient-hero)" }}
            >
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground leading-none">Water Wizard</p>
              <p className="truncate text-xs font-medium leading-tight">
                {profile?.display_name || user.email}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={async () => {
              await signOut();
              navigate({ to: "/login" });
            }}
            aria-label="Sign out"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </header>
        <main className="px-4 py-5">
          <Outlet />
        </main>
      </div>
      {showNav && <BottomNav />}
    </div>
  );
}
