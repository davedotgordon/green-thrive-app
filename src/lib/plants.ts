import monstera from "@/assets/plant-monstera.jpg";
import honeysuckle from "@/assets/plant-honeysuckle.jpg";
import defaultPlant from "@/assets/plant-default.jpg";

export type PlantLocation = "indoor" | "outdoor";
export type PotSize = "small" | "medium" | "large";
export type EstablishmentLevel = "infant" | "young" | "mature" | "unsure";

export interface Plant {
  id: string;
  name: string;
  location: PlantLocation;
  image_url: string | null;
  watering_frequency_days: number;
  watering_volume: number;
  pot_size: PotSize;
  establishment_level: EstablishmentLevel;
  last_watered_date: string | null;
  next_watering_date: string | null;
}

export function getPlantImage(plant: Pick<Plant, "name" | "image_url">): string {
  if (plant.image_url) return plant.image_url;
  const n = plant.name.toLowerCase();
  if (n.includes("monstera")) return monstera;
  if (n.includes("honeysuckle")) return honeysuckle;
  return defaultPlant;
}

export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function addDaysISO(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function needsWateringToday(plant: Plant): boolean {
  if (!plant.next_watering_date) return true;
  return plant.next_watering_date <= todayISO();
}

/**
 * Atlanta, GA climate-calibrated watering recommendations.
 * Atlanta is hot & humid (Köppen Cfa) — humid summers mean indoor pots dry slower
 * than arid climates, but outdoor heat (90°F+) means outdoor plants need more water.
 *
 * Returns recommended water volume (ml) and frequency (days between waterings).
 */
export function calcWatering(opts: {
  potSize: PotSize;
  establishmentLevel: EstablishmentLevel;
  location: PlantLocation;
  baselineFrequencyDays?: number;
}): { volumeMl: number; frequencyDays: number } {
  const { potSize, establishmentLevel, location } = opts;

  // Base volume by pot size (ml)
  const baseVolume = potSize === "small" ? 150 : potSize === "medium" ? 300 : 600;

  // Establishment multiplier — younger plants get less water more often
  const establishmentVolMult =
    establishmentLevel === "infant"
      ? 0.5
      : establishmentLevel === "young"
        ? 0.75
        : establishmentLevel === "mature"
          ? 1.0
          : 0.7; // unsure → conservative

  // Outdoor Atlanta plants need ~30% more volume in summer heat
  const locationVolMult = location === "outdoor" ? 1.3 : 1.0;

  const volumeMl = Math.round(baseVolume * establishmentVolMult * locationVolMult);

  // Base frequency from pot size (larger pots hold moisture longer)
  let frequencyDays = potSize === "small" ? 4 : potSize === "medium" ? 7 : 10;

  // Establishment adjustments
  if (establishmentLevel === "infant") frequencyDays = Math.max(2, frequencyDays - 2);
  else if (establishmentLevel === "young") frequencyDays = Math.max(3, frequencyDays - 1);
  else if (establishmentLevel === "unsure") {
    // Conservative "Medium" — clamp to 5–7 day window
    frequencyDays = Math.max(5, Math.min(7, frequencyDays));
  }

  // Atlanta outdoor heat → water more often
  if (location === "outdoor") frequencyDays = Math.max(2, frequencyDays - 2);

  // Use AI baseline as a soft anchor (average it in if provided & sensible)
  if (opts.baselineFrequencyDays && opts.baselineFrequencyDays > 0) {
    frequencyDays = Math.round((frequencyDays + opts.baselineFrequencyDays) / 2);
  }

  return { volumeMl, frequencyDays: Math.max(1, Math.min(30, frequencyDays)) };
}
