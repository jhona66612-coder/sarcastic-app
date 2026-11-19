const test = require('node:test');
const assert = require('node:assert/strict');
const { interpretBasic, parseWhen } = require('../src/services/assistant/language');
const { validatePlan } = require('../src/services/assistant/actions');
const id='12345678-1234-1234-1234-123456789abc';
const context = { now:new Date('2026-11-19T18:00:00Z'), timeZone:'America/La_Paz', tasks:[{id,title:'Estudiar química'}],events:[],alarms:[],focus:[] };
test('Spanish speech creates the right task, date, priority and calendar time',()=>{
  const result=interpretBasic('Recuérdame estudiar mañana a las cinco de la tarde con prioridad alta',context);
  assert.deepEqual(result.actions[0].data,{title:'estudiar',priority:'vital',deadline:'2026-11-20'});
  assert.equal(result.actions[1].data.start_date,'2026-11-20T21:00:00.000Z');
  validatePlan(result.actions,context);
});
test('spoken durations and relative dates work',()=>{
  assert.equal(interpretBasic('Inicia enfoque de veinticinco minutos',context).actions[0].data.duration_minutes,25);
  assert.equal(parseWhen('pasado mañana',context).date,'2026-11-21');
  const plan=interpretBasic('Crea la tarea estudiar el lunes a las 15:00 durante dos horas',context);
  assert.equal(plan.actions[0].data.title,'estudiar');
  assert.equal(Date.parse(plan.actions[1].data.end_date)-Date.parse(plan.actions[1].data.start_date),7200000);
});
test('missing data and compound commands never silently apply a partial request',()=>{
  const result=interpretBasic('Crea la tarea estudiar y programa una reunión',context);
  assert.equal(result.actions,undefined);
  assert.equal(result.clarify,true);
  const two=interpretBasic('Crea la tarea comprar pan y crea la tarea estudiar mañana',context);
  assert.equal(two.actions.length,2);
  assert.equal(two.actions[0].data.title,'comprar pan');
});
test('title lookup rejects ambiguous and unknown tasks',()=>{
  assert.equal(interpretBasic('Completa la tarea estudiar química',context).actions[0].id,id);
  assert.throws(()=>interpretBasic('Completa la tarea química',{...context,tasks:[...context.tasks,{id:'other',title:'Repasar química'}]}),/varios/);
  assert.throws(()=>interpretBasic('Elimina la tarea desconocida',context),/No encuentro/);
});
test('allowlist rejects foreign IDs, unknown tools and malformed dates',()=>{
  assert.throws(()=>validatePlan([{type:'delete_task',id:'22345678-1234-1234-1234-123456789abc'}],context),/tu cuenta/);
  assert.throws(()=>validatePlan([{type:'sql',data:{}}],context),/no disponible/);
  assert.throws(()=>validatePlan([{type:'create_task',data:{title:'X',priority:'vital',user_id:id}}],context),/Campo no permitido/);
  assert.throws(()=>validatePlan([{type:'create_task',data:{title:'X',priority:'vital',deadline:'2026-02-31'}}],context),/no existe/);
  assert.throws(()=>validatePlan([{type:'start_focus',data:{duration_minutes:999}}],context),/inválido/);
});
test('local date is correct around midnight in Bolivia and timezone changes',()=>{
  assert.equal(parseWhen('mañana',{...context,now:new Date('2026-11-20T02:00:00Z')}).date,'2026-11-20');
  assert.equal(parseWhen('mañana a las 17:00',{...context,timeZone:'Europe/Madrid'}).iso,'2026-11-20T16:00:00.000Z');
});
test('time ranges, title edits, priority and date filters are explicit',()=>{
  const range=interpretBasic('Programa una reunión mañana de 15 a 17',context);
  assert.equal(range.actions[0].data.start_date,'2026-11-20T19:00:00.000Z');
  assert.equal(range.actions[0].data.end_date,'2026-11-20T21:00:00.000Z');
  assert.equal(interpretBasic('Renombra la tarea estudiar química como repasar química',context).actions[0].data.title,'repasar química');
  assert.equal(interpretBasic('Pon la prioridad de la tarea estudiar química en alta',context).actions[0].data.priority,'vital');
  assert.deepEqual(interpretBasic('Qué tareas pendientes tengo mañana',context).actions[0].data,{status:'pending',deadline_on:'2026-11-20'});
});
