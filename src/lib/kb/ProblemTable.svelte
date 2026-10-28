<script lang="ts">
  import reports from '#lib/data/reports-4471.json';
  import notes from '#lib/data/desk-notes.json';
  import type { Report } from '#lib/kb/causes';
  import { tenantOf } from '#lib/kb/locales';
  import { PROBLEM_TITLE, splitTicket, type Problem } from '#lib/kb/problems';

  // `tickets`: where each problem is filed now, problem → issue URL and what became of it.
  type Filed = { url: string; state: string };
  let { ticket, tickets = {} }: { ticket: number; tickets?: Partial<Record<Problem, Filed>> } = $props();

  const rows = $derived(reports as Report[]);
  const groups = $derived(splitTicket(rows, ticket, tenantOf, notes.oneDayMove));
  const total = $derived(new Set(groups.flatMap((g) => g.reports.map((r) => r.id))).size);
  const dupes = $derived(rows.filter((r) => r.mergedInto === ticket).length - total);
  const issue = (url: string) => '#' + url.split('/').pop();
  const channels = (c: Record<string, number>) =>
    Object.entries(c)
      .sort((a, b) => b[1] - a[1])
      .map(([k, n]) => `${k} ×${n}`)
      .join(' · ');
</script>

<p class="sum">
  <strong>{total}</strong> reports in #{ticket} · <strong>{groups.length}</strong>
  {groups.length === 1 ? 'problem' : 'problems'}
  {#if dupes}<span class="muted">· {dupes} rows in the export were the same report twice, counted once</span>{/if}
</p>

<table>
  <thead>
    <tr><th>problem</th><th>reports</th><th>tenants</th><th>channels</th><th>seen</th><th>ticket</th><th>state</th></tr>
  </thead>
  <tbody>
    {#each groups as g (g.problem)}
      {@const filed = g.problem === 'unplaced' ? undefined : tickets[g.problem]}
      <tr class:open={!filed}>
        <td><code>{g.problem}</code><br /><span class="muted">{g.problem === 'unplaced' ? 'no tenant on file' : PROBLEM_TITLE[g.problem]}</span></td>
        <td><strong>{g.reports.length}</strong></td>
        <td title={g.tenants.join(', ')}>{g.tenants.length}</td>
        <td class="muted">{channels(g.channels)}</td>
        <td class="muted">{g.firstSeen} → {g.lastSeen}</td>
        <td>{#if filed}<a href={filed.url}>{issue(filed.url)}</a>{:else}no ticket yet{/if}</td>
        <td>{filed?.state ?? '—'}</td>
      </tr>
    {/each}
  </tbody>
</table>

<p class="muted">
  Intake's tag disagrees with the problem on
  <strong>{groups.filter((g) => g.problem !== 'timezone').reduce((n, g) => n + g.mistagged, 0)}</strong> of {total} reports. The tag is a guess from the
  reporter's browser; the problem comes from the tenant, their form and what the report says.
</p>

<style>
  .sum { font-size: 1.1rem; }
  .muted { color: var(--muted); font-size: 0.85em; }
  .open td { background: var(--warn-bg); }
</style>
