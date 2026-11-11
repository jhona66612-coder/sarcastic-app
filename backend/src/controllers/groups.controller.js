const { query, withTransaction } = require('../config/database');
const { HttpError, required } = require('../utils/helpers');

async function roleOf(groupId, userId) {
  const r = await query('select role from group_members where group_id = $1 and user_id = $2', [
    groupId,
    userId,
  ]);
  return r.rows[0]?.role || null;
}

// GET /groups  -> grupos de los que soy miembro
exports.list = async (req, res) => {
  const r = await query(
    `select g.*, m.role from groups g join group_members m on m.group_id = g.id
      where m.user_id = $1 order by g.name`,
    [req.user.id]
  );
  res.json(r.rows);
};

// POST /groups  { name, description? }
exports.create = async (req, res) => {
  required(req.body, ['name']);
  const group = await withTransaction(async (c) => {
    const g = await c.query(
      'insert into groups (name, description, creator_id) values ($1, $2, $3) returning *',
      [req.body.name, req.body.description, req.user.id]
    );
    await c.query(
      "insert into group_members (group_id, user_id, role) values ($1, $2, 'admin')",
      [g.rows[0].id, req.user.id]
    );
    return g.rows[0];
  });
  res.status(201).json(group);
};

// GET /groups/:id
exports.getOne = async (req, res) => {
  if (!(await roleOf(req.params.id, req.user.id))) {
    throw new HttpError(404, 'Grupo no encontrado o no eres miembro');
  }
  const g = await query('select * from groups where id = $1', [req.params.id]);
  const members = await query(
    `select u.id as user_id, u.name, u.username, m.role
       from group_members m join users u on u.id = m.user_id
      where m.group_id = $1 order by m.role, u.username`,
    [req.params.id]
  );
  res.json({ ...g.rows[0], members: members.rows });
};

// POST /groups/:id/members  { user_id, role? }  (solo admin)
exports.addMember = async (req, res) => {
  required(req.body, ['user_id']);
  if ((await roleOf(req.params.id, req.user.id)) !== 'admin') {
    throw new HttpError(403, 'Solo un admin puede agregar miembros');
  }
  const role = req.body.role || 'member';
  if (!['member', 'admin'].includes(role)) throw new HttpError(400, "role debe ser 'member' o 'admin'");
  const r = await query(
    'insert into group_members (group_id, user_id, role) values ($1, $2, $3) returning *',
    [req.params.id, req.body.user_id, role]
  );
  res.status(201).json(r.rows[0]);
};

// DELETE /groups/:id/members/:userId  (admin, o el propio miembro al salir)
exports.removeMember = async (req, res) => {
  const isSelf = req.params.userId === req.user.id;
  if (!isSelf && (await roleOf(req.params.id, req.user.id)) !== 'admin') {
    throw new HttpError(403, 'No tienes permiso para quitar a este miembro');
  }
  const r = await query(
    'delete from group_members where group_id = $1 and user_id = $2 returning id',
    [req.params.id, req.params.userId]
  );
  if (!r.rowCount) throw new HttpError(404, 'Miembro no encontrado');
  res.status(204).end();
};
