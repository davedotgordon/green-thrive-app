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
 * <240ml -> "X cup" / "X cups"  (1 cup ≈ 240ml)
 * 240–950ml -> "X cups"
 * >950ml -> "X gallon Deep Soak" (1 gallon ≈ 3785ml)
 */
export function formatVolume(ml: number): string {
  if (ml >= 950) {
    const gal = ml / 3785;
    if (gal >= 0.95) {
      const rounded = Math.round(gal * 2) / 2;
      return `${rounded} Gallon Deep Soak`;
    }
  }
  const cups = ml / 240;
  if (cups < 1.25) return "1 Cup";
  return `${Math.round(cups)} Cups`;
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
 * Defaults tuned for hot/humid (Atlanta-like). City affects multipliers.
 *
 * Returns recommended water volume (ml) and frequency (days between waterings).
 */
export function calcWatering(opts: {
  potSize: PotSize;
  establishmentLevel: EstablishmentLevel;
  exposure: PlantExposure;
  baselineFrequencyDays?: number;
}): { volumeMl: number; frequencyDays: number } {
  const { potSize, establishmentLevel, exposure } = opts;

  const baseVolume = potSize === "small" ? 150 : potSize === "medium" ? 300 : 600;

  const establishmentVolMult =
    establishmentLevel === "infant"
      ? 0.5
      : establishmentLevel === "young"
        ? 0.75
        : establishmentLevel === "mature"
          ? 1.0
          : 0.7;

  // Outdoor exposed needs more; porch (covered) slightly more than indoor
  const exposureVolMult =
    exposure === "outdoor" ? 1.35 : exposure === "porch" ? 1.1 : 1.0;

  const volumeMl = Math.round(baseVolume * establishmentVolMult * exposureVolMult);

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
