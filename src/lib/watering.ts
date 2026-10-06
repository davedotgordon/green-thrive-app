import { supabase } from "@/integrations/supabase/client";
import { addDaysISO, todayISO, type Plant } from "@/lib/plants";

/**
 * Log a watering: resets the clock from today and clears any rain delay.
 * Returns the updated fields so callers can patch local state.
 */
export async function markPlantWatered(plant: Pick<Plant, "id" | "watering_frequency_days">) {
  const today = todayISO();
  const next = addDaysISO(today, plant.watering_frequency_days);
  const { error } = await supabase
    .from("plants")
    .update({
      last_watered_date: today,
      next_watering_date: next,
      rain_delay_until: null,
    })
    .eq("id", plant.id);
  if (error) throw error;
  return { last_watered_date: today, next_watering_date: next, rain_delay_until: null };
}

/** Retire a plant without deleting it: it leaves active lists but stays in history. */
export async function archivePlant(plantId: string, reason: string | null) {
  const archived_at = new Date().toISOString();
  const { error } = await supabase
    .from("plants")
    .update({ archived_at, archived_reason: reason })
    .eq("id", plantId);
  if (error) throw error;
  return { archived_at, archived_reason: reason };
}

/** Bring an archived plant back; the watering clock restarts from today. */
export async function restorePlant(
  plant: Pick<Plant, "id" | "watering_frequency_days">,
) {
  const today = todayISO();
  const next = addDaysISO(today, plant.watering_frequency_days);
  const patch = {
    archived_at: null,
    archived_reason: null,
    last_watered_date: today,
    next_watering_date: next,
    rain_delay_until: null,
  };
  const { error } = await supabase.from("plants").update(patch).eq("id", plant.id);
  if (error) throw error;
  return patch;
}

/** Permanently remove a plant row. Only offered from the history view. */
export async function deletePlantForever(plantId: string) {
  const { error } = await supabase.from("plants").delete().eq("id", plantId);
  if (error) throw error;
}

/**
 * Fields to write whenever a plant changes exposure: remembers its outdoor spot
 * when it comes inside, restores nothing automatically, and clears any pending move task.
 */
export function exposureTrackingPatch(
  plant: Pick<Plant, "exposure" | "outdoor_exposure">,
  next: Plant["exposure"],
) {
  return {
    outdoor_exposure:
      next === "indoor"
        ? plant.exposure !== "indoor"
          ? plant.exposure
          : (plant.outdoor_exposure ?? null)
        : null,
    move_suggestion: null,
    move_reason: null,
    move_suggested_date: null,
  };
}

/** Target exposure for a pending move task. */
export function moveTarget(plant: Pick<Plant, "move_suggestion" | "outdoor_exposure">) {
  return plant.move_suggestion === "indoor"
    ? ("indoor" as const)
    : (plant.outdoor_exposure ?? "outdoor");
}
