const chrono = require('chrono-node');
const { HttpError } = require('../../utils/helpers');
const fold = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const pad = value => String(value).padStart(2, '0');
const numbers = { una:1, uno:1, dos:2, tres:3, cuatro:4, cinco:5, seis:6, siete:7, ocho:8, nueve:9, diez:10, once:11, doce:12, trece:13, catorce:14, quince:15, dieciseis:16, diecisiete:17, dieciocho:18, diecinueve:19, veinte:20, veintiuno:21, veintidos:22, veintitres:23, veinticuatro:24, veinticinco:25, treinta:30, cuarenta:40, cuarentaicinco:45, sesenta:60 };
function normalizeTime(message) {
  let text = message.replace(/pasado mañana/gi, 'dentro de 2 días').replace(/cuarenta y cinco/gi, '45').replace(/veinticinco/gi, '25');
  text = text.replace(/\b(a las?\s+|de\s+|por\s+|durante\s+)([a-záéíóú]+)\b/gi, (all, prefix, word) => numbers[fold(word)] ? prefix + numbers[fold(word)] : all);
  text = text.replace(/(\d{1,2})\s+y\s+media\b/gi, '$1:30').replace(/(\d{1,2})\s+y\s+cuarto\b/gi, '$1:15');
  text = text.replace(/(\d{1,2})(:\d{2})?\s+de\s+la\s+(mañana|tarde|noche)/gi, (_, h, m, part) => {
    const hour = Number(h) % 12 + (part.toLowerCase() === 'mañana' ? 0 : 12);
    return pad(hour) + (m || ':00');
  });
  return text;
}
function zonedTimestamp(parts, zone) {
  const desired = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute);
  let candidate = desired;
  for (let i = 0; i < 3; i++) {
    const values = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: zone, year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23' }).formatToParts(new Date(candidate)).map(p => [p.type,p.value]));
    const actual = Date.UTC(+values.year,+values.month-1,+values.day,+values.hour,+values.minute);
    const difference = desired - actual;
    if (!difference) return new Date(candidate).toISOString();
    candidate += difference;
  }
  throw new HttpError(400, 'Esa hora no existe por el cambio horario. Indica otra hora.');
}
function parseWhen(message, context) {
  let text = normalizeTime(message);
  let rangeEnd;
  text = text.replace(/\b(?:de(?: las)?|desde(?: las)?|a las)\s+(\d{1,2})(?::(\d{2}))?\s+(?:a(?: las)?|hasta(?: las)?)\s+(\d{1,2})(?::(\d{2}))?\b/i, (_,h,m,endH,endM) => {
    if(+h>23 || +endH>23 || +(m||0)>59 || +(endM||0)>59) throw new HttpError(400,'Indica horas válidas entre 00:00 y 23:59.');
    rangeEnd={hour:+endH,minute:+(endM||0)};
    return 'a las '+pad(h)+':'+(m||'00');
  });
  const formatter = new Intl.DateTimeFormat('en-US', { timeZone: context.timeZone, timeZoneName:'shortOffset' });
  const offsetName = formatter.formatToParts(context.now).find(p=>p.type==='timeZoneName').value;
  const offsetMatch = offsetName.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
  const timezone = offsetMatch ? (offsetMatch[1] === '-' ? -1 : 1) * (+offsetMatch[2] * 60 + +(offsetMatch[3] || 0)) : 0;
  const parsed = chrono.es.parse(text, {instant:context.now,timezone}, {forwardDate:true})[0];
  if (!parsed) return {text, date:null, hasTime:false};
  const start = parsed.start;
  const parts = Object.fromEntries(['year','month','day','hour','minute'].map(key => [key,start.get(key)]));
  const hasTime = start.isCertain('hour');
  const result = {text, fragment:parsed.text, index:parsed.index, date:parts.year+'-'+pad(parts.month)+'-'+pad(parts.day), hasTime, time:pad(parts.hour)+':'+pad(parts.minute)};
  if (hasTime) result.iso = zonedTimestamp(parts, context.timeZone);
  if (hasTime && rangeEnd) result.endIso=zonedTimestamp({...parts,...rangeEnd},context.timeZone);
  if (parsed.end && parsed.end.isCertain('hour')) {
    result.endIso = zonedTimestamp(Object.fromEntries(['year','month','day','hour','minute'].map(key=>[key,parsed.end.get(key)])), context.timeZone);
  }
  return result;
}
function selectRecord(rows, phrase, label) {
  const wanted = fold(phrase).replace(/["“”]/g, '').trim();
  const exact = rows.filter(row => fold(row.title || row.time || '') === wanted);
  const matches = exact.length ? exact : rows.filter(row => {
    const title = fold(row.title || row.time || '').trim();
    return title && (wanted.includes(title) || (wanted.length > 2 && title.includes(wanted)));
  });
  if (matches.length === 1) return matches[0];
  if (matches.length > 1) throw new HttpError(400, 'Encontré varios registros. Indica el título completo de ' + label + '.');
  throw new HttpError(400, 'No encuentro ' + label + '. Dime el título tal como aparece en tu lista.');
}
function cleanTitle(when, prefix) {
  let title = when.text.replace(prefix, '').replace(/["“”]/g,'');
  if (when.fragment) title = title.replace(when.fragment,'');
  return title.replace(/\b(?:por|durante)\s+\d+\s*(?:minutos?|horas?)\b/gi,'')
    .replace(/\b(?:con\s+)?prioridad\s+(?:alta|máxima|normal|baja|importante)\b/gi,'')
    .replace(/\b(?:urgente|por favor)\b/gi,'').replace(/\b(?:para|el|a las?|durante)\s*$/i,'')
    .replace(/\s+/g,' ').replace(/^[\s,.:;-]+|[\s,.:;-]+$/g,'').trim();
}
function interpretBasic(message, context) {
  const raw = message.trim().replace(/^(?:por favor[, ]+)?(?:slothbot[, ]+)?/i,'').replace(/[.!?]+$/,'');
  const normalized = fold(raw);
  const parts = raw.split(/\s+(?:y\s+(?:luego\s+)?|después\s+)(?=(?:crea|agenda|programa|anota|agrega|completa|termina|mueve|pospón|elimina|borra|inicia|abre|pon|registra)\b)/i);
  if(parts.length > 1) {
    if(parts.length > 8) throw new HttpError(400,'Pídeme hasta ocho acciones a la vez.');
    const plans=parts.map(part=>interpretBasic(part,context));
    const unresolved=plans.find(plan=>!plan.actions?.length);
    return unresolved ? {reply:'Todavía no hice cambios. '+unresolved.reply,clarify:true} : {actions:plans.flatMap(plan=>plan.actions)};
  }
  if (/\b(?:cada dia|todos los|todas las|repite|recurrente)\b/.test(normalized) && !/alarma/.test(normalized)) return {reply:'Puedo programar una fecha concreta. Dime el día y la hora para esta tarea o evento.'};
  const action = (type, data = {}, id) => ({actions:[{type,data,...(id && {id})}]});
  const when = parseWhen(raw,context);
  const durationMatch=when.text.match(/\b(?:durante|por)\s+(\d+)\s*(minutos?|horas?)\b/i);
  const duration=durationMatch ? +durationMatch[1] * (/hora/i.test(durationMatch[2])?60:1) : 60;
  if(durationMatch && (duration<1||duration>1440)) throw new HttpError(400,'El bloque debe durar entre 1 minuto y 24 horas.');
  const endTime=when.endIso || (when.iso && new Date(Date.parse(when.iso)+duration*60000).toISOString());
  const priority = /urgente|prioridad (alta|maxima)|vital/.test(normalized)?'vital':/importante/.test(normalized)?'important':'ordinary';
  if (/^(?:hola|buenas|gracias|ayuda|que puedes hacer)/.test(normalized)) return {reply:'Soy SlothBot. Dime «Crea la tarea estudiar mañana», «Programa una reunión mañana a las cinco de la tarde» o «Inicia enfoque de 25 minutos». También puedo completar, mover o eliminar tareas, gestionar alarmas y consultar tu progreso.'};
  const open = normalized.match(/^(?:abre|abrir|muestra|ve a|ir a|llevame a) (?:la |el |mis |mi )?(inicio|agenda|rachas|roast|social|perfil|alarma|alarmas|notificaciones|tareas)$/);
  if (open) return action('navigate',{page:open[1]==='tareas'?'inicio':open[1]==='alarmas'?'alarma':open[1]});
  if (/^(?:que|cuales|dime|muestra|lista|ver|consulta).*(?:tareas|pendientes)/.test(normalized)) return action('list_tasks', {...(/completadas/.test(normalized)?{status:'completed'}:/pendientes/.test(normalized)?{status:'pending'}:{}),...(when.date&&{deadline_on:when.date})});
  if (/^(?:que|cuales|dime|muestra|lista|ver|consulta).*(?:eventos|reuniones|agenda)/.test(normalized)) {
    if(!when.date) return action('list_events');
    const [year,month,day]=when.date.split('-').map(Number);
    const next=new Date(Date.UTC(year,month-1,day+1));
    return action('list_events', {from:zonedTimestamp({year,month,day,hour:0,minute:0},context.timeZone),to:new Date(Date.parse(zonedTimestamp({year:next.getUTCFullYear(),month:next.getUTCMonth()+1,day:next.getUTCDate(),hour:0,minute:0},context.timeZone))-1).toISOString()});
  }
  if (/^(?:que|cuales|dime|muestra|lista|ver|consulta).*alarmas/.test(normalized)) return action('list_alarms');
  if (/(?:mi progreso|mis puntos|mi nivel|cuanta experiencia)/.test(normalized)) return action('get_progress');
  if (/(?:marca|marcar|lee|leer).*notificaciones.*leidas/.test(normalized)) return action('read_notifications');
  if (/(?:registra|marca|cumpli|completa).*(?:racha|actividad de hoy)/.test(normalized)) return action('check_in');
  if (/^(?:pon|registra|anota|crea|programa|marca|quiero).*(?:dia libre)/.test(normalized)) return when.date?action('free_day',{free_date:when.date}):{reply:'¿Para qué fecha quieres el día libre?',clarify:true};
  if (/^(?:pon|cambia|ajusta|establece).*(?:sarcasmo|agresividad)/.test(normalized)) {
    const level = normalized.match(/\b(10|[0-9])\b/);
    return level?action('set_sarcasm',{sarcasm_level:+level[1]}):{reply:'Dime el nivel de sarcasmo entre cero y diez, por ejemplo «Pon sarcasmo en 4».',clarify:true};
  }
  if (/(?:enfoque|pomodoro|temporizador|concentracion)/.test(normalized)) {
    if (/^(?:termina|finaliza|completa|deten|interrumpe|cancela)/.test(normalized)) {
      const sessions=context.focus.filter(s=>s.status==='active');
      if(sessions.length!==1) return {reply:sessions.length?'Tienes varias sesiones activas. Selecciona la que deseas terminar en Agenda.':'No tienes una sesión de enfoque activa.'};
      return action(/interrumpe|cancela|deten/.test(normalized)?'interrupt_focus':'finish_focus',{},sessions[0].id);
    }
    if(!/^(?:inicia|empieza|comienza|pon|activa)/.test(normalized)) return {reply:'Para concentrarte, dime «Inicia enfoque de 25 minutos».'};
    const duration=when.text.match(/(\d+)\s*minutos?/i);
    if (!duration) return {reply:'¿Cuántos minutos? Puedes decir «Inicia enfoque de 25 minutos».',clarify:true};
    return action('start_focus',{duration_minutes:+duration[1]});
  }
  if (/alarma/.test(normalized)) {
    if (/^(?:elimina|borra|quita)/.test(normalized)) {
      const record=selectRecord(context.alarms,when.time||raw,'la alarma');
      return action('delete_alarm',{},record.id);
    }
    if (/^(?:desactiva|activa)/.test(normalized)) {
      const record=selectRecord(context.alarms,when.time||raw,'la alarma');
      return action('update_alarm',{status:normalized.startsWith('desactiva')?'inactive':'active'},record.id);
    }
    if(!/^(?:pon|crea|programa|anade|agrega|registra)/.test(normalized)) return {reply:'Puedo crear una alarma con «Pon una alarma a las siete de la mañana».'};
    if (!when.hasTime) return {reply:'¿A qué hora quieres la alarma? Por ejemplo «Pon una alarma a las siete de la mañana».',clarify:true};
    return action('create_alarm',{time:when.time});
  }
  const taskPrefix=/^(?:(?:crea|crear|añade|añadir|agrega|agregar|registra|registrar|anota|anotar|pon|poner|programa|programar)\s+(?:(?:una|la|nueva)\s+)?(?:tarea\s*(?:de\s+|para\s+|llamada\s+|[:,-]\s*)?)?|recuérdame\s+(?:que\s+)?|tengo que\s+|necesito\s+|debo\s+)/i;
  const rename=raw.match(/^renombra\s+(?:la\s+)?(?:tarea\s+)?(.+?)\s+(?:como|a)\s+(.+)$/i);
  if(rename) return action('update_task',{title:rename[2].replace(/["“”]/g,'').trim()},selectRecord(context.tasks,rename[1],'la tarea').id);
  const changePriority=raw.match(/^(?:pon|cambia|establece)\s+(?:la\s+)?prioridad\s+(?:de\s+)?(?:la\s+)?(?:tarea\s+)?(.+?)\s+(?:a|en)\s+(alta|máxima|normal|baja|importante)$/i);
  if(changePriority) return action('update_task',{priority:/alta|maxima/.test(fold(changePriority[2]))?'vital':/importante/.test(changePriority[2])?'important':'ordinary'},selectRecord(context.tasks,changePriority[1],'la tarea').id);
  const changeStatus=raw.match(/^marca\s+(?:la\s+)?tarea\s+(.+?)\s+como\s+(pendiente|en progreso|pospuesta|completada)$/i);
  if(changeStatus) return action('task_status',{status:({'pendiente':'pending','en progreso':'in_progress','pospuesta':'postponed','completada':'completed'})[changeStatus[2].toLowerCase()]},selectRecord(context.tasks,changeStatus[1],'la tarea').id);
  if (/^(?:completa|completar|termina|ya termine|marca como completada)/.test(normalized)) {
    const phrase=raw.replace(/^(?:completa[r]?|termina|ya terminé|marca como completada)\s+(?:(?:la|mi)\s+)?(?:tarea\s+)?/i,'');
    const record=selectRecord(context.tasks,phrase,'la tarea');
    return action('task_status',{status:'completed'},record.id);
  }
  if (/^(?:elimina|eliminar|borra|borrar|quita)/.test(normalized)) {
    const isEvent=/\b(?:evento|reunion|cita)\b/.test(normalized);
    const phrase=raw.replace(/^(?:elimina[r]?|borra[r]?|quita)\s+(?:(?:la|el|mi)\s+)?(?:tarea|evento|reunión|cita)?\s*/i,'');
    const record=selectRecord(isEvent?context.events:context.tasks,phrase,isEvent?'el evento':'la tarea');
    return action(isEvent?'delete_event':'delete_task',{},record.id);
  }
  if (/^(?:mueve|pospon|cambia|reprograma)/.test(normalized)) {
    const isEvent=/\b(?:evento|reunion|cita)\b/.test(normalized);
    const prefix=/^(?:mueve|pospón|pospon|cambia|reprograma)\s+(?:(?:la|el|mi)\s+)?(?:tarea|evento|reunión|cita)?\s*/i;
    const phrase=cleanTitle(when,prefix);
    const record=selectRecord(isEvent?context.events:context.tasks,phrase,isEvent?'el evento':'la tarea');
    if (!when.date) return {reply:'¿Para qué fecha quieres mover '+(record.title||'ese registro')+'?',clarify:true};
    if(isEvent) {
      if(!when.hasTime) return {reply:'Indica también la hora del evento.',clarify:true};
      const duration=Date.parse(record.end_date)-Date.parse(record.start_date);
      return action('update_event',{start_date:when.iso,end_date:new Date(Date.parse(when.iso)+duration).toISOString()},record.id);
    }
    return action('update_task',{deadline:when.date},record.id);
  }
  if (/^(?:crea|crear|agenda|agendar|programa|programar|anota|añade|agrega|tengo)\b/.test(normalized) && /\b(?:reunion|evento|cita|bloque)\b/.test(normalized)) {
    if (!when.hasTime) return {reply:'Indica la fecha y la hora, por ejemplo «Programa una reunión con Ana mañana a las 17:00».',clarify:true};
    const title=cleanTitle(when,/^(?:crea[r]?|agenda[r]?|programa[r]?|anota|añade|agrega|tengo)\s+(?:un[a]?\s+)?/i);
    return action('create_event',{title:title||'Evento',start_date:when.iso,end_date:endTime});
  }
  if (taskPrefix.test(raw)) {
    const title=cleanTitle(when,taskPrefix);
    if (!title||title.length<2) return {reply:'¿Cómo se llama la tarea que quieres crear?',clarify:true};
    const result=action('create_task',{title,priority,...(when.date&&{deadline:when.date})});
    if(when.hasTime) result.actions.push({type:'create_event',data:{title,start_date:when.iso,end_date:endTime}});
    return result;
  }
  return {reply:'Necesito una instrucción más concreta. Prueba «Crea la tarea estudiar mañana», «Completa la tarea estudiar» o «Abre mi agenda».'};
}
module.exports={interpretBasic,parseWhen,fold};
