// The problems #4471 really holds. causes.ts says why a date flips; this file adds the reports
// whose date did not flip at all: they moved by one day (desk-notes.json `oneDayMove`). A one-day
// move is a timezone, not a day-first locale, so the parser fix will not close it. Counts follow the
// desk's view: those reports stay counted where they are filed, and the timezone row counts them again.
import { causeOf, uniqueById, type Report, type Tenant } from '#lib/kb/causes';

export type Problem = 'parser' | 'hint' | 'timezone';
export const PROBLEMS: readonly Problem[] = ['parser', 'hint', 'timezone'];

export const PROBLEM_TITLE: Record<Problem, string> = {
  parser: 'Shared parser reads day-first dates month first',
  hint: 'booking-v3 form hints MM/DD/YYYY but reads the date day first',
  timezone: 'Invite and calendar disagree by one day (timezone)',
};

export function problemOf(r: Report, t: Tenant | undefined, oneDayMove: readonly string[]): Problem | null {
  if (oneDayMove.includes(r.id)) return 'timezone';
  return causeOf(r, t);
}

export type ProblemGroup = {
  problem: Problem | 'unplaced';
  reports: Report[];
  tenants: string[];
  channels: Record<string, number>;
  // Reports intake tagged as something other than their problem.
  mistagged: number;
  firstSeen: string;
  lastSeen: string;
};

export function splitTicket(
  all: Report[],
  ticket: number,
  tenantOf: (r: Report) => Tenant | undefined,
  oneDayMove: readonly string[],
): ProblemGroup[] {
  const merged = uniqueById(all).filter((r) => r.mergedInto === ticket);
  const by = new Map<ProblemGroup['problem'], Report[]>();
  const add = (p: ProblemGroup['problem'], r: Report) => by.set(p, [...(by.get(p) ?? []), r]);
  for (const r of merged) {
    // Counted the desk's way: where it is filed (causes.ts). A one-day move is also counted under timezone.
    add(causeOf(r, tenantOf(r)) ?? 'unplaced', r);
    if (problemOf(r, tenantOf(r), oneDayMove) === 'timezone') add('timezone', r);
  }
  return [...by.entries()]
    .map(([problem, rs]) => {
      const days = rs.map((r) => r.receivedAt.slice(0, 10)).sort();
      return {
        problem,
        reports: rs,
        tenants: [...new Set(rs.map((r) => r.tenant))].sort(),
        channels: rs.reduce<Record<string, number>>((n, r) => ({ ...n, [r.channel]: (n[r.channel] ?? 0) + 1 }), {}),
        mistagged: rs.filter((r) => r.meta.intakeTag !== problem).length,
        firstSeen: days[0],
        lastSeen: days[days.length - 1],
      };
    })
    .sort((a, b) => b.reports.length - a.reports.length);
}
