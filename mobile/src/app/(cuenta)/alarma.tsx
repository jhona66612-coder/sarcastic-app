import { useState } from 'react';
import { Platform, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import Svg,{Path,Rect} from 'react-native-svg';
import { toQR } from 'toqr';
import { useSession } from '../../lib/session';
import { useResource,useAction } from '../../lib/data';
import { scheduleAlarm,cancelAlarm } from '../../lib/reminders';
import { Button,Card,c,Field,Icon,Label,Loading,nav,Notice,Page,Section,Tag } from '../../ui/kit';
type Alarm={id:string;time:string;status:string};
type Code={token:string;expiration_date:string};
type History={id:string;activation_date:string;fulfilled:boolean};
const load=(api:ReturnType<typeof useSession>['api'])=>api<Alarm[]>('/alarms');
function QR({value}:{value:string}){
  const pixels=toQR(value),size=Math.sqrt(pixels.length),path=Array.from(pixels,(v,i)=>v?'M'+(i%size+4)+' '+(Math.floor(i/size)+4)+'h1v1h-1z':'').join('');
  return <Svg width={190} height={190} viewBox={'0 0 '+(size+8)+' '+(size+8)} accessibilityLabel="QR temporal de la alarma"><Rect width="100%" height="100%" fill="white"/><Path d={path} fill="black"/></Svg>;
}
export default function AlarmScreen(){
  const {api}=useSession(),r=useResource(load),a=useAction(),[permission,ask]=useCameraPermissions();
  const [time,setTime]=useState('07:00'),[code,setCode]=useState<Code|null>(null),[manual,setManual]=useState(''),[scan,setScan]=useState(false),[notice,setNotice]=useState('');
  const [history,setHistory]=useState<History[]|null>(null),[confirm,setConfirm]=useState('');
  function verify(raw:string){return a.run(async()=>{setScan(false);await api('/alarms/qr/scan','POST',{token:raw.trim()});setManual('');setCode(null);setHistory(null);setNotice('QR verificado. Cumplimiento registrado.');});}
  const configure=()=>a.run(async()=>{const alarm=await api<Alarm>('/alarms','POST',{time});await r.refresh();await scheduleAlarm(alarm.id,time);setNotice(Platform.OS==='web'?'Alarma guardada en tu cuenta.':'Aviso diario activado en este dispositivo.');});
  return <Page title="Alarma QR" header={false}><Card tone={c.pink} style={{alignItems:'center'}}><Tag tone={c.dark} color={c.lime}>● SIRENA QR</Tag><Icon name="alarm" size={42} color="white"/><Label size={34} color="white" bold>¡DESPIERTA!</Label><Label color="white">Escanea el QR de tu alarma para silenciarla y registrar tu actividad.</Label>
    <Card tone={c.dark} style={{alignItems:'center',width:'100%'}}>{scan?<CameraView style={{width:'100%',height:230}} facing="back" barcodeScannerSettings={{barcodeTypes:['qr']}} onBarcodeScanned={a.busy?undefined:e=>void verify(e.data)}/>:code?<><QR value={code.token}/><Label size={12} color="white">Vence a las {new Date(code.expiration_date).toLocaleTimeString('es-BO')}</Label><Label size={11} color="white" style={{textAlign:'center'}}>{code.token}</Label></>:<Icon name="qrcode-scan" size={95} color={c.lime}/>}</Card>
    <Button variant="dark" disabled={a.busy} onPress={()=>a.run(async()=>{if(scan){setScan(false);return;}if(permission?.granted||(await ask()).granted)setScan(true);else throw new Error('Permite la cámara o introduce el código manualmente.');})}>{scan?'Cerrar cámara':'Escanear QR para callar'}</Button></Card>
    <Notice error={a.error||r.error} retry={r.error?r.refresh:undefined}/>{!!notice&&<Card tone={c.lavender}><Label>{notice}</Label></Card>}
    <Card><Field label="Código manual" value={manual} onChangeText={setManual} autoCapitalize="none" autoCorrect={false}/><Button variant="quiet" disabled={a.busy||!manual.trim()} onPress={()=>verify(manual)}>Validar código</Button></Card>
    <Card><Section title="Configurar alarma"/><Field label="Hora local (HH:MM)" value={time} onChangeText={setTime}/><Button disabled={a.busy||!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)} onPress={configure}>Guardar alarma diaria</Button>
    {Platform.OS==='web'&&<Label size={12} color={c.muted}>Para recibir el aviso con la aplicación cerrada, actívalo en tu dispositivo Android o iOS.</Label>}</Card>
    {!r.data&&!r.error&&<Loading/>}{r.data?.map(al=><Card key={al.id}><Label size={22} bold>{al.time.slice(0,5)}</Label>
    <Button disabled={a.busy} onPress={()=>a.run(async()=>{setCode(await api<Code>('/alarms/'+al.id+'/qr-token','POST',{expires_in_minutes:60}));setScan(false);setNotice('Muestra el QR en otro dispositivo para escanearlo.');})}>Mostrar QR temporal</Button>
    {Platform.OS!=='web'&&<Button variant="quiet" disabled={a.busy} onPress={()=>a.run(async()=>{await scheduleAlarm(al.id,al.time);setNotice('Aviso diario activado aquí.');})}>Activar aviso aquí</Button>}
    <Button variant="quiet" disabled={a.busy} onPress={()=>a.run(async()=>setHistory(await api<History[]>('/alarms/'+al.id+'/history')))}>Ver historial</Button>
    <Button variant="quiet" disabled={a.busy} onPress={()=>confirm!==al.id?setConfirm(al.id):a.run(async()=>{await api('/alarms/'+al.id,'DELETE');await cancelAlarm(al.id);setHistory(null);setCode(null);await r.refresh();})}>{confirm===al.id?'Confirmar eliminación':'Eliminar alarma'}</Button></Card>)}
    {history&&<Card><Section title="Historial de alarma"/>{!history.length&&<Label>Sin activaciones registradas.</Label>}{history.map(h=><Label key={h.id}>{new Date(h.activation_date).toLocaleString('es-BO')} · {h.fulfilled?'Cumplida':'Pendiente'}</Label>)}</Card>}
    <Button variant="quiet" onPress={()=>nav('/perfil')}>Volver al perfil</Button>
  </Page>;
}
