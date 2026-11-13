import { useCallback, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import { useSession } from "./session";
type Api = ReturnType<typeof useSession>["api"];
export function useResource<T>(load: (api: Api) => Promise<T>) {
  const { api } = useSession();
  const [data, setData] = useState<T>();
  const [error, setError] = useState("");
  const version = useRef(0);
  const refresh = useCallback(async () => {
    const id = ++version.current;
    setError("");
    try {
      const value = await load(api);
      if (id === version.current) setData(value);
    } catch (e) {
      if (id === version.current)
        setError(e instanceof Error ? e.message : "Error al cargar.");
    }
  }, [api, load]);
  useFocusEffect(
    useCallback(() => {
      void refresh();
      return () => {
        version.current++;
      };
    }, [refresh]),
  );
  return { data, error, refresh };
}
export function useAction() {
  const locked = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function run(job: () => Promise<void>) {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setError("");
    try {
      await job();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  return { run, busy, error };
}
