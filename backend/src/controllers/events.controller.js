const { query } = require('../config/database');
const { HttpError, required } = require('../utils/helpers');

function checkDates(start, end) {
  if (start && end && new Date(end) <= new Date(start)) {
    throw new HttpError(400, 'end_date debe ser posterior a start_date');
  }
}

// GET /events  (filtros opcionales: from, to)
exports.list = async (req, res) => {
  const where = ['user_id = $1'];
  const params = [req.user.id];
  if (req.query.from) {
    params.push(req.query.from);
    where.push(`start_date >= $${params.length}`);
  }
  if (req.query.to) {
    params.push(req.query.to);
    where.push(`end_date <= $${params.length}`);
  }
  const r = await query(
    `select * from calendar_events where ${where.join(' and ')} order by start_date`,
    params
  );
  res.json(r.rows);
};

// GET /events/:id
exports.getOne = async (req, res) => {
  const r = await query('select * from calendar_events where id = $1 and user_id = $2', [
    req.params.id,
    req.user.id,
  ]);
  if (!r.rowCount) throw new HttpError(404, 'Evento no encontrado');
  res.json(r.rows[0]);
};

// POST /events
exports.create = async (req, res) => {
  const b = req.body;
  required(b, ['title', 'start_date', 'end_date']);
  checkDates(b.start_date, b.end_date);
  const r = await query(
    `insert into calendar_events (title, start_date, end_date, user_id)
     values ($1, $2, $3, $4) returning *`,
    [b.title, b.start_date, b.end_date, req.user.id]
  );
  res.status(201).json(r.rows[0]);
};

// PUT /events/:id
exports.update = async (req, res) => {
  const b = req.body;
  checkDates(b.start_date, b.end_date);
  const r = await query(
    `update calendar_events
        set title = coalesce($3, title),
            start_date = coalesce($4, start_date),
            end_date = coalesce($5, end_date)
      where id = $1 and user_id = $2
      returning *`,
    [req.params.id, req.user.id, b.title, b.start_date, b.end_date]
  );
  if (!r.rowCount) throw new HttpError(404, 'Evento no encontrado');
  res.json(r.rows[0]);
};

// DELETE /events/:id
exports.remove = async (req, res) => {
  const r = await query('delete from calendar_events where id = $1 and user_id = $2 returning id', [
    req.params.id,
    req.user.id,
  ]);
  if (!r.rowCount) throw new HttpError(404, 'Evento no encontrado');
  res.status(204).end();
};
