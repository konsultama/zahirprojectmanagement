import { describe, it, expect } from 'vitest';
import { ProjectStatus, Role } from '@prisma/client';
import { findTransition, allowedTargets, TRANSITIONS } from './status-transition';

describe('project status transitions (§7.1.3)', () => {
  it('allows DRAFT → ACTIVE for PM without a reason', () => {
    const rule = findTransition(ProjectStatus.DRAFT, ProjectStatus.ACTIVE);
    expect(rule).toBeDefined();
    expect(rule?.roles).toContain(Role.PM);
    expect(rule?.reasonRequired).toBe(false);
  });

  it('requires a reason to cancel', () => {
    expect(findTransition(ProjectStatus.ACTIVE, ProjectStatus.CANCELLED)?.reasonRequired).toBe(true);
    expect(findTransition(ProjectStatus.DRAFT, ProjectStatus.CANCELLED)?.reasonRequired).toBe(true);
  });

  it('lets only ADMIN close a completed project', () => {
    const rule = findTransition(ProjectStatus.COMPLETED, ProjectStatus.CLOSED);
    expect(rule?.roles).toEqual([Role.ADMIN]);
  });

  it('lets only ADMIN reopen a closed project, with a reason', () => {
    const rule = findTransition(ProjectStatus.CLOSED, ProjectStatus.ACTIVE);
    expect(rule?.roles).toEqual([Role.ADMIN]);
    expect(rule?.reasonRequired).toBe(true);
  });

  it('forbids illegal jumps (DRAFT → COMPLETED)', () => {
    expect(findTransition(ProjectStatus.DRAFT, ProjectStatus.COMPLETED)).toBeUndefined();
  });

  it('has no outgoing transition that a PM alone can use to close', () => {
    for (const rules of Object.values(TRANSITIONS)) {
      for (const r of rules) {
        if (r.to === ProjectStatus.CLOSED) expect(r.roles).not.toContain(Role.PM);
      }
    }
  });

  it('lists allowed targets for a status', () => {
    expect(allowedTargets(ProjectStatus.ACTIVE).sort()).toEqual(
      [ProjectStatus.ON_HOLD, ProjectStatus.COMPLETED, ProjectStatus.CANCELLED].sort(),
    );
    expect(allowedTargets(ProjectStatus.CLOSED)).toEqual([ProjectStatus.ACTIVE]);
  });
});
