import monstera from "@/assets/plant-monstera.jpg";
import honeysuckle from "@/assets/plant-honeysuckle.jpg";
import defaultPlant from "@/assets/plant-default.jpg";

export type PlantLocation = "indoor" | "outdoor";
export type PlantExposure = "indoor" | "porch" | "outdoor";
export type PotSize = "small" | "medium" | "large";
export type EstablishmentLevel = "infant" | "young" | "mature" | "unsure";
export type LastWateredOption = "today" | "yesterday" | "two_plus" | "bone_dry";

export interface Plant {
  id: string;
  name: string;
  location: PlantLocation;
  exposure: PlantExposure;
  image_url: string | null;
  watering_frequency_days: number;
  watering_volume: number;
  pot_size: PotSize;
  establishment_level: EstablishmentLevel;
  last_watered_date: string | null;
  next_watering_date: string | null;
  rain_delay_until: string | null;
  family_id: string | null;
  ai_care_instructions?: string | null;
}

// Cities where the heat-boost (+25% volume) applies for outdoor/porch plants
const HOT_CITY_KEYWORDS = [
  "atlanta",
  "salt lake",
  "slc",
  "phoenix",
  "tucson",
  "las vegas",
  "houston",
  "dallas",
  "austin",
  "miami",
  "tampa",
  "orlando",
  "san antonio",
];

export function isHotCity(city?: string | null): boolean {
  if (!city) return false;
  const c = city.toLowerCase();
  return HOT_CITY_KEYWORDS.some((k) => c.includes(k));
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

export function isRainDelayed(plant: Plant): boolean {
  if (!plant.rain_delay_until) return false;
  return plant.rain_delay_until >= todayISO();
}

export function needsWateringToday(plant: Plant): boolean {
  if (isRainDelayed(plant)) return false;
  if (!plant.next_watering_date) return true;
  return plant.next_watering_date <= todayISO();
}

export function generateFamilyCode(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let code = "WIZ-";
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/**
 * Format watering volume as user-friendly copy.
 * Renders as a half-cup-precise range or a gallon deep soak above ~3+ cups.
 *   1 cup ≈ 240ml, 1 gallon ≈ 3785ml.
 */
export function formatVolume(ml: number): string {
  if (ml >= 1900) {
    const gal = ml / 3785;
    const rounded = Math.max(0.5, Math.round(gal * 2) / 2);
    return `${rounded} Gallon Deep Soak`;
  }
  const cups = ml / 240;
  // Half-cup precision; never show "0 cups"
  const rounded = Math.max(0.5, Math.round(cups * 2) / 2);
  if (rounded === 1) return "1 Cup";
  return `${rounded} Cups`;
}

export function lastWateredToOffsetDays(opt: LastWateredOption): number {
  switch (opt) {
    case "today":
      return 0;
    case "yesterday":
      return -1;
    case "two_plus":
      return -3;
    case "bone_dry":
      return -7;
  }
}

/**
 * Climate-calibrated watering recommendations.
 *
 * Volume scale (in cups, 240ml each):
 *   Small (<4"):    0.5–1 cup     → ~180ml base (mid 0.75c)
 *   Medium (6-10"): 2–4 cups      → ~720ml base (mid 3c)
 *   Large (>12"):   8–16 cups     → ~2880ml base (mid 12c)
 *
 * +25% boost for outdoor/porch plants in hot cities (Atlanta, SLC, Phoenix, etc).
 *
 * Returns recommended water volume (ml) and frequency (days between waterings).
 */
export function calcWatering(opts: {
  potSize: PotSize;
  establishmentLevel: EstablishmentLevel;
  exposure: PlantExposure;
  baselineFrequencyDays?: number;
  city?: string | null;
}): { volumeMl: number; frequencyDays: number } {
  const { potSize, establishmentLevel, exposure } = opts;

  // Mid-point of the prescribed range, in ml (1 cup = 240ml)
  const baseVolume =
    potSize === "small" ? 0.75 * 240 : potSize === "medium" ? 3 * 240 : 12 * 240;

  const establishmentVolMult =
    establishmentLevel === "infant"
      ? 0.6
      : establishmentLevel === "young"
        ? 0.8
        : establishmentLevel === "mature"
          ? 1.0
          : 0.85;

  // Outdoor exposed needs more; porch (covered) slightly more than indoor
  const exposureVolMult =
    exposure === "outdoor" ? 1.25 : exposure === "porch" ? 1.1 : 1.0;

  // +25% heat boost for outdoor/porch plants in hot cities
  const heatMult =
    (exposure === "outdoor" || exposure === "porch") && isHotCity(opts.city)
      ? 1.25
      : 1.0;

  const volumeMl = Math.round(
    baseVolume * establishmentVolMult * exposureVolMult * heatMult,
  );

  let frequencyDays = potSize === "small" ? 4 : potSize === "medium" ? 7 : 10;

  if (establishmentLevel === "infant") frequencyDays = Math.max(2, frequencyDays - 2);
  else if (establishmentLevel === "young") frequencyDays = Math.max(3, frequencyDays - 1);
  else if (establishmentLevel === "unsure") {
    frequencyDays = Math.max(5, Math.min(7, frequencyDays));
  }

  if (exposure === "outdoor") frequencyDays = Math.max(2, frequencyDays - 2);
  else if (exposure === "porch") frequencyDays = Math.max(3, frequencyDays - 1);

  if (opts.baselineFrequencyDays && opts.baselineFrequencyDays > 0) {
    frequencyDays = Math.round((frequencyDays + opts.baselineFrequencyDays) / 2);
  }

  return { volumeMl, frequencyDays: Math.max(1, Math.min(30, frequencyDays)) };
}

export function greetingForHour(date: Date = new Date()): string {
  const h = date.getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}
