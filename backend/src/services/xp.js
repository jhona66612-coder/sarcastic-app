// Servicio de experiencia, logros y notificaciones internas.
// Todas las funciones reciben "client" para ejecutarse dentro de una transacción.

const rankFor = (level) =>
  level < 3 ? 'Novato' : level < 6 ? 'Aprendiz' : level < 10 ? 'Experto' : 'Maestro';

async function notify(client, userId, title, message, type) {
  await client.query(
    'insert into notifications (user_id, title, message, type) values ($1, $2, $3, $4)',
    [userId, title, message, type]
  );
}

// Suma XP, registra la transacción y recalcula nivel (cada 100 XP) y rango
async function addXp(client, userId, points, reason, referenceId = null) {
  await client.query(
    `insert into experience_transactions (user_id, points, reason, reference_id)
     values ($1, $2, $3, $4)`,
    [userId, points, reason, referenceId]
  );
  const r = await client.query(
    `update user_experience
        set experience_points = coalesce(experience_points, 0) + $2
      where user_id = $1
      returning experience_points`,
    [userId, points]
  );
  if (!r.rowCount) return;
  const xp = Number(r.rows[0].experience_points);
  const level = Math.floor(xp / 100) + 1;
  await client.query('update user_experience set level = $2, rank = $3 where user_id = $1', [
    userId,
    level,
    rankFor(level),
  ]);
}

// Otorga un logro (una sola vez) buscándolo por nombre
async function grantAchievement(client, userId, name) {
  const a = await client.query('select id, points from achievements where name = $1', [name]);
  if (!a.rowCount) return;
  const ins = await client.query(
    `insert into user_achievements (user_id, achievement_id)
     select $1::uuid, $2::uuid
      where not exists (
        select 1 from user_achievements where user_id = $1::uuid and achievement_id = $2::uuid)
     returning id`,
    [userId, a.rows[0].id]
  );
  if (ins.rowCount) {
    await addXp(client, userId, Number(a.rows[0].points), `Logro: ${name}`, a.rows[0].id);
    await notify(client, userId, '¡Nuevo logro!', `Desbloqueaste: ${name}`, 'achievement');
  }
}

module.exports = { addXp, grantAchievement, notify };
