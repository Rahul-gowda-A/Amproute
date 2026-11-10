import { app } from './app.js';
import { config } from './config/env.js';

export { app };

if (process.env.NODE_ENV !== 'test') {
  app.listen(config.PORT, '0.0.0.0', () => {
    console.log(`API listening on port ${config.PORT}`);
    console.log(`OpenAPI documentation available at http://localhost:${config.PORT}/api-docs`);
  });
}
