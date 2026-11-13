import { useState } from 'react';
import { Switch, View } from 'react-native';
import { dateKey, daysFrom, shortDate } from '../../../lib/api';
import { useResource,useAction } from '../../../lib/data';
import { useSession } from '../../../lib/session';
import { Button,Card,c,Icon,Label,Loading,Notice,Page,Row,Section,Tag } from '../../../ui/kit';
type RecordDay={id:string;record_date:string;achieved:boolean};
type FreeDay={id:string;free_date:string};
async function load(api:ReturnType<typeof useSession>['api']) {
  const [streak,tokens,history,free]=await Promise.all([api<{current_streak:number;best_streak:number}>('/streaks'),api<{available_tokens:number}>('/streak-tokens'),api<RecordDay[]>('/streaks/history'),api<FreeDay[]>('/free-days')]);
  return {streak,tokens,history,free};
}
export default function Streaks(){
  const {api}=useSession(), r=useResource(load), a=useAction();const [message,setMessage]=useState('');
  const d=r.data;
  const today=new Intl.DateTimeFormat('sv-SE',{year:'numeric',month:'2-digit',day:'2-digit',timeZone:'America/La_Paz'}).format(new Date());
  const anchor=new Date(today+'T12:00:00'), monday=daysFrom(-((anchor.getDay()+6)%7),anchor);
  const done=(key:string)=>d?.history.some(h=>h.achieved&&h.record_date.slice(0,10)===key);
  const write=(path:string,method:string,body:unknown,success:string)=>a.run(async()=>{setMessage('');await api(path,method,body);setMessage(success);await r.refresh();});
  return <Page title="Rachas" subtitle="Registro de supervivencia"><Notice error={r.error} retry={r.refresh}/><Notice error={a.error}/>{!d&&!r.error&&<Loading/>}
  {d&&<><Card tone={c.dark}><Row><Tag tone={c.lime}>NIVEL SUPERVIVENCIA</Tag><Label color="white" size={12}>Récord: {d.streak.best_streak} días</Label></Row>
  <Label color={c.lime} size={36} bold>🔥 {d.streak.current_streak} días</Label><Label color="white">Racha actual · Milagrosamente vivo</Label>
  <Row style={{justifyContent:'space-between'}}>{Array.from({length:7},(_,i)=>{const key=dateKey(daysFrom(i,monday));return <View key={key} style={{alignItems:'center',gap:5}}><Label color="white" size={11}>{['L','M','X','J','V','S','D'][i]}</Label><Icon name={done(key)?'fire':'circle-outline'} color={done(key)?c.lime:'#BAA9C9'}/></View>;})}</Row>
  <Button variant="lime" disabled={a.busy||done(today)} onPress={()=>write('/streaks/check-in','POST',{},'Actividad registrada.')}>{done(today)?'Hoy ya cumpliste':'Registrar actividad de hoy'}</Button></Card>
  <Card><Section icon="shield-star-outline" title="Comodines Anti-Vergüenza"/><Tag>{d.tokens.available_tokens} disponibles</Tag><Label color={c.muted}>Cada siete días de racha ganas un comodín para proteger un día perdido.</Label><Button disabled={a.busy||!d.tokens.available_tokens||done(dateKey(daysFrom(-1,anchor)))} onPress={()=>write('/streak-tokens/use','POST',{date:dateKey(daysFrom(-1,anchor))},'Ayer quedó protegido.')}>Salvar la racha de ayer</Button></Card>
  <Card><Section icon="weather-sunset" title="Días Libres Oficiales"/>{[6,0].map((weekday,i)=>{const date=daysFrom((weekday-anchor.getDay()+7)%7,anchor),key=dateKey(date),entry=d.free.find(f=>f.free_date.slice(0,10)===key);return <Row key={key}><View style={{flex:1}}><Label bold>{i?'Domingo':'Sábado'}</Label><Label size={12} color={c.muted}>{shortDate(key)}</Label></View><Switch accessibilityLabel={'Día libre '+key} value={!!entry} disabled={a.busy} onValueChange={()=>write(entry?'/free-days/'+entry.id:'/free-days',entry?'DELETE':'POST',entry?undefined:{free_date:key},'Día libre actualizado.')}/></Row>;})}</Card>
  <Card><Section icon="history" title="Muro de la Vergüenza"/>{d.history.length?d.history.slice(0,14).map(h=><Row key={h.id}><Tag tone={h.achieved?c.lime:c.rose}>{h.achieved?'Cumplido':'Perdido'}</Tag><Label>{shortDate(h.record_date)}</Label></Row>):<Label color={c.muted}>Tu historial comienza con el primer registro.</Label>}</Card>{!!message&&<Label>{message}</Label>}</>}
  </Page>;
}
