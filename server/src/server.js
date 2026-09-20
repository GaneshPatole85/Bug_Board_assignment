import app from './app.js';
import { env } from './config/env.js';
import { connectDB, setupGracefulShutdown } from './config/db.js';
import { logger } from './utils/logger.js';

const startServer = async () => {
  // Fail-fast startup: DB connection must succeed before opening server port
  await connectDB();

  const server = app.listen(env.PORT, () => {
    logger.info(
      {
        port: env.PORT,
        env: env.NODE_ENV,
        apiVersion: env.API_VERSION,
      },
      `🚀 BugBoard API server running on http://localhost:${env.PORT}/api/${env.API_VERSION}`
    );
  });

  // Attach graceful shutdown handlers (SIGINT, SIGTERM)
  setupGracefulShutdown(server);
};

startServer().catch((err) => {
  logger.fatal({ err }, 'Fatal error during server startup');
  process.exit(1);
});
