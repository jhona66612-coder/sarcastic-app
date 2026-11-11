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
