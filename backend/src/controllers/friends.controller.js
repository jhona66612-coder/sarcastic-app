const { query } = require('../config/database');
const { HttpError, required } = require('../utils/helpers');
const { notify } = require('../services/xp');

// GET /friends  -> amistades aceptadas (en cualquier sentido)
exports.list = async (req, res) => {
  const r = await query(
    `select f.id as friendship_id, u.id as user_id, u.name, u.username
       from friendships f
       join users u on u.id = case when f.user_id = $1 then f.friend_id else f.user_id end
      where (f.user_id = $1 or f.friend_id = $1) and f.status = 'accepted'
      order by u.username`,
    [req.user.id]
  );
  res.json(r.rows);
};

// GET /friends/requests  -> solicitudes recibidas y enviadas (pendientes)
exports.listRequests = async (req, res) => {
  const r = await query(
    `select f.id, f.status,
            case when f.friend_id = $1 then 'received' else 'sent' end as direction,
            u.id as user_id, u.name, u.username
       from friendships f
       join users u on u.id = case when f.user_id = $1 then f.friend_id else f.user_id end
      where (f.user_id = $1 or f.friend_id = $1) and f.status = 'pending'`,
    [req.user.id]
  );
  res.json(r.rows);
};

// POST /friends/requests  { friend_id }
exports.sendRequest = async (req, res) => {
  required(req.body, ['friend_id']);
  const { friend_id } = req.body;
  if (friend_id === req.user.id) throw new HttpError(400, 'No puedes enviarte una solicitud a ti mismo');
  const target = await query("select 1 from users where id = $1 and status = 'active'", [friend_id]);
  if (!target.rowCount) throw new HttpError(404, 'Usuario no encontrado');

  // El índice único de la BD rechaza solicitudes duplicadas o inversas (error 409)
  const r = await query(
    `insert into friendships (user_id, friend_id, status) values ($1, $2, 'pending') returning *`,
    [req.user.id, friend_id]
  );
  await notify(
    { query },
    friend_id,
    'Nueva solicitud de amistad',
    'Alguien quiere ser tu amigo',
    'friend_request'
  );
  res.status(201).json(r.rows[0]);
};

// PATCH /friends/requests/:id  { status: 'accepted' | 'rejected' }
exports.answerRequest = async (req, res) => {
  const { status } = req.body;
  if (!['accepted', 'rejected'].includes(status)) {
    throw new HttpError(400, "status debe ser 'accepted' o 'rejected'");
  }
  const r = await query(
    `update friendships set status = $3
      where id = $1 and friend_id = $2 and status = 'pending' returning *`,
    [req.params.id, req.user.id, status]
  );
  if (!r.rowCount) throw new HttpError(404, 'Solicitud no encontrada o ya respondida');
  res.json(r.rows[0]);
};

// DELETE /friends/:id  (id de la amistad)
exports.remove = async (req, res) => {
  const r = await query(
    `delete from friendships where id = $1 and (user_id = $2 or friend_id = $2) returning id`,
    [req.params.id, req.user.id]
  );
  if (!r.rowCount) throw new HttpError(404, 'Amistad no encontrada');
  res.status(204).end();
};
