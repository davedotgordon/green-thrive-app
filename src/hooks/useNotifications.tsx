import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { pushSupported, subscribeToPush, unsubscribeFromPush } from "@/lib/push";

type PermissionState = "default" | "granted" | "denied" | "unsupported";

export const DEFAULT_REMINDER_HOUR = 8;

export function useNotifications() {
  const [permission, setPermission] = useState<PermissionState>("default");
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reminderHour, setReminderHour] = useState(DEFAULT_REMINDER_HOUR);
  const [endpoint, setEndpoint] = useState<string | null>(null);

  const supported = permission !== "unsupported";

  // Read current permission + whether this device is already registered.
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setPermission("unsupported");
      return;
    }
    setPermission(Notification.permission as PermissionState);

    (async () => {
      if (!pushSupported()) return;
      const registration = await navigator.serviceWorker.getRegistration("/sw.js");
      const sub = await registration?.pushManager.getSubscription();
      if (!sub) return;
      const { data } = await supabase
        .from("push_subscriptions")
        .select("endpoint, reminder_hour")
        .eq("endpoint", sub.endpoint)
        .maybeSingle();
      if (data) {
        setEnabled(true);
        setEndpoint(data.endpoint);
        setReminderHour(data.reminder_hour);
      }
    })().catch(() => {});
  }, []);

  const enable = useCallback(async (hour = DEFAULT_REMINDER_HOUR) => {
    if (!pushSupported()) {
      setPermission("unsupported");
      return { ok: false, error: "This device can't receive push notifications." };
    }
    setBusy(true);
    try {
      let p = Notification.permission as PermissionState;
      if (p === "default") p = (await Notification.requestPermission()) as PermissionState;
      setPermission(p);
      if (p !== "granted") {
        return { ok: false, error: "Notifications are blocked in your browser settings." };
      }

      const payload = await subscribeToPush();
      const { data: userRes } = await supabase.auth.getUser();
      const userId = userRes.user?.id;
      if (!userId) return { ok: false, error: "You need to be signed in." };

      const { error } = await supabase.from("push_subscriptions").upsert(
        {
          user_id: userId,
          endpoint: payload.endpoint,
          p256dh: payload.p256dh,
          auth: payload.auth,
          timezone: payload.timezone,
          reminder_hour: hour,
        },
        { onConflict: "endpoint" },
      );
      if (error) return { ok: false, error: "Could not save this device." };

      setEnabled(true);
      setEndpoint(payload.endpoint);
      setReminderHour(hour);
      return { ok: true as const };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Could not enable reminders." };
    } finally {
      setBusy(false);
    }
  }, []);

  const disable = useCallback(async () => {
    setBusy(true);
    try {
      const ep = (await unsubscribeFromPush()) ?? endpoint;
      if (ep) await supabase.from("push_subscriptions").delete().eq("endpoint", ep);
      setEnabled(false);
      setEndpoint(null);
      return { ok: true as const };
    } finally {
      setBusy(false);
    }
  }, [endpoint]);

  const updateHour = useCallback(
    async (hour: number) => {
      setReminderHour(hour);
      if (!endpoint) return;
      await supabase
        .from("push_subscriptions")
        .update({
          reminder_hour: hour,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York",
        })
        .eq("endpoint", endpoint);
    },
    [endpoint],
  );

  return {
    permission,
    supported,
    enabled,
    busy,
    reminderHour,
    endpoint,
    enable,
    disable,
    updateHour,
  };
}
