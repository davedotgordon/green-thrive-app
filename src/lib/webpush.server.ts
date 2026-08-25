import { ApplicationServerKeys, generatePushHTTPRequest } from "webpush-webcrypto";

export interface PushTarget {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

/**
 * Send a Web Push message. Returns the HTTP status from the push service.
 * 404/410 means the subscription is gone and should be deleted.
 */
export async function sendWebPush(
  target: PushTarget,
  payload: PushPayload,
): Promise<number> {
  const publicKey = process.env["VAPID_PUBLIC_KEY"];
  const privateKey = process.env["VAPID_PRIVATE_KEY"];
  const subject = process.env["VAPID_SUBJECT"] ?? "mailto:reminders@example.com";
  if (!publicKey || !privateKey) throw new Error("VAPID keys are not configured");

  const keys = await ApplicationServerKeys.fromJSON({ publicKey, privateKey });

  const { headers, body, endpoint } = await generatePushHTTPRequest({
    applicationServerKeys: keys,
    payload: JSON.stringify(payload),
    target: {
      endpoint: target.endpoint,
      keys: { p256dh: target.p256dh, auth: target.auth },
    },
    adminContact: subject.replace(/^mailto:/, ""),
    ttl: 12 * 60 * 60,
    urgency: "normal",
  });

  const res = await fetch(endpoint, { method: "POST", headers, body });
  return res.status;
}
