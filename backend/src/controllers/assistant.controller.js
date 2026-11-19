const crypto = require('node:crypto');
const { query, withTransaction } = require('../config/database');
const { HttpError } = require('../utils/helpers');
const { actions, validatePlan, executeAction, uuidPattern } = require('../services/assistant/actions');
const { planCommand } = require('../services/assistant/planner');

async function getContext(userId, timeZone) {
  // Sequential queries also work when this snapshot runs inside a transaction.
  const tasks=await query("select id,title,status,priority,deadline from tasks where user_id=$1 order by creation_date desc limit 200",[userId]);
  const events=await query("select id,title,start_date,end_date from calendar_events where user_id=$1 order by start_date desc limit 200",[userId]);
  const alarms=await query("select id,time,status from alarms where user_id=$1 order by time limit 100",[userId]);
  const focus=await query("select id,status from focus_sessions where user_id=$1 and status='active' order by start_time desc",[userId]);
  return {now:new Date(),timeZone,tasks:tasks.rows,events:events.rows,alarms:alarms.rows,focus:focus.rows};
}
function signature(value) {
  return crypto.createHmac('sha256',process.env.JWT_SECRET).update(value).digest('base64url');
}
function signPlan(plan,userId,timeZone,requestId) {
  const payload=Buffer.from(JSON.stringify({plan,userId,timeZone,requestId,expires:Date.now()+300000})).toString('base64url');
  return payload+'.'+signature(payload);
}
function readPlan(token,userId) {
  const [payload,sig]=token.split('.');
  const expected=signature(payload||'');
  if(!sig||sig.length!==expected.length||!crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(expected))) throw new HttpError(400,'La confirmación no es válida.');
  const parsed=JSON.parse(Buffer.from(payload,'base64url').toString());
  if(parsed.userId!==userId) throw new HttpError(400,'La confirmación pertenece a otra cuenta.');
  return parsed;
}
function summarize(result,timeZone) {
  const data=result.data;
  const dateText = date => (date instanceof Date ? date.toISOString() : String(date)).slice(0,10);
  if(result.type==='list_tasks') return data.length ? data.slice(0,12).map(t=>t.title+(t.deadline?' · '+dateText(t.deadline):'')).join('; ')+(data.length>12?' · Hay '+data.length+' tareas en total.':'') : 'No tienes tareas en esta vista.';
  if(result.type==='list_events') return data.length ? data.slice(0,8).map(e=>e.title+' · '+new Date(e.start_date).toLocaleString('es-BO',{timeZone})).join('; ') : 'Tu agenda está vacía.';
  if(result.type==='list_alarms') return data.length ? data.map(a=>a.time.slice(0,5)+' ('+a.status+')').join(', ') : 'No tienes alarmas guardadas.';
  if(result.type==='get_progress') return 'Tienes '+data.experience_points+' XP, nivel '+data.level+' y rango '+data.rank+'.';
  if(result.type==='create_event'||result.type==='update_event') return result.title+': '+data.title+', '+new Date(data.start_date).toLocaleString('es-BO',{timeZone})+' a '+new Date(data.end_date).toLocaleTimeString('es-BO',{timeZone,hour:'2-digit',minute:'2-digit'})+'.';
  if(result.type==='create_task'||result.type==='update_task'||result.type==='task_status') return result.title+': '+data.title+(data.deadline?' · '+dateText(data.deadline):'')+'.';
  if(result.type==='create_alarm'||result.type==='update_alarm') return 'Alarma diaria '+(data.status==='inactive'?'desactivada':result.type==='create_alarm'?'guardada':'actualizada')+' a las '+data.time.slice(0,5)+'.';
  if(result.type==='start_focus') return 'Sesión de enfoque iniciada por '+data.duration_minutes+' minutos.';
  return result.title+'.';
}
exports.capabilities = (req,res) => res.json({
  mode:process.env.ANTHROPIC_API_KEY?'ai':'commands',
  actions:Object.keys(actions),
});
exports.command = async (req,res) => {
  const {request_id,confirmation_token,previous_message} = req.body;
  const message=typeof req.body.message==='string'?req.body.message.trim():'';
  if(!uuidPattern.test(request_id||'')) throw new HttpError(400,'Falta un identificador válido de instrucción.');
  if((!message&&!confirmation_token)||message.length>2000||(confirmation_token!==undefined&&typeof confirmation_token!=='string')||String(confirmation_token||'').length>16000||(previous_message!==undefined&&typeof previous_message!=='string')||String(previous_message||'').length>2000) throw new HttpError(400,'Usa una instrucción de hasta 2000 caracteres.');
  const timeZone=req.body.time_zone||'America/La_Paz';
  try {new Intl.DateTimeFormat('es',{timeZone});} catch {throw new HttpError(400,'Zona horaria inválida.');}
  const confirmation=confirmation_token?readPlan(confirmation_token,req.user.id):null;
  if(confirmation && (confirmation.requestId!==request_id || confirmation.timeZone!==timeZone)) throw new HttpError(400,'La confirmación corresponde a otra instrucción.');
  const hash=crypto.createHash('sha256').update(JSON.stringify({message,confirmation_token,previous_message,timeZone})).digest('hex');
  const cached=await query("select result from ai_analyses where id=$1 and user_id=$2 and analysis_type='assistant_command'",[request_id,req.user.id]);
  if(cached.rowCount) {
    if(cached.rows[0].result.hash!==hash) throw new HttpError(409,'Esa instrucción ya se utilizó con otro contenido.');
    return res.json(cached.rows[0].result.response);
  }
  if(confirmation?.expires<Date.now()) throw new HttpError(400,'La confirmación venció. Repite la instrucción.');
  const context=await getContext(req.user.id,timeZone);
  let planned;
  if(confirmation) planned={actions:confirmation.plan,mode:'confirmed'};
  else {
    const combined=previous_message?previous_message+' '+message:message;
    try {planned=await planCommand(combined,context);}
    catch(error) {
      if(error.name==='TimeoutError') throw new HttpError(503,'SlothBot tardó demasiado. Vuelve a intentar la misma instrucción.');
      throw error;
    }
    if(!planned.actions?.length) return res.json({reply:planned.reply,results:[],mode:planned.mode,notice:planned.notice,...(planned.clarify && {follow_up:combined})});
  }
  validatePlan(planned.actions,context);
  if(!confirmation && planned.actions.some(a=>actions[a.type].confirm)) {
    return res.json({reply:'Confirma estas acciones antes de continuar.',results:[],mode:planned.mode,
      confirmation:{token:signPlan(planned.actions,req.user.id,timeZone,request_id),actions:planned.actions.map(a=>({title:actions[a.type].label.replace(/eliminad[ao]/,'por eliminar'),detail:a.id?context[actions[a.type].entity]?.find(x=>x.id===a.id)?.title||context[actions[a.type].entity]?.find(x=>x.id===a.id)?.time||a.id:a.data.title||''}))}});
  }
  const result=await withTransaction(async client=>{
    // Serialize commands for this account, including retries and concurrent devices.
    await client.query('select pg_advisory_xact_lock(hashtextextended($1,0))',['assistant:'+req.user.id]);
    const existing=await client.query("select result from ai_analyses where id=$1 and user_id=$2 and analysis_type='assistant_command'",[request_id,req.user.id]);
    if(existing.rowCount) {
      if(existing.rows[0].result.hash!==hash) throw new HttpError(409,'La instrucción ya tiene otro contenido.');
      return existing.rows[0].result.response;
    }
    // The snapshot may have changed while the speech model was responding.
    validatePlan(planned.actions,await getContext(req.user.id,timeZone));
    const results=[];
    for(const action of planned.actions) results.push(await executeAction(action,req.user));
    const response={reply:results.map(item=>summarize(item,timeZone)).join('\n'),results,mode:planned.mode,notice:planned.notice};
    await client.query("insert into ai_analyses (id,user_id,analysis_type,result) values ($1,$2,'assistant_command',$3::jsonb)",[request_id,req.user.id,JSON.stringify({hash,response})]);
    await client.query("insert into ai_messages (user_id,message,sender) values ($1,$2,'user'),($1,$3,'bot')",[req.user.id,message||'Confirmar acciones',response.reply]);
    return response;
  });
  res.json(result);
};
