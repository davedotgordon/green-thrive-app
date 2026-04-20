import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Droplets,
  CalendarDays,
  CloudRain,
  Sparkles,
  Trash2,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import {
  formatVolume,
  getPlantImage,
  isRainDelayed,
  type Plant,
  type PlantExposure,
} from "@/lib/plants";
import { recalibratePlant } from "@/utils/recalibratePlant.functions";
import { refreshAdvice } from "@/utils/refreshAdvice.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/plant/$plantId")({
  head: () => ({
    meta: [
      { title: "Plant — Water Wizard" },
      { name: "description", content: "Adjust this plant's environment and schedule." },
    ],
  }),
  component: PlantDetail,
});

const EXPOSURE_OPTIONS: { value: PlantExposure; label: string; hint: string }[] = [
  { value: "indoor", label: "Indoor", hint: "Inside" },
  { value: "porch", label: "Porch", hint: "Covered" },
  { value: "outdoor", label: "Outdoor", hint: "Exposed" },
];

function PlantDetail() {
  const { plantId } = Route.useParams();
  const navigate = useNavigate();
  const { profile } = useProfile();
  const recalibrateFn = useServerFn(recalibratePlant);
  const refreshAdviceFn = useServerFn(refreshAdvice);

  const [plant, setPlant] = useState<Plant | null>(null);
  const [loading, setLoading] = useState(true);
  const [recalibrating, setRecalibrating] = useState(false);
  const [refreshingAdvice, setRefreshingAdvice] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    supabase
      .from("plants")
      .select("*")
      .eq("id", plantId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) toast.error("Could not load plant");
        setPlant((data as Plant | null) ?? null);
        setLoading(false);
      });
  }, [plantId]);

  const changeExposure = async (next: PlantExposure) => {
    if (!plant || next === plant.exposure || recalibrating) return;

    setRecalibrating(true);
    const previous = plant;
    // optimistic update for the toggle UI
    setPlant({ ...plant, exposure: next });

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

      const { error } = await supabase
        .from("plants")
        .update({
          exposure: next,
          location: next === "indoor" ? "indoor" : "outdoor",
          watering_frequency_days: rec.watering_frequency_days,
          watering_volume: rec.watering_volume_ml,
          // Outdoor plants might already have a rain delay — clear when the
          // user explicitly moves them inside/porch.
          rain_delay_until: next === "outdoor" ? plant.rain_delay_until : null,
        })
        .eq("id", plant.id);

      if (error) {
        setPlant(previous);
        toast.error("Could not save changes");
        return;
      }

      setPlant({
        ...plant,
        exposure: next,
        location: next === "indoor" ? "indoor" : "outdoor",
        watering_frequency_days: rec.watering_frequency_days,
        watering_volume: rec.watering_volume_ml,
        rain_delay_until: next === "outdoor" ? plant.rain_delay_until : null,
      });
      toast.success(rec.rationale || "Schedule recalibrated");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Recalibration failed";
      // Persist the exposure change even if AI fails
      const { error } = await supabase
        .from("plants")
        .update({
          exposure: next,
          location: next === "indoor" ? "indoor" : "outdoor",
        })
        .eq("id", plant.id);
      if (error) {
        setPlant(previous);
        toast.error("Could not save changes");
      } else {
        toast.warning(`${msg} — kept current schedule`);
      }
    } finally {
      setRecalibrating(false);
    }
  };

  const handleDelete = async () => {
    if (!plant) return;
    if (!confirm(`Remove ${plant.name} from your garden?`)) return;
    setDeleting(true);
    const { error } = await supabase.from("plants").delete().eq("id", plant.id);
    setDeleting(false);
    if (error) {
      toast.error("Could not delete plant");
      return;
    }
    toast.success("Plant removed");
    navigate({ to: "/inventory" });
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-56 animate-pulse rounded-2xl bg-muted" />
        <div className="h-32 animate-pulse rounded-2xl bg-muted" />
      </div>
    );
  }

  if (!plant) {
    return (
      <div className="space-y-4 text-center">
        <p>Plant not found.</p>
        <Button onClick={() => navigate({ to: "/inventory" })}>Back to plants</Button>
      </div>
    );
  }

  const img = getPlantImage(plant);
  const rainDelayed = isRainDelayed(plant);

  return (
    <div className="space-y-5">
      <button
        type="button"
        onClick={() => navigate({ to: "/inventory" })}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Garden
      </button>

      <img
        src={img}
        alt={plant.name}
        className="h-56 w-full rounded-2xl object-cover shadow-[var(--shadow-card)]"
      />

      <div>
        <h1 className="text-2xl font-bold">{plant.name}</h1>
        {rainDelayed && (
          <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-water/15 px-2 py-0.5 text-xs font-semibold text-water">
            <CloudRain className="h-3.5 w-3.5" />
            Rain Delay until {plant.rain_delay_until}
          </p>
        )}
      </div>

      {plant.ai_care_instructions && (
        <Card className="space-y-2 p-4" style={{ background: "var(--gradient-card)" }}>
          <div className="flex items-center gap-2 text-primary">
            <Sparkles className="h-4 w-4" />
            <p className="text-xs font-semibold uppercase tracking-wide">
              Wizard's Advice
            </p>
          </div>
          <p className="text-sm leading-relaxed text-foreground">
            {plant.ai_care_instructions}
          </p>
        </Card>
      )}

      <Card className="space-y-3 p-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-leaf-soft/60 p-3">
            <div className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-leaf">
              <Droplets className="h-3.5 w-3.5" /> Volume
            </div>
            <p className="mt-1 text-base font-bold">{formatVolume(plant.watering_volume)}</p>
          </div>
          <div className="rounded-xl bg-leaf-soft/60 p-3">
            <div className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-leaf">
              <CalendarDays className="h-3.5 w-3.5" /> Every
            </div>
            <p className="mt-1 text-base font-bold">
              {plant.watering_frequency_days} day{plant.watering_frequency_days === 1 ? "" : "s"}
            </p>
          </div>
        </div>
        {plant.next_watering_date && (
          <p className="text-xs text-muted-foreground">
            Next watering: <span className="font-medium text-foreground">{plant.next_watering_date}</span>
          </p>
        )}
      </Card>

      <Card className="space-y-3 p-4">
        <Label>Where does it live now?</Label>
        <div className="grid grid-cols-3 gap-2">
          {EXPOSURE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              disabled={recalibrating}
              onClick={() => changeExposure(opt.value)}
              className={cn(
                "flex flex-col items-center gap-0.5 rounded-lg border px-2 py-2 text-sm font-medium transition-colors disabled:opacity-60",
                plant.exposure === opt.value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-input bg-background hover:bg-muted",
              )}
            >
              <span>{opt.label}</span>
              <span className={cn(
                "text-[10px] font-normal",
                plant.exposure === opt.value ? "opacity-80" : "text-muted-foreground"
              )}>{opt.hint}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {recalibrating ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Asking the wizard to recalibrate for {profile?.city || "your climate"}...
            </>
          ) : (
            <>
              <Sparkles className="h-3.5 w-3.5" />
              Changing this re-runs the wizard for {profile?.city || "your climate"}.
            </>
          )}
        </div>
      </Card>

      <Button
        variant="outline"
        onClick={handleDelete}
        disabled={deleting}
        className="w-full text-destructive hover:text-destructive"
      >
        {deleting ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Trash2 className="mr-2 h-4 w-4" />
        )}
        Remove plant
      </Button>
    </div>
  );
}
