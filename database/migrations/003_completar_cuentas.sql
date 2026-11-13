begin;
-- Existing accounts created before the API registration flow may lack these rows.
insert into public.user_settings (user_id, sarcasm_level, notification_preferences, penalties, privacy_settings)
select id, 5, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb from public.users
on conflict (user_id) do nothing;

insert into public.user_experience (user_id, experience_points, level, rank)
select id, 0, 1, 'Novato' from public.users
on conflict (user_id) do nothing;

insert into public.streaks (user_id, current_streak, best_streak, status)
select id, 0, 0, 'inactive' from public.users
on conflict (user_id) do nothing;

insert into public.streak_tokens (user_id, available_tokens, used_tokens)
select id, 0, 0 from public.users
on conflict (user_id) do nothing;
commit;
