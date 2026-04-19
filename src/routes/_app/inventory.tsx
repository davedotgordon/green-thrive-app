import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Home, TreePine, Umbrella } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PlantCard } from "@/components/PlantCard";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import type { Plant } from "@/lib/plants";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/inventory")({
  head: () => ({
    meta: [
      { title: "Plants — Water Wizard" },
      { name: "description", content: "All your indoor, porch, and outdoor plants." },
    ],
  }),
  component: Inventory,
});

function Section({
  title,
  icon: Icon,
  plants,
  defaultOpen,
}: {
  title: string;
  icon: typeof Home;
  plants: Plant[];
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen ?? true);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="group flex w-full items-center justify-between rounded-2xl bg-card px-4 py-3 shadow-[var(--shadow-soft)] ring-1 ring-border/60 transition hover:bg-accent/40">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-leaf-soft">
            <Icon className="h-5 w-5 text-leaf" />
          </div>
          <div className="text-left">
            <p className="font-semibold">{title}</p>
            <p className="text-xs text-muted-foreground">
              {plants.length} plant{plants.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>
        <ChevronDown className={cn("h-5 w-5 text-muted-foreground transition-transform", open && "rotate-180")} />
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-3 space-y-3">
        {plants.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">No plants here yet.</p>
        ) : (
          plants.map((p) => <PlantCard key={p.id} plant={p} variant="inventory" />)
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

function Inventory() {
  const [plants, setPlants] = useState<Plant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("plants")
      .select("*")
      .order("name")
      .then(({ data, error }) => {
        if (error) toast.error("Could not load plants");
        else setPlants((data ?? []) as Plant[]);
        setLoading(false);
      });
  }, []);

  const indoor = useMemo(() => plants.filter((p) => p.exposure === "indoor"), [plants]);
  const porch = useMemo(() => plants.filter((p) => p.exposure === "porch"), [plants]);
  const outdoor = useMemo(() => plants.filter((p) => p.exposure === "outdoor"), [plants]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Plants</h1>
        <p className="mt-1 text-sm text-muted-foreground">All plants in your home and garden.</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      ) : (
        <div className="space-y-5">
          <Section title="Indoor" icon={Home} plants={indoor} defaultOpen />
          <Section title="Porch (Covered)" icon={Umbrella} plants={porch} defaultOpen />
          <Section title="Outdoor (Exposed)" icon={TreePine} plants={outdoor} defaultOpen />
        </div>
      )}
    </div>
  );
}
