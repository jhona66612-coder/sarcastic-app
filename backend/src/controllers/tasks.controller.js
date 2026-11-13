const { query, withTransaction } = require('../config/database');
const { HttpError, required, TODAY_SQL } = require('../utils/helpers');
const { addXp, grantAchievement } = require('../services/xp');

const STATUSES = ['pending', 'in_progress', 'completed', 'postponed'];
const XP_BY_PRIORITY = { vital: 30, important: 20, ordinary: 10 };

// GET /tasks  (filtros: status, priority, category_id, deadline_before)
exports.list = async (req, res) => {
  const where = ['t.user_id = $1'];
  const params = [req.user.id];
  for (const field of ['status', 'priority', 'category_id']) {
    if (req.query[field]) {
      params.push(req.query[field]);
      where.push(`t.${field} = $${params.length}`);
    }
  }
  if (req.query.deadline_before) {
    params.push(req.query.deadline_before);
    where.push(`t.deadline <= $${params.length}`);
  }
  const r = await query(
    `select t.*, c.name as category_name
       from tasks t left join task_categories c on c.id = t.category_id
      where ${where.join(' and ')}
      order by t.creation_date desc`,
    params
  );
  res.json(r.rows);
};

// GET /tasks/:id
exports.getOne = async (req, res) => {
  const r = await query('select * from tasks where id = $1 and user_id = $2', [
    req.params.id,
    req.user.id,
  ]);
  if (!r.rowCount) throw new HttpError(404, 'Tarea no encontrada');
  res.json(r.rows[0]);
};

// POST /tasks
exports.create = async (req, res) => {
  const b = req.body;
  required(b, ['title', 'priority']);
  const task = await withTransaction(async (c) => {
    const r = await c.query(
      `insert into tasks (title, description, user_id, category_id, priority, status,
                          deadline, estimated_duration, alternative_plan)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       returning *`,
      [
        b.title, b.description, req.user.id, b.category_id, b.priority,
        b.status || 'pending', b.deadline, b.estimated_duration, b.alternative_plan,
      ]
    );
    await c.query('insert into task_history (task_id, change_description) values ($1, $2)', [
      r.rows[0].id,
      'Tarea creada',
    ]);
    return r.rows[0];
  });
  res.status(201).json(task);
};

// PUT /tasks/:id
exports.update = async (req, res) => {
  const b = req.body;
  const task = await withTransaction(async (c) => {
    const r = await c.query(
      `update tasks
          set title = coalesce($3, title),
              description = coalesce($4, description),
              category_id = coalesce($5, category_id),
              priority = coalesce($6, priority),
              deadline = case when $10 then $7::date else deadline end,
              estimated_duration = coalesce($8, estimated_duration),
              alternative_plan = coalesce($9, alternative_plan)
        where id = $1 and user_id = $2
        returning *`,
      [
        req.params.id, req.user.id, b.title, b.description, b.category_id,
        b.priority, b.deadline, b.estimated_duration, b.alternative_plan,
        Object.prototype.hasOwnProperty.call(b, 'deadline'),
      ]
    );
    if (!r.rowCount) throw new HttpError(404, 'Tarea no encontrada');
    await c.query('insert into task_history (task_id, change_description) values ($1, $2)', [
      req.params.id,
      'Tarea actualizada',
    ]);
    return r.rows[0];
  });
  res.json(task);
};

// PATCH /tasks/:id/status
exports.changeStatus = async (req, res) => {
  const { status } = req.body;
  if (!STATUSES.includes(status)) {
    throw new HttpError(400, `status debe ser uno de: ${STATUSES.join(', ')}`);
  }
  const task = await withTransaction(async (c) => {
    const cur = await c.query(
      'select status, priority from tasks where id = $1 and user_id = $2 for update',
      [req.params.id, req.user.id]
    );
    if (!cur.rowCount) throw new HttpError(404, 'Tarea no encontrada');
    const previous = cur.rows[0];

    const r = await c.query(
      `update tasks
          set status = $3::text,
              completion_date = case when $3::text = 'completed' then ${TODAY_SQL} else null end
        where id = $1 and user_id = $2
        returning *`,
      [req.params.id, req.user.id, status]
    );
    await c.query('insert into task_history (task_id, change_description) values ($1, $2)', [
      req.params.id,
      `Estado: ${previous.status} -> ${status}`,
    ]);

    // Al completar por primera vez: XP según prioridad y posible logro
    if (status === 'completed' && previous.status !== 'completed') {
      await addXp(c, req.user.id, XP_BY_PRIORITY[previous.priority], 'Tarea completada', req.params.id);
      const done = await c.query(
        "select count(*)::int as n from tasks where user_id = $1 and status = 'completed'",
        [req.user.id]
      );
      if (done.rows[0].n === 1) {
        await grantAchievement(c, req.user.id, 'Primera tarea completada');
      }
    }
    return r.rows[0];
  });
  res.json(task);
};

// DELETE /tasks/:id
exports.remove = async (req, res) => {
  const r = await query('delete from tasks where id = $1 and user_id = $2 returning id', [
    req.params.id,
    req.user.id,
  ]);
  if (!r.rowCount) throw new HttpError(404, 'Tarea no encontrada');
  res.status(204).end();
};

// GET /tasks/:id/history
exports.history = async (req, res) => {
  const own = await query('select 1 from tasks where id = $1 and user_id = $2', [
    req.params.id,
    req.user.id,
  ]);
  if (!own.rowCount) throw new HttpError(404, 'Tarea no encontrada');
  const r = await query(
    'select * from task_history where task_id = $1 order by change_date desc',
    [req.params.id]
  );
  res.json(r.rows);
};

// GET /task-categories
exports.listCategories = async (req, res) => {
  const r = await query('select * from task_categories order by name');
  res.json(r.rows);
};

// POST /task-categories
exports.createCategory = async (req, res) => {
  required(req.body, ['name']);
  const r = await query('insert into task_categories (name) values ($1) returning *', [
    req.body.name,
  ]);
  res.status(201).json(r.rows[0]);
};
