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
