import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Camera, Image as ImageIcon, Loader2, Sparkles, Check, X, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useServerFn } from "@tanstack/react-start";
import { identifyPlant, type IdentifiedPlant } from "@/utils/identifyPlant.functions";
import { supabase } from "@/integrations/supabase/client";
import { addDaysISO, todayISO } from "@/lib/plants";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/add")({
  head: () => ({
    meta: [
      { title: "Add Plant — Family Plant Tracker" },
      { name: "description", content: "Snap a photo and let AI identify your plant." },
    ],
  }),
  component: AddPlant,
});

type Step = "capture" | "identifying" | "review";

function AddPlant() {
  const navigate = useNavigate();
  const identifyFn = useServerFn(identifyPlant);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("capture");
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [imageMime, setImageMime] = useState<string>("image/jpeg");
  const [result, setResult] = useState<IdentifiedPlant | null>(null);
  const [saving, setSaving] = useState(false);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      setImageDataUrl(dataUrl);
      setImageMime(file.type);
      setStep("identifying");
      try {
        const identified = await identifyFn({
          data: { imageBase64: dataUrl, mimeType: file.type },
        });
        setResult(identified);
        setStep("review");
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Identification failed";
        toast.error(msg);
        setStep("capture");
        setImageDataUrl(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const reset = () => {
    setImageDataUrl(null);
    setResult(null);
    setStep("capture");
    if (cameraInputRef.current) cameraInputRef.current.value = "";
    if (galleryInputRef.current) galleryInputRef.current.value = "";
  };

  const handleSave = async () => {
    if (!result) return;
    setSaving(true);
    const today = todayISO();
    const next = addDaysISO(today, result.watering_frequency_days);
    const { error } = await supabase.from("plants").insert({
      name: result.name,
      location: result.location,
      watering_frequency_days: result.watering_frequency_days,
      image_url: imageDataUrl, // store the photo so user sees their own pic
      last_watered_date: today,
      next_watering_date: next,
    });
    setSaving(false);
    if (error) {
      toast.error("Could not save plant");
      return;
    }
    toast.success(`${result.name} added to your collection 🌱`);
    navigate({ to: "/inventory" });
  };

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold">Add a plant</h1>
        <p className="text-sm text-muted-foreground">
          Snap a photo and AI will identify it for you.
        </p>
      </header>

      {/* Hidden file inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />

      {step === "capture" && (
        <div className="space-y-3">
          <Card className="overflow-hidden border-dashed">
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="flex w-full flex-col items-center justify-center gap-3 px-6 py-12 text-center transition-colors hover:bg-muted/50"
            >
              <div
                className="flex h-16 w-16 items-center justify-center rounded-full text-primary-foreground shadow-[var(--shadow-card)]"
                style={{ background: "var(--gradient-hero)" }}
              >
                <Camera className="h-8 w-8" />
              </div>
              <div>
                <p className="font-semibold">Take a photo</p>
                <p className="text-xs text-muted-foreground">Use your device camera</p>
              </div>
            </button>
          </Card>

          <Button
            variant="outline"
            size="lg"
            className="w-full"
            onClick={() => galleryInputRef.current?.click()}
          >
            <ImageIcon className="mr-2 h-5 w-5" />
            Choose from gallery
          </Button>
        </div>
      )}

      {step === "identifying" && (
        <Card className="flex flex-col items-center justify-center gap-4 p-8 text-center">
          {imageDataUrl && (
            <img
              src={imageDataUrl}
              alt="Captured plant"
              className="h-40 w-40 rounded-2xl object-cover shadow-[var(--shadow-card)]"
            />
          )}
          <div className="flex items-center gap-2 text-primary">
            <Loader2 className="h-5 w-5 animate-spin" />
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold">Identifying your plant...</p>
            <p className="mt-1 text-sm text-muted-foreground">
              AI is analysing the photo. This usually takes a few seconds.
            </p>
          </div>
        </Card>
      )}

      {step === "review" && result && (
        <div className="space-y-4">
          {imageDataUrl && (
            <img
              src={imageDataUrl}
              alt={result.name}
              className="h-56 w-full rounded-2xl object-cover shadow-[var(--shadow-card)]"
            />
          )}

          <Card className="space-y-4 p-4">
            <div className="flex items-center gap-2 text-primary">
              <Sparkles className="h-4 w-4" />
              <p className="text-xs font-semibold uppercase tracking-wide">AI identification</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Plant name</Label>
              <Input
                id="name"
                value={result.name}
                onChange={(e) => setResult({ ...result, name: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <select
                  id="location"
                  value={result.location}
                  onChange={(e) =>
                    setResult({ ...result, location: e.target.value as "indoor" | "outdoor" })
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="indoor">Indoor</option>
                  <option value="outdoor">Outdoor</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="freq">Water every (days)</Label>
                <Input
                  id="freq"
                  type="number"
                  min={1}
                  max={60}
                  value={result.watering_frequency_days}
                  onChange={(e) =>
                    setResult({
                      ...result,
                      watering_frequency_days: Math.max(1, Number(e.target.value) || 1),
                    })
                  }
                />
              </div>
            </div>

            <div className="rounded-xl bg-leaf-soft/60 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-leaf">
                Care tip
              </p>
              <p className="mt-1 text-sm text-foreground">{result.care_instructions}</p>
            </div>
          </Card>

          <div className="flex gap-2">
            <Button variant="outline" onClick={reset} disabled={saving} className="flex-1">
              <RotateCcw className="mr-2 h-4 w-4" />
              Retake
            </Button>
            <Button onClick={handleSave} disabled={saving} className="flex-1">
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-2 h-4 w-4" />
              )}
              Save plant
            </Button>
          </div>

          <Button
            variant="ghost"
            onClick={() => navigate({ to: "/" })}
            className="w-full text-muted-foreground"
          >
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}
