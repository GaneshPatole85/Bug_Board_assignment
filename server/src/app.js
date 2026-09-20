import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env.js';
import { requestLogger } from './middlewares/requestLogger.js';
import { notFoundHandler } from './middlewares/notFoundHandler.js';
import { errorHandler } from './middlewares/errorHandler.js';
import apiRoutes from './routes/index.js';

const app = express();

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, postman) or matching CLIENT_URL
      if (!origin || origin === env.CLIENT_URL || env.isDevelopment) {
        callback(null, true);
      } else {
        callback(new Error(`CORS blocked for origin: ${origin}`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id'],
  })
);

// Body parsing middleware
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Structured HTTP logging (pino-http)
app.use(requestLogger);

// API v1 versioned routes mount
app.use(`/api/${env.API_VERSION}`, apiRoutes);

// Centralized 404 handler
app.use(notFoundHandler);

// Centralized error handler
app.use(errorHandler);

export default app;
