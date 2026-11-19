import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { randomUUID } from "expo-crypto";
import * as Speech from "expo-speech";
import { useSession } from "../lib/session";
import { ApiError } from "../lib/api";
import { notifyChanges } from "../lib/changes";
import { useVoice } from "../lib/useVoice";
import { cancelAlarm, scheduleAlarm } from "../lib/reminders";
import { SlothMascot } from "./SlothMascot";
import { Button, c, Icon, Label, nav } from "./kit";

type Command = { request_id: string; time_zone: string; message?: string; previous_message?: string; confirmation_token?: string };
type Result = { type: string; title: string; path: string; id?: string; data?: { id?: string; time?: string; status?: string } };
type Reply = { reply: string; results: Result[]; mode: string; notice?: string; follow_up?: string; confirmation?: { token: string; actions: { title: string; detail: string }[] } };
const examples = [
  { icon: "checkbox-marked-circle-outline" as const, text: "Crea la tarea estudiar mañana" },
  { icon: "calendar-clock" as const, text: "Programa una reunión mañana a las 17:00" },
  { icon: "timer-outline" as const, text: "Inicia enfoque de 25 minutos" },
];
const welcome = "Tú pon la voz. Yo pongo el orden.\nDime qué tienes que hacer y lo organizamos.";

export function SlothAssistant() {
  const { api } = useSession();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const opened = useRef(false);
  const mounted = useRef(true);
  const [text, setText] = useState("");
  const [heard, setHeard] = useState("");
  const [reply, setReply] = useState<Reply | null>(null);
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState<Command | null>(null);
  const [confirmationId, setConfirmationId] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [voiceReply, setVoiceReply] = useState(true);
  const voiceEnabled = useRef(true);
  const [speaking, setSpeaking] = useState(false);
  const [deviceNote, setDeviceNote] = useState("");
  const [mode, setMode] = useState("commands");
  const voice = useVoice(setText, value => { void submit(value); });

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; opened.current = false; void Speech.stop(); };
  }, []);
  useEffect(() => {
    if (open) void api<{ mode: string }>("/assistant/capabilities").then(value => setMode(value.mode)).catch(() => {});
  }, [open, api]);

  function close() {
    opened.current = false;
    setOpen(false);
    voice.cancel();
    void Speech.stop();
    setSpeaking(false);
  }
  function speak(value: string) {
    if (!voiceEnabled.current || !opened.current) return;
    void Speech.stop().then(() => {
      if (!mounted.current || !opened.current || !voiceEnabled.current) return;
      Speech.speak(value.slice(0, 1800), {
        language: "es", rate: 0.98,
        onStart: () => { if (mounted.current) setSpeaking(true); },
        onDone: () => { if (mounted.current) setSpeaking(false); },
        onStopped: () => { if (mounted.current) setSpeaking(false); },
        onError: () => {
          if (mounted.current) { setSpeaking(false); setDeviceNote("No se pudo reproducir la voz. La respuesta está disponible por escrito."); }
        },
      });
    });
  }
  async function syncAlarms(results: Result[]) {
    if (Platform.OS === "web") {
      if (results.some(result => result.type === "create_alarm" || result.type === "update_alarm")) setDeviceNote("Alarma guardada en tu cuenta. Para recibir el aviso diario, actívalo desde Alarmas en la app instalada.");
      return;
    }
    for (const result of results) {
      if (result.type === "delete_alarm" && result.id) await cancelAlarm(result.id);
      if ((result.type === "create_alarm" || result.type === "update_alarm") && result.data?.id && result.data.time) {
        if (result.data.status === "inactive") await cancelAlarm(result.data.id);
        else await scheduleAlarm(result.data.id, result.data.time);
      }
    }
  }
  async function execute(command: Command) {
    if (locked.current) return;
    locked.current = true;
    setBusy(true); setError(""); setRetry(null); setDeviceNote(""); setSpeaking(false);
    voice.cancel();
    void Speech.stop();
    try {
      const result = await api<Reply>("/assistant/command", "POST", command);
      notifyChanges();
      if (!mounted.current) return;
      setReply(result);
      setMode(result.mode === "confirmed" ? mode : result.mode);
      setFollowUp(result.follow_up || "");
      setConfirmationId(command.request_id);
      setText("");
      try { await syncAlarms(result.results); }
      catch (cause) { if (mounted.current) setDeviceNote(cause instanceof Error ? cause.message : "Revisa el permiso de notificaciones para activar el aviso aquí."); }
      if (!mounted.current) return;
      speak(result.reply);
      const navigation = result.results.find(item => item.type === "navigate");
      if (navigation) { close(); nav(navigation.path); }
    } catch (cause) {
      if (!mounted.current) return;
      setError(cause instanceof Error ? cause.message : "No pude realizar la instrucción.");
      if (!(cause instanceof ApiError) || cause.status >= 500) {
        setRetry(command);
        setDeviceNote("Si se cortó la conexión, reintenta esta misma instrucción para comprobar el resultado sin duplicarlo.");
      }
    } finally {
      locked.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  async function submit(value = text) {
    const instruction = value.trim();
    if (!instruction || locked.current || retry || reply?.confirmation) return;
    setHeard(instruction);
    await execute({ request_id: randomUUID(), message: instruction, time_zone: Intl.DateTimeFormat().resolvedOptions().timeZone || "America/La_Paz", ...(followUp && { previous_message: followUp }) });
  }
  function clearConversation() {
    setReply(null); setFollowUp(""); setError(""); setText(""); setHeard(""); setDeviceNote("");
    voice.cancel(); void Speech.stop(); setSpeaking(false);
  }
  const state = voice.listening ? "listening" : busy ? "thinking" : speaking ? "speaking" : "idle";
  const status = voice.listening ? "Te estoy escuchando" : busy ? "Organizando tu día…" : speaking ? "SlothBot está hablando" : "Listo para ayudarte";
  const paths = Array.from(new Set(reply?.results.filter(result => result.type !== "navigate").map(result => result.path) || []));
  return <>
    <View pointerEvents="box-none" style={[s.floating, { bottom: insets.bottom + 75 }]}>
      <Pressable accessibilityRole="button" accessibilityLabel="Hablar con SlothBot, tu asistente" onPress={() => { opened.current = true; setOpen(true); }} style={({ pressed }) => [s.launcher, { opacity: pressed ? 0.8 : 1 }]}>
        <SlothMascot size={62} state={busy ? "thinking" : "idle"} />
        <View style={s.launcherMic}><Icon name="microphone" size={15} color={c.dark} /></View>
      </Pressable>
      <Text style={s.launcherLabel}>SlothBot</Text>
    </View>
    <Modal visible={open} transparent animationType="slide" onRequestClose={close}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={s.backdrop}>
        <Pressable accessibilityLabel="Cerrar asistente" accessibilityRole="button" style={StyleSheet.absoluteFill} onPress={close} />
        <View accessibilityViewIsModal style={[s.sheet, { paddingBottom: Math.max(insets.bottom, 16), marginTop: insets.top + 18 }]}>
          <View style={s.handle} />
          <View style={s.topbar}>
            <View><Label size={18} bold>SlothBot</Label><Label size={11} color={c.muted}>Tu asistente personal</Label></View>
            <Pressable accessibilityLabel="Cerrar SlothBot" accessibilityRole="button" onPress={close} style={s.iconButton}><Icon name="close" /></Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}>
            <View style={s.hero}>
              <View style={s.orbit}><SlothMascot size={145} state={state} /></View>
              <View style={s.status}><View style={[s.dot, { backgroundColor: voice.listening ? c.pink : c.purple }]} /><Label size={12} bold>{status}</Label>{busy && <ActivityIndicator size="small" color={c.purple} />}</View>
              <Label size={12} color={c.muted}>{mode === "ai" ? "Conversación natural" : "Tareas · agenda · enfoque · alarmas"}</Label>
            </View>
            {heard ? <View style={s.userMessage}><Label size={10} bold color={c.purple}>TÚ DIJISTE</Label><Label>{heard}</Label></View> : null}
            <View style={s.botMessage}>
              <Text accessibilityLiveRegion="polite" style={s.reply}>{reply?.reply || welcome}</Text>
              {reply?.notice ? <Label size={11} color={c.muted}>{reply.notice}</Label> : null}
              {paths.length ? <View style={s.links}>{paths.map(path => <Button key={path} variant="quiet" icon="arrow-top-right" onPress={() => { close(); nav(path); }}>Ver {path === "/inicio" ? "tareas" : path.slice(1)}</Button>)}</View> : null}
            </View>
            {reply?.confirmation && <View style={s.confirmation}>
              <Label bold>Revisa antes de eliminar</Label>
              {reply.confirmation.actions.map((action, index) => <Label key={index} size={13}>{action.title} · {action.detail}</Label>)}
              <Button variant="danger" disabled={busy} onPress={() => void execute({ request_id: confirmationId, confirmation_token: reply.confirmation!.token, time_zone: Intl.DateTimeFormat().resolvedOptions().timeZone || "America/La_Paz" })}>Confirmar acciones</Button>
              <Button variant="quiet" disabled={busy} onPress={clearConversation}>Cancelar</Button>
            </View>}
            {!heard && <View style={{ gap: 7 }}>
              <Label size={11} bold color={c.muted}>PRUEBA DECIRME</Label>
              {examples.map(example => <Pressable key={example.text} accessibilityRole="button" onPress={() => { setText(example.text); setError(""); }} style={s.example}>
                <Icon name={example.icon} size={19} color={c.purple} /><Label size={12} style={{ flex: 1 }}>{example.text}</Label><Icon name="arrow-bottom-left" size={16} color={c.muted} />
              </Pressable>)}
            </View>}
            {(error || voice.error) ? <Text accessibilityRole="alert" style={s.error}>{error || voice.error}</Text> : null}
            {deviceNote ? <Label size={12} color={c.muted}>{deviceNote}</Label> : null}
            {retry && <Button disabled={busy} icon="refresh" onPress={() => void execute(retry)}>Comprobar o reintentar instrucción</Button>}
            <View style={s.footer}>
              <Icon name="volume-high" size={19} color={c.muted} /><Label size={12} style={{ flex: 1 }}>Responder en voz alta</Label>
              <Switch accessibilityLabel="Responder en voz alta" value={voiceReply} onValueChange={value => { voiceEnabled.current = value; setVoiceReply(value); if (!value) { void Speech.stop(); setSpeaking(false); } }} trackColor={{ false: "#D4CCD9", true: c.purple }} thumbColor="white" />
            </View>
            <Label size={10} color={c.muted}>Solo escucho al tocar el micrófono. No guardamos audio; tu dispositivo o navegador puede enviarlo a su servicio de reconocimiento. Las instrucciones realizadas quedan en tu historial de SlothBot.</Label>
          </ScrollView>
          <View style={s.composer}>
            {!reply?.confirmation && !retry && <View style={{ gap: 10 }}>
              {followUp ? <View style={s.followUp}><Label size={12} style={{ flex: 1 }}>Responde para completar la instrucción.</Label><Button variant="quiet" onPress={clearConversation}>Nueva orden</Button></View> : null}
              <TextInput accessibilityLabel="Tu instrucción para SlothBot" placeholder="Escribe o toca el micrófono…" placeholderTextColor={c.muted} multiline value={text} onChangeText={setText} editable={!busy && !voice.listening} maxLength={2000} style={s.input} />
              <View style={s.controls}>
                <Pressable accessibilityRole="button" accessibilityLabel={voice.listening ? "Terminar y enviar audio" : "Hablar con SlothBot"} accessibilityState={{ disabled: busy || !voice.available }} disabled={busy || !voice.available}
                  onPress={() => { setSpeaking(false); if (voice.listening) voice.stop(); else void voice.start(); }}
                  style={[s.microphone, { backgroundColor: voice.listening ? c.pink : c.plum, opacity: busy || !voice.available ? 0.4 : 1 }]}>
                  <Icon name={voice.listening ? "stop" : "microphone"} size={27} color="white" />
                </Pressable>
                <View style={{ flex: 1 }}><Label size={13} bold>{voice.listening ? "Habla, te escucho" : "Toca y habla"}</Label><Label size={10} color={c.muted}>{voice.listening ? "Tu orden se envía al terminar." : "Se envía al terminar tu frase."}</Label></View>
                {voice.listening ? <Button variant="quiet" onPress={voice.cancel}>Cancelar</Button> : <Button icon="send" disabled={!text.trim() || busy} onPress={() => void submit()}>Enviar</Button>}
              </View>
              {!voice.available && <Label size={12} color={c.muted}>{Platform.OS === "web" ? "Este navegador no ofrece reconocimiento de voz. Prueba Chrome o Edge, o escribe tu instrucción." : "La voz requiere la versión instalada de la app con reconocimiento de voz. Aquí puedes escribir."}</Label>}
            </View>}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  </>;
}
const s = StyleSheet.create({
  floating: { position: "absolute", right: 15, alignItems: "center", zIndex: 30 },
  launcher: { width: 65, height: 65, borderRadius: 33, backgroundColor: "#F4EAFE", borderWidth: 2, borderColor: "white", boxShadow: "0 4px 18px #27143430", alignItems: "center", justifyContent: "center" },
  launcherMic: { position: "absolute", right: -2, bottom: 0, backgroundColor: c.lime, borderRadius: 14, padding: 4, borderWidth: 2, borderColor: "white" },
  launcherLabel: { fontSize: 10, fontWeight: "700", color: c.plum, marginTop: 3, backgroundColor: "#FFFFFFEE", borderRadius: 7, paddingHorizontal: 6 },
  backdrop: { flex: 1, backgroundColor: "#180A2488", justifyContent: "flex-end", alignItems: "center" },
  sheet: { width: "100%", maxWidth: 520, maxHeight: "94%", backgroundColor: c.paper, borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: "hidden" },
  handle: { width: 36, height: 4, borderRadius: 3, backgroundColor: "#D7CEDF", alignSelf: "center", marginTop: 10 },
  topbar: { paddingHorizontal: 24, paddingVertical: 9, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  iconButton: { width: 44, height: 44, justifyContent: "center", alignItems: "center", borderRadius: 24, backgroundColor: "white" },
  content: { paddingHorizontal: 24, paddingBottom: 12, gap: 16 },
  composer: { paddingHorizontal: 24, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#E5DFEA" },
  hero: { alignItems: "center", gap: 7, paddingVertical: 4 },
  orbit: { width: 160, height: 146, borderRadius: 80, backgroundColor: c.lavender, alignItems: "center", justifyContent: "center" },
  status: { flexDirection: "row", alignItems: "center", gap: 7 },
  dot: { width: 7, height: 7, borderRadius: 5 },
  userMessage: { alignSelf: "flex-end", maxWidth: "95%", borderRadius: 16, borderBottomRightRadius: 4, padding: 14, gap: 4, backgroundColor: "#EDE2FA" },
  botMessage: { backgroundColor: "white", borderRadius: 17, borderTopLeftRadius: 4, padding: 16, gap: 10, borderWidth: 1, borderColor: "#E9E3EF" },
  reply: { color: c.ink, fontSize: 15, lineHeight: 22 },
  links: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  example: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "white", borderWidth: 1, borderColor: "#E9E3EF", borderRadius: 11, padding: 11, minHeight: 44 },
  confirmation: { backgroundColor: c.rose, borderRadius: 14, padding: 15, gap: 10 },
  input: { backgroundColor: "white", minHeight: 65, maxHeight: 130, borderRadius: 14, borderWidth: 1, borderColor: "#CFC0DA", padding: 13, color: c.ink, fontSize: 15, textAlignVertical: "top" },
  controls: { flexDirection: "row", alignItems: "center", gap: 10 },
  microphone: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  footer: { flexDirection: "row", alignItems: "center", gap: 8, borderTopWidth: 1, borderTopColor: "#E5DFEA", paddingTop: 12 },
  followUp: { flexDirection: "row", gap: 8, alignItems: "center" },
  error: { color: c.red, fontSize: 13, lineHeight: 19, backgroundColor: c.rose, borderRadius: 10, padding: 12 },
});
