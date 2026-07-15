import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { apiGet, getUserId, setUserId } from './lib/api';
import type { UserRef } from './lib/types';

interface SessionCtx {
  users: UserRef[];
  currentUser: UserRef | null;
  switchUser: (id: string) => void;
}

const Ctx = createContext<SessionCtx>({ users: [], currentUser: null, switchUser: () => {} });

/**
 * MVP session: a demo user switcher (no login yet). The chosen user's id goes
 * out as `x-user-id`, driving RBAC and data-scope on the API.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<UserRef[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(getUserId());

  useEffect(() => {
    apiGet<UserRef[]>('/users')
      .then((list) => {
        setUsers(list);
        if (!getUserId() && list.length > 0) {
          const admin = list.find((u) => u.role === 'ADMIN') ?? list[0];
          setUserId(admin.id);
          setCurrentId(admin.id);
        }
      })
      .catch(() => setUsers([]));
  }, []);

  const value = useMemo<SessionCtx>(
    () => ({
      users,
      currentUser: users.find((u) => u.id === currentId) ?? null,
      switchUser: (id: string) => {
        setUserId(id);
        setCurrentId(id);
      },
    }),
    [users, currentId],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useSession = () => useContext(Ctx);
