import { useMemo } from "react";
import { Sparkles, Droplets, CalendarDays } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  calcWatering,
  intensityFromVolume,
  intensityLabel,
  type EstablishmentLevel,
  type LastWateredOption,
  type PlantExposure,
  type PotSize,
} from "@/lib/plants";

export interface WizardState {
  name: string;
  exposure: PlantExposure;
  pot_size: PotSize;
  establishment_level: EstablishmentLevel;
  care_instructions: string;
  baseline_frequency_days: number;
  last_watered: LastWateredOption;
  fromAI: boolean;
}

interface Props {
  state: WizardState;
  setState: (s: WizardState) => void;
  imageDataUrl: string | null;
  fellBackToManual?: boolean;
  city?: string | null;
}

const POT_OPTIONS: { value: PotSize; label: string; hint: string }[] = [
  { value: "small", label: "Small", hint: "<4″" },
  { value: "medium", label: "Medium", hint: "6–10″" },
  { value: "large", label: "Large", hint: ">12″" },
];

const AGE_OPTIONS: { value: EstablishmentLevel; label: string }[] = [
  { value: "infant", label: "Infant" },
  { value: "young", label: "Young" },
  { value: "mature", label: "Mature" },
  { value: "unsure", label: "Unsure" },
];

const EXPOSURE_OPTIONS: { value: PlantExposure; label: string; hint: string }[] = [
  { value: "indoor", label: "Indoor", hint: "Inside the house" },
  { value: "porch", label: "Porch", hint: "Covered / sheltered" },
  { value: "outdoor", label: "Outdoor", hint: "Exposed to rain" },
];

const LAST_WATERED_OPTIONS: { value: LastWateredOption; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "two_plus", label: "2+ Days Ago" },
  { value: "bone_dry", label: "Bone Dry" },
];

export function PlantWizard({ state, setState, imageDataUrl, fellBackToManual, city }: Props) {
  const recommendation = useMemo(
    () =>
      calcWatering({
        potSize: state.pot_size,
        establishmentLevel: state.establishment_level,
        exposure: state.exposure,
        baselineFrequencyDays: state.baseline_frequency_days || undefined,
        city: city ?? null,
      }),
    [
      state.pot_size,
      state.establishment_level,
      state.exposure,
      state.baseline_frequency_days,
      city,
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

      {fellBackToManual && (
        <div className="rounded-xl border border-accent/40 bg-accent/10 p-3 text-sm text-accent-foreground">
          The wizard couldn't read this photo — please fill in the details below.
        </div>
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
          <Label>Where will it live?</Label>
          <div className="grid grid-cols-3 gap-2">
            {EXPOSURE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setState({ ...state, exposure: opt.value })}
                className={cn(
                  "flex flex-col items-center gap-0.5 rounded-lg border px-2 py-2 text-sm font-medium transition-colors",
                  state.exposure === opt.value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-input bg-background hover:bg-muted",
                )}
              >
                <span>{opt.label}</span>
                <span className={cn(
                  "text-[10px] font-normal",
                  state.exposure === opt.value ? "opacity-80" : "text-muted-foreground"
                )}>{opt.hint}</span>
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
                  "flex flex-col items-center gap-0.5 rounded-lg border px-2 py-2 text-sm font-medium transition-colors",
                  state.pot_size === opt.value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-input bg-background hover:bg-muted",
                )}
              >
                <span>{opt.label}</span>
                <span className={cn(
                  "text-[10px] font-normal",
                  state.pot_size === opt.value ? "opacity-80" : "text-muted-foreground"
                )}>{opt.hint}</span>
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

        <div className="space-y-2">
          <Label>When was this last watered?</Label>
          <div className="grid grid-cols-2 gap-2">
            {LAST_WATERED_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setState({ ...state, last_watered: opt.value })}
                className={cn(
                  "rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                  state.last_watered === opt.value
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
            Wizard's recommendation
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div className="flex items-center gap-2">
              <Droplets className="h-5 w-5" />
              <div>
                <p className="text-xs opacity-90">Watering</p>
                <p className="text-base font-bold">
                  {intensityLabel(intensityFromVolume(recommendation.volumeMl))}
                </p>
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

export function getRecommendation(state: WizardState, city?: string | null) {
  return calcWatering({
    potSize: state.pot_size,
    establishmentLevel: state.establishment_level,
    exposure: state.exposure,
    baselineFrequencyDays: state.baseline_frequency_days || undefined,
    city: city ?? null,
  });
}
