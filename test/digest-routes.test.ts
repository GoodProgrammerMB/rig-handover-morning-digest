import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

const base = { adapter: 'shim', installed: '2026-10-29T14:06:00+01:00', beatEverySeconds: 60 };

// runs/ is read-only: every case writes its nights to a temp dir.
function appWith(files: Record<string, string>) {
  const dir = mkdtempSync(join(tmpdir(), 'rig-routes-'));
  for (const [night, text] of Object.entries(files)) writeFileSync(join(dir, `${night}.jsonl`), text);
  return createApp({ ...base, runsDir: dir });
}

const ok = (job: string) => JSON.stringify({ at: '2026-10-28T23:00:00+01:00', job, status: 'ok', owner: null });

describe('digest page and JSON', () => {
  it('200: the page and the JSON list the same jobs in the same order', async () => {
    const app = createApp({ ...base, runsDir: 'runs' });
    const page = await app.request('/digest/2026-10-28');
    const json = await app.request('/api/digest/2026-10-28');
    expect(page.status).toBe(200);
    expect(json.status).toBe(200);
    const jobs = ((await json.json()) as { rows: { job: string }[] }).rows.map((r) => r.job);
    const html = await page.text();
    const positions = jobs.map((j) => html.indexOf(`<td>${j}</td>`));
    expect(positions.every((p) => p >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });

  it('404 for a night with no file, on both routes', async () => {
    const app = appWith({});
    expect((await app.request('/digest/2026-01-01')).status).toBe(404);
    expect((await app.request('/api/digest/2026-01-01')).status).toBe(404);
    expect((await app.request('/digest/not-a-night')).status).toBe(404);
  });

  it('an empty night renders "nothing ran"', async () => {
    const app = appWith({ '2026-01-01': '' });
    const res = await app.request('/digest/2026-01-01');
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('nothing ran');
    expect(((await (await app.request('/api/digest/2026-01-01')).json()) as { rows: unknown[] }).rows).toEqual([]);
  });

  it('a night with a bad line still renders and counts it', async () => {
    const app = appWith({ '2026-01-01': `${ok('a/job')}\n{"at":"2026-10-28T2\n` });
    const res = await app.request('/digest/2026-01-01');
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('a/job');
    expect(html).toContain('1 unreadable line skipped');
    expect(((await (await app.request('/api/digest/2026-01-01')).json()) as { badLines: number }).badLines).toBe(1);
  });

  it('marks 3 or more retries and any fail; missing owner is —', async () => {
    const res = await createApp({ ...base, runsDir: 'runs' }).request('/digest/2026-10-28');
    const html = await res.text();
    expect(html).toContain('<td class="warn">3 ⚠</td>');
    expect(html).toContain('<td class="warn">fail ⚠</td>');
    expect(html).toContain('<td>digest/render</td><td>—</td>');
  });

  it('the board links both nights with their counts', async () => {
    const html = await (await createApp({ ...base, runsDir: 'runs' }).request('/')).text();
    expect(html).toContain('href="/digest/2026-10-28"');
    expect(html).toContain('href="/digest/2026-10-27"');
    expect(html).toContain('ok 10 · retry 4 · fail 1');
  });
});
