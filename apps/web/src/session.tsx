import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { apiGet, getUserId, setUserId } from './lib/api';
import type { Role, UserRef } from './lib/types';

interface Persona {
  id: string;
  name: string;
  roleTitle: string;
  systemRole: Role | null;
}

/** A persona from master data, resolved to a user account for auth (x-user-id). */
export interface PersonaOption {
  personaId: string;
  name: string;
  roleTitle: string;
  userId: string;
  role: Role;
}

interface SessionCtx {
  users: UserRef[];
  personas: PersonaOption[];
  currentUser: UserRef | null;
  currentPersona: PersonaOption | null;
  switchUser: (id: string) => void;
}

const Ctx = createContext<SessionCtx>({
  users: [],
  personas: [],
  currentUser: null,
  currentPersona: null,
  switchUser: () => {},
});

/**
 * MVP session: the "Masuk sebagai" switcher is driven by master Persona data
 * (§5). Each persona is mapped to a user account with the same system role;
 * that user's id goes out as `x-user-id`, driving RBAC and data-scope.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<UserRef[]>([]);
  const [personaRows, setPersonaRows] = useState<Persona[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(getUserId());

  useEffect(() => {
    Promise.all([
      apiGet<UserRef[]>('/users').catch(() => [] as UserRef[]),
      apiGet<{ data: Persona[] }>('/master/persona?pageSize=100')
        .then((r) => r.data)
        .catch(() => [] as Persona[]),
    ]).then(([userList, personaList]) => {
      setUsers(userList);
      setPersonaRows(personaList);
      if (!getUserId() && userList.length > 0) {
        const admin = userList.find((u) => u.role === 'ADMIN') ?? userList[0];
        setUserId(admin.id);
        setCurrentId(admin.id);
      }
    });
  }, []);

  const value = useMemo<SessionCtx>(() => {
    // map each persona to a user with the same system role
    const personas: PersonaOption[] = personaRows
      .map((p) => {
        const user = p.systemRole ? users.find((u) => u.role === p.systemRole) : undefined;
        return user
          ? { personaId: p.id, name: p.name, roleTitle: p.roleTitle, userId: user.id, role: user.role as Role }
          : null;
      })
      .filter((x): x is PersonaOption => x !== null);

    const currentUser = users.find((u) => u.id === currentId) ?? null;
    const currentPersona =
      personas.find((p) => p.userId === currentId) ??
      (currentUser ? personas.find((p) => p.role === currentUser.role) ?? null : null);

    return {
      users,
      personas,
      currentUser,
      currentPersona,
      switchUser: (id: string) => {
        setUserId(id);
        setCurrentId(id);
      },
    };
  }, [users, personaRows, currentId]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useSession = () => useContext(Ctx);
