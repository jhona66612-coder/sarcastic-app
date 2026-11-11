const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query, withTransaction } = require('../config/database');
const { HttpError, required } = require('../utils/helpers');

const PUBLIC_FIELDS = 'id, name, username, email, registration_date, status';

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

// POST /auth/register
exports.register = async (req, res) => {
  const b = req.body;
  required(b, ['name', 'username', 'email', 'password']);
  if (String(b.password).length < 6) {
    throw new HttpError(400, 'La contraseña debe tener al menos 6 caracteres');
  }
  const hash = await bcrypt.hash(b.password, 10);

  // Se crean el usuario y sus registros iniciales en una sola transacción
  const user = await withTransaction(async (c) => {
    const r = await c.query(
      `insert into users (name, username, email, password_hash, status)
       values ($1, $2, lower($3), $4, 'active')
       returning ${PUBLIC_FIELDS}`,
      [b.name, b.username, b.email, hash]
    );
    const u = r.rows[0];
    await c.query(
      `insert into user_settings (user_id, sarcasm_level, notification_preferences, penalties, privacy_settings)
       values ($1, 5, '{}', '{}', '{}')`,
      [u.id]
    );
    await c.query(
      `insert into user_experience (user_id, experience_points, level, rank)
       values ($1, 0, 1, 'Novato')`,
      [u.id]
    );
    await c.query(
      `insert into streaks (user_id, current_streak, best_streak, status)
       values ($1, 0, 0, 'inactive')`,
      [u.id]
    );
    await c.query(
      'insert into streak_tokens (user_id, available_tokens, used_tokens) values ($1, 0, 0)',
      [u.id]
    );
    return u;
  });

  res.status(201).json({ user, token: signToken(user.id) });
};

// POST /auth/login  (acepta email o username)
exports.login = async (req, res) => {
  const { email, username, password } = req.body;
  if (!(email || username) || !password) {
    throw new HttpError(400, 'Envía email (o username) y password');
  }
  const r = await query(
    'select * from users where email = lower($1) or username = $2',
    [email || '', username || email || '']
  );
  const user = r.rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    throw new HttpError(401, 'Credenciales incorrectas');
  }
  if (user.status !== 'active') {
    throw new HttpError(403, 'La cuenta no está activa');
  }
  delete user.password_hash;
  res.json({ user, token: signToken(user.id) });
};

// GET /auth/me
exports.me = async (req, res) => {
  const r = await query(`select ${PUBLIC_FIELDS} from users where id = $1`, [req.user.id]);
  if (!r.rowCount) throw new HttpError(404, 'Usuario no encontrado');
  res.json(r.rows[0]);
};
