import { useCallback, useEffect, useState } from "react";

type PermissionState = "default" | "granted" | "denied" | "unsupported";

const STORAGE_KEY = "ww_notifications_enabled";

function getInitialPermission(): PermissionState {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  return Notification.permission as PermissionState;
}

export function useNotifications() {
  const [permission, setPermission] = useState<PermissionState>("default");
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const p = getInitialPermission();
    setPermission(p);
    if (typeof window !== "undefined") {
      setEnabled(localStorage.getItem(STORAGE_KEY) === "1" && p === "granted");
    }
  }, []);

  const supported = permission !== "unsupported";

  const requestAndEnable = useCallback(async () => {
    if (!("Notification" in window)) return false;
    let p = Notification.permission as PermissionState;
    if (p === "default") {
      p = (await Notification.requestPermission()) as PermissionState;
    }
    setPermission(p);
    const ok = p === "granted";
    if (ok) {
      localStorage.setItem(STORAGE_KEY, "1");
      setEnabled(true);
    } else {
      localStorage.removeItem(STORAGE_KEY);
      setEnabled(false);
    }
    return ok;
  }, []);

  const disable = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setEnabled(false);
  }, []);

  return { permission, supported, enabled, requestAndEnable, disable };
}
