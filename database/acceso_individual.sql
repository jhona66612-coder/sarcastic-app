-- Cambia spe_tunombre en la última línea, por ejemplo por spe_ana.
-- Ejecuta el archivo completo como postgres. Genera una clave para ese login.
-- La función es temporal y solo vive en la sesión del editor SQL.
create or replace function pg_temp.crear_acceso_sarcastic(nombre text)
returns table (usuario text, clave text)
language plpgsql as $$
declare
  secreto text := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
begin
  if nombre = 'spe_tunombre' or nombre !~ '^spe_[a-z][a-z0-9_]{0,30}$' then
    raise exception 'Elige un nombre propio como spe_ana en la última línea';
  end if;
  execute format('create role %I login inherit password %L', nombre, secreto);
  execute format('grant sarcastic_backend to %I', nombre);
  return query select nombre, secreto;
end;
$$;

select * from pg_temp.crear_acceso_sarcastic('spe_tunombre');
