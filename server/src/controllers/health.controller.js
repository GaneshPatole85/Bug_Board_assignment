import mongoose from 'mongoose';
import { env } from '../config/env.js';

const MONGO_STATE_MAP = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
};

/**
 * Health Check Controller.
 * Returns server status, environment, uptime, and MongoDB connection state.
 */
export const getHealth = (req, res) => {
  const readyState = mongoose.connection.readyState;
  const dbStatus = MONGO_STATE_MAP[readyState] || 'unknown';
  const isHealthy = readyState === 1;

  res.status(isHealthy ? 200 : 503).json({
    success: true,
    status: isHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    environment: env.NODE_ENV,
    version: '1.0.0',
    database: {
      status: dbStatus,
      readyState,
      host: mongoose.connection.host || null,
      name: mongoose.connection.name || null,
    },
  });
};
