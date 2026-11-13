require('express-async-errors');
const express = require('express');
const cors = require('cors');
const path = require('node:path');
const routes = require('./routes');
const { notFound, errorHandler } = require('./middlewares/errorHandler');
const { query } = require('./config/database');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/v1/health', (req, res) => res.json({ ok: true }));

app.get('/api/v1/db-check', async (req, res) => {
  const r = await query('select count(*)::int as users from users');
  res.json({ ok: true, users: r.rows[0].users });
});

app.use('/api/v1', routes);
app.use('/api', notFound);

const webRoot = path.join(__dirname, '..', 'public');
app.use(express.static(webRoot, { index: false }));
app.get(['/', '/inicio', '/agenda', '/rachas', '/roast', '/social', '/perfil', '/alarma', '/notificaciones'], (req, res) => {
  res.set('Cache-Control', 'no-cache').sendFile(path.join(webRoot, 'index.html'));
});
app.use(notFound);
app.use(errorHandler);

module.exports = app;
