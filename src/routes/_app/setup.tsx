import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  CheckCircle2,
  Loader2,
  Share,
  Smartphone,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNotifications } from "@/hooks/useNotifications";
import { toast } from "sonner";

const SETUP_KEY = "ww_setup_complete";

export const Route = createFileRoute("/_app/setup")({
  head: () => ({
    meta: [
      { title: "App Setup — Water Wizard" },
      {
        name: "description",
        content: "Install Water Wizard and enable watering alerts.",
      },
    ],
  }),
  component: AppSetup,
});

type DeviceKind = "ios" | "android" | "desktop";

function detectDevice(): DeviceKind {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent || "";
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "desktop";
}

function AppSetup() {
  const navigate = useNavigate();
  const { permission, supported, enabled, requestAndEnable } = useNotifications();
  const [requesting, setRequesting] = useState(false);
  const [device, setDevice] = useState<DeviceKind>("desktop");

  useEffect(() => {
    setDevice(detectDevice());
  }, []);

  const installCopy = useMemo(() => {
    if (device === "ios") {
      return {
        title: "Install on iPhone / iPad",
        steps: [
          "Tap the Share icon in Safari's toolbar.",
          'Scroll and choose "Add to Home Screen".',
          'Tap "Add" — Water Wizard will appear on your home screen.',
        ],
        icon: <Share className="h-5 w-5" />,
      };
    }
    if (device === "android") {
      return {
        title: "Install on Android",
        steps: [
          "Tap the three-dot menu (⋮) in Chrome.",
          'Choose "Add to Home screen" or "Install app".',
          "Confirm — Water Wizard will install like a native app.",
        ],
        icon: <Smartphone className="h-5 w-5" />,
      };
    }
    return {
      title: "Install on desktop",
      steps: [
        "Look for the install icon in your browser's address bar.",
        'Or open the browser menu and pick "Install Water Wizard".',
      ],
      icon: <Smartphone className="h-5 w-5" />,
    };
  }, [device]);

  const finish = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem(SETUP_KEY, "1");
    }
    toast.success("You're all set 🌿");
    navigate({ to: "/" });
  };

  const handleEnableAlerts = async () => {
    setRequesting(true);
    try {
      const ok = await requestAndEnable();
      if (ok) {
        toast.success("Watering alerts enabled");
      } else if (permission === "denied") {
        toast.error("Notifications blocked — enable them in browser settings");
      } else {
        toast.message("Notifications not enabled");
      }
    } finally {
      setRequesting(false);
    }
  };

  return (
    <div className="space-y-5">
      <header className="text-center">
        <div
          className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl text-primary-foreground shadow-[var(--shadow-card)]"
          style={{ background: "var(--gradient-hero)" }}
        >
          <Sparkles className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-bold">Set up Water Wizard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Install the app and turn on watering alerts so plants never get thirsty.
        </p>
      </header>

      <Card className="space-y-3 p-5">
        <div className="flex items-center gap-2 text-primary">
          {installCopy.icon}
          <p className="text-sm font-semibold">{installCopy.title}</p>
        </div>
        <ol className="space-y-2 pl-1 text-sm text-foreground">
          {installCopy.steps.map((s, i) => (
            <li key={i} className="flex gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-leaf-soft text-[11px] font-semibold text-leaf">
                {i + 1}
              </span>
              <span className="text-muted-foreground">{s}</span>
            </li>
          ))}
        </ol>
      </Card>

      <Card className="space-y-3 p-5">
        <div className="flex items-center gap-2 text-primary">
          <Bell className="h-5 w-5" />
          <p className="text-sm font-semibold">Watering alerts</p>
        </div>
        <p className="text-sm text-muted-foreground">
          Get a friendly nudge when a plant is due for water.
        </p>
        {!supported ? (
          <p className="text-xs italic text-muted-foreground">
            Notifications aren't supported in this browser.
          </p>
        ) : enabled ? (
          <div className="flex items-center gap-2 text-sm text-leaf">
            <CheckCircle2 className="h-4 w-4" />
            Alerts enabled
          </div>
        ) : (
          <Button
            onClick={handleEnableAlerts}
            disabled={requesting || permission === "denied"}
            className="h-11 w-full"
          >
            {requesting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Bell className="mr-2 h-4 w-4" />
            )}
            {permission === "denied" ? "Blocked in browser" : "Enable Watering Alerts"}
          </Button>
        )}
      </Card>

      <Button variant="outline" onClick={finish} className="h-11 w-full">
        {enabled ? "Enter Garden" : "Skip for now / Enter Garden"}
      </Button>
    </div>
  );
}
