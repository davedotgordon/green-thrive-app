import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, Save, Copy, Bell, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useProfile } from "@/hooks/useProfile";
import { useNotifications } from "@/hooks/useNotifications";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Water Wizard" },
      { name: "description", content: "Update your display name, city, and ZIP code." },
    ],
  }),
  component: Settings,
});

function Settings() {
  const { profile, refetch } = useProfile();
  const navigate = useNavigate();
  const notifications = useNotifications();
  const [displayName, setDisplayName] = useState("");
  const [city, setCity] = useState("");
  const [zip, setZip] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name ?? "");
      setCity(profile.city ?? "");
      setZip(profile.zip ?? "");
    }
  }, [profile]);

  const save = async () => {
    if (!profile) return;
    if (zip && !/^\d{5}$/.test(zip)) {
      toast.error("ZIP code must be 5 digits");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: displayName.trim() || null,
        city: city.trim() || null,
        zip: zip.trim() || null,
      })
      .eq("id", profile.id);
    setSaving(false);
    if (error) {
      toast.error("Could not save");
      return;
    }
    toast.success("Preferences saved! 🌿");
    refetch();
  };

  const copyCode = async () => {
    if (!profile?.family_id) return;
    await navigator.clipboard.writeText(profile.family_id);
    toast.success("Family code copied");
  };

  const toggleNotifications = async (next: boolean) => {
    if (next) {
      const ok = await notifications.requestAndEnable();
      if (ok) {
        toast.success("Notifications enabled 🔔");
        try {
          new Notification("Water Wizard", {
            body: "You'll get reminders when plants need watering.",
          });
        } catch {
          /* some browsers block direct notifications */
        }
      } else if (notifications.permission === "denied") {
        toast.error("Notifications are blocked in your browser settings");
      }
    } else {
      notifications.disable();
      toast("Notifications turned off");
    }
  };

  return (
    <div className="space-y-5">
      <button
        type="button"
        onClick={() => navigate({ to: "/" })}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Garden
      </button>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Personalize your wizard and weather forecast.
        </p>
      </div>

      <Card className="space-y-4 p-5">
        <div className="space-y-2">
          <Label htmlFor="dn">Display name</Label>
          <Input
            id="dn"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="e.g. Sam"
          />
          <p className="text-xs text-muted-foreground">
            Used in the morning greeting on your dashboard.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="city">City &amp; state</Label>
          <Input
            id="city"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="e.g. Atlanta, GA"
          />
          <p className="text-xs text-muted-foreground">
            Helps the wizard tune watering for your local climate.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="zip">ZIP code</Label>
          <Input
            id="zip"
            value={zip}
            onChange={(e) => setZip(e.target.value.replace(/\D/g, "").slice(0, 5))}
            placeholder="30301"
            inputMode="numeric"
            maxLength={5}
          />
          <p className="text-xs text-muted-foreground">
            Used for the rain delay weather check.
          </p>
        </div>

        <Button onClick={save} disabled={saving} className="h-11 w-full">
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save preferences
        </Button>
      </Card>

      <Card className="space-y-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-leaf-soft text-leaf">
              {notifications.enabled ? (
                <Bell className="h-4 w-4" />
              ) : (
                <BellOff className="h-4 w-4" />
              )}
            </div>
            <div>
              <p className="font-semibold">Watering reminders</p>
              <p className="text-xs text-muted-foreground">
                {notifications.supported
                  ? notifications.permission === "denied"
                    ? "Blocked — re-enable in your browser site settings."
                    : "Get a browser notification when a plant needs watering."
                  : "Notifications aren't supported in this browser."}
              </p>
            </div>
          </div>
          <Switch
            checked={notifications.enabled}
            onCheckedChange={toggleNotifications}
            disabled={
              !notifications.supported || notifications.permission === "denied"
            }
            aria-label="Toggle notifications"
          />
        </div>
      </Card>

      {profile?.family_id && (
        <Card className="space-y-2 p-5">
          <Label>Your family code</Label>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-lg bg-muted px-3 py-2 font-mono text-base font-semibold tracking-wider">
              {profile.family_id}
            </code>
            <Button variant="outline" size="icon" onClick={copyCode} aria-label="Copy code">
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Share this code with family members so they can join your garden.
          </p>
        </Card>
      )}

      <Button
        variant="outline"
        onClick={() => navigate({ to: "/" })}
        className="h-11 w-full"
      >
        Back to Garden
      </Button>
    </div>
  );
}
