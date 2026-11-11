const { query, withTransaction } = require('../config/database');
const { HttpError, required } = require('../utils/helpers');
const { addXp, grantAchievement } = require('../services/xp');

// GET /focus-sessions  (filtro opcional: status)
exports.list = async (req, res) => {
  const params = [req.user.id];
  let filter = '';
  if (req.query.status) {
    params.push(req.query.status);
    filter = 'and status = $2';
  }
  const r = await query(
    `select *, (extract(epoch from duration) / 60)::int as duration_minutes
       from focus_sessions where user_id = $1 ${filter}
      order by start_time desc`,
    params
  );
  res.json(r.rows);
};

// POST /focus-sessions  { duration_minutes, task_id? }
exports.start = async (req, res) => {
  const { duration_minutes, task_id } = req.body;
  required(req.body, ['duration_minutes']);
  const minutes = Math.round(Number(duration_minutes));
  if (!(minutes > 0 && minutes <= 240)) {
    throw new HttpError(400, 'duration_minutes debe estar entre 1 y 240');
  }
  if (task_id) {
    const own = await query('select 1 from tasks where id = $1 and user_id = $2', [
      task_id,
      req.user.id,
    ]);
    if (!own.rowCount) throw new HttpError(404, 'La tarea indicada no existe');
  }
  // end_time es obligatoria en la BD: se calcula como inicio + duración
  const r = await query(
    `insert into focus_sessions (task_id, duration, start_time, end_time, status, user_id)
     values ($1, make_interval(mins => $2::int), now(),
             now() + make_interval(mins => $2::int), 'active', $3)
     returning *, $2::int as duration_minutes`,
    [task_id || null, minutes, req.user.id]
  );
  res.status(201).json(r.rows[0]);
};

// PATCH /focus-sessions/:id/finish
exports.finish = async (req, res) => {
  const session = await withTransaction(async (c) => {
    const cur = await c.query(
      `select *, (extract(epoch from duration) / 60)::int as minutes
         from focus_sessions where id = $1 and user_id = $2 for update`,
      [req.params.id, req.user.id]
    );
    if (!cur.rowCount) throw new HttpError(404, 'Sesión no encontrada');
    if (cur.rows[0].status !== 'active') throw new HttpError(409, 'La sesión ya no está activa');

    const r = await c.query(
      `update focus_sessions
          set status = 'completed',
              end_time = greatest(now(), start_time + interval '1 second')
        where id = $1 returning *`,
      [req.params.id]
    );
    await addXp(c, req.user.id, Math.max(1, Math.round(cur.rows[0].minutes / 5)),
      'Sesión de enfoque completada', req.params.id);
    const done = await c.query(
      "select count(*)::int as n from focus_sessions where user_id = $1 and status = 'completed'",
      [req.user.id]
    );
    if (done.rows[0].n === 1) {
      await grantAchievement(c, req.user.id, 'Primera sesión de enfoque');
    }
    return r.rows[0];
  });
  res.json(session);
};

// PATCH /focus-sessions/:id/interrupt
exports.interrupt = async (req, res) => {
  const r = await query(
    `update focus_sessions
        set status = 'interrupted',
            end_time = greatest(now(), start_time + interval '1 second')
      where id = $1 and user_id = $2 and status = 'active'
      returning *`,
    [req.params.id, req.user.id]
  );
  if (!r.rowCount) throw new HttpError(404, 'No hay una sesión activa con ese id');
  res.json(r.rows[0]);
};
