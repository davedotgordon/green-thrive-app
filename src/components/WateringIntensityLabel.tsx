import { Info } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  intensityLabel,
  type WateringIntensity,
} from "@/lib/plants";

const DEFINITIONS: Record<WateringIntensity, string> = {
  deep_soak:
    "Drench soil until water flows from drainage holes. Let excess drain completely.",
  moderate_drink:
    "Saturate the top half of the soil. Do not soak the bottom.",
  light_sip:
    "Moisten only the top inch of soil or lightly mist the leaves.",
};

interface Props {
  intensity: WateringIntensity;
  /** Use "inline" inside small text, "block" when standing alone (e.g. detail card). */
  variant?: "inline" | "block";
  className?: string;
}

/**
 * Renders the descriptive watering phrase ("Deep Soak" / "Moderate Drink" / "Light Sip")
 * with a muted (i) info popover that explains what the phrase means.
 */
export function WateringIntensityLabel({
  intensity,
  variant = "inline",
  className,
}: Props) {
  const label = intensityLabel(intensity);
  const description = DEFINITIONS[intensity];

  return (
    <span className={"inline-flex items-center gap-1 " + (className ?? "")}>
      <span>{label}</span>
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            aria-label={`What does ${label} mean?`}
            className="inline-flex h-4 w-4 items-center justify-center rounded-full text-muted-foreground/70 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Info className={variant === "block" ? "h-4 w-4" : "h-3.5 w-3.5"} />
          </button>
        </PopoverTrigger>
        <PopoverContent
          side="top"
          align="center"
          className="w-64 text-xs leading-relaxed"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="mb-1 font-semibold">{label}</p>
          <p className="text-muted-foreground">{description}</p>
        </PopoverContent>
      </Popover>
    </span>
  );
}
