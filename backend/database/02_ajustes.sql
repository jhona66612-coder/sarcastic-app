-- Ajustes recomendados (ejecutar DESPUES de 01_esquema_original.sql)

alter table user_settings add constraint user_settings_unique_user_id unique (user_id);
alter table user_experience add constraint user_experience_unique_user_id unique (user_id);
alter table streaks add constraint streaks_unique_user_id unique (user_id);
alter table streak_tokens add constraint streak_tokens_unique_user_id unique (user_id);
alter table group_members add constraint group_members_unique_group_user unique (group_id, user_id);
alter table challenge_participants add constraint challenge_participants_unique_challenge_user unique (challenge_id, user_id);
alter table free_days add constraint free_days_unique_user_free_date unique (user_id, free_date);
alter table streak_daily_records add constraint streak_daily_records_unique_streak_record_date unique (streak_id, record_date);

alter table calendar_events add constraint calendar_events_check_end_after_start check (end_date > start_date);
alter table challenges add constraint challenges_check_end_after_start check (end_date > start_date);
alter table focus_sessions add constraint focus_sessions_check_end_after_start check (end_time > start_time);

create unique index friendships_unique_friendship on friendships (
  least(user_id, friend_id),
  greatest(user_id, friend_id)
);

alter table user_settings alter column user_id set not null;
alter table tasks alter column user_id set not null;
alter table task_history alter column task_id set not null;
alter table calendar_events alter column user_id set not null;
alter table focus_sessions alter column user_id set not null;
alter table streaks alter column user_id set not null;
alter table streak_daily_records alter column streak_id set not null;
alter table streak_tokens alter column user_id set not null;
alter table free_days alter column user_id set not null;
alter table ai_analyses alter column user_id set not null;
alter table ai_messages alter column user_id set not null;
alter table user_experience alter column user_id set not null;
alter table experience_transactions alter column user_id set not null;
alter table user_achievements alter column user_id set not null;
alter table user_achievements alter column achievement_id set not null;
alter table user_inventory alter column user_id set not null;
alter table user_inventory alter column item_id set not null;
alter table friendships alter column user_id set not null;
alter table friendships alter column friend_id set not null;
alter table groups alter column creator_id set not null;
alter table group_members alter column group_id set not null;
alter table group_members alter column user_id set not null;
alter table posts alter column user_id set not null;
alter table post_likes alter column post_id set not null;
alter table post_likes alter column user_id set not null;
alter table comments alter column post_id set not null;
alter table comments alter column user_id set not null;
alter table challenges alter column creator_id set not null;
alter table challenge_participants alter column challenge_id set not null;
alter table challenge_participants alter column user_id set not null;
alter table alarms alter column user_id set not null;
alter table alarm_qr_tokens alter column alarm_id set not null;
alter table alarm_history alter column alarm_id set not null;
alter table notifications alter column user_id set not null;
alter table push_tokens alter column user_id set not null;
