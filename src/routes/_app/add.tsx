import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import {
  Camera,
  Image as ImageIcon,
  Check,
  X,
  RotateCcw,
  PencilLine,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useServerFn } from "@tanstack/react-start";
import { identifyPlant } from "@/utils/identifyPlant.functions";
import { supabase } from "@/integrations/supabase/client";
import { addDaysISO, todayISO } from "@/lib/plants";
import { toast } from "sonner";
import { WizardLoader } from "@/components/WizardLoader";
import {
  PlantWizard,
  getRecommendation,
  type WizardState,
} from "@/components/PlantWizard";

export const Route = createFileRoute("/_app/add")({
  head: () => ({
    meta: [
      { title: "Add Plant — Family Plant Tracker" },
      {
        name: "description",
        content: "Snap a photo and let the Plant Wizard set it up.",
      },
    ],
  }),
  component: AddPlant,
});

type Step = "capture" | "identifying" | "wizard";

const EMPTY_STATE: WizardState = {
  name: "",
  location: "indoor",
  pot_size: "medium",
  establishment_level: "unsure",
  care_instructions: "",
  baseline_frequency_days: 0,
  fromAI: false,
};

function AddPlant() {
  const navigate = useNavigate();
  const identifyFn = useServerFn(identifyPlant);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("capture");
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [imageMime, setImageMime] = useState<string>("image/jpeg");
  const [wizard, setWizard] = useState<WizardState>(EMPTY_STATE);
  const [saving, setSaving] = useState(false);

  const handleFile = (file: File) => {
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
        setWizard({
          name: identified.name,
          location: identified.location,
          pot_size: identified.pot_size,
          establishment_level: identified.establishment_level,
          care_instructions: identified.care_instructions,
          baseline_frequency_days: identified.watering_frequency_days,
          fromAI: true,
        });
        setStep("wizard");
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Identification failed";
        toast.error(msg);
        // Fall back to manual wizard with the photo still attached
        setWizard({ ...EMPTY_STATE });
        setStep("wizard");
      }
    };
    reader.readAsDataURL(file);
  };

  const startManual = () => {
    setImageDataUrl(null);
    setImageMime("image/jpeg");
    setWizard({ ...EMPTY_STATE });
    setStep("wizard");
  };

  const reset = () => {
    setImageDataUrl(null);
    setWizard(EMPTY_STATE);
    setStep("capture");
    if (cameraInputRef.current) cameraInputRef.current.value = "";
    if (galleryInputRef.current) galleryInputRef.current.value = "";
  };

  const dataUrlToBlob = (dataUrl: string): Blob => {
    const [header, base64] = dataUrl.split(",");
    const mime = header.match(/:(.*?);/)?.[1] || "image/jpeg";
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  };

  const handleSave = async () => {
    if (!wizard.name.trim()) {
      toast.error("Please give your plant a name");
      return;
    }
    setSaving(true);
    try {
      let publicUrl: string | null = null;

      // Upload photo if we have one
      if (imageDataUrl) {
        const blob = dataUrlToBlob(imageDataUrl);
        const ext = (imageMime.split("/")[1] || "jpg").replace("jpeg", "jpg");
        const path = `${crypto.randomUUID()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("plants")
          .upload(path, blob, { contentType: imageMime, upsert: false });

        if (uploadError) {
          console.error(uploadError);
          toast.error("Could not upload photo");
          setSaving(false);
          return;
        }
        publicUrl = supabase.storage.from("plants").getPublicUrl(path).data.publicUrl;
      }

      const rec = getRecommendation(wizard);
      const today = todayISO();
      const next = addDaysISO(today, rec.frequencyDays);

      const { error } = await supabase.from("plants").insert({
        name: wizard.name.trim(),
        location: wizard.location,
        pot_size: wizard.pot_size,
        establishment_level: wizard.establishment_level,
        watering_frequency_days: rec.frequencyDays,
        watering_volume: rec.volumeMl,
        image_url: publicUrl,
        last_watered_date: today,
        next_watering_date: next,
      });

      if (error) {
        console.error(error);
        toast.error("Could not save plant");
        return;
      }
      toast.success(`${wizard.name} added to your collection 🌱`);
      navigate({ to: "/inventory" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold">Add a plant</h1>
        <p className="text-sm text-muted-foreground">
          Snap a photo and the Plant Wizard will set it up.
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
                <p className="text-xs text-muted-foreground">
                  Use your device camera
                </p>
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

          <Button
            variant="ghost"
            size="lg"
            className="w-full"
            onClick={startManual}
          >
            <PencilLine className="mr-2 h-5 w-5" />
            Skip AI / Manual entry
          </Button>
        </div>
      )}

      {step === "identifying" && (
        <Card className="space-y-2 p-6">
          {imageDataUrl && (
            <img
              src={imageDataUrl}
              alt="Captured plant"
              className="mx-auto h-40 w-40 rounded-2xl object-cover shadow-[var(--shadow-card)]"
            />
          )}
          <WizardLoader />
        </Card>
      )}

      {step === "wizard" && (
        <div className="space-y-4">
          <PlantWizard
            state={wizard}
            setState={setWizard}
            imageDataUrl={imageDataUrl}
          />

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={reset}
              disabled={saving}
              className="flex-1"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Start over
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
