# Daily watering notifications + true schedule reset

## What's wrong today

- Nothing ever sends a notification. The app only asks for permission and fires one test notification from Settings. There is no service worker, no web app manifest, and no scheduled job — so no daily reminder can ever arrive.
- Watering dates: marking a plant watered on the dashboard does correctly reset the clock (last watered = today, next = today + frequency). But two gaps make it feel like a fixed "every X days" treadmill:
  - Changing a plant's Indoor/Porch/Outdoor exposure recalculates the frequency but never recomputes the next watering date, so the plant keeps its old due date.
  - Cards and the detail page display "every X days" instead of the actual countdown to the next watering.
  - There is no "Mark as watered" button anywhere except the dashboard's due-today list, so a plant watered early can't be logged.

## What I'll build

### 1. Real daily push notifications

- Add a web app manifest and a service worker so the app can receive push messages even when it's closed (on iPhone this only works after "Add to Home Screen", which the setup screen already walks through).
- Store each device's push subscription in the backend, tied to the signed-in user.
- Settings toggle: turning notifications on registers the device and subscribes; turning it off unsubscribes and removes the record.
- A daily scheduled job runs each morning, finds every user with plants due for watering that day (skipping rain-delayed plants), and sends one summary push per device: e.g. "3 plants need water today — Monstera, Fern, Basil".
- Tapping the notification opens the app's Today page.
- Add a "Send me a test notification" button in Settings so delivery can be verified immediately instead of waiting a day.
- Reminder time: default 8:00 AM in the user's local time, with a time picker in Settings.

### 2. Watering schedule resets properly

- Add a "Mark as Watered" button on the Plant Detail page and on inventory cards, using the same reset: last watered = today, next = today + frequency, rain delay cleared.
- When a plant's frequency changes (exposure recalibration or AI recalibration), recompute the next watering date from the last watered date, not from the old due date.
- Replace "every X days" on cards and the detail page with a live countdown driven by the next watering date: "Due today", "Due tomorrow", "In 4 days", "Overdue by 2 days". The frequency stays visible as secondary text.
- Show "Last watered: <date>" on the detail page.

## Technical notes

- New table `push_subscriptions` (user_id, endpoint, keys, reminder_hour, timezone) with RLS scoped to `auth.uid()` plus grants; service role reads it from the scheduled job.
- `public/manifest.webmanifest` + `public/sw.js` registered from the root route; sw handles `push` and `notificationclick`.
- Web Push uses VAPID keys generated during implementation and stored as backend secrets (public key exposed to the client, private key server-only).
- Delivery endpoint: `src/routes/api/public/hooks/send-watering-reminders.ts`, authenticated with the anon key header, scheduled hourly by pg_cron so each user fires at their local reminder hour.
- Due calculation reuses `needsWateringToday` from `src/lib/plants.ts`, ported to the server side so app and job agree.
- Countdown helper `daysUntilWatering(plant)` added to `src/lib/plants.ts` and used by `PlantCard` and the detail page.
- No changes to the camera, AI identification, or volume/intensity logic.
