# Plant Archive (remember past plants)

## Goal

When an annual dies or a plant is retired, archive it instead of deleting. Archived plants disappear from the dashboard, inventory, and reminders, but stay browsable in a "Garden History" view with the option to restore.

## What changes

### Archive instead of delete
- The plant detail page's "Remove plant" button becomes "Archive plant", with a confirm dialog asking for an optional reason (Died, Gave away, Seasonal / annual ended, Other) and recording the date.
- Permanent delete stays available, but only from inside the archived view, clearly marked as permanent.

### Garden History view
- New "History" screen listing archived plants, newest first, grouped by year archived.
- Each entry shows the photo, name, how long it was in the garden (added → archived), and the reason.
- Actions per entry: "Restore to garden" (returns it to inventory, next watering date reset to today + frequency) and "Delete forever".
- Reached from the Plants screen via a link at the bottom ("Garden History — N past plants"); no new bottom-nav tab.

### Everything else ignores archived plants
- Dashboard due-today list, inventory sections, plant counts, and the daily push reminder job all filter archived plants out.

## Technical notes

- Migration on `public.plants`: add `archived_at timestamptz`, `archived_reason text`. Existing family RLS policies already cover reads/updates; no new policies needed. Add a partial index on `(family_id) where archived_at is null`.
- Every existing `.from("plants").select(...)` query adds `.is("archived_at", null)`: `src/routes/_app/index.tsx`, `src/routes/_app/inventory.tsx`, and the reminder endpoint `src/routes/api/public/hooks/send-watering-reminders.ts`.
- Archive/restore helpers live next to `markPlantWatered` in `src/lib/watering.ts`; restore uses `nextWateringFrom` from `src/lib/plants.ts`.
- New route `src/routes/_app/history.tsx` with its own `head()` metadata; `Plant` type in `src/lib/plants.ts` gains the two fields.
- Plant detail page keeps working for an archived plant (read-only banner + restore button) so old links don't break.
