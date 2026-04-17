import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Sprout, Droplets } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PlantCard } from "@/components/PlantCard";
import { useAuth } from "@/hooks/useAuth";
import { addDaysISO, needsWateringToday, todayISO, type Plant } from "@/lib/plants";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Family Plant Tracker" },
      { name: "description", content: "Today's watering tasks for your family's plants." },
    ],
  }),
  component: Dashboard,
});

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function Dashboard() {
  const { user } = useAuth();
  const [plants, setPlants] = useState<Plant[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data, error } = await supabase
      .from("plants")
      .select("*")
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

  const dueToday = useMemo(() => plants.filter(needsWateringToday), [plants]);

  const handleWater = async (plant: Plant) => {
    const today = todayISO();
    const next = addDaysISO(today, plant.watering_frequency_days);
    const { error } = await supabase
      .from("plants")
      .update({ last_watered_date: today, next_watering_date: next })
      .eq("id", plant.id);
    if (error) {
      toast.error("Could not update watering");
      return;
    }
    toast.success(`${plant.name} watered! Next: ${next}`);
    setPlants((prev) =>
      prev.map((p) =>
        p.id === plant.id ? { ...p, last_watered_date: today, next_watering_date: next } : p,
      ),
    );
  };

  const name = user?.email?.split("@")[0] ?? "there";

  return (
    <div className="space-y-6">
      <section
        className="rounded-3xl p-5 text-primary-foreground shadow-[var(--shadow-card)]"
        style={{ background: "var(--gradient-hero)" }}
      >
        <p className="text-sm opacity-90">{greeting()},</p>
        <h1 className="text-2xl font-bold capitalize">{name} 🌿</h1>
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
        ) : dueToday.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card py-12 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-leaf-soft">
              <Sprout className="h-6 w-6 text-leaf" />
            </div>
            <p className="font-medium">Nothing to water today</p>
            <p className="mt-1 text-sm text-muted-foreground">Your plants are happy 🌱</p>
          </div>
        ) : (
          <div className="space-y-3">
            {dueToday.map((p) => (
              <PlantCard key={p.id} plant={p} onWater={handleWater} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
