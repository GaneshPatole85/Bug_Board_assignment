import pino from 'pino';
import { env } from '../config/env.js';

const transport = env.isDevelopment
  ? {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:yyyy-mm-dd HH:MM:ss',
        ignore: 'pid,hostname',
      },
    }
  : undefined;

export const logger = pino({
  level: env.LOG_LEVEL,
  transport,
  base: {
    service: 'bugboard-api',
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});
