const { query } = require('../config/database');
const { HttpError, required, paginate } = require('../utils/helpers');
const { askSlothBot } = require('../services/slothbot');

// POST /ai/chat  { message }
exports.chat = async (req, res) => {
  required(req.body, ['message']);
  const { message } = req.body;

  const settings = await query('select sarcasm_level from user_settings where user_id = $1', [
    req.user.id,
  ]);
  const level = settings.rows[0]?.sarcasm_level ?? 5;
  const tasks = (
    await query(
      `select title, status, priority, deadline from tasks
        where user_id = $1 and status in ('pending', 'in_progress', 'postponed')
        order by deadline nulls last limit 10`,
      [req.user.id]
    )
  ).rows;

  await query('insert into ai_messages (user_id, message, sender) values ($1, $2, $3)', [
    req.user.id, message, 'user',
  ]);
  const reply = await askSlothBot(message, level, tasks);
  const saved = await query(
    `insert into ai_messages (user_id, message, sender) values ($1, $2, 'bot')
     returning id, message, sender, message_date`,
    [req.user.id, reply]
  );
  res.status(201).json({ reply: saved.rows[0] });
};

// GET /ai/messages
exports.messages = async (req, res) => {
  const { limit, offset } = paginate(req, 50);
  const r = await query(
    `select id, message, sender, message_date from ai_messages
      where user_id = $1 order by message_date desc limit $2 offset $3`,
    [req.user.id, limit, offset]
  );
  res.json(r.rows);
};

// GET /ai/analyses
exports.listAnalyses = async (req, res) => {
  const r = await query('select * from ai_analyses where user_id = $1 order by analysis_date desc', [
    req.user.id,
  ]);
  res.json(r.rows);
};

// GET /ai/analyses/:id
exports.getAnalysis = async (req, res) => {
  const r = await query('select * from ai_analyses where id = $1 and user_id = $2', [
    req.params.id,
    req.user.id,
  ]);
  if (!r.rowCount) throw new HttpError(404, 'Análisis no encontrado');
  res.json(r.rows[0]);
};

// POST /ai/analyses  { analysis_type }  -> calcula estadísticas de productividad
exports.createAnalysis = async (req, res) => {
  required(req.body, ['analysis_type']);
  const tasks = (
    await query(
      `select count(*) filter (where status = 'completed')::int as completed,
              count(*) filter (where status = 'pending')::int as pending,
              count(*) filter (where status = 'in_progress')::int as in_progress,
              count(*) filter (where status = 'postponed')::int as postponed,
              count(*) filter (where status = 'completed'
                               and completion_date >= current_date - 7)::int as completed_last_7_days
         from tasks where user_id = $1`,
      [req.user.id]
    )
  ).rows[0];
  const focus = (
    await query(
      `select coalesce(sum(extract(epoch from duration) / 60)
                       filter (where status = 'completed'), 0)::int as focus_minutes_last_7_days,
              count(*) filter (where status = 'interrupted')::int as interrupted_last_7_days
         from focus_sessions
        where user_id = $1 and start_time >= now() - interval '7 days'`,
      [req.user.id]
    )
  ).rows[0];

  const total = tasks.completed + tasks.pending + tasks.in_progress + tasks.postponed;
  const result = {
    tasks,
    focus,
    completion_rate: total ? Math.round((tasks.completed / total) * 100) : 0,
  };
  const r = await query(
    `insert into ai_analyses (user_id, analysis_type, result) values ($1, $2, $3::jsonb)
     returning *`,
    [req.user.id, req.body.analysis_type, JSON.stringify(result)]
  );
  res.status(201).json(r.rows[0]);
};
