import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { createApp } from './app.js';
import { loadConfig } from './config.js';

// Plan morning-digest §3: save one page as a single HTML file, lane banner included.
// Usage: pnpm preview [night] [out]. Output lands in var/ (git-ignored): previews never go in the
// repo (ADR 0003). The banner shows LANE_MARKER; run with it unset for the clean-up copy.
const night = process.argv[2] ?? '2026-10-28';
const out = process.argv[3] ?? 'var/preview/index.html';

const res = await createApp(loadConfig()).request(`/digest/${night}`);
if (res.status !== 200) {
  console.error(`digest ${night}: ${res.status}`);
  process.exit(1);
}
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, await res.text());
console.log(`saved ${out} (marker: ${process.env.LANE_MARKER?.trim() || 'none'})`);
