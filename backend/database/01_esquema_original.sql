-- A. Usuarios y Autenticación
create table users (
  id uuid primary key default gen_random_uuid (),
  name text not null,
  username text unique not null,
  email text unique not null,
  password_hash text not null,
  registration_date timestamptz default now(),
  status text not null check (status in ('active', 'inactive', 'banned'))
);

create table user_settings (
  id uuid primary key default gen_random_uuid (),
  user_id uuid references users (id) on delete cascade,
  sarcasm_level integer check (sarcasm_level between 0 and 10),
  notification_preferences jsonb,
  penalties jsonb,
  privacy_settings jsonb
);

-- B. Gestión de Tareas
create table task_categories (
  id uuid primary key default gen_random_uuid (),
  name text not null
);

create table tasks (
  id uuid primary key default gen_random_uuid (),
  title text not null,
  description text,
  user_id uuid references users (id) on delete cascade,
  category_id uuid references task_categories (id),
  priority text not null check (priority in ('vital', 'important', 'ordinary')),
  status text not null check (
    status in ('pending', 'in_progress', 'completed', 'postponed')
  ),
  creation_date timestamptz default now(),
  deadline date,
  completion_date date,
  estimated_duration interval,
  alternative_plan text
);

create table task_history (
  id uuid primary key default gen_random_uuid (),
  task_id uuid references tasks (id) on delete cascade,
  change_date timestamptz default now(),
  change_description text
);

-- C. Calendario y Concentración
create table calendar_events (
  id uuid primary key default gen_random_uuid (),
  title text not null,
  start_date timestamptz not null,
  end_date timestamptz not null,
  user_id uuid references users (id) on delete cascade
);

create table focus_sessions (
  id uuid primary key default gen_random_uuid (),
  task_id uuid references tasks (id),
  duration interval not null,
  start_time timestamptz not null,
  end_time timestamptz not null,
  status text not null check (status in ('active', 'completed', 'interrupted')),
  user_id uuid references users (id) on delete cascade
);

-- D. Rachas y Hábitos
create table streaks (
  id uuid primary key default gen_random_uuid (),
  user_id uuid references users (id) on delete cascade,
  current_streak integer default 0,
  best_streak integer default 0,
  status text not null check (status in ('active', 'inactive'))
);

create table streak_daily_records (
  id uuid primary key default gen_random_uuid (),
  streak_id uuid references streaks (id) on delete cascade,
  record_date date not null,
  achieved boolean default false
);

create table streak_tokens (
  id uuid primary key default gen_random_uuid (),
  user_id uuid references users (id) on delete cascade,
  available_tokens integer default 0,
  used_tokens integer default 0
);

create table free_days (
  id uuid primary key default gen_random_uuid (),
  user_id uuid references users (id) on delete cascade,
  free_date date not null
);

-- E. Inteligencia Artificial SlothBot
create table ai_analyses (
  id uuid primary key default gen_random_uuid (),
  user_id uuid references users (id) on delete cascade,
  analysis_type text not null,
  result jsonb,
  analysis_date timestamptz default now()
);

create table ai_messages (
  id uuid primary key default gen_random_uuid (),
  user_id uuid references users (id) on delete cascade,
  analysis_id uuid references ai_analyses (id),
  message text not null,
  message_date timestamptz default now()
);

-- F. Experiencia y Recompensas
create table user_experience (
  id uuid primary key default gen_random_uuid (),
  user_id uuid references users (id) on delete cascade,
  experience_points numeric check (experience_points >= 0),
  level integer default 1,
  rank text
);

create table experience_transactions (
  id uuid primary key default gen_random_uuid (),
  user_id uuid references users (id) on delete cascade,
  points numeric not null,
  reason text,
  reference_id uuid,
  transaction_date timestamptz default now()
);

create table achievements (
  id uuid primary key default gen_random_uuid (),
  name text not null,
  description text,
  points numeric not null
);

create table user_achievements (
  id uuid primary key default gen_random_uuid (),
  user_id uuid references users (id) on delete cascade,
  achievement_id uuid references achievements (id) on delete cascade,
  achieved_date timestamptz default now()
);

create table inventory_items (
  id uuid primary key default gen_random_uuid (),
  name text not null,
  description text,
  type text not null,
  effect jsonb
);

create table user_inventory (
  id uuid primary key default gen_random_uuid (),
  user_id uuid references users (id) on delete cascade,
  item_id uuid references inventory_items (id) on delete cascade,
  equipped boolean default false
);

-- G. Comunidad y Redes Sociales
create table friendships (
  id uuid primary key default gen_random_uuid (),
  user_id uuid references users (id) on delete cascade,
  friend_id uuid references users (id) on delete cascade,
  status text not null check (status in ('pending', 'accepted', 'rejected')),
  unique (user_id, friend_id),
  check (user_id <> friend_id)
);

create table groups (
  id uuid primary key default gen_random_uuid (),
  name text not null,
  description text,
  creator_id uuid references users (id) on delete cascade
);

create table group_members (
  id uuid primary key default gen_random_uuid (),
  group_id uuid references groups (id) on delete cascade,
  user_id uuid references users (id) on delete cascade,
  role text not null check (role in ('member', 'admin'))
);

create table posts (
  id uuid primary key default gen_random_uuid (),
  user_id uuid references users (id) on delete cascade,
  content text not null,
  creation_date timestamptz default now()
);

create table post_likes (
  id uuid primary key default gen_random_uuid (),
  post_id uuid references posts (id) on delete cascade,
  user_id uuid references users (id) on delete cascade,
  unique (post_id, user_id)
);

create table comments (
  id uuid primary key default gen_random_uuid (),
  post_id uuid references posts (id) on delete cascade,
  user_id uuid references users (id) on delete cascade,
  content text not null,
  creation_date timestamptz default now()
);

-- H. Desafíos y Competencias
create table challenges (
  id uuid primary key default gen_random_uuid (),
  creator_id uuid references users (id) on delete cascade,
  name text not null,
  description text,
  start_date timestamptz not null,
  end_date timestamptz not null,
  status text not null check (status in ('active', 'completed', 'cancelled')),
  winner_id uuid references users (id)
);

create table challenge_participants (
  id uuid primary key default gen_random_uuid (),
  challenge_id uuid references challenges (id) on delete cascade,
  user_id uuid references users (id) on delete cascade,
  progress numeric default 0,
  result text
);

-- I. Alarmas QR
create table alarms (
  id uuid primary key default gen_random_uuid (),
  user_id uuid references users (id) on delete cascade,
  time time not null,
  status text not null check (status in ('active', 'inactive')),
  configuration jsonb
);

create table alarm_qr_tokens (
  id uuid primary key default gen_random_uuid (),
  alarm_id uuid references alarms (id) on delete cascade,
  token text not null,
  expiration_date timestamptz not null,
  used boolean default false,
  unique (alarm_id, token)
);

create table alarm_history (
  id uuid primary key default gen_random_uuid (),
  alarm_id uuid references alarms (id) on delete cascade,
  activation_date timestamptz default now(),
  scan_date timestamptz,
  fulfilled boolean default false
);

-- J. Notificaciones
create table notifications (
  id uuid primary key default gen_random_uuid (),
  user_id uuid references users (id) on delete cascade,
  title text not null,
  message text not null,
  type text not null,
  creation_date timestamptz default now(),
  read_status boolean default false
);

create table push_tokens (
  id uuid primary key default gen_random_uuid (),
  user_id uuid references users (id) on delete cascade,
  device_token text not null,
  unique (user_id, device_token)
);
