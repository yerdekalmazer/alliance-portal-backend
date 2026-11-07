import 'dotenv/config';
import { createApp } from './app';
import { migrate, pool } from './db';
import { ensureAdminFromEnv } from './seedAdmin';

const PORT = Number(process.env.PORT || 3001);

async function main() {
  await migrate();
  await ensureAdminFromEnv();

  const server = createApp().listen(PORT, () => {
    console.log(`Alliance Portal API :${PORT}`);
  });

  const shutdown = () => {
    server.close(() => pool.end().then(() => process.exit(0)));
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((err) => {
  console.error('Başlatılamadı:', err);
  process.exit(1);
});
