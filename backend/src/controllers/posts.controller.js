const { query } = require('../config/database');
const { HttpError, required, paginate } = require('../utils/helpers');

// GET /posts
exports.list = async (req, res) => {
  const { limit, offset } = paginate(req, 20);
  const r = await query(
    `select p.id, p.content, p.creation_date,
            u.id as user_id, u.username, u.name,
            (select count(*)::int from post_likes l where l.post_id = p.id) as likes_count,
            (select count(*)::int from comments c where c.post_id = p.id) as comments_count,
            exists (select 1 from post_likes l where l.post_id = p.id and l.user_id = $1) as liked_by_me
       from posts p join users u on u.id = p.user_id
      order by p.creation_date desc limit $2 offset $3`,
    [req.user.id, limit, offset]
  );
  res.json(r.rows);
};

// POST /posts  { content }
exports.create = async (req, res) => {
  required(req.body, ['content']);
  const r = await query('insert into posts (user_id, content) values ($1, $2) returning *', [
    req.user.id,
    req.body.content,
  ]);
  res.status(201).json(r.rows[0]);
};

// DELETE /posts/:id  (solo el autor)
exports.remove = async (req, res) => {
  const r = await query('delete from posts where id = $1 and user_id = $2 returning id', [
    req.params.id,
    req.user.id,
  ]);
  if (!r.rowCount) throw new HttpError(404, 'Publicación no encontrada o no es tuya');
  res.status(204).end();
};

// POST /posts/:id/likes
exports.like = async (req, res) => {
  await query(
    `insert into post_likes (post_id, user_id) values ($1, $2)
     on conflict (post_id, user_id) do nothing`,
    [req.params.id, req.user.id]
  );
  res.status(201).json({ liked: true });
};

// DELETE /posts/:id/likes
exports.unlike = async (req, res) => {
  await query('delete from post_likes where post_id = $1 and user_id = $2', [
    req.params.id,
    req.user.id,
  ]);
  res.status(204).end();
};

// GET /posts/:id/comments
exports.listComments = async (req, res) => {
  const r = await query(
    `select c.id, c.content, c.creation_date, u.id as user_id, u.username, u.name
       from comments c join users u on u.id = c.user_id
      where c.post_id = $1 order by c.creation_date`,
    [req.params.id]
  );
  res.json(r.rows);
};

// POST /posts/:id/comments  { content }
exports.createComment = async (req, res) => {
  required(req.body, ['content']);
  const r = await query(
    'insert into comments (post_id, user_id, content) values ($1, $2, $3) returning *',
    [req.params.id, req.user.id, req.body.content]
  );
  res.status(201).json(r.rows[0]);
};
