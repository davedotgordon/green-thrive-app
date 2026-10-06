import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Sprout, Droplets, CloudRain } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PlantCard } from "@/components/PlantCard";
import { useProfile } from "@/hooks/useProfile";
import { useServerFn } from "@tanstack/react-start";
import { recalibratePlant } from "@/utils/recalibratePlant.functions";
import { MoveTaskCard } from "@/components/MoveTaskCard";
import { exposureTrackingPatch, moveTarget } from "@/lib/watering";
import {
  addDaysISO,
  greetingForHour,
  needsWateringToday,
  nextWateringFrom,
  todayISO,
  type Plant,
} from "@/lib/plants";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/")({
  head: () => ({
    meta: [
      { title: "Today — Water Wizard" },
      { name: "description", content: "Today's watering tasks for your plants." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { profile } = useProfile();
  const recalibrateFn = useServerFn(recalibratePlant);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [loading, setLoading] = useState(true);
  const [rainfall, setRainfall] = useState<number | null>(null);

  const load = async () => {
    const { data, error } = await supabase
      .from("plants")
      .select("*")
      .is("archived_at", null)
      .order("next_watering_date", { ascending: true });
    if (error) {
      toast.error("Could not load plants");
    } else {
      setPlants((data ?? []) as Plant[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  // Rain/forecast come from the daily backend weather pass
  useEffect(() => {
    supabase
      .from("family_weather")
      .select("rainfall_24h")
      .maybeSingle()
      .then(({ data }) => {
        if (data) setRainfall(Number(data.rainfall_24h));
      });
  }, []);

  const dueToday = useMemo(() => plants.filter(needsWateringToday), [plants]);
  const moves = useMemo(() => plants.filter((p) => p.move_suggestion), [plants]);

  const handleMoved = async (plant: Plant) => {
    const next = moveTarget(plant);
    let schedule: Partial<Plant> = {};
    try {
      const rec = await recalibrateFn({
        data: {
          name: plant.name,
          exposure: next,
          pot_size: plant.pot_size,
          establishment_level: plant.establishment_level,
          city: profile?.city ?? null,
        },
      });
      schedule = {
        watering_frequency_days: rec.watering_frequency_days,
        watering_volume: rec.watering_volume_ml,
        next_watering_date: nextWateringFrom(plant.last_watered_date, rec.watering_frequency_days),
      };
    } catch {
      toast.warning("Couldn't recalibrate — kept current watering schedule");
    }
    const patch = {
      exposure: next,
      location: next === "indoor" ? ("indoor" as const) : ("outdoor" as const),
      rain_delay_until: next === "outdoor" ? plant.rain_delay_until : null,
      ...schedule,
      ...exposureTrackingPatch(plant, next),
    };
    const { error } = await supabase.from("plants").update(patch).eq("id", plant.id);
    if (error) {
      toast.error("Could not save the move");
      return;
    }
    toast.success(`${plant.name} moved ${next === "indoor" ? "inside" : "out"} 🪴`);
    setPlants((prev) => prev.map((p) => (p.id === plant.id ? { ...p, ...patch } : p)));
  };

  const handleWater = async (plant: Plant) => {
    const today = todayISO();
    const next = addDaysISO(today, plant.watering_frequency_days);
    const { error } = await supabase
      .from("plants")
      .update({ last_watered_date: today, next_watering_date: next, rain_delay_until: null })
      .eq("id", plant.id);
    if (error) {
      toast.error("Could not update watering");
      return;
    }
    toast.success(`${plant.name} watered! Next: ${next}`);
    setPlants((prev) =>
      prev.map((p) =>
        p.id === plant.id
          ? { ...p, last_watered_date: today, next_watering_date: next, rain_delay_until: null }
          : p,
      ),
    );
  };

  const name = profile?.display_name || "friend";

  return (
    <div className="space-y-6">
      <section
        className="rounded-3xl p-5 text-primary-foreground shadow-[var(--shadow-card)]"
        style={{ background: "var(--gradient-hero)" }}
      >
        <p className="text-sm opacity-90">{greetingForHour()},</p>
        <h1 className="text-2xl font-bold">{name}! 🌿</h1>
        <div className="mt-4 flex items-center gap-2 rounded-2xl bg-white/15 px-3 py-2 backdrop-blur-sm">
          <Droplets className="h-4 w-4" />
          <p className="text-sm font-medium">
            {loading
              ? "Loading..."
              : dueToday.length === 0
                ? "All caught up — no plants need watering today!"
                : `${dueToday.length} plant${dueToday.length === 1 ? "" : "s"} need${dueToday.length === 1 ? "s" : ""} watering today`}
          </p>
        </div>
        {rainfall !== null && rainfall > 0.05 && (
          <div className="mt-2 flex items-center gap-2 rounded-2xl bg-white/15 px-3 py-2 backdrop-blur-sm">
            <CloudRain className="h-4 w-4" />
            <p className="text-sm font-medium">
              {rainfall}" of rain in the last 24h
              {rainfall >= 0.25 && " — outdoor plants snoozed"}
            </p>
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 px-1 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Today's tasks
        </h2>
        {loading ? (
          <div className="space-y-3">
            {[0, 1].map((i) => (
              <div key={i} className="h-32 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : dueToday.length === 0 && moves.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card py-12 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-leaf-soft">
              <Sprout className="h-6 w-6 text-leaf" />
            </div>
            <p className="font-medium">Nothing to water today</p>
            <p className="mt-1 text-sm text-muted-foreground">Your plants are happy 🌱</p>
          </div>
        ) : (
          <div className="space-y-3">
            {moves.map((p) => (
              <MoveTaskCard key={`move-${p.id}`} plant={p} onMoved={handleMoved} />
            ))}
            {dueToday.map((p) => (
              <PlantCard key={p.id} plant={p} onWater={handleWater} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
