const { query } = require('../config/database');
const { HttpError, required, paginate } = require('../utils/helpers');

// GET /notifications  (filtro opcional: ?unread=true)
exports.list = async (req, res) => {
  const { limit, offset } = paginate(req, 30);
  const unread = req.query.unread === 'true' ? 'and read_status = false' : '';
  const r = await query(
    `select * from notifications where user_id = $1 ${unread}
      order by creation_date desc limit $2 offset $3`,
    [req.user.id, limit, offset]
  );
  res.json(r.rows);
};

// PATCH /notifications/:id/read
exports.markRead = async (req, res) => {
  const r = await query(
    'update notifications set read_status = true where id = $1 and user_id = $2 returning *',
    [req.params.id, req.user.id]
  );
  if (!r.rowCount) throw new HttpError(404, 'Notificación no encontrada');
  res.json(r.rows[0]);
};

// PATCH /notifications/read-all
exports.markAllRead = async (req, res) => {
  const r = await query(
    'update notifications set read_status = true where user_id = $1 and read_status = false',
    [req.user.id]
  );
  res.json({ updated: r.rowCount });
};

// POST /push-tokens  { device_token }
exports.registerPushToken = async (req, res) => {
  required(req.body, ['device_token']);
  await query(
    `insert into push_tokens (user_id, device_token) values ($1, $2)
     on conflict (user_id, device_token) do nothing`,
    [req.user.id, req.body.device_token]
  );
  res.status(201).json({ registered: true });
};

// DELETE /push-tokens  { device_token }  (también acepta ?device_token=)
exports.removePushToken = async (req, res) => {
  const token = req.body.device_token || req.query.device_token;
  if (!token) throw new HttpError(400, 'Falta device_token');
  await query('delete from push_tokens where user_id = $1 and device_token = $2', [
    req.user.id,
    token,
  ]);
  res.status(204).end();
};
