import monstera from "@/assets/plant-monstera.jpg";
import honeysuckle from "@/assets/plant-honeysuckle.jpg";
import defaultPlant from "@/assets/plant-default.jpg";

export type PlantLocation = "indoor" | "outdoor";

export interface Plant {
  id: string;
  name: string;
  location: PlantLocation;
  image_url: string | null;
  watering_frequency_days: number;
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
