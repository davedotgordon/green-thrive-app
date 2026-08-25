import { useState } from "react";
import { Archive, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ARCHIVE_REASONS } from "@/lib/plants";

interface ArchivePlantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plantName: string;
  onConfirm: (reason: string | null) => Promise<void>;
}

export function ArchivePlantDialog({
  open,
  onOpenChange,
  plantName,
  onConfirm,
}: ArchivePlantDialogProps) {
  const [reason, setReason] = useState<string>(ARCHIVE_REASONS[0]);
  const [saving, setSaving] = useState(false);

  const handleConfirm = async () => {
    setSaving(true);
    try {
      await onConfirm(reason || null);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle>Archive {plantName}?</DialogTitle>
          <DialogDescription>
            It leaves your garden and reminders, but stays in Garden History so you can
            remember it later.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            What happened?
          </Label>
          <RadioGroup value={reason} onValueChange={setReason} className="gap-2">
            {ARCHIVE_REASONS.map((r) => (
              <label
                key={r}
                className="flex cursor-pointer items-center gap-3 rounded-xl border border-border/60 px-3 py-2 text-sm transition hover:bg-accent/40"
              >
                <RadioGroupItem value={r} />
                {r}
              </label>
            ))}
          </RadioGroup>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={saving}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Archive className="mr-2 h-4 w-4" />
            )}
            Archive plant
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
