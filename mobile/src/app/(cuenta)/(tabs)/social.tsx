import { useState } from 'react';
import { dateKey, daysFrom, type Experience } from '../../../lib/api';
import { useResource,useAction } from '../../../lib/data';
import { useSession } from '../../../lib/session';
import { Button,Card,c,Field,Label,Loading,Meter,Notice,Page,Row,Section,Tag } from '../../../ui/kit';
type Person={id:string;name:string;username:string};
type Invite=Person & {direction:string};
type Post={id:string;name:string;content:string;likes_count:number;comments_count:number;liked_by_me:boolean};
type Challenge={id:string;name:string;status:string;participants_count:number;creator_id:string};
type Participant={user_id:string;name:string;progress:number};
type Api=ReturnType<typeof useSession>['api'];
async function load(api:Api){
  const [xp,challenges,posts,friends,requests]=await Promise.all([api<Experience>('/experience'),api<Challenge[]>('/challenges?status=active'),api<Post[]>('/posts'),api<Person[]>('/friends'),api<Invite[]>('/friends/requests')]);
  return {xp,challenges,posts,friends,requests};
}
export default function Social(){
  const {api,session}=useSession(),r=useResource(load),a=useAction(),d=r.data;
  const [query,setQuery]=useState(''),[results,setResults]=useState<Person[]>([]),[content,setContent]=useState(''),[name,setName]=useState('');
  const [selected,setSelected]=useState<Challenge|null>(null),[ranking,setRanking]=useState<Participant[]>([]),[progress,setProgress]=useState('');
  const [post,setPost]=useState(''),[comments,setComments]=useState<{id:string;name:string;content:string}[]>([]),[reply,setReply]=useState('');
  function change(job:()=>Promise<unknown>){return a.run(async()=>{await job();await r.refresh();});}
  async function open(ch:Challenge){const rows=await api<Participant[]>('/challenges/'+ch.id+'/participants');setSelected(ch);setRanking(rows);setProgress(String(rows.find(p=>p.user_id===session?.user.id)?.progress??0));}
  async function openPost(id:string){const rows=await api<typeof comments>('/posts/'+id+'/comments');setPost(id);setReply('');setComments(rows);}
  const participating=ranking.some(p=>p.user_id===session?.user.id);
  return <Page title="Social" subtitle="La presión del grupo"><Notice error={r.error} retry={r.refresh}/><Notice error={a.error}/>{!d&&!r.error&&<Loading/>}
    {d&&<><Card><Section icon="trophy-outline" title={'Liga · '+d.xp.rank} side={<Tag>NIV. {d.xp.level}</Tag>}/><Label size={12}>{d.xp.experience_points} XP · Próximo nivel a {d.xp.level*100} XP</Label><Meter value={d.xp.experience_points%100}/></Card>
    <Card tone={c.dark}><Tag tone={c.lime}>EN VIVO</Tag><Label size={21} bold color="white">Duelo 1 vs 1</Label><Label color="white">Abre un reto de siete días y compara tu avance con los participantes.</Label><Field label="Nombre del reto" value={name} placeholder="Una semana sin posponer" onChangeText={setName} style={{backgroundColor:'white'}}/><Button variant="lime" disabled={a.busy||!name.trim()} onPress={()=>change(async()=>{const ch=await api<Challenge>('/challenges','POST',{name:name.trim(),start_date:dateKey(),end_date:dateKey(daysFrom(7))});setName('');await open(ch);})}>Lanzar reto</Button></Card>
    <Section icon="podium" title="Tabla de Honor y Vergüenza"/><Card>{!d.challenges.length&&<Label>Todavía no hay retos activos.</Label>}{d.challenges.map(ch=><Button key={ch.id} disabled={a.busy} variant={ch.id===selected?.id?'dark':'quiet'} onPress={()=>a.run(()=>open(ch))}>{ch.name} · {ch.participants_count}</Button>)}
    {selected&&<><Label bold>{selected.name}</Label>{ranking.map((p,i)=><Row key={p.user_id}><Tag>#{i+1}</Tag><Label>{p.name} · {p.progress} puntos</Label></Row>)}
    {participating?<><Field label="Mi progreso" keyboardType="number-pad" value={progress} onChangeText={setProgress}/><Button disabled={a.busy||!/^\d+$/.test(progress)} onPress={()=>change(async()=>{await api('/challenges/'+selected.id+'/progress','PATCH',{progress:+progress});await open(selected);})}>Guardar progreso</Button></>:<Button disabled={a.busy} onPress={()=>change(async()=>{await api('/challenges/'+selected.id+'/participants','POST',{});await open(selected);})}>Unirme al reto</Button>}</>}</Card>
    <Section icon="account-group-outline" title="Amistades"/><Card><Field label="Buscar por usuario" value={query} autoCapitalize="none" onChangeText={setQuery}/><Button disabled={a.busy||query.trim().length<2} onPress={()=>a.run(async()=>setResults(await api<Person[]>('/users/search?q='+encodeURIComponent(query.trim()))))}>Buscar</Button>
    {results.map(p=><Button key={p.id} variant="quiet" disabled={a.busy} onPress={()=>change(async()=>{await api('/friends/requests','POST',{friend_id:p.id});setResults(rows=>rows.filter(x=>x.id!==p.id));})}>Añadir @{p.username}</Button>)}
    {d.requests.map(v=><Row key={v.id}><Label>@{v.username}</Label>{v.direction==='received'?(['accepted','rejected'] as const).map((status,i)=><Button key={status} variant="quiet" disabled={a.busy} onPress={()=>change(()=>api('/friends/requests/'+v.id,'PATCH',{status}))}>{i?'Rechazar':'Aceptar'}</Button>):<Tag>Solicitud enviada</Tag>}</Row>)}{d.friends.map(p=><Label key={p.username}>● {p.name} · @{p.username}</Label>)}</Card>
    <Section icon="forum-outline" title="Feed ácido"/><Card><Field label="Nueva publicación" multiline value={content} onChangeText={setContent}/><Button disabled={a.busy||!content.trim()} onPress={()=>change(async()=>{await api('/posts','POST',{content:content.trim()});setContent('');})}>Publicar</Button><Button variant="quiet" onPress={r.refresh}>Actualizar feed</Button></Card>
    {d.posts.map(p=><Card key={p.id}><Label bold>{p.name}</Label><Label>{p.content}</Label><Row><Button disabled={a.busy} variant={p.liked_by_me?'primary':'quiet'} onPress={()=>change(()=>api('/posts/'+p.id+'/likes',p.liked_by_me?'DELETE':'POST'))}>♥ {p.likes_count}</Button><Button variant="quiet" disabled={a.busy} onPress={()=>a.run(()=>openPost(p.id))}>Comentarios · {p.comments_count}</Button></Row>
    {post===p.id&&<>{comments.map(v=><Label key={v.id} size={13}>{v.name} · {v.content}</Label>)}<Field label="Comentario" value={reply} onChangeText={setReply}/><Button disabled={a.busy||!reply.trim()} onPress={()=>change(async()=>{await api('/posts/'+p.id+'/comments','POST',{content:reply.trim()});await openPost(p.id);})}>Comentar</Button></>}</Card>)}</>}
  </Page>;
}
