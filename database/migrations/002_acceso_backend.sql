-- Ejecutar después de 001_inicial.sql, como postgres, en SQL Editor.
-- El rol solo se concede a los logins del servidor de desarrollo.
begin;
create role sarcastic_backend nologin;
grant usage on schema public to sarcastic_backend;

grant select, insert, update, delete on table public.users to sarcastic_backend;
create policy acceso_backend on public.users
  for all to sarcastic_backend using (true) with check (true);

grant select, insert, update, delete on table public.user_settings to sarcastic_backend;
create policy acceso_backend on public.user_settings
  for all to sarcastic_backend using (true) with check (true);

grant select, insert, update, delete on table public.task_categories to sarcastic_backend;
create policy acceso_backend on public.task_categories
  for all to sarcastic_backend using (true) with check (true);

grant select, insert, update, delete on table public.tasks to sarcastic_backend;
create policy acceso_backend on public.tasks
  for all to sarcastic_backend using (true) with check (true);

grant select, insert, update, delete on table public.task_history to sarcastic_backend;
create policy acceso_backend on public.task_history
  for all to sarcastic_backend using (true) with check (true);

grant select, insert, update, delete on table public.calendar_events to sarcastic_backend;
create policy acceso_backend on public.calendar_events
  for all to sarcastic_backend using (true) with check (true);

grant select, insert, update, delete on table public.focus_sessions to sarcastic_backend;
create policy acceso_backend on public.focus_sessions
  for all to sarcastic_backend using (true) with check (true);

grant select, insert, update, delete on table public.streaks to sarcastic_backend;
create policy acceso_backend on public.streaks
  for all to sarcastic_backend using (true) with check (true);

grant select, insert, update, delete on table public.streak_daily_records to sarcastic_backend;
create policy acceso_backend on public.streak_daily_records
  for all to sarcastic_backend using (true) with check (true);

grant select, insert, update, delete on table public.streak_tokens to sarcastic_backend;
create policy acceso_backend on public.streak_tokens
  for all to sarcastic_backend using (true) with check (true);

grant select, insert, update, delete on table public.free_days to sarcastic_backend;
create policy acceso_backend on public.free_days
  for all to sarcastic_backend using (true) with check (true);

grant select, insert, update, delete on table public.ai_analyses to sarcastic_backend;
create policy acceso_backend on public.ai_analyses
  for all to sarcastic_backend using (true) with check (true);

grant select, insert, update, delete on table public.ai_messages to sarcastic_backend;
create policy acceso_backend on public.ai_messages
  for all to sarcastic_backend using (true) with check (true);

grant select, insert, update, delete on table public.user_experience to sarcastic_backend;
create policy acceso_backend on public.user_experience
  for all to sarcastic_backend using (true) with check (true);

grant select, insert, update, delete on table public.experience_transactions to sarcastic_backend;
create policy acceso_backend on public.experience_transactions
  for all to sarcastic_backend using (true) with check (true);

grant select, insert, update, delete on table public.achievements to sarcastic_backend;
create policy acceso_backend on public.achievements
  for all to sarcastic_backend using (true) with check (true);

grant select, insert, update, delete on table public.user_achievements to sarcastic_backend;
create policy acceso_backend on public.user_achievements
  for all to sarcastic_backend using (true) with check (true);

grant select, insert, update, delete on table public.inventory_items to sarcastic_backend;
create policy acceso_backend on public.inventory_items
  for all to sarcastic_backend using (true) with check (true);

grant select, insert, update, delete on table public.user_inventory to sarcastic_backend;
create policy acceso_backend on public.user_inventory
  for all to sarcastic_backend using (true) with check (true);

grant select, insert, update, delete on table public.friendships to sarcastic_backend;
create policy acceso_backend on public.friendships
  for all to sarcastic_backend using (true) with check (true);

grant select, insert, update, delete on table public.groups to sarcastic_backend;
create policy acceso_backend on public.groups
  for all to sarcastic_backend using (true) with check (true);

grant select, insert, update, delete on table public.group_members to sarcastic_backend;
create policy acceso_backend on public.group_members
  for all to sarcastic_backend using (true) with check (true);

grant select, insert, update, delete on table public.posts to sarcastic_backend;
create policy acceso_backend on public.posts
  for all to sarcastic_backend using (true) with check (true);

grant select, insert, update, delete on table public.post_likes to sarcastic_backend;
create policy acceso_backend on public.post_likes
  for all to sarcastic_backend using (true) with check (true);

grant select, insert, update, delete on table public.comments to sarcastic_backend;
create policy acceso_backend on public.comments
  for all to sarcastic_backend using (true) with check (true);

grant select, insert, update, delete on table public.challenges to sarcastic_backend;
create policy acceso_backend on public.challenges
  for all to sarcastic_backend using (true) with check (true);

grant select, insert, update, delete on table public.challenge_participants to sarcastic_backend;
create policy acceso_backend on public.challenge_participants
  for all to sarcastic_backend using (true) with check (true);

grant select, insert, update, delete on table public.alarms to sarcastic_backend;
create policy acceso_backend on public.alarms
  for all to sarcastic_backend using (true) with check (true);

grant select, insert, update, delete on table public.alarm_qr_tokens to sarcastic_backend;
create policy acceso_backend on public.alarm_qr_tokens
  for all to sarcastic_backend using (true) with check (true);

grant select, insert, update, delete on table public.alarm_history to sarcastic_backend;
create policy acceso_backend on public.alarm_history
  for all to sarcastic_backend using (true) with check (true);

grant select, insert, update, delete on table public.notifications to sarcastic_backend;
create policy acceso_backend on public.notifications
  for all to sarcastic_backend using (true) with check (true);

grant select, insert, update, delete on table public.push_tokens to sarcastic_backend;
create policy acceso_backend on public.push_tokens
  for all to sarcastic_backend using (true) with check (true);

commit;

select count(*) as tablas_con_politica_backend
from pg_policies
where schemaname = 'public' and policyname = 'acceso_backend'
  and 'sarcastic_backend' = any(roles);
