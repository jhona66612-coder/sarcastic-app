const { query, withTransaction } = require('../config/database');
const { HttpError, required } = require('../utils/helpers');

const STATUSES = ['active', 'completed', 'cancelled'];

// GET /challenges  (filtro opcional: status)
exports.list = async (req, res) => {
  const params = [];
  let filter = '';
  if (req.query.status) {
    params.push(req.query.status);
    filter = 'where c.status = $1';
  }
  const r = await query(
    `select c.*, (select count(*)::int from challenge_participants p
                   where p.challenge_id = c.id) as participants_count
       from challenges c ${filter} order by c.start_date desc`,
    params
  );
  res.json(r.rows);
};

// POST /challenges  { name, description?, start_date, end_date }
exports.create = async (req, res) => {
  const b = req.body;
  required(b, ['name', 'start_date', 'end_date']);
  if (new Date(b.end_date) <= new Date(b.start_date)) {
    throw new HttpError(400, 'end_date debe ser posterior a start_date');
  }
  const challenge = await withTransaction(async (c) => {
    const r = await c.query(
      `insert into challenges (creator_id, name, description, start_date, end_date, status)
       values ($1, $2, $3, $4, $5, 'active') returning *`,
      [req.user.id, b.name, b.description, b.start_date, b.end_date]
    );
    // El creador participa automáticamente
    await c.query(
      'insert into challenge_participants (challenge_id, user_id) values ($1, $2)',
      [r.rows[0].id, req.user.id]
    );
    return r.rows[0];
  });
  res.status(201).json(challenge);
};

// GET /challenges/:id
exports.getOne = async (req, res) => {
  const r = await query('select * from challenges where id = $1', [req.params.id]);
  if (!r.rowCount) throw new HttpError(404, 'Desafío no encontrado');
  res.json(r.rows[0]);
};

// PATCH /challenges/:id  { name?, description?, status? }  (solo el creador)
exports.update = async (req, res) => {
  const { name, description, status } = req.body;
  if (status && !STATUSES.includes(status)) {
    throw new HttpError(400, `status debe ser uno de: ${STATUSES.join(', ')}`);
  }
  const challenge = await withTransaction(async (c) => {
    const r = await c.query(
      `update challenges
          set name = coalesce($3, name),
              description = coalesce($4, description),
              status = coalesce($5, status)
        where id = $1 and creator_id = $2
        returning *`,
      [req.params.id, req.user.id, name, description, status]
    );
    if (!r.rowCount) throw new HttpError(404, 'Desafío no encontrado o no eres el creador');
    if (status === 'completed') {
      // Gana quien tenga mayor progreso
      const w = await c.query(
        `select user_id from challenge_participants
          where challenge_id = $1 order by progress desc limit 1`,
        [req.params.id]
      );
      if (w.rowCount) {
        const upd = await c.query('update challenges set winner_id = $2 where id = $1 returning *', [
          req.params.id,
          w.rows[0].user_id,
        ]);
        return upd.rows[0];
      }
    }
    return r.rows[0];
  });
  res.json(challenge);
};

// POST /challenges/:id/participants  (me uno al desafío)
exports.join = async (req, res) => {
  const ch = await query('select status from challenges where id = $1', [req.params.id]);
  if (!ch.rowCount) throw new HttpError(404, 'Desafío no encontrado');
  if (ch.rows[0].status !== 'active') throw new HttpError(409, 'El desafío no está activo');
  const r = await query(
    'insert into challenge_participants (challenge_id, user_id) values ($1, $2) returning *',
    [req.params.id, req.user.id]
  );
  res.status(201).json(r.rows[0]);
};

// GET /challenges/:id/participants  -> ranking por progreso
exports.participants = async (req, res) => {
  const r = await query(
    `select p.id, p.progress, p.result, u.id as user_id, u.username, u.name
       from challenge_participants p join users u on u.id = p.user_id
      where p.challenge_id = $1 order by p.progress desc`,
    [req.params.id]
  );
  res.json(r.rows);
};

// PATCH /challenges/:id/progress  { progress }
exports.updateProgress = async (req, res) => {
  required(req.body, ['progress']);
  const progress = Number(req.body.progress);
  if (Number.isNaN(progress) || progress < 0) throw new HttpError(400, 'progress debe ser un número >= 0');
  const r = await query(
    `update challenge_participants p set progress = $3
       from challenges c
      where p.challenge_id = c.id and c.id = $1 and c.status = 'active' and p.user_id = $2
      returning p.*`,
    [req.params.id, req.user.id, progress]
  );
  if (!r.rowCount) throw new HttpError(404, 'No participas en este desafío o ya no está activo');
  res.json(r.rows[0]);
};
