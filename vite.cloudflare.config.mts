import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/postcss';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const fromRoot = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  root: fromRoot('./cloudflare'),
  publicDir: fromRoot('./public'),
  resolve: { alias: { '@': fromRoot('./') } },
  plugins: [react()],
  css: { postcss: { plugins: [tailwindcss()] } },
  build: { outDir: fromRoot('./dist/cloudflare/assets'), emptyOutDir: true },
});
