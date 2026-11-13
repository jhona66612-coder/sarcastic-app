import { useSession } from '../../lib/session';
import { useResource,useAction } from '../../lib/data';
import { Button,Card,c,Label,Loading,nav,Notice,Page,Tag } from '../../ui/kit';
type Notification={id:string;title:string;message:string;read_status:boolean;creation_date:string};
const load=(api:ReturnType<typeof useSession>['api'])=>api<Notification[]>('/notifications');
export default function Notifications(){
  const {api}=useSession(),r=useResource(load),a=useAction();
  const read=(path:string)=>a.run(async()=>{await api(path,'PATCH',{});await r.refresh();});
  return <Page title="Notificaciones" accessories={false}><Notice error={r.error} retry={r.refresh}/><Notice error={a.error}/>{!r.data&&!r.error&&<Loading/>}
    {r.data&&<><Button disabled={a.busy||!r.data.some(n=>!n.read_status)} onPress={()=>read('/notifications/read-all')}>Marcar todas como leídas</Button>
    {!r.data.length&&<Card><Label color={c.muted}>Todavía no tienes notificaciones.</Label></Card>}
    {r.data.map(n=><Card key={n.id} tone={n.read_status?'white':c.lavender}><Tag>{n.read_status?'LEÍDA':'NUEVA'}</Tag><Label bold>{n.title}</Label><Label>{n.message}</Label><Label size={12}>{new Date(n.creation_date).toLocaleString('es-BO')}</Label>
    {!n.read_status&&<Button disabled={a.busy} variant="quiet" onPress={()=>read('/notifications/'+n.id+'/read')}>Marcar como leída</Button>}</Card>)}</>}
    <Button variant="quiet" onPress={()=>nav('/inicio')}>Volver a Inicio</Button></Page>;
}
