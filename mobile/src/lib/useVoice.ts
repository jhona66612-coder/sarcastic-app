import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import * as Speech from "expo-speech";
import { recognition } from "./recognition";

const errors: Record<string, string> = {
  "not-allowed": "Permite el micrófono en los ajustes de este sitio o de la aplicación.",
  "service-not-allowed": "El reconocimiento de voz no está disponible en este dispositivo.",
  "audio-capture": "No se encontró un micrófono disponible.",
  "no-speech": "No pude oírte. Toca el micrófono e inténtalo otra vez.",
  network: "El reconocimiento necesita conexión. Puedes escribir tu instrucción.",
  "language-not-supported": "Activa el reconocimiento en español en tu dispositivo.",
};
export function useVoice(onText: (text: string) => void, onFinal: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState("");
  const active = useRef(false);
  const recording = useRef(false);
  const generation = useRef(0);
  const finalText = useRef("");
  const callbacks = useRef({ onText, onFinal });
  useEffect(() => { callbacks.current = { onText, onFinal }; }, [onText, onFinal]);
  const available = Boolean(recognition?.isRecognitionAvailable());
  const cancel = useCallback(() => {
    generation.current++;
    active.current = false;
    recording.current = false;
    finalText.current = "";
    recognition?.abort();
    setListening(false);
  }, []);
  useEffect(() => {
    if (!recognition) return;
    const subscriptions = [
      recognition.addListener("result", event => {
        if (!active.current) return;
        const text = event.results[0]?.transcript || "";
        callbacks.current.onText(text);
        if (event.isFinal) finalText.current = text;
      }),
      recognition.addListener("error", event => {
        if (!active.current) return;
        active.current = false;
        recording.current = false;
        setListening(false);
        finalText.current = "";
        if (event.error !== "aborted") setError(errors[event.error] || "No pude reconocer tu voz. Inténtalo otra vez.");
      }),
      recognition.addListener("end", () => {
        if (!active.current) return;
        active.current = false;
        recording.current = false;
        setListening(false);
        const text = finalText.current.trim();
        finalText.current = "";
        if (text) callbacks.current.onFinal(text);
        else setError("No recibí una frase completa. Puedes editar el texto y enviarlo.");
      }),
    ];
    const app = AppState.addEventListener("change", state => {
      if (state !== "active" && recording.current) { cancel(); void Speech.stop(); }
    });
    return () => {
      cancel();
      subscriptions.forEach(subscription => subscription.remove());
      app.remove();
      void Speech.stop();
    };
  }, [cancel]);
  // A recording can never remain open indefinitely.
  useEffect(() => {
    if (!listening) return;
    const timer = setTimeout(() => recognition?.stop(), 30000);
    return () => clearTimeout(timer);
  }, [listening]);
  const start = async () => {
    if (active.current || !recognition) return;
    const attempt = ++generation.current;
    setError("");
    active.current = true;
    finalText.current = "";
    try {
      await Speech.stop();
      const permission = await recognition.requestPermissionsAsync();
      if (attempt !== generation.current) return;
      if (!permission.granted) throw new Error(errors["not-allowed"]);
      callbacks.current.onText("");
      setListening(true);
      recording.current = true;
      recognition.start({
        lang: "es-BO", interimResults: true, continuous: false, maxAlternatives: 1,
        recordingOptions: { persist: false },
      });
    } catch (cause) {
      if (attempt !== generation.current) return;
      active.current = false;
      setListening(false);
      setError(cause instanceof Error ? cause.message : "No se pudo abrir el micrófono.");
    }
  };
  return { listening, error, available, start, stop: () => recognition?.stop(), cancel };
}
