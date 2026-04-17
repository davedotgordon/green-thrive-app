import { Droplets, Check } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getPlantImage, type Plant } from "@/lib/plants";

interface PlantCardProps {
  plant: Plant;
  onWater?: (plant: Plant) => Promise<void> | void;
  variant?: "dashboard" | "inventory";
}

export function PlantCard({ plant, onWater, variant = "dashboard" }: PlantCardProps) {
  const [loading, setLoading] = useState(false);
  const [justWatered, setJustWatered] = useState(false);
  const img = getPlantImage(plant);

  const handleWater = async () => {
    if (!onWater || loading) return;
    setLoading(true);
    try {
      await onWater(plant);
      setJustWatered(true);
      setTimeout(() => setJustWatered(false), 1500);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card
      className="overflow-hidden border-border/60 p-0 shadow-[var(--shadow-card)]"
      style={{ background: "var(--gradient-card)" }}
    >
      <div className="flex items-center gap-4 p-3">
        <img
          src={img}
          alt={plant.name}
          loading="lazy"
          width={64}
          height={64}
          className="h-16 w-16 shrink-0 rounded-xl object-cover ring-1 ring-border/50"
        />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold text-foreground">{plant.name}</h3>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
            <Droplets className="h-3.5 w-3.5" />
            Every {plant.watering_frequency_days} day{plant.watering_frequency_days === 1 ? "" : "s"}
          </p>
        </div>
      </div>
      {variant === "dashboard" && (
        <div className="px-3 pb-3">
          <Button
            onClick={handleWater}
            disabled={loading || justWatered}
            className={cn(
              "h-11 w-full rounded-xl font-semibold transition-all",
              justWatered
                ? "bg-leaf text-primary-foreground"
                : "bg-water text-water-foreground hover:bg-water/90",
            )}
          >
            {justWatered ? (
              <>
                <Check className="mr-2 h-5 w-5" /> Watered!
              </>
            ) : loading ? (
              "Watering..."
            ) : (
              <>
                <Droplets className="mr-2 h-5 w-5" /> Mark as Watered
              </>
            )}
          </Button>
        </div>
      )}
    </Card>
  );
}
