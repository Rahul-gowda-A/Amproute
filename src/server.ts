import { app } from './app.js';
import { config } from './config/env.js';
import { runMigrations } from './db/migrate.js';
import { seedIfEmpty } from './db/seed.js';

export { app };

async function startServer() {
  try {
    console.log('Running automatic database migrations...');
    await runMigrations();
    console.log('Checking database seed status...');
    await seedIfEmpty();
  } catch (error) {
    console.warn('Startup database initialization issue:', error);
  }

  if (process.env.NODE_ENV !== 'test') {
    app.listen(config.PORT, '0.0.0.0', () => {
      console.log(`API listening on port ${config.PORT}`);
      console.log(`OpenAPI documentation available at http://localhost:${config.PORT}/api-docs`);
    });
  }
}

if (process.env.NODE_ENV !== 'test') {
  startServer();
}
