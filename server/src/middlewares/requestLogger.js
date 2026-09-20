import pinoHttp from 'pino-http';
import { logger } from '../utils/logger.js';
import crypto from 'crypto';

/**
 * HTTP request logging middleware via pino-http.
 * Generates unique request ID and logs method, URL, status code, and latency.
 */
export const requestLogger = pinoHttp({
  logger,
  genReqId: (req) => req.headers['x-request-id'] || crypto.randomUUID(),
  customLogLevel: (req, res, err) => {
    if (res.statusCode >= 500 || err) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  customSuccessMessage: (req, res) => `${req.method} ${req.url} completed with status ${res.statusCode}`,
  customErrorMessage: (req, res, err) => `${req.method} ${req.url} failed with status ${res.statusCode}: ${err.message}`,
});
