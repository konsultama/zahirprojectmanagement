import { describe, it, expect } from 'vitest';
import { Role } from '@prisma/client';
import { PERMISSIONS, ROLES, ROLE_LABELS } from './rbac.permissions';

const byKey = (key: string) => PERMISSIONS.find((p) => p.key === key);

describe('RBAC default matrix (§6)', () => {
  it('defines every documented permission key exactly once', () => {
    const keys = PERMISSIONS.map((p) => p.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys).toContain('initiating.approve');
    expect(keys).toContain('closing.approve');
  });

  it('gives ADMIN every permission by default', () => {
    for (const p of PERMISSIONS) expect(p.defaults).toContain(Role.ADMIN);
  });

  it('restricts Initiating & Closing approval to ADMIN only', () => {
    expect(byKey('initiating.approve')?.defaults).toEqual([Role.ADMIN]);
    expect(byKey('closing.approve')?.defaults).toEqual([Role.ADMIN]);
    expect(byKey('master_project.delete')?.defaults).toEqual([Role.ADMIN]);
  });

  it('lets FINANCE (not PM) approve planning and overbudget', () => {
    expect(byKey('planning.approve')?.defaults).toContain(Role.FINANCE);
    expect(byKey('planning.approve')?.defaults).not.toContain(Role.PM);
    expect(byKey('overbudget.approve')?.defaults).toContain(Role.FINANCE);
  });

  it('lets every role view a project', () => {
    expect([...(byKey('project.view')?.defaults ?? [])].sort()).toEqual([...ROLES].sort());
  });

  it('does not grant VIEWER any write/approve permission', () => {
    for (const p of PERMISSIONS) {
      if (p.key === 'project.view') continue;
      expect(p.defaults).not.toContain(Role.VIEWER);
    }
  });

  it('has a label for every role', () => {
    for (const r of ROLES) expect(ROLE_LABELS[r]).toBeTruthy();
  });
});
