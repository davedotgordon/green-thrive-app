import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Snowflake, Sun, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getPlantImage, type Plant } from "@/lib/plants";
import { moveTarget } from "@/lib/watering";

const EXPOSURE_LABEL = { indoor: "inside", porch: "to the porch", outdoor: "outside" } as const;

interface Props {
  plant: Plant;
  onMoved: (plant: Plant) => Promise<void>;
}

export function MoveTaskCard({ plant, onMoved }: Props) {
  const [busy, setBusy] = useState(false);
  const inward = plant.move_suggestion === "indoor";
  const target = moveTarget(plant);
  const Icon = inward ? Snowflake : Sun;

  const handle = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await onMoved(plant);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card
      className={cn(
        "overflow-hidden border-2 shadow-[var(--shadow-card)]",
        inward ? "border-water/40" : "border-leaf/40",
      )}
    >
      <Link
        to="/plant/$plantId"
        params={{ plantId: plant.id }}
        className="flex items-center gap-4 p-3"
      >
        <img
          src={getPlantImage(plant)}
          alt={plant.name}
          loading="lazy"
          width={64}
          height={64}
          className="h-16 w-16 shrink-0 rounded-xl object-cover ring-1 ring-border/50"
        />
        <div className="min-w-0 flex-1">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
              inward ? "bg-water/15 text-water" : "bg-leaf-soft text-leaf",
            )}
          >
            <Icon className="h-3 w-3" />
            Move {EXPOSURE_LABEL[target]}
          </span>
          <h3 className="mt-1 truncate text-base font-semibold text-foreground">{plant.name}</h3>
          {plant.move_reason && (
            <p className="mt-0.5 text-xs text-muted-foreground">{plant.move_reason}</p>
          )}
        </div>
      </Link>
      <div className="px-3 pb-3">
        <Button
          onClick={handle}
          disabled={busy}
          variant={inward ? "default" : "secondary"}
          className="w-full"
        >
          {busy ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Recalibrating watering...
            </>
          ) : (
            <>
              <Check className="h-4 w-4" /> Mark as moved
            </>
          )}
        </Button>
      </div>
    </Card>
  );
}
