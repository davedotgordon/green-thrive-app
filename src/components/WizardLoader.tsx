import { useEffect, useState } from "react";
import { Sprout } from "lucide-react";

const PHRASES = [
  "Consulting the Elder Ferns...",
  "Measuring local humidity...",
  "Counting leaves...",
  "Whispering to the roots...",
  "Brewing a sip of rainwater...",
  "Asking the bees for a second opinion...",
  "Polishing the chlorophyll...",
];

export function WizardLoader() {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % PHRASES.length), 1800);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center gap-5 py-10 text-center">
      <div className="relative">
        <div
          className="absolute inset-0 animate-ping rounded-full opacity-40"
          style={{ background: "var(--gradient-hero)" }}
        />
        <div
          className="relative flex h-20 w-20 items-center justify-center rounded-full text-primary-foreground shadow-[var(--shadow-card)]"
          style={{ background: "var(--gradient-hero)" }}
        >
          <Sprout className="h-10 w-10 animate-pulse" />
        </div>
      </div>
      <div className="min-h-[2.5rem]">
        <p
          key={idx}
          className="animate-fade-in text-base font-semibold text-foreground"
        >
          {PHRASES[idx]}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          The Water Wizard is hard at work 🌿
        </p>
      </div>
    </div>
  );
}
