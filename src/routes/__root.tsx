import { Outlet, createRootRoute, HeadContent, Scripts, Link } from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/hooks/useAuth";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#4a8a5c" },
      { title: "Water Wizard" },
      { name: "description", content: "Keep your family's plants happy with simple watering reminders." },
      { property: "og:title", content: "Water Wizard" },
      { property: "og:description", content: "Keep your family's plants happy with simple watering reminders." },
      { property: "og:type", content: "website" },
      { name: "twitter:title", content: "Water Wizard" },
      { name: "twitter:description", content: "Keep your family's plants happy with simple watering reminders." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/Ni3PTz9lM7NRjlqVN6ZD8FSUaxk2/social-images/social-1776518077984-Gemini_Generated_Image_pd28dipd28dipd28.webp" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/Ni3PTz9lM7NRjlqVN6ZD8FSUaxk2/social-images/social-1776518077984-Gemini_Generated_Image_pd28dipd28dipd28.webp" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <AuthProvider>
      <Outlet />
      <Toaster position="top-center" />
    </AuthProvider>
  );
}
