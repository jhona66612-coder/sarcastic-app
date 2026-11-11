-- Sarcastic Productivity Engine | Instalación inicial en Supabase
-- Ejecuta el archivo completo una vez en un proyecto nuevo, desde SQL Editor.
-- La aplicación móvil utiliza Express. La migración 002 configura el rol del backend.
-- Todas las operaciones de instalación se confirman juntas.

begin;
set local search_path to public;

-- 01_esquema_original.sql
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

-- 02_ajustes.sql
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

-- 03_extra_y_datos_iniciales.sql
-- 1) Columna necesaria para distinguir quién escribió cada mensaje de SlothBot
alter table ai_messages
  add column sender text not null default 'user' check (sender in ('user', 'bot'));

-- 2) Datos iniciales (catálogos que la API consulta)
insert into task_categories (name) values
  ('Estudio'), ('Trabajo'), ('Personal'), ('Salud'), ('Hogar');

insert into achievements (name, description, points) values
  ('Primera tarea completada', 'Completaste tu primera tarea', 50),
  ('Primera sesión de enfoque', 'Terminaste tu primera sesión Pomodoro', 30);

insert into inventory_items (name, description, type, effect) values
  ('Gorro de perezoso', 'Accesorio para SlothBot', 'hat', '{"bonus": "none"}'),
  ('Hoja de eucalipto', 'Accesorio decorativo', 'accessory', '{"bonus": "none"}'),
  ('Marco dorado', 'Marco de perfil', 'frame', '{"bonus": "none"}');

-- Acceso a través del backend. Activa RLS en las tablas de esta aplicación.
alter table public.users enable row level security;
alter table public.user_settings enable row level security;
alter table public.task_categories enable row level security;
alter table public.tasks enable row level security;
alter table public.task_history enable row level security;
alter table public.calendar_events enable row level security;
alter table public.focus_sessions enable row level security;
alter table public.streaks enable row level security;
alter table public.streak_daily_records enable row level security;
alter table public.streak_tokens enable row level security;
alter table public.free_days enable row level security;
alter table public.ai_analyses enable row level security;
alter table public.ai_messages enable row level security;
alter table public.user_experience enable row level security;
alter table public.experience_transactions enable row level security;
alter table public.achievements enable row level security;
alter table public.user_achievements enable row level security;
alter table public.inventory_items enable row level security;
alter table public.user_inventory enable row level security;
alter table public.friendships enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.posts enable row level security;
alter table public.post_likes enable row level security;
alter table public.comments enable row level security;
alter table public.challenges enable row level security;
alter table public.challenge_participants enable row level security;
alter table public.alarms enable row level security;
alter table public.alarm_qr_tokens enable row level security;
alter table public.alarm_history enable row level security;
alter table public.notifications enable row level security;
alter table public.push_tokens enable row level security;

revoke all privileges on table
  public.users,
  public.user_settings,
  public.task_categories,
  public.tasks,
  public.task_history,
  public.calendar_events,
  public.focus_sessions,
  public.streaks,
  public.streak_daily_records,
  public.streak_tokens,
  public.free_days,
  public.ai_analyses,
  public.ai_messages,
  public.user_experience,
  public.experience_transactions,
  public.achievements,
  public.user_achievements,
  public.inventory_items,
  public.user_inventory,
  public.friendships,
  public.groups,
  public.group_members,
  public.posts,
  public.post_likes,
  public.comments,
  public.challenges,
  public.challenge_participants,
  public.alarms,
  public.alarm_qr_tokens,
  public.alarm_history,
  public.notifications,
  public.push_tokens
from public, anon, authenticated;

commit;

-- Resultado esperado para una instalación nueva: 5 categorías, 2 logros, 3 objetos.
select
  (select count(*) from public.task_categories) as categorias,
  (select count(*) from public.achievements) as logros,
  (select count(*) from public.inventory_items) as objetos;
