import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { dateKey, daysFrom, priorities, type Task } from '../../../lib/api';
import { useResource, useAction } from '../../../lib/data';
import { useSession } from '../../../lib/session';
import { Button, Card, c, Field, Label, Loading, Meter, Notice, Page, Row, Section, Tag } from '../../../ui/kit';
type Event = {id:string; title:string; start_date:string; end_date:string};
type Focus = {id:string; status:string; end_time:string; duration_minutes:number; task_id:string|null};
async function load(api:ReturnType<typeof useSession>['api']) {
  const [events,focus,tasks]=await Promise.all([api<Event[]>('/events'),api<Focus[]>('/focus-sessions'),api<Task[]>('/tasks')]);
  return {events,focus,tasks};
}
function monday(date:Date) {return daysFrom(-((date.getDay()+6)%7),date);}
export default function Agenda() {
  const {api}=useSession(), r=useResource(load), a=useAction();
  const [day,setDay]=useState(dateKey()), [week,setWeek]=useState(monday(new Date())), [now,setNow]=useState(Date.now());
  const [editing,setEditing]=useState<string|null>(null), [name,setName]=useState(''),[start,setStart]=useState('09:00'),[end,setEnd]=useState('10:00');
  const [minutes,setMinutes]=useState('25'), [taskId,setTaskId]=useState(''), [confirm,setConfirm]=useState('');
  const active=r.data?.focus.find(f=>f.status==='active');
  useEffect(()=>{if(!active)return;const id=setInterval(()=>setNow(Date.now()),1000);return ()=>clearInterval(id);},[active]);
  const seconds=active?Math.max(0,Math.ceil((Date.parse(active.end_time)-now)/1000)):0;
  const clock=(s:string)=>new Date(s).toLocaleTimeString('es-BO',{hour:'2-digit',minute:'2-digit',hour12:false});
  const tasks=r.data?.tasks.filter(t=>t.status!=='completed'&&(!t.deadline||t.deadline.slice(0,10)===day))??[];
  const events=r.data?.events.filter(e=>dateKey(new Date(e.start_date))<=day&&dateKey(new Date(e.end_date))>=day)??[];
  function mutate(job:()=>Promise<unknown>){return a.run(async()=>{await job();await r.refresh();});}
  function save(){return mutate(async()=>{
    if(![start,end].every(t=>/^([01]\d|2[0-3]):[0-5]\d$/.test(t))||end<=start) throw new Error('Indica horas HH:MM y un final posterior al inicio.');
    const body={title:name.trim(),start_date:new Date(day+'T'+start).toISOString(),end_date:new Date(day+'T'+end).toISOString()};
    await api('/events'+(editing?'/'+editing:''),editing?'PUT':'POST',body);setEditing(null);
  });}
  return <Page title="Agenda" subtitle="Tu semana bajo supervisión"><Notice error={r.error} retry={r.refresh}/><Notice error={a.error}/>
    <Section title={new Date(day+'T12:00').toLocaleDateString('es-BO',{month:'long',year:'numeric'})}/>
    <Row><Button variant="quiet" onPress={()=>{const w=daysFrom(-7,week);setWeek(w);setDay(dateKey(w));setEditing(null);}}>← Anterior</Button><Button variant="quiet" onPress={()=>{const w=daysFrom(7,week);setWeek(w);setDay(dateKey(w));setEditing(null);}}>Siguiente →</Button></Row>
    <Row style={{gap:3,flexWrap:'nowrap'}}>{Array.from({length:7},(_,i)=>{const date=daysFrom(i,week),key=dateKey(date),current=key===day;return <Pressable key={key} accessibilityRole="button" accessibilityLabel={key} onPress={()=>{setDay(key);setEditing(null);}} style={{flex:1,alignItems:'center',paddingVertical:9,borderRadius:10,backgroundColor:current?c.dark:'#EDECEF'}}><Label size={10} color={current?'white':c.muted}>{['LUN','MAR','MIÉ','JUE','VIE','SÁB','DOM'][i]}</Label><Label bold color={current?c.lime:c.ink}>{date.getDate()}</Label></Pressable>;})}</Row>
    {!r.data&&!r.error&&<Loading/>}{r.data&&<>
    <Card tone={c.sand}><Tag tone={c.dark} color={c.lime}>ENFOQUE</Tag><Label size={24} bold>{active?(r.data.tasks.find(t=>t.id===active.task_id)?.title||'Sesión en progreso'):'Tiempo para concentrarte'}</Label>
    {active?<><Label size={36} bold>{String(Math.floor(seconds/60)).padStart(2,'0')}:{String(seconds%60).padStart(2,'0')}</Label><Meter value={100*(1-seconds/(active.duration_minutes*60))}/>
    <Row><Button disabled={a.busy} onPress={()=>mutate(()=>api('/focus-sessions/'+active.id+'/finish','PATCH'))}>Finalizar</Button><Button variant="quiet" disabled={a.busy} onPress={()=>mutate(()=>api('/focus-sessions/'+active.id+'/interrupt','PATCH'))}>Interrumpir</Button></Row></>:
    <><Field label="Duración en minutos" keyboardType="number-pad" value={minutes} onChangeText={setMinutes}/><Row><Button variant={!taskId?'dark':'quiet'} onPress={()=>setTaskId('')}>Libre</Button>{tasks.map(t=><Button key={t.id} variant={taskId===t.id?'dark':'quiet'} onPress={()=>setTaskId(t.id)}>{t.title}</Button>)}</Row>
    <Button disabled={a.busy||!/^\d+$/.test(minutes)||+minutes<1||+minutes>240} onPress={()=>mutate(()=>api('/focus-sessions','POST',{duration_minutes:+minutes,task_id:taskId||null}))}>Iniciar temporizador</Button></>}</Card>
    <Section icon="calendar-outline" title="Eventos del día"/>{events.map(e=><Card key={e.id}><Label bold>{e.title}</Label><Label>{clock(e.start_date)} – {clock(e.end_date)}</Label><Row><Button variant="quiet" onPress={()=>{setEditing(e.id);setName(e.title);setStart(clock(e.start_date));setEnd(clock(e.end_date));}}>Editar</Button><Button variant="quiet" disabled={a.busy} onPress={()=>confirm===e.id?mutate(()=>api('/events/'+e.id,'DELETE')):setConfirm(e.id)}>{confirm===e.id?'Confirmar eliminación':'Eliminar'}</Button></Row></Card>)}
    {!events.length&&<Label color={c.muted}>Día sin eventos programados.</Label>}
    {editing===null?<Button icon="calendar-plus" onPress={()=>{setEditing('');setName('');setStart('09:00');setEnd('10:00');}}>Añadir evento</Button>:<Card><Field label="Nombre del evento" value={name} onChangeText={setName}/><Field label="Inicio (HH:MM)" value={start} onChangeText={setStart}/><Field label="Fin (HH:MM)" value={end} onChangeText={setEnd}/><Button disabled={a.busy||!name.trim()} onPress={save}>Guardar evento</Button><Button variant="quiet" onPress={()=>setEditing(null)}>Cancelar</Button></Card>}
    <Section title="Obligaciones del día"/>{!tasks.length&&<Label color={c.muted}>No hay tareas abiertas para esta fecha.</Label>}
    {tasks.map(t=><Card key={t.id}><Tag>{priorities[t.priority]}</Tag><Label bold>{t.title}</Label>{t.alternative_plan&&<View><Label size={12} bold>PLAN B</Label><Label>{t.alternative_plan}</Label></View>}<Button disabled={a.busy} variant="quiet" onPress={()=>mutate(()=>api('/tasks/'+t.id+'/status','PATCH',{status:'completed'}))}>Marcar completada</Button></Card>)}</>}
  </Page>;
}
