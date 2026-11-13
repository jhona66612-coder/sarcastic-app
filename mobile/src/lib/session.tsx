import { createContext, useCallback, useContext, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { ApiError, request, type User } from './api';
import { readToken, writeToken } from './storage';

type Session = { token: string; user: User };
type Api = <T>(path: string, method?: string, body?: unknown) => Promise<T>;
type Context = { session: Session | null; loading: boolean; error: string; retry: () => void;
  enter: (s: Session) => Promise<void>; leave: () => Promise<void>; api: Api };
const Auth = createContext<Context | null>(null);
export function SessionProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const active = useRef('');
  const leave = useCallback(async () => { await writeToken(''); active.current = ''; setSession(null); }, []);
  const enter = useCallback(async (s: Session) => { await writeToken(s.token); active.current = s.token; setSession(s); }, []);
  useEffect(() => {
    let live = true;
    async function restore() {
      setLoading(true); setError('');
      try {
        const token = await readToken();
        if (token) {
          const user = await request<User>('/auth/me', token);
          if (live) { active.current = token; setSession({ token, user }); }
        }
      } catch (e) {
        if (live && e instanceof ApiError && e.status === 401) await leave();
        else if (live) setError(e instanceof Error ? e.message : 'Error al abrir la sesión.');
      } finally { if (live) setLoading(false); }
    }
    void restore(); return () => { live = false; };
  }, [attempt, leave]);
  const token = session?.token || '';
  const api: Api = useCallback(async <T,>(path: string, method?: string, body?: unknown) => {
    try { return await request<T>(path, token, method, body); }
    catch (e) {
      if (token && token === active.current && e instanceof ApiError && e.status === 401) await leave();
      throw e;
    }
  }, [token, leave]);
  return <Auth.Provider value={{session, loading, error, retry: () => setAttempt(a=>a+1), api, enter, leave}}>{children}</Auth.Provider>;
}
export function useSession() {
  const ctx = useContext(Auth);
  if (!ctx) throw new Error('Se necesita una sesión.');
  return ctx;
}
