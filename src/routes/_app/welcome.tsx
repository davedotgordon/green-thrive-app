import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Sparkles, Users, PlusCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { generateFamilyCode } from "@/lib/plants";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/welcome")({
  head: () => ({
    meta: [
      { title: "Welcome — Water Wizard" },
      { name: "description", content: "Set up your garden in the Water Wizard." },
    ],
  }),
  component: Welcome,
});

type Step = "name" | "choose" | "join";

function Welcome() {
  const { profile, refetch } = useProfile();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("name");
  const [displayName, setDisplayName] = useState(profile?.display_name ?? "");
  const [joinCode, setJoinCode] = useState("");
  const [saving, setSaving] = useState(false);

  const saveName = async () => {
    const trimmed = displayName.trim();
    if (!trimmed) {
      toast.error("Please enter a display name");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: trimmed })
      .eq("id", profile!.id);
    setSaving(false);
    if (error) {
      toast.error("Could not save name");
      return;
    }
    await refetch();
    setStep("choose");
  };

  const startNew = async () => {
    const code = generateFamilyCode();
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ family_id: code })
      .eq("id", profile!.id);
    setSaving(false);
    if (error) {
      toast.error("Could not create garden");
      return;
    }
    toast.success(`Garden created! Your code: ${code}`);
    await refetch();
    navigate({ to: "/setup" });
  };

  const joinExisting = async () => {
    const code = joinCode.trim().toUpperCase();
    if (!/^WIZ-[A-Z0-9]{4}$/.test(code)) {
      toast.error("Enter a valid code like WIZ-AB12");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ family_id: code })
      .eq("id", profile!.id);
    setSaving(false);
    if (error) {
      toast.error("Could not join garden");
      return;
    }
    toast.success(`Joined garden ${code}! Welcome aboard 🌿`);
    await refetch();
    navigate({ to: "/setup" });
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div
          className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl text-primary-foreground shadow-[var(--shadow-card)]"
          style={{ background: "var(--gradient-hero)" }}
        >
          <Sparkles className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-bold">Welcome to Water Wizard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Let's set up your garden in two quick steps.
        </p>
      </div>

      {step === "name" && (
        <Card className="space-y-4 p-5">
          <div className="space-y-2">
            <Label htmlFor="dn">What should we call you?</Label>
            <Input
              id="dn"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Sam"
              autoFocus
            />
          </div>
          <Button onClick={saveName} disabled={saving} className="h-11 w-full">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Continue
          </Button>
        </Card>
      )}

      {step === "choose" && (
        <div className="space-y-3">
          <Card className="space-y-3 p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-leaf-soft">
                <PlusCircle className="h-5 w-5 text-leaf" />
              </div>
              <div className="flex-1">
                <p className="font-semibold">Start a new garden</p>
                <p className="text-xs text-muted-foreground">
                  We'll generate a code (e.g. WIZ-AB12) you can share with family.
                </p>
              </div>
            </div>
            <Button onClick={startNew} disabled={saving} className="h-11 w-full">
              Start New Garden
            </Button>
          </Card>

          <Card className="space-y-3 p-5">
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl text-primary-foreground"
                style={{ background: "var(--gradient-pomegranate)" }}
              >
                <Users className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="font-semibold">Join an existing family</p>
                <p className="text-xs text-muted-foreground">
                  Enter the WIZ-XXXX code a family member shared with you.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => setStep("join")}
              className="h-11 w-full"
            >
              I have a code
            </Button>
          </Card>
        </div>
      )}

      {step === "join" && (
        <Card className="space-y-4 p-5">
          <div className="space-y-2">
            <Label htmlFor="code">Family code</Label>
            <Input
              id="code"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="WIZ-AB12"
              maxLength={8}
              autoFocus
              className="font-mono uppercase tracking-wider"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setStep("choose")}
              className="flex-1"
            >
              Back
            </Button>
            <Button onClick={joinExisting} disabled={saving} className="flex-1">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Join
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
