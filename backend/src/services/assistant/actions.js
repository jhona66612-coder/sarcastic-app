const tasks = require('../../controllers/tasks.controller');
const events = require('../../controllers/events.controller');
const focus = require('../../controllers/focus.controller');
const alarms = require('../../controllers/alarms.controller');
const streaks = require('../../controllers/streaks.controller');
const users = require('../../controllers/users.controller');
const experience = require('../../controllers/experience.controller');
const notifications = require('../../controllers/notifications.controller');
const { HttpError } = require('../../utils/helpers');

const text = { type: 'string', minLength: 1, maxLength: 500 };
const date = { type: 'string', format: 'date' };
const datetime = { type: 'string', format: 'date-time' };
const priority = { type: 'string', enum: ['ordinary', 'important', 'vital'] };
const status = { type: 'string', enum: ['pending', 'in_progress', 'completed', 'postponed'] };
const pages = ['inicio', 'agenda', 'rachas', 'roast', 'social', 'perfil', 'alarma', 'notificaciones'];

// This registry is the complete capability boundary for both speech and AI.
const actions = {
  create_task: { handler: tasks.create, path: '/inicio', label: 'Tarea creada', required: ['title', 'priority'], fields: { title: text, description: text, priority, deadline: date } },
  update_task: { handler: tasks.update, path: '/inicio', label: 'Tarea actualizada', entity: 'tasks', fields: { title: text, description: text, priority, deadline: date, alternative_plan: text } },
  task_status: { handler: tasks.changeStatus, path: '/inicio', label: 'Estado actualizado', entity: 'tasks', required: ['status'], fields: { status } },
  delete_task: { handler: tasks.remove, path: '/inicio', label: 'Tarea eliminada', entity: 'tasks', confirm: true, fields: {} },
  list_tasks: { handler: tasks.list, path: '/inicio', label: 'Tus tareas', query: true, fields: { status, priority, deadline_on: date } },
  create_event: { handler: events.create, path: '/agenda', label: 'Evento programado', required: ['title', 'start_date', 'end_date'], fields: { title: text, start_date: datetime, end_date: datetime } },
  update_event: { handler: events.update, path: '/agenda', label: 'Evento actualizado', entity: 'events', fields: { title: text, start_date: datetime, end_date: datetime } },
  delete_event: { handler: events.remove, path: '/agenda', label: 'Evento eliminado', entity: 'events', confirm: true, fields: {} },
  list_events: { handler: events.list, path: '/agenda', label: 'Tu agenda', query: true, fields: { from: datetime, to: datetime } },
  start_focus: { handler: focus.start, path: '/agenda', label: 'Enfoque iniciado', required: ['duration_minutes'], fields: { duration_minutes: { type: 'integer', minimum: 1, maximum: 240 } } },
  finish_focus: { handler: focus.finish, path: '/agenda', label: 'Enfoque completado', entity: 'focus', fields: {} },
  interrupt_focus: { handler: focus.interrupt, path: '/agenda', label: 'Enfoque interrumpido', entity: 'focus', fields: {} },
  create_alarm: { handler: alarms.create, path: '/alarma', label: 'Alarma guardada', required: ['time'], fields: { time: { type: 'string', pattern: '^([01]\\d|2[0-3]):[0-5]\\d$' } } },
  update_alarm: { handler: alarms.update, path: '/alarma', label: 'Alarma actualizada', entity: 'alarms', fields: { time: { type: 'string', pattern: '^([01]\\d|2[0-3]):[0-5]\\d$' }, status: { type: 'string', enum: ['active', 'inactive'] } } },
  delete_alarm: { handler: alarms.remove, path: '/alarma', label: 'Alarma eliminada', entity: 'alarms', confirm: true, fields: {} },
  list_alarms: { handler: alarms.list, path: '/alarma', label: 'Tus alarmas', fields: {} },
  check_in: { handler: streaks.checkIn, path: '/rachas', label: 'Actividad de hoy registrada', fields: {} },
  free_day: { handler: streaks.addFreeDay, path: '/rachas', label: 'Día libre añadido', required: ['free_date'], fields: { free_date: date } },
  get_progress: { handler: experience.get, path: '/perfil', label: 'Tu progreso', fields: {} },
  set_sarcasm: { handler: users.updateSettings, path: '/perfil', label: 'Sarcasmo actualizado', required: ['sarcasm_level'], fields: { sarcasm_level: { type: 'integer', minimum: 0, maximum: 10 } } },
  read_notifications: { handler: notifications.markAllRead, path: '/notificaciones', label: 'Notificaciones marcadas como leídas', fields: {} },
  navigate: { path: '', label: 'Sección abierta', required: ['page'], fields: { page: { type: 'string', enum: pages } } },
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function validateValue(key, value, rule) {
  if (rule.type === 'string' && (typeof value !== 'string' || value.length > (rule.maxLength || 500) || value.trim().length < (rule.minLength || 0))) throw new HttpError(400, 'Valor inválido para ' + key);
  if (rule.type === 'integer' && (!Number.isInteger(value) || value < rule.minimum || value > rule.maximum)) throw new HttpError(400, 'Número inválido para ' + key);
  if (rule.enum && !rule.enum.includes(value)) throw new HttpError(400, 'Opción inválida para ' + key);
  if (rule.pattern && !new RegExp(rule.pattern).test(value)) throw new HttpError(400, 'Hora inválida');
  if (rule.format) {
    const validDate = Number.isFinite(Date.parse(value));
    const pattern = rule.format === 'date' ? /^\d{4}-\d{2}-\d{2}$/ : /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}.*(?:Z|[+-]\d{2}:\d{2})$/;
    if (!validDate || !pattern.test(value)) throw new HttpError(400, 'Fecha inválida para ' + key);
    if (rule.format === 'date' && new Date(value).toISOString().slice(0, 10) !== value) throw new HttpError(400, 'Esa fecha no existe');
  }
}
function validatePlan(plan, context) {
  if (!Array.isArray(plan) || !plan.length || plan.length > 8) throw new HttpError(400, 'La instrucción debe contener entre una y ocho acciones.');
  for (const action of plan) {
    if (!action || !Object.hasOwn(actions, action.type)) throw new HttpError(400, 'Acción no disponible');
    const spec = actions[action.type];
    const data = action.data || {};
    if (typeof data !== 'object' || Array.isArray(data)) throw new HttpError(400, 'Datos de acción inválidos');
    if (spec.entity && (!uuidPattern.test(action.id || '') || !context[spec.entity].some(row => row.id === action.id))) throw new HttpError(400, 'No encuentro ese registro en tu cuenta.');
    for (const required of spec.required || []) {
      if (data[required] === undefined) throw new HttpError(400, 'Falta ' + required);
    }
    for (const [key, value] of Object.entries(data)) {
      if (!Object.hasOwn(spec.fields, key)) throw new HttpError(400, 'Campo no permitido');
      validateValue(key, value, spec.fields[key]);
    }
    if (action.type.startsWith('update_') && !Object.keys(data).length) throw new HttpError(400, 'Indica qué deseas cambiar.');
    if (action.type === 'create_event' || action.type === 'update_event') {
      const original = context.events.find(e => e.id === action.id) || {};
      if (Date.parse(data.end_date || original.end_date) <= Date.parse(data.start_date || original.start_date)) throw new HttpError(400, 'La hora final debe ser posterior al inicio.');
    }
  }
}
function toolSchema(name, spec) {
  return {
    name, description: spec.label + (spec.entity ? '. Usa exclusivamente un id de ' + spec.entity + ' del contexto.' : ''),
    input_schema: {
      type: 'object',
      properties: { ...(spec.entity && { id: { type: 'string', format: 'uuid' } }), ...spec.fields },
      required: [...(spec.entity ? ['id'] : []), ...(spec.required || [])],
      additionalProperties: false,
    },
  };
}
async function executeAction(action, user) {
  const spec = actions[action.type];
  let data;
  if (spec.handler) {
    const response = { status() { return this; }, json(value) { data = value; return this; }, end() { return this; } };
    // Keep ownership checks, XP awards, history and notifications in the original handlers.
    await spec.handler({ user, params: { id: action.id }, body: action.data || {}, query: spec.query ? action.data || {} : {} }, response);
  }
  return { type: action.type, id: action.id, title: spec.label, path: action.type === 'navigate' ? '/' + action.data.page : spec.path, data };
}
module.exports = { actions, validatePlan, toolSchema, executeAction, uuidPattern };
