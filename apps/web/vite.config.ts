import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';

const developmentContentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self' data:",
  "connect-src 'self' ws://127.0.0.1:4173",
  "form-action 'self'",
].join('; ');

const previewContentSecurityPolicy = developmentContentSecurityPolicy.replace(
  "connect-src 'self' ws://127.0.0.1:4173",
  "connect-src 'self'",
).replace("style-src 'self' 'unsafe-inline'", "style-src 'self'");

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: '127.0.0.1',
    port: 4173,
    strictPort: true,
    headers: {
      'Content-Security-Policy': developmentContentSecurityPolicy,
    },
  },
  preview: {
    headers: {
      'Content-Security-Policy': previewContentSecurityPolicy,
    },
  },
});
