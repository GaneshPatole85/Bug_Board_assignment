import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from repo root (primary) or server root if available
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT, 10) || 5000,
  API_VERSION: process.env.API_VERSION || 'v1',
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/bugboard',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  LOG_LEVEL: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'test' ? 'silent' : 'info'),
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000, // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
  // Phase 2 JWT Authentication
  JWT_SECRET: process.env.JWT_SECRET || 'bugboard-dev-super-secret-jwt-key-min-32-chars',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '1d',
  JWT_TOKEN: process.env.JWT_TOKEN || '',
  // Administrator Configuration (.env driven)
  ADMIN_NAME: process.env.ADMIN_NAME || 'Admin User',
  ADMIN_EMAIL: (process.env.ADMIN_EMAIL || 'admin@bugboard.test').toLowerCase().trim(),
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'Password123!',
  ADMIN_EMPLOYEE_ID: process.env.ADMIN_EMPLOYEE_ID || 'ADM-0001',
  ADMIN_DEPARTMENT: process.env.ADMIN_DEPARTMENT || 'Platform Operations',
  // Object Storage / MinIO S3
  S3_ENDPOINT: process.env.S3_ENDPOINT || 'http://localhost:9000',
  S3_ACCESS_KEY: process.env.S3_ACCESS_KEY || 'minioadmin',
  S3_SECRET_KEY: process.env.S3_SECRET_KEY || 'miniopassword',
  S3_BUCKET: process.env.S3_BUCKET || 'bugboard-attachments',
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV === 'development' || !process.env.NODE_ENV,
  isTest: process.env.NODE_ENV === 'test',
};
