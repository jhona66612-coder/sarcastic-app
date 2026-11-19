// Requires DATABASE_URL and JWT_SECRET. Creates private temporary accounts and removes them.
require('dotenv').config();
process.env.ANTHROPIC_API_KEY=''; // Deterministic offline planner; no paid model calls.
const assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto');
const app=require('../src/app');
const {pool}=require('../src/config/database');
const accounts=[];
let server;
let base=process.env.BASE;
async function call(path,body,token,expected=200,method='POST') {
  const response=await fetch(base+path,{method,headers:{'content-type':'application/json',...(token&&{authorization:'Bearer '+token})},body:body===undefined?undefined:JSON.stringify(body)});
  const value=await response.json();
  if(path==='/auth/register' && value.user) accounts.push(value);
  assert.equal(response.status,expected,path+': '+(value.error||'unexpected status'));
  return value;
}
async function command(message,token,extra={},expected=200) {
  return call('/assistant/command',{request_id:randomUUID(),time_zone:'America/La_Paz',message,...extra},token,expected);
}
async function main() {
  if(!base) {server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));base='http://127.0.0.1:'+server.address().port+'/api/v1';}
  for(let i=0;i<2;i++) {
    const name='slothqa_'+randomUUID().replaceAll('-','').slice(0,16);
    await call('/auth/register',{name:'Prueba temporal SlothBot',username:name,email:name+'@example.invalid',password:randomUUID()},undefined,201);
  }
  const [a,b]=accounts;
  await command('Crea la tarea no autorizada',null,{},401);
  const requestId=randomUUID();
  const phrase='Crea la tarea estudiar química mañana a las cinco de la tarde durante dos horas';
  const pair=await Promise.all([command(phrase,a.token,{request_id:requestId}),command(phrase,a.token,{request_id:requestId})]);
  assert.deepEqual(pair[0],pair[1]);
  assert.equal(pair[0].results.length,2);
  const tasks=await call('/tasks',undefined,a.token,200,'GET');
  assert.equal(tasks.length,1);
  assert.equal(tasks[0].title,'estudiar química');
  assert.equal((await call('/events',undefined,a.token,200,'GET')).length,1);
  await command('Crea la tarea contenido cambiado',a.token,{request_id:requestId},409);
  await command('Completa la tarea estudiar química',b.token,{},400);
  const completionId=randomUUID();
  await command('Completa la tarea estudiar química',a.token,{request_id:completionId});
  const xp=await call('/experience',undefined,a.token,200,'GET');
  await command('Completa la tarea estudiar química',a.token,{request_id:completionId});
  assert.deepEqual(await call('/experience',undefined,a.token,200,'GET'),xp);
  await command('Registra un día libre mañana',a.token);
  await command('Crea la tarea rollback y registra un día libre mañana',a.token,{},409);
  assert.equal((await call('/tasks',undefined,a.token,200,'GET')).length,1,'task must roll back if second action fails');
  const deleteId=randomUUID();
  const pending=await command('Elimina la tarea estudiar química',a.token,{request_id:deleteId});
  assert.ok(pending.confirmation);
  assert.equal((await call('/tasks',undefined,a.token,200,'GET')).length,1);
  await command('',b.token,{request_id:deleteId,confirmation_token:pending.confirmation.token},400);
  await command('',a.token,{confirmation_token:pending.confirmation.token},400);
  const confirmed={request_id:deleteId,confirmation_token:pending.confirmation.token};
  const removed=await command('',a.token,confirmed);
  assert.deepEqual(await command('',a.token,confirmed),removed);
  assert.equal((await call('/tasks',undefined,a.token,200,'GET')).length,0);
  const alarm=await command('Pon una alarma a las siete de la mañana',a.token);
  assert.equal(alarm.results[0].data.time.slice(0,5),'07:00');
  const focus=await command('Inicia enfoque de veinticinco minutos',a.token);
  assert.equal(focus.results[0].data.duration_minutes,25);
  await command('Interrumpe el enfoque',a.token);
  assert.equal((await call('/ai/analyses',undefined,a.token,200,'GET')).length,0,'ledger is not shown as analysis');
  console.log('PASS: voice commands, dates, atomic rollback, ownership, auth, concurrent retries, XP, signed confirmations, alarms and focus.');
}
main().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{
  for(const account of accounts) await pool.query('delete from users where id=$1 and email=$2',[account.user.id,account.user.email]);
  if(server) await new Promise(resolve=>server.close(resolve));
  await pool.end();
  console.log('Temporary test accounts removed.');
});
