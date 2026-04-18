import { useMemo } from "react";
import { Sparkles, Droplets, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  calcWatering,
  type EstablishmentLevel,
  type PlantLocation,
  type PotSize,
} from "@/lib/plants";

export interface WizardState {
  name: string;
  location: PlantLocation;
  pot_size: PotSize;
  establishment_level: EstablishmentLevel;
  care_instructions: string;
  /** Soft baseline from AI (days) — used to anchor calculation. 0 = no baseline. */
  baseline_frequency_days: number;
  fromAI: boolean;
}

interface Props {
  state: WizardState;
  setState: (s: WizardState) => void;
  imageDataUrl: string | null;
}

const POT_OPTIONS: { value: PotSize; label: string }[] = [
  { value: "small", label: "Small" },
  { value: "medium", label: "Medium" },
  { value: "large", label: "Large" },
];

const AGE_OPTIONS: { value: EstablishmentLevel; label: string }[] = [
  { value: "infant", label: "Infant" },
  { value: "young", label: "Young" },
  { value: "mature", label: "Mature" },
  { value: "unsure", label: "Unsure" },
];

export function PlantWizard({ state, setState, imageDataUrl }: Props) {
  const recommendation = useMemo(
    () =>
      calcWatering({
        potSize: state.pot_size,
        establishmentLevel: state.establishment_level,
        location: state.location,
        baselineFrequencyDays: state.baseline_frequency_days || undefined,
      }),
    [
      state.pot_size,
      state.establishment_level,
      state.location,
      state.baseline_frequency_days,
    ],
  );

  return (
    <div className="space-y-4">
      {imageDataUrl ? (
        <img
          src={imageDataUrl}
          alt={state.name || "New plant"}
          className="h-56 w-full rounded-2xl object-cover shadow-[var(--shadow-card)]"
        />
      ) : (
        <Card
          className="flex h-40 items-center justify-center text-sm text-muted-foreground"
          aria-label="No photo — manual entry"
        >
          Manual entry — no photo
        </Card>
      )}

      <Card className="space-y-5 p-4">
        {state.fromAI && (
          <div className="flex items-center gap-2 text-primary">
            <Sparkles className="h-4 w-4" />
            <p className="text-xs font-semibold uppercase tracking-wide">
              AI suggestions — review & refine
            </p>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="name">Species name</Label>
          <Input
            id="name"
            value={state.name}
            placeholder="e.g. Monstera Deliciosa"
            onChange={(e) => setState({ ...state, name: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label>Location</Label>
          <div className="grid grid-cols-2 gap-2">
            {(["indoor", "outdoor"] as PlantLocation[]).map((loc) => (
              <button
                key={loc}
                type="button"
                onClick={() => setState({ ...state, location: loc })}
                className={cn(
                  "rounded-lg border px-3 py-2 text-sm font-medium capitalize transition-colors",
                  state.location === loc
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-input bg-background hover:bg-muted",
                )}
              >
                {loc}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Pot size</Label>
          <div className="grid grid-cols-3 gap-2">
            {POT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setState({ ...state, pot_size: opt.value })}
                className={cn(
                  "rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                  state.pot_size === opt.value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-input bg-background hover:bg-muted",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Plant age</Label>
          <div className="grid grid-cols-4 gap-2">
            {AGE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() =>
                  setState({ ...state, establishment_level: opt.value })
                }
                className={cn(
                  "rounded-lg border px-2 py-2 text-xs font-medium transition-colors",
                  state.establishment_level === opt.value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-input bg-background hover:bg-muted",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Live recommendation */}
        <div
          className="rounded-xl p-3 text-primary-foreground shadow-[var(--shadow-card)]"
          style={{ background: "var(--gradient-hero)" }}
        >
          <p className="text-xs font-semibold uppercase tracking-wide opacity-90">
            Atlanta-calibrated recommendation
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div className="flex items-center gap-2">
              <Droplets className="h-5 w-5" />
              <div>
                <p className="text-xs opacity-90">Volume</p>
                <p className="text-base font-bold">{recommendation.volumeMl} ml</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              <div>
                <p className="text-xs opacity-90">Every</p>
                <p className="text-base font-bold">
                  {recommendation.frequencyDays}{" "}
                  {recommendation.frequencyDays === 1 ? "day" : "days"}
                </p>
              </div>
            </div>
          </div>
          {state.establishment_level === "unsure" && (
            <p className="mt-2 text-xs opacity-90">
              Age unknown → using a conservative medium schedule.
            </p>
          )}
        </div>

        {state.care_instructions && (
          <div className="rounded-xl bg-leaf-soft/60 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-leaf">
              Care tip
            </p>
            <p className="mt-1 text-sm text-foreground">{state.care_instructions}</p>
          </div>
        )}
      </Card>
    </div>
  );
}

export function getRecommendation(state: WizardState) {
  return calcWatering({
    potSize: state.pot_size,
    establishmentLevel: state.establishment_level,
    location: state.location,
    baselineFrequencyDays: state.baseline_frequency_days || undefined,
  });
}
