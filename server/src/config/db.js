import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

/**
 * Initialize MongoDB connection using Mongoose.
 * Implements fail-fast startup: exits process if initial connection fails.
 */
export const connectDB = async () => {
  try {
    logger.info({ uri: env.MONGODB_URI }, 'Attempting MongoDB connection...');

    mongoose.connection.on('connected', () => {
      logger.info('MongoDB connection established successfully');
    });

    mongoose.connection.on('error', (err) => {
      logger.error({ err }, 'MongoDB connection encountered an error');
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB connection lost / disconnected');
    });

    // Server selection timeout set to 5000ms for fast failure in development
    const conn = await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });

    logger.info(
      {
        host: conn.connection.host,
        port: conn.connection.port,
        name: conn.connection.name,
      },
      'MongoDB connected'
    );

    return conn;
  } catch (error) {
    logger.fatal(
      { error: error.message, stack: error.stack },
      'Fatal: Failed to connect to MongoDB during startup. Exiting...'
    );
    // Fail fast
    process.exit(1);
  }
};

/**
 * Close MongoDB connection gracefully.
 */
export const closeDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close(false);
    logger.info('MongoDB connection closed cleanly');
  }
};

/**
 * Register graceful shutdown listeners for SIGINT, SIGTERM, and unhandled rejections.
 * Closes HTTP server first to drain connections, then closes database connection.
 * @param {import('http').Server} server
 */
export const setupGracefulShutdown = (server) => {
  const shutdown = async (signal) => {
    logger.info({ signal }, `Received ${signal}. Starting graceful shutdown...`);

    // Force close after 10s if graceful shutdown hangs
    const forceExitTimer = setTimeout(() => {
      logger.error('Graceful shutdown timed out. Forcing process exit.');
      process.exit(1);
    }, 10000);
    forceExitTimer.unref();

    if (server) {
      await new Promise((resolve) => {
        server.close((err) => {
          if (err) {
            logger.error({ err }, 'Error closing HTTP server');
          } else {
            logger.info('HTTP server closed successfully');
          }
          resolve();
        });
      });
    }

    try {
      await closeDB();
      logger.info('Graceful shutdown completed successfully. Process exiting.');
      process.exit(0);
    } catch (err) {
      logger.error({ err }, 'Error during MongoDB shutdown');
      process.exit(1);
    }
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  process.on('unhandledRejection', (reason, promise) => {
    logger.fatal({ reason, promise }, 'Unhandled Promise Rejection detected. Commencing graceful shutdown...');
    shutdown('unhandledRejection');
  });

  process.on('uncaughtException', (error) => {
    logger.fatal({ error: error.message, stack: error.stack }, 'Uncaught Exception detected. Commencing graceful shutdown...');
    shutdown('uncaughtException');
  });
};
