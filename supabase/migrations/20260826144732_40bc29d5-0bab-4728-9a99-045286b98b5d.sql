SELECT cron.unschedule('aloe-watering-reminders') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'aloe-watering-reminders');

SELECT cron.schedule(
  'water-wizard-watering-reminders',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://project--85dea5b2-0eeb-4169-9a6f-75a6f8188bc0.lovable.app/api/public/hooks/send-watering-reminders',
    headers := '{"Content-Type": "application/json", "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdkemVhc2Vxb2t4dXFrZHhldnl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0Mzc2MTIsImV4cCI6MjA5MjAxMzYxMn0.Rmv0cC5H2B14VZYJ0cBXoa03BgIqVDGCF0fm3HfMYmc"}'::jsonb,
    body := '{"source":"pg_cron"}'::jsonb
  );
  $$
);