import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

interface TestInput {
  endpoint: string;
}

/**
 * Sends a test push to one of the caller's own registered devices.
 */
export const sendTestPush = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: TestInput) => {
    const endpoint = String(input?.endpoint || "").trim();
    if (!endpoint.startsWith("https://")) throw new Error("Invalid push endpoint");
    return { endpoint };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: sub, error } = await supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("endpoint", data.endpoint)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw new Error("Could not look up this device");
    if (!sub) throw new Error("This device isn't registered for notifications yet");

    const { sendWebPush } = await import("@/lib/webpush.server");
    const status = await sendWebPush(sub, {
      title: "Water Wizard 🌿",
      body: "Test notification — reminders are working!",
      url: "/",
      tag: "aloe-test",
    });

    if (status >= 400) {
      throw new Error(`Push service rejected the message (${status})`);
    }
    return { ok: true, status };
  });
