-- Install after the core migrations, using the database owner in Supabase SQL Editor.
-- Kept outside migrations so PGlite/core SQL tests do not require pg_cron.
create extension if not exists pg_cron;
select cron.schedule(
  'ertee-monthly-dues',
  '0 17 * * *', -- 00.00 Asia/Jakarta, daily; the unique monthly key makes retries safe.
  $$select app_private.generate_monthly_dues();$$
);
