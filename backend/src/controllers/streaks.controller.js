const { query, withTransaction } = require('../config/database');
const { HttpError, required, TODAY_SQL } = require('../utils/helpers');
const { addXp } = require('../services/xp');

// GET /streaks
exports.get = async (req, res) => {
  const r = await query('select * from streaks where user_id = $1', [req.user.id]);
  if (!r.rowCount) throw new HttpError(404, 'Racha no encontrada');
  res.json(r.rows[0]);
};

// GET /streaks/history  (filtros opcionales: from, to)
exports.history = async (req, res) => {
  const params = [req.user.id];
  let filter = '';
  if (req.query.from) {
    params.push(req.query.from);
    filter += ` and r.record_date >= $${params.length}`;
  }
  if (req.query.to) {
    params.push(req.query.to);
    filter += ` and r.record_date <= $${params.length}`;
  }
  const r = await query(
    `select r.* from streak_daily_records r
       join streaks s on s.id = r.streak_id
      where s.user_id = $1 ${filter}
      order by r.record_date desc`,
    params
  );
  res.json(r.rows);
};

// POST /streaks/check-in  -> marca el día de hoy como cumplido
exports.checkIn = async (req, res) => {
  const result = await withTransaction(async (c) => {
    const s = (await c.query('select * from streaks where user_id = $1 for update', [req.user.id]))
      .rows[0];
    if (!s) throw new HttpError(404, 'Racha no encontrada');

    const today = await c.query(
      `select 1 from streak_daily_records
        where streak_id = $1 and record_date = ${TODAY_SQL} and achieved`,
      [s.id]
    );
    if (today.rowCount) return { already_checked_in: true, streak: s };

    // La racha continúa si ayer se cumplió o fue día libre
    const yesterday = await c.query(
      `select 1 from streak_daily_records
        where streak_id = $1 and record_date = ${TODAY_SQL} - 1 and achieved
       union all
       select 1 from free_days where user_id = $2 and free_date = ${TODAY_SQL} - 1`,
      [s.id, req.user.id]
    );
    const current = yesterday.rowCount ? s.current_streak + 1 : 1;
    const best = Math.max(s.best_streak, current);

    await c.query(
      `insert into streak_daily_records (streak_id, record_date, achieved)
       values ($1, ${TODAY_SQL}, true)
       on conflict (streak_id, record_date) do update set achieved = true`,
      [s.id]
    );
    const u = await c.query(
      `update streaks set current_streak = $2, best_streak = $3, status = 'active'
        where id = $1 returning *`,
      [s.id, current, best]
    );
    // Cada 7 días seguidos se gana un token de racha
    if (current % 7 === 0) {
      await c.query(
        'update streak_tokens set available_tokens = available_tokens + 1 where user_id = $1',
        [req.user.id]
      );
    }
    await addXp(c, req.user.id, 5, 'Racha diaria', s.id);
    return { already_checked_in: false, streak: u.rows[0] };
  });
  res.json(result);
};

// GET /streak-tokens
exports.getTokens = async (req, res) => {
  const r = await query('select * from streak_tokens where user_id = $1', [req.user.id]);
  if (!r.rowCount) throw new HttpError(404, 'Tokens no encontrados');
  res.json(r.rows[0]);
};

// POST /streak-tokens/use  { date? }  -> protege la racha en un día (por defecto hoy)
exports.useToken = async (req, res) => {
  const result = await withTransaction(async (c) => {
    const t = await c.query('select * from streak_tokens where user_id = $1 for update', [
      req.user.id,
    ]);
    if (!t.rowCount || t.rows[0].available_tokens <= 0) {
      throw new HttpError(400, 'No tienes tokens disponibles');
    }
    const s = (await c.query('select id from streaks where user_id = $1', [req.user.id])).rows[0];
    await c.query(
      `insert into streak_daily_records (streak_id, record_date, achieved)
       values ($1, coalesce($2::date, ${TODAY_SQL}), true)
       on conflict (streak_id, record_date) do update set achieved = true`,
      [s.id, req.body.date || null]
    );
    const u = await c.query(
      `update streak_tokens
          set available_tokens = available_tokens - 1, used_tokens = used_tokens + 1
        where user_id = $1 returning *`,
      [req.user.id]
    );
    return u.rows[0];
  });
  res.json(result);
};

// GET /free-days
exports.listFreeDays = async (req, res) => {
  const r = await query('select * from free_days where user_id = $1 order by free_date desc', [
    req.user.id,
  ]);
  res.json(r.rows);
};

// POST /free-days  { free_date }
exports.addFreeDay = async (req, res) => {
  required(req.body, ['free_date']);
  const r = await query('insert into free_days (user_id, free_date) values ($1, $2) returning *', [
    req.user.id,
    req.body.free_date,
  ]);
  res.status(201).json(r.rows[0]);
};

// DELETE /free-days/:id
exports.removeFreeDay = async (req, res) => {
  const r = await query('delete from free_days where id = $1 and user_id = $2 returning id', [
    req.params.id,
    req.user.id,
  ]);
  if (!r.rowCount) throw new HttpError(404, 'Día libre no encontrado');
  res.status(204).end();
};
