const crypto = require('crypto');
const { query, withTransaction } = require('../config/database');
const { HttpError, required, toJson } = require('../utils/helpers');
const { addXp } = require('../services/xp');

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

async function ownAlarm(id, userId) {
  const r = await query('select * from alarms where id = $1 and user_id = $2', [id, userId]);
  if (!r.rowCount) throw new HttpError(404, 'Alarma no encontrada');
  return r.rows[0];
}

// GET /alarms
exports.list = async (req, res) => {
  const r = await query('select * from alarms where user_id = $1 order by time', [req.user.id]);
  res.json(r.rows);
};

// POST /alarms  { time: "HH:MM", status?, configuration? }
exports.create = async (req, res) => {
  required(req.body, ['time']);
  if (!TIME_REGEX.test(req.body.time)) throw new HttpError(400, 'time debe tener formato HH:MM');
  const r = await query(
    `insert into alarms (user_id, time, status, configuration)
     values ($1, $2, $3, $4::jsonb) returning *`,
    [req.user.id, req.body.time, req.body.status || 'active', toJson(req.body.configuration)]
  );
  res.status(201).json(r.rows[0]);
};

// PUT /alarms/:id
exports.update = async (req, res) => {
  const b = req.body;
  if (b.time && !TIME_REGEX.test(b.time)) throw new HttpError(400, 'time debe tener formato HH:MM');
  const r = await query(
    `update alarms
        set time = coalesce($3, time),
            status = coalesce($4, status),
            configuration = coalesce($5::jsonb, configuration)
      where id = $1 and user_id = $2
      returning *`,
    [req.params.id, req.user.id, b.time, b.status, toJson(b.configuration)]
  );
  if (!r.rowCount) throw new HttpError(404, 'Alarma no encontrada');
  res.json(r.rows[0]);
};

// DELETE /alarms/:id
exports.remove = async (req, res) => {
  const r = await query('delete from alarms where id = $1 and user_id = $2 returning id', [
    req.params.id,
    req.user.id,
  ]);
  if (!r.rowCount) throw new HttpError(404, 'Alarma no encontrada');
  res.status(204).end();
};

// POST /alarms/:id/qr-token  { expires_in_minutes? }
exports.createQrToken = async (req, res) => {
  await ownAlarm(req.params.id, req.user.id);
  const minutes = Math.min(Math.max(Number(req.body.expires_in_minutes) || 10, 1), 60);
  const token = crypto.randomBytes(24).toString('hex');
  const r = await query(
    `insert into alarm_qr_tokens (alarm_id, token, expiration_date)
     values ($1, $2, now() + make_interval(mins => $3::int))
     returning alarm_id, token, expiration_date`,
    [req.params.id, token, minutes]
  );
  res.status(201).json(r.rows[0]);
};

// POST /alarms/qr/scan  { token }
exports.scanQr = async (req, res) => {
  required(req.body, ['token']);
  const result = await withTransaction(async (c) => {
    const t = await c.query(
      `select q.id, q.alarm_id
         from alarm_qr_tokens q join alarms a on a.id = q.alarm_id
        where q.token = $1 and a.user_id = $2 and q.used = false and q.expiration_date > now()
        for update of q`,
      [req.body.token, req.user.id]
    );
    if (!t.rowCount) throw new HttpError(400, 'QR inválido, vencido o ya utilizado');
    const { id: tokenId, alarm_id } = t.rows[0];

    await c.query('update alarm_qr_tokens set used = true where id = $1', [tokenId]);
    // Se completa el último disparo pendiente; si no hay, se crea el registro
    let h = await c.query(
      `update alarm_history set scan_date = now(), fulfilled = true
        where id = (select id from alarm_history
                     where alarm_id = $1 and scan_date is null
                     order by activation_date desc limit 1)
        returning *`,
      [alarm_id]
    );
    if (!h.rowCount) {
      h = await c.query(
        `insert into alarm_history (alarm_id, scan_date, fulfilled)
         values ($1, now(), true) returning *`,
        [alarm_id]
      );
    }
    await addXp(c, req.user.id, 5, 'Alarma QR cumplida', alarm_id);
    return h.rows[0];
  });
  res.json({ valid: true, history: result });
};

// POST /alarms/:id/activations  -> registra que la alarma sonó
exports.activate = async (req, res) => {
  await ownAlarm(req.params.id, req.user.id);
  const r = await query('insert into alarm_history (alarm_id) values ($1) returning *', [
    req.params.id,
  ]);
  res.status(201).json(r.rows[0]);
};

// GET /alarms/:id/history
exports.history = async (req, res) => {
  await ownAlarm(req.params.id, req.user.id);
  const r = await query(
    'select * from alarm_history where alarm_id = $1 order by activation_date desc',
    [req.params.id]
  );
  res.json(r.rows);
};
