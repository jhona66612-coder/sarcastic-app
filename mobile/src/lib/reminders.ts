import { Platform } from 'react-native';
import * as N from 'expo-notifications';
N.setNotificationHandler({handleNotification:async()=>({shouldShowBanner:true,shouldShowList:true,shouldPlaySound:true,shouldSetBadge:false})});
export async function scheduleAlarm(id:string,time:string) {
  if(Platform.OS==='android') await N.setNotificationChannelAsync('alarmas',{name:'Alarmas QR',importance:N.AndroidImportance.HIGH,sound:'default'});
  const p=await N.requestPermissionsAsync();
  if(!p.granted) throw new Error('Alarma guardada. Habilita las notificaciones y toca «Activar aviso aquí».');
  const [hour,minute]=time.split(':').map(Number);
  await N.scheduleNotificationAsync({identifier:'roast-'+id,content:{title:'¡Despierta!',body:'Abre tu alarma QR para registrar el cumplimiento.',sound:'default',data:{alarmId:id}},trigger:{type:N.SchedulableTriggerInputTypes.DAILY,hour,minute,channelId:'alarmas'}});
}
export const cancelAlarm=(id:string)=>N.cancelScheduledNotificationAsync('roast-'+id);
