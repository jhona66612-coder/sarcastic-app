const { query, withTransaction } = require('../config/database');
const { HttpError, paginate } = require('../utils/helpers');

// GET /experience
exports.get = async (req, res) => {
  const r = await query('select * from user_experience where user_id = $1', [req.user.id]);
  if (!r.rowCount) throw new HttpError(404, 'Experiencia no encontrada');
  res.json(r.rows[0]);
};

// GET /experience/transactions
exports.transactions = async (req, res) => {
  const { limit, offset } = paginate(req, 50);
  const r = await query(
    `select * from experience_transactions where user_id = $1
      order by transaction_date desc limit $2 offset $3`,
    [req.user.id, limit, offset]
  );
  res.json(r.rows);
};

// GET /achievements
exports.listAchievements = async (req, res) => {
  const r = await query('select * from achievements order by points');
  res.json(r.rows);
};

// GET /users/me/achievements
exports.myAchievements = async (req, res) => {
  const r = await query(
    `select ua.id, ua.achieved_date, a.name, a.description, a.points
       from user_achievements ua join achievements a on a.id = ua.achievement_id
      where ua.user_id = $1 order by ua.achieved_date desc`,
    [req.user.id]
  );
  res.json(r.rows);
};

// GET /inventory-items
exports.listItems = async (req, res) => {
  const r = await query('select * from inventory_items order by name');
  res.json(r.rows);
};

// GET /inventory
exports.inventory = async (req, res) => {
  const r = await query(
    `select ui.id, ui.equipped, i.id as item_id, i.name, i.description, i.type, i.effect
       from user_inventory ui join inventory_items i on i.id = ui.item_id
      where ui.user_id = $1 order by i.name`,
    [req.user.id]
  );
  res.json(r.rows);
};

// PATCH /inventory/:id/equip  { equipped?: true|false }
exports.equip = async (req, res) => {
  const equipped = req.body.equipped === undefined ? true : Boolean(req.body.equipped);
  const row = await withTransaction(async (c) => {
    const cur = await c.query(
      `select i.type from user_inventory ui join inventory_items i on i.id = ui.item_id
        where ui.id = $1 and ui.user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (!cur.rowCount) throw new HttpError(404, 'Objeto no encontrado en tu inventario');
    if (equipped) {
      // Solo un objeto equipado por tipo
      await c.query(
        `update user_inventory ui set equipped = false
           from inventory_items i
          where i.id = ui.item_id and ui.user_id = $1 and i.type = $2`,
        [req.user.id, cur.rows[0].type]
      );
    }
    const r = await c.query('update user_inventory set equipped = $2 where id = $1 returning *', [
      req.params.id,
      equipped,
    ]);
    return r.rows[0];
  });
  res.json(row);
};
