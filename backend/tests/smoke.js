// Prueba de humo: recorre todos los endpoints. Uso: node tests/smoke.js
const BASE = process.env.BASE || 'http://localhost:3000/api/v1';
let passed = 0, failed = 0;
const covered = new Set();

async function call(method, path, body, token, expect) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch (e) { /* 204 */ }
  const ok = Array.isArray(expect) ? expect.includes(res.status) : res.status === (expect || 200);
  covered.add(method + ' ' + path.split('?')[0].replace(/[0-9a-f]{8}-[0-9a-f-]{27}/g, ':id'));
  if (ok) passed++; else { failed++; console.log('FALLO', method, path, res.status, JSON.stringify(data)); }
  return { status: res.status, data };
}

(async () => {
  const t = Date.now();
  // --- A. Auth
  const a = await call('POST', '/auth/register', { name: 'Ana', username: 'ana' + t, email: `ana${t}@mail.com`, password: 'secreto1' }, null, 201);
  const b = await call('POST', '/auth/register', { name: 'Beto', username: 'beto' + t, email: `beto${t}@mail.com`, password: 'secreto1' }, null, 201);
  await call('POST', '/auth/register', { name: 'Ana', username: 'ana' + t, email: `x${t}@mail.com`, password: 'secreto1' }, null, 409);
  await call('POST', '/auth/register', { name: 'Sin pass' }, null, 400);
  const TA = a.data.token, TB = b.data.token, ida = a.data.user.id, idb = b.data.user.id;
  await call('POST', '/auth/login', { email: `ana${t}@mail.com`, password: 'mala' }, null, 401);
  await call('POST', '/auth/login', { username: 'ana' + t, password: 'secreto1' }, null, 200);
  await call('GET', '/auth/me', null, null, 401);
  const me = await call('GET', '/auth/me', null, TA);
  if (me.data.password_hash) { failed++; console.log('FALLO: se devolvió password_hash'); }
  await call('PUT', '/users/me', { name: 'Ana Maria' }, TA);
  await call('GET', '/users/search?q=beto', null, TA);
  await call('GET', '/users/me/settings', null, TA);
  await call('PUT', '/users/me/settings', { sarcasm_level: 8, privacy_settings: { posts: 'friends' } }, TA);
  await call('PUT', '/users/me/settings', { sarcasm_level: 99 }, TA, 400);

  // --- B. Tareas
  const cats = await call('GET', '/task-categories', null, TA);
  await call('POST', '/task-categories', { name: 'Extra' }, TA, 201);
  const task = await call('POST', '/tasks', { title: 'Estudiar BD', priority: 'vital', category_id: cats.data[0].id, deadline: '2026-12-01', estimated_duration: '01:30:00' }, TA, 201);
  const tid = task.data.id;
  await call('POST', '/tasks', { title: 'x', priority: 'urgente' }, TA, 400);
  await call('GET', '/tasks?status=pending', null, TA);
  await call('GET', '/tasks/' + tid, null, TA);
  await call('GET', '/tasks/' + tid, null, TB, 404);
  await call('PUT', '/tasks/' + tid, { title: 'Estudiar BD II' }, TA);
  await call('PATCH', `/tasks/${tid}/status`, { status: 'inventado' }, TA, 400);
  await call('PATCH', `/tasks/${tid}/status`, { status: 'completed' }, TA);
  await call('GET', `/tasks/${tid}/history`, null, TA);
  const t2 = await call('POST', '/tasks', { title: 'Borrar', priority: 'ordinary' }, TA, 201);
  await call('DELETE', '/tasks/' + t2.data.id, null, TA, 204);

  // --- C. Calendario y enfoque
  const ev = await call('POST', '/events', { title: 'Parcial', start_date: '2026-11-10T08:00:00-04:00', end_date: '2026-11-10T10:00:00-04:00' }, TA, 201);
  await call('POST', '/events', { title: 'Mal', start_date: '2026-11-10T10:00:00-04:00', end_date: '2026-11-10T08:00:00-04:00' }, TA, 400);
  await call('GET', '/events', null, TA);
  await call('GET', '/events/' + ev.data.id, null, TA);
  await call('PUT', '/events/' + ev.data.id, { title: 'Parcial final' }, TA);
  await call('DELETE', '/events/' + ev.data.id, null, TA, 204);
  const fs = await call('POST', '/focus-sessions', { duration_minutes: 25, task_id: tid }, TA, 201);
  await call('PATCH', `/focus-sessions/${fs.data.id}/finish`, null, TA);
  await call('PATCH', `/focus-sessions/${fs.data.id}/finish`, null, TA, 409);
  const fs2 = await call('POST', '/focus-sessions', { duration_minutes: 10 }, TA, 201);
  await call('PATCH', `/focus-sessions/${fs2.data.id}/interrupt`, null, TA);
  await call('GET', '/focus-sessions', null, TA);

  // --- D. Rachas
  await call('GET', '/streaks', null, TA);
  const ci = await call('POST', '/streaks/check-in', null, TA);
  if (ci.data.streak.current_streak !== 1) { failed++; console.log('FALLO racha esperada 1'); }
  const ci2 = await call('POST', '/streaks/check-in', null, TA);
  if (!ci2.data.already_checked_in) { failed++; console.log('FALLO check-in repetido'); }
  await call('GET', '/streaks/history', null, TA);
  await call('GET', '/streak-tokens', null, TA);
  await call('POST', '/streak-tokens/use', {}, TA, 400);
  const fd = await call('POST', '/free-days', { free_date: '2026-11-20' }, TA, 201);
  await call('POST', '/free-days', { free_date: '2026-11-20' }, TA, 409);
  await call('GET', '/free-days', null, TA);
  await call('DELETE', '/free-days/' + fd.data.id, null, TA, 204);

  // --- E. SlothBot
  await call('POST', '/ai/chat', { message: 'No tengo ganas de estudiar' }, TA, 201);
  await call('GET', '/ai/messages', null, TA);
  const an = await call('POST', '/ai/analyses', { analysis_type: 'productivity' }, TA, 201);
  await call('GET', '/ai/analyses', null, TA);
  await call('GET', '/ai/analyses/' + an.data.id, null, TA);

  // --- F. Experiencia
  const xp = await call('GET', '/experience', null, TA);
  console.log('   XP de Ana:', xp.data.experience_points, 'nivel', xp.data.level, xp.data.rank);
  await call('GET', '/experience/transactions', null, TA);
  await call('GET', '/achievements', null, TA);
  const ach = await call('GET', '/users/me/achievements', null, TA);
  console.log('   Logros de Ana:', ach.data.map((x) => x.name).join(' | '));
  const items = await call('GET', '/inventory-items', null, TA);
  await call('GET', '/inventory', null, TA);
  await call('PATCH', '/inventory/00000000-0000-0000-0000-000000000000/equip', {}, TA, 404);
  global.itemId = items.data[0].id;

  // --- G. Comunidad
  const fr = await call('POST', '/friends/requests', { friend_id: idb }, TA, 201);
  await call('POST', '/friends/requests', { friend_id: idb }, TA, 409);
  await call('POST', '/friends/requests', { friend_id: ida }, TB, 409); // inversa
  await call('POST', '/friends/requests', { friend_id: ida }, TA, 400);
  await call('GET', '/friends/requests', null, TB);
  await call('PATCH', '/friends/requests/' + fr.data.id, { status: 'accepted' }, TA, 404); // solo el receptor
  await call('PATCH', '/friends/requests/' + fr.data.id, { status: 'accepted' }, TB);
  await call('GET', '/friends', null, TA);
  const gr = await call('POST', '/groups', { name: 'Equipo BD' }, TA, 201);
  await call('GET', '/groups', null, TA);
  await call('GET', '/groups/' + gr.data.id, null, TA);
  await call('POST', `/groups/${gr.data.id}/members`, { user_id: idb }, TB, 403);
  await call('POST', `/groups/${gr.data.id}/members`, { user_id: idb }, TA, 201);
  await call('POST', `/groups/${gr.data.id}/members`, { user_id: idb }, TA, 409);
  await call('DELETE', `/groups/${gr.data.id}/members/${idb}`, null, TA, 204);
  const po = await call('POST', '/posts', { content: 'Hoy completé mi primera tarea' }, TA, 201);
  await call('GET', '/posts', null, TB);
  await call('POST', `/posts/${po.data.id}/likes`, null, TB, 201);
  await call('POST', `/posts/${po.data.id}/likes`, null, TB, 201);
  await call('DELETE', `/posts/${po.data.id}/likes`, null, TB, 204);
  await call('POST', `/posts/${po.data.id}/comments`, { content: 'Bien!' }, TB, 201);
  await call('GET', `/posts/${po.data.id}/comments`, null, TA);
  await call('DELETE', '/posts/' + po.data.id, null, TB, 404);
  await call('DELETE', '/posts/' + po.data.id, null, TA, 204);
  await call('DELETE', '/friends/' + fr.data.id, null, TA, 204);

  // --- H. Desafíos
  const ch = await call('POST', '/challenges', { name: 'Semana productiva', start_date: '2026-11-05T00:00:00-04:00', end_date: '2026-11-12T00:00:00-04:00' }, TA, 201);
  await call('GET', '/challenges', null, TB);
  await call('GET', '/challenges/' + ch.data.id, null, TB);
  await call('POST', `/challenges/${ch.data.id}/participants`, null, TB, 201);
  await call('POST', `/challenges/${ch.data.id}/participants`, null, TB, 409);
  await call('PATCH', `/challenges/${ch.data.id}/progress`, { progress: 40 }, TB);
  await call('PATCH', `/challenges/${ch.data.id}/progress`, { progress: 10 }, TA);
  await call('GET', `/challenges/${ch.data.id}/participants`, null, TA);
  await call('PATCH', '/challenges/' + ch.data.id, { status: 'completed' }, TB, 404);
  const cc = await call('PATCH', '/challenges/' + ch.data.id, { status: 'completed' }, TA);
  if (cc.data.winner_id !== idb) { failed++; console.log('FALLO ganador esperado Beto'); }

  // --- I. Alarmas
  const al = await call('POST', '/alarms', { time: '06:30', configuration: { days: ['mon', 'tue'] } }, TA, 201);
  await call('POST', '/alarms', { time: '25:99' }, TA, 400);
  await call('GET', '/alarms', null, TA);
  await call('PUT', '/alarms/' + al.data.id, { status: 'inactive' }, TA);
  await call('POST', `/alarms/${al.data.id}/activations`, null, TA, 201);
  const qr = await call('POST', `/alarms/${al.data.id}/qr-token`, {}, TA, 201);
  await call('POST', '/alarms/qr/scan', { token: 'falso' }, TA, 400);
  await call('POST', '/alarms/qr/scan', { token: qr.data.token }, TB, 400);
  await call('POST', '/alarms/qr/scan', { token: qr.data.token }, TA);
  await call('POST', '/alarms/qr/scan', { token: qr.data.token }, TA, 400); // ya usado
  await call('GET', `/alarms/${al.data.id}/history`, null, TA);
  await call('DELETE', '/alarms/' + al.data.id, null, TA, 204);

  // --- J. Notificaciones
  const nots = await call('GET', '/notifications?unread=true', null, TA);
  await call('PATCH', `/notifications/${nots.data[0].id}/read`, null, TA);
  await call('PATCH', '/notifications/read-all', null, TA);
  await call('POST', '/push-tokens', { device_token: 'ExponentPushToken[abc]' }, TA, 201);
  await call('POST', '/push-tokens', { device_token: 'ExponentPushToken[abc]' }, TA, 201);
  await call('DELETE', '/push-tokens', { device_token: 'ExponentPushToken[abc]' }, TA, 204);

  console.log(`\nResultado: ${passed} correctas, ${failed} fallidas`);
  console.log('Rutas distintas probadas:', covered.size);
  process.exit(failed ? 1 : 0);
})();
