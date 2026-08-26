import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { sendWebPush } from "@/lib/webpush.server";

function localParts(timezone: string): { hour: number; date: string } {
  const now = new Date();
  let tz = timezone;
  let fmt: Intl.DateTimeFormat;
  try {
    fmt = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
    });
  } catch {
    tz = "UTC";
    fmt = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
    });
  }
  const parts = fmt.formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  const hour = parseInt(get("hour"), 10) % 24;
  return { hour, date: `${get("year")}-${get("month")}-${get("day")}` };
}

export const Route = createFileRoute("/api/public/hooks/send-watering-reminders")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apikey =
          request.headers.get("apikey") ??
          request.headers.get("authorization")?.replace("Bearer ", "");
        const allowed = [
          process.env["SUPABASE_ANON_KEY"],
          process.env["SUPABASE_PUBLISHABLE_KEY"],
        ].filter(Boolean);
        if (!apikey || !allowed.includes(apikey)) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        const supabase = createClient<Database>(
          process.env["SUPABASE_URL"]!,
          process.env["SUPABASE_SERVICE_ROLE_KEY"]!,
          { auth: { persistSession: false, autoRefreshToken: false } },
        );

        const { data: subs, error } = await supabase
          .from("push_subscriptions")
          .select("id, user_id, endpoint, p256dh, auth, reminder_hour, timezone, last_sent_date");

        if (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

        let sent = 0;
        let skipped = 0;
        const removed: string[] = [];

        for (const sub of subs ?? []) {
          const { hour, date } = localParts(sub.timezone);
          // Fire as soon as the local time has reached the requested hour,
          // once per local day. Tolerates missed/late cron ticks.
          if (hour < sub.reminder_hour || sub.last_sent_date === date) {
            skipped++;
            continue;
          }

          const { data: profile } = await supabase
            .from("profiles")
            .select("family_id")
            .eq("id", sub.user_id)
            .maybeSingle();

          if (!profile?.family_id) {
            skipped++;
            continue;
          }

          const { data: plants } = await supabase
            .from("plants")
            .select("name, next_watering_date, rain_delay_until")
            .is("archived_at", null)
            .eq("family_id", profile.family_id);

          const due = (plants ?? []).filter(
            (p) =>
              (!p.rain_delay_until || p.rain_delay_until < date) &&
              (!p.next_watering_date || p.next_watering_date <= date),
          );

          if (due.length === 0) {
            await supabase
              .from("push_subscriptions")
              .update({ last_sent_date: date })
              .eq("id", sub.id);
            skipped++;
            continue;
          }

          const names = due
            .slice(0, 3)
            .map((p) => p.name)
            .join(", ");
          const extra = due.length > 3 ? ` +${due.length - 3} more` : "";

          try {
            const status = await sendWebPush(sub, {
              title: `${due.length} plant${due.length === 1 ? "" : "s"} need${due.length === 1 ? "s" : ""} water today`,
              body: `${names}${extra}`,
              url: "/",
              tag: "watering-reminder",
            });

            if (status === 404 || status === 410) {
              await supabase.from("push_subscriptions").delete().eq("id", sub.id);
              removed.push(sub.id);
              continue;
            }

            if (status < 400) {
              sent++;
              await supabase
                .from("push_subscriptions")
                .update({ last_sent_date: date })
                .eq("id", sub.id);
            }
          } catch (e) {
            console.error("push failed", e);
          }
        }

        return new Response(
          JSON.stringify({ ok: true, sent, skipped, removed: removed.length }),
          { headers: { "Content-Type": "application/json" } },
        );
      },
    },
  },
});
