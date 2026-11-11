const { query } = require('../config/database');
const { HttpError, toJson } = require('../utils/helpers');

const PUBLIC_FIELDS = 'id, name, username, email, registration_date, status';

// PUT /users/me
exports.updateMe = async (req, res) => {
  const { name, username, email } = req.body;
  const r = await query(
    `update users
        set name = coalesce($2, name),
            username = coalesce($3, username),
            email = coalesce(lower($4), email)
      where id = $1
      returning ${PUBLIC_FIELDS}`,
    [req.user.id, name, username, email]
  );
  res.json(r.rows[0]);
};

// GET /users/search?q=texto
exports.search = async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (q.length < 2) throw new HttpError(400, 'Escribe al menos 2 letras en ?q=');
  const r = await query(
    `select id, name, username from users
      where username ilike $1 and id <> $2 and status = 'active'
      order by username limit 20`,
    [`%${q}%`, req.user.id]
  );
  res.json(r.rows);
};

// GET /users/me/settings
exports.getSettings = async (req, res) => {
  const r = await query('select * from user_settings where user_id = $1', [req.user.id]);
  if (!r.rowCount) throw new HttpError(404, 'Configuración no encontrada');
  res.json(r.rows[0]);
};

// PUT /users/me/settings
exports.updateSettings = async (req, res) => {
  const { sarcasm_level, notification_preferences, penalties, privacy_settings } = req.body;
  const r = await query(
    `update user_settings
        set sarcasm_level = coalesce($2, sarcasm_level),
            notification_preferences = coalesce($3::jsonb, notification_preferences),
            penalties = coalesce($4::jsonb, penalties),
            privacy_settings = coalesce($5::jsonb, privacy_settings)
      where user_id = $1
      returning *`,
    [
      req.user.id,
      sarcasm_level,
      toJson(notification_preferences),
      toJson(penalties),
      toJson(privacy_settings),
    ]
  );
  if (!r.rowCount) throw new HttpError(404, 'Configuración no encontrada');
  res.json(r.rows[0]);
};
