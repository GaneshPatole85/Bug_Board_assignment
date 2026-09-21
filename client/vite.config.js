import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

const rootEnvExists = fs.existsSync(path.resolve(process.cwd(), '../.env'));

export default defineConfig({
  plugins: [react()],
  envDir: rootEnvExists ? '../' : './',
  server: {
    port: 5173,
    host: true,
  },
  preview: {
    port: 5173,
  },
});
