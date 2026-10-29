import { Hono } from 'hono';
import { loadConfig, type RigConfig } from './config.js';
import { readNight } from './digest/read.js';
import { lane } from './lane.js';
import { readStatus } from './status.js';
import { DigestPage } from './views/digest.js';
import { Layout } from './views/layout.js';
import { StatusBoard } from './views/status.js';

// A night is a date; anything else never reaches the filesystem.
const NIGHT = /^\d{4}-\d{2}-\d{2}$/;

export function createApp(config: RigConfig = loadConfig()) {
  const app = new Hono();

  const night = (name: string) => (NIGHT.test(name) ? readNight(config.runsDir, name) : null);

  app.get('/health', (c) => c.json({ ok: true, lane: lane().id }));

  app.get('/', (c) =>
    c.html(
      <Layout title="status" lane={lane()}>
        <StatusBoard status={readStatus(config)} />
      </Layout>,
    ),
  );

  app.get('/digest/:night', (c) => {
    const n = night(c.req.param('night'));
    if (!n) return c.text('no such night', 404);
    return c.html(
      <Layout title={`digest ${n.night}`} lane={lane()}>
        <DigestPage night={n} />
      </Layout>,
    );
  });

  app.get('/api/digest/:night', (c) => {
    const n = night(c.req.param('night'));
    if (!n) return c.json({ error: 'no such night' }, 404);
    return c.json(n);
  });

  return app;
}
