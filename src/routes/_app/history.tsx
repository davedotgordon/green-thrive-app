import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Archive, RotateCcw, Trash2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getPlantImage, type Plant } from "@/lib/plants";
import { deletePlantForever, restorePlant } from "@/lib/watering";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/history")({
  head: () => ({
    meta: [
      { title: "Garden History — Water Wizard" },
      {
        name: "description",
        content: "Past plants you've grown, archived with the story of how they ended.",
      },
      { property: "og:title", content: "Garden History — Water Wizard" },
      {
        property: "og:description",
        content: "Remember the annuals and past plants that lived in your garden.",
      },
    ],
  }),
  component: History,
});

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function lifespan(plant: Plant): string | null {
  if (!plant.created_at || !plant.archived_at) return null;
  const start = new Date(plant.created_at).getTime();
  const end = new Date(plant.archived_at).getTime();
  const days = Math.max(1, Math.round((end - start) / 86400000));
  if (days < 60) return `${days} day${days === 1 ? "" : "s"} in the garden`;
  const months = Math.round(days / 30);
  if (months < 24) return `${months} months in the garden`;
  return `${Math.round(days / 365)} years in the garden`;
}

function History() {
  const [plants, setPlants] = useState<Plant[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("plants")
      .select("*")
      .not("archived_at", "is", null)
      .order("archived_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) toast.error("Could not load garden history");
        else setPlants((data ?? []) as Plant[]);
        setLoading(false);
      });
  }, []);

  const byYear = useMemo(() => {
    const groups = new Map<string, Plant[]>();
    for (const p of plants) {
      const year = p.archived_at ? new Date(p.archived_at).getFullYear().toString() : "—";
      groups.set(year, [...(groups.get(year) ?? []), p]);
    }
    return [...groups.entries()];
  }, [plants]);

  const handleRestore = async (plant: Plant) => {
    setBusyId(plant.id);
    try {
      await restorePlant(plant);
      setPlants((prev) => prev.filter((p) => p.id !== plant.id));
      toast.success(`${plant.name} is back in your garden`);
    } catch {
      toast.error("Could not restore that plant");
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (plant: Plant) => {
    if (!confirm(`Delete ${plant.name} forever? This can't be undone.`)) return;
    setBusyId(plant.id);
    try {
      await deletePlantForever(plant.id);
      setPlants((prev) => prev.filter((p) => p.id !== plant.id));
      toast.success("Deleted forever");
    } catch {
      toast.error("Could not delete that plant");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-5">
      <Link
        to="/inventory"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Garden
      </Link>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Garden History</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Plants you've grown in the past, kept for the memories.
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      ) : plants.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 p-8 text-center">
          <Archive className="h-8 w-8 text-muted-foreground" />
          <p className="font-semibold">No past plants yet</p>
          <p className="text-sm text-muted-foreground">
            When an annual finishes its season, archive it instead of removing it and it
            will live here.
          </p>
        </Card>
      ) : (
        byYear.map(([year, list]) => (
          <div key={year} className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {year}
            </p>
            {list.map((plant) => (
              <Card
                key={plant.id}
                className="overflow-hidden border-border/60 p-0 shadow-[var(--shadow-card)]"
                style={{ background: "var(--gradient-card)" }}
              >
                <div className="flex items-center gap-4 p-3">
                  <img
                    src={getPlantImage(plant)}
                    alt={plant.name}
                    loading="lazy"
                    width={64}
                    height={64}
                    className="h-16 w-16 shrink-0 rounded-xl object-cover opacity-80 grayscale ring-1 ring-border/50"
                  />
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-base font-semibold">{plant.name}</h2>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {plant.archived_reason ?? "Archived"}
                      {plant.archived_at ? ` · ${formatDate(plant.archived_at)}` : ""}
                    </p>
                    {lifespan(plant) && (
                      <p className="mt-0.5 text-[11px] text-muted-foreground/80">
                        {lifespan(plant)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 px-3 pb-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleRestore(plant)}
                    disabled={busyId === plant.id}
                  >
                    {busyId === plant.id ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <RotateCcw className="mr-2 h-4 w-4" />
                    )}
                    Restore
                  </Button>
                  <Button
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDelete(plant)}
                    disabled={busyId === plant.id}
                    aria-label={`Delete ${plant.name} forever`}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete forever
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        ))
      )}
    </div>
  );
}
