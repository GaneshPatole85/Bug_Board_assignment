import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_UPLOAD_DIR = path.resolve(__dirname, '../../uploads');

class StorageService {
  constructor() {
    this._uploadDir = process.env.UPLOAD_DIR || DEFAULT_UPLOAD_DIR;
    this._ensureUploadDir();
  }

  _ensureUploadDir() {
    try {
      if (!fs.existsSync(this._uploadDir)) {
        fs.mkdirSync(this._uploadDir, { recursive: true });
      }
    } catch (err) {
      logger.warn({ err: err.message }, 'Failed to create storage upload directory');
    }
  }

  /**
   * Store file buffer with the given storageKey
   */
  async uploadFile(storageKey, buffer, mimeType) {
    this._ensureUploadDir();
    const filePath = path.join(this._uploadDir, storageKey);
    await fs.promises.writeFile(filePath, buffer);
    logger.info({ storageKey, size: buffer.length, mimeType }, 'Attachment stored successfully');
    return { storageKey, size: buffer.length, mimeType };
  }

  /**
   * Retrieve file buffer for download
   */
  async downloadFile(storageKey) {
    const filePath = path.join(this._uploadDir, storageKey);
    if (!fs.existsSync(filePath)) {
      const error = new Error('File not found in storage');
      error.statusCode = 404;
      throw error;
    }
    return fs.promises.readFile(filePath);
  }

  /**
   * Remove stored file
   */
  async deleteFile(storageKey) {
    try {
      const filePath = path.join(this._uploadDir, storageKey);
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
      }
    } catch (err) {
      logger.warn({ err: err.message, storageKey }, 'Failed to delete file from storage');
    }
  }
}

export const storageService = new StorageService();
export default storageService;
