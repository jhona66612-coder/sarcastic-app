import { useState } from 'react';
import { View } from 'react-native';
import { dateKey, priorities, states, type Experience, type Task } from '../../../lib/api';
import { useAction, useResource } from '../../../lib/data';
import { useSession } from '../../../lib/session';
import { Button, Card, c, Field, Label, Loading, Meter, nav, Notice, Page, Row, Section, Tag } from '../../../ui/kit';

type Api = ReturnType<typeof useSession>['api'];
async function load(api: Api) {
  const [tasks,xp,messages] = await Promise.all([api<Task[]>('/tasks'),api<Experience>('/experience'),api<{message:string;sender:string}[]>('/ai/messages?limit=6')]);
  return {tasks,xp,quote:messages.find(m=>m.sender==='bot')?.message};
}
export default function Home() {
  const {api} = useSession(), resource=useResource(load), action=useAction();
  const [filter,setFilter] = useState<'hoy'|'todas'|'listas'>('hoy');
  const [editing,setEditing] = useState<Task|'new'|null>(null), [title,setTitle]=useState(''), [desc,setDesc]=useState('');
  const [priority,setPriority]=useState<Task['priority']>('ordinary'), [deadline,setDeadline]=useState('');
  const [excuse,setExcuse]=useState(''), [confirm,setConfirm]=useState('');
  const d=resource.data, today=dateKey();
  const pending=d?.tasks.filter(t=>t.status!=='completed')??[];
  const due=pending.filter(t=>!t.deadline||t.deadline.slice(0,10)<=today);
  const tasks=filter==='todas'?d?.tasks:filter==='listas'?d?.tasks.filter(t=>t.status==='completed'):due;
  const completion=d?.tasks.length?Math.round(100*(d.tasks.length-pending.length)/d.tasks.length):0;
  function edit(t: Task|'new') {setEditing(t);setTitle(t==='new'?'':t.title);setDesc(t==='new'?'':t.description||'');setPriority(t==='new'?'ordinary':t.priority);setDeadline(t==='new'?'':(t.deadline||'').slice(0,10));}
  function mutate(job:()=>Promise<unknown>) {return action.run(async()=>{await job(); await resource.refresh();});}
  function save(){return mutate(async()=>{
    if(deadline && (!/^\d{4}-\d{2}-\d{2}$/.test(deadline)||!Number.isFinite(Date.parse(deadline))||new Date(deadline).toISOString().slice(0,10)!==deadline)) throw new Error('Usa una fecha válida con formato AAAA-MM-DD.');
    const id=editing&&editing!=='new'?editing.id:'';
    await api('/tasks'+(id?'/'+id:''),id?'PUT':'POST',{title:title.trim(),description:desc.trim(),priority,deadline:deadline||null});setEditing(null);
  });}
  const chat=(message:string)=>mutate(async()=>{await api('/ai/chat','POST',{message});setExcuse('');});
  return <Page title="Inicio" subtitle={d?'NIV. '+d.xp.level+'  ·  Rango: '+d.xp.rank:'RoastProductivity'}>
    <Notice error={resource.error} retry={resource.refresh}/><Notice error={action.error}/>
    {!d&&!resource.error&&<Loading/>}
    {d&&<><Card tone={c.red}><Label size={11} color="white" bold>⚠  REPORTE DE ACTIVIDAD</Label><Label size={23} bold color="white">{due.length?due.length+' obligaciones a la vista':'Estás al día'}</Label><Label size={13} color="white">Tu supervisor lleva la cuenta.</Label></Card>
    <Card><Row><Tag tone={c.lime}>MENTOR TÓXICO</Tag><Label size={12}>SlothBot</Label></Row><Row><Label size={37}>🦥</Label><View style={{flex:1}}><Label color={c.red} bold>{d.quote||'¿De verdad vas a ser productivo hoy o es otra excusa?'}</Label></View></Row></Card>
    <Card><Row><Label bold>Fuerza de voluntad</Label><Tag>{completion}%</Tag><Tag tone={c.sand}>{d.xp.experience_points} XP</Tag></Row><Meter value={completion}/></Card>
    <Section title="Obligaciones de hoy" side={<Tag>{due.length} tareas</Tag>}/>
    <Row>{(['hoy','todas','listas'] as const).map((f,i)=><Button key={f} variant={filter===f?'dark':'quiet'} onPress={()=>setFilter(f)}>{['Hoy','Todas','Completadas'][i]}</Button>)}</Row>
    <Button icon="plus" onPress={()=>edit('new')}>Nueva tarea</Button>
    {editing&&<Card tone={c.sand}><Label bold>{editing==='new'?'Nueva obligación':'Editar obligación'}</Label><Field label="Título" value={title} onChangeText={setTitle}/><Field label="Descripción" value={desc} onChangeText={setDesc}/>
    <Row>{(Object.keys(priorities) as Task['priority'][]).map(p=><Button key={p} variant={priority===p?'dark':'quiet'} onPress={()=>setPriority(p)}>{priorities[p]}</Button>)}</Row>
    <Field label="Vencimiento (AAAA-MM-DD)" placeholder={today} value={deadline} onChangeText={setDeadline}/><Button disabled={!title.trim()||action.busy} onPress={save}>Guardar</Button><Button variant="quiet" onPress={()=>setEditing(null)}>Cancelar</Button></Card>}
    {!tasks?.length&&<Card><Label color={c.muted}>No hay tareas en esta vista.</Label></Card>}
    {tasks?.map(t=><Card key={t.id}><Row><Tag tone={t.priority==='vital'?c.rose:c.lavender}>{priorities[t.priority]}</Tag><Label size={12}>{states[t.status]}</Label></Row><Label size={18} bold>{t.title}</Label>{!!t.description&&<Label color={c.muted}>{t.description}</Label>}
    {!!t.deadline&&<Label size={12}>Vence el {t.deadline.slice(0,10)}</Label>}
    {t.status!=='completed'&&<Row><Button disabled={action.busy} onPress={()=>mutate(()=>api('/tasks/'+t.id+'/status','PATCH',{status:'completed'}))}>Completar</Button>{t.status!=='postponed'&&<Button disabled={action.busy} variant="quiet" onPress={()=>mutate(()=>api('/tasks/'+t.id+'/status','PATCH',{status:'postponed'}))}>Posponer</Button>}</Row>}
    <Row><Button variant="quiet" onPress={()=>edit(t)}>Editar</Button><Button disabled={action.busy} variant={confirm===t.id?'danger':'quiet'} onPress={()=>confirm===t.id?mutate(()=>api('/tasks/'+t.id,'DELETE')):setConfirm(t.id)}>{confirm===t.id?'Confirmar eliminación':'Eliminar'}</Button></Row></Card>)}
    <Card tone={c.lavender}><Section icon="message-alert-outline" title="Auditoría de excusas"/><Field label="Justifica tu improductividad" value={excuse} onChangeText={setExcuse}/><Button disabled={!excuse.trim()||action.busy} onPress={()=>chat(excuse.trim())}>Juzgar mi excusa</Button></Card>
    <Button variant="danger" disabled={action.busy} onPress={()=>chat('No quiero trabajar. Dame un empujón para empezar.')}>Insúltame, no quiero trabajar</Button><Button variant="quiet" onPress={()=>nav('/agenda')}>Abrir agenda</Button></>}
  </Page>;
}
