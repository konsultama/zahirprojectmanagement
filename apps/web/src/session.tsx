import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { apiGet, clearToken, fetchMe, login as apiLogin, setToken, type AuthUser } from './lib/api';

interface Persona {
  id: string;
  name: string;
  roleTitle: string;
  userId: string | null;
  systemRole: string | null;
}
export interface CurrentPersona {
  name: string;
  roleTitle: string;
}

type Status = 'loading' | 'authed' | 'anon';

interface SessionCtx {
  status: Status;
  currentUser: AuthUser | null;
  currentPersona: CurrentPersona | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const Ctx = createContext<SessionCtx>({
  status: 'loading',
  currentUser: null,
  currentPersona: null,
  login: async () => {},
  logout: () => {},
});

/** Auth-aware session backed by a JWT (Authorization: Bearer). */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [personas, setPersonas] = useState<Persona[]>([]);

  // restore session from stored token on load
  useEffect(() => {
    fetchMe()
      .then((u) => {
        setCurrentUser(u);
        setStatus('authed');
      })
      .catch(() => {
        clearToken();
        setStatus('anon');
      });
  }, []);

  // load personas (to label the current user) once authenticated
  useEffect(() => {
    if (status !== 'authed') return;
    apiGet<{ data: Persona[] }>('/master/persona?pageSize=100')
      .then((r) => setPersonas(r.data))
      .catch(() => setPersonas([]));
  }, [status]);

  const value = useMemo<SessionCtx>(() => {
    const persona =
      currentUser &&
      (personas.find((p) => p.userId === currentUser.id) ??
        personas.find((p) => p.systemRole === currentUser.role));
    return {
      status,
      currentUser,
      currentPersona: persona ? { name: persona.name, roleTitle: persona.roleTitle } : null,
      login: async (email, password) => {
        const { token, user } = await apiLogin(email, password);
        setToken(token);
        setCurrentUser(user);
        setStatus('authed');
      },
      logout: () => {
        clearToken();
        setCurrentUser(null);
        setPersonas([]);
        setStatus('anon');
      },
    };
  }, [status, currentUser, personas]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useSession = () => useContext(Ctx);
