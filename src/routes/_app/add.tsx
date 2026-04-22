import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useRef, useState } from "react";
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
import { addDaysISO, lastWateredToOffsetDays, todayISO } from "@/lib/plants";
import { toast } from "sonner";
import { WizardLoader } from "@/components/WizardLoader";
import {
  PlantWizard,
  getRecommendation,
  type WizardState,
} from "@/components/PlantWizard";
import { CameraCapture } from "@/components/CameraCapture";
import { useProfile } from "@/hooks/useProfile";

export const Route = createFileRoute("/_app/add")({
  head: () => ({
    meta: [
      { title: "Add Plant — Water Wizard" },
      {
        name: "description",
        content: "Snap a photo and let the Water Wizard set it up.",
      },
    ],
  }),
  component: AddPlant,
});

type Step = "capture" | "identifying" | "wizard";

const EMPTY_STATE: WizardState = {
  name: "",
  exposure: "indoor",
  pot_size: "medium",
  establishment_level: "unsure",
  care_instructions: "",
  baseline_frequency_days: 0,
  last_watered: "today",
  fromAI: false,
};

function AddPlant() {
  const navigate = useNavigate();
  const identifyFn = useServerFn(identifyPlant);
  const { profile } = useProfile();
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("capture");
  const [showCamera, setShowCamera] = useState(false);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [imageMime, setImageMime] = useState<string>("image/jpeg");
  const [wizard, setWizard] = useState<WizardState>(EMPTY_STATE);
  const [fellBackToManual, setFellBackToManual] = useState(false);
  const [saving, setSaving] = useState(false);

  const runIdentify = useCallback(
    async (dataUrl: string, mimeType: string) => {
      try {
        const identified = await identifyFn({
          data: {
            imageBase64: dataUrl,
            mimeType,
            city: profile?.city ?? null,
          },
        });
        setWizard({
          name: identified.name,
          exposure: identified.location === "outdoor" ? "outdoor" : "indoor",
          pot_size: identified.pot_size,
          establishment_level: identified.establishment_level,
          care_instructions: identified.care_instructions,
          baseline_frequency_days: identified.watering_frequency_days,
          last_watered: "today",
          fromAI: true,
        });
        setStep("wizard");
      } catch (err) {
        console.error("[add-plant] identify failed", err);
        const msg = err instanceof Error ? err.message : "Identification failed";
        toast.error(msg);
        setWizard({ ...EMPTY_STATE });
        setFellBackToManual(true);
        setStep("wizard");
      }
    },
    [identifyFn, profile?.city],
  );

  const handleFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) {
        toast.error("Please select an image file");
        return;
      }
      console.log("[add-plant] file received", {
        name: file.name,
        type: file.type,
        size: file.size,
      });
      const objectUrl = URL.createObjectURL(file);
      setImageDataUrl(objectUrl);
      setImageMime(file.type);
      setFellBackToManual(false);
      setStep("identifying");

      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        setImageDataUrl(dataUrl);
        URL.revokeObjectURL(objectUrl);
        void runIdentify(dataUrl, file.type);
      };
      reader.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        console.error("[add-plant] FileReader failed", reader.error);
        setImageDataUrl(null);
        setStep("capture");
        toast.error("Could not read photo — please try again");
      };
      reader.readAsDataURL(file);
    },
    [runIdentify],
  );

  // Stable change handler shared by camera + gallery inputs.
  const onInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (f) handleFile(f);
      // Reset value so picking the same photo a second time still fires onChange.
      e.target.value = "";
    },
    [handleFile],
  );

  const startManual = () => {
    setImageDataUrl(null);
    setImageMime("image/jpeg");
    setWizard({ ...EMPTY_STATE });
    setFellBackToManual(false);
    setStep("wizard");
  };

  const reset = () => {
    setImageDataUrl(null);
    setWizard(EMPTY_STATE);
    setFellBackToManual(false);
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
    if (!profile?.family_id) {
      toast.error("You need to join or create a family first");
      navigate({ to: "/welcome" });
      return;
    }
    setSaving(true);
    try {
      let publicUrl: string | null = null;

      if (imageDataUrl && imageDataUrl.startsWith("data:")) {
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

      const rec = getRecommendation(wizard, profile?.city ?? null);
      const today = todayISO();
      // Compute a "last watered" date based on the user's selection
      const offset = lastWateredToOffsetDays(wizard.last_watered);
      const lastWatered = offset === 0 ? today : addDaysISO(today, offset);
      const next = addDaysISO(lastWatered, rec.frequencyDays);

      const { error } = await supabase.from("plants").insert({
        name: wizard.name.trim(),
        location: wizard.exposure === "indoor" ? "indoor" : "outdoor",
        exposure: wizard.exposure,
        pot_size: wizard.pot_size,
        establishment_level: wizard.establishment_level,
        watering_frequency_days: rec.frequencyDays,
        watering_volume: rec.volumeMl,
        image_url: publicUrl,
        last_watered_date: lastWatered,
        next_watering_date: next,
        family_id: profile.family_id,
        ai_care_instructions: wizard.care_instructions?.trim() || null,
      });

      if (error) {
        console.error(error);
        toast.error("Could not save plant");
        return;
      }
      toast.success(`${wizard.name} added to your garden 🌱`);
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
          Snap a photo and the Water Wizard will set it up.
        </p>
      </header>

      {step === "capture" && (
        <div className="space-y-3">
          {/*
            Android 14/15 + iOS Safari quirk: a hidden (display:none) <input
            type="file"> triggered via .click() often does not fire `change`
            after the camera returns, because the input element is detached
            from the layout tree. The fix is to keep the input in the layout
            (visually clipped via sr-only) and trigger it via a real <label>.
          */}
          <Card className="overflow-hidden border-dashed">
            <label
              htmlFor="ww-camera-input"
              className="flex w-full cursor-pointer flex-col items-center justify-center gap-3 px-6 py-12 text-center transition-colors hover:bg-muted/50"
            >
              <input
                id="ww-camera-input"
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="sr-only"
                onChange={onInputChange}
              />
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
            </label>
          </Card>

          <label
            htmlFor="ww-gallery-input"
            className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-input bg-background px-8 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <input
              id="ww-gallery-input"
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={onInputChange}
            />
            <ImageIcon className="h-5 w-5" />
            Choose from gallery
          </label>

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
            fellBackToManual={fellBackToManual}
            city={profile?.city ?? null}
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
