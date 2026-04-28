/// <reference types="vitest" />
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { firebaseConfig } from './src/firebase/config';

// GitHub Pages serves the app under /<repo>/.
// Override with VITE_BASE if your repo name differs.
const base = process.env.VITE_BASE || '/todo-witek/';

function stampFirebaseSwPlugin() {
  return {
    name: 'stamp-firebase-sw',
    writeBundle({ dir }: { dir?: string }) {
      const outDir = dir ?? 'dist';
      const swPath = resolve(outDir, 'firebase-messaging-sw.js');
      let src = readFileSync(swPath, 'utf-8');
      src = src
        .replace("apiKey: ''", `apiKey: '${firebaseConfig.apiKey}'`)
        .replace("authDomain: ''", `authDomain: '${firebaseConfig.authDomain}'`)
        .replace("projectId: ''", `projectId: '${firebaseConfig.projectId}'`)
        .replace("storageBucket: ''", `storageBucket: '${firebaseConfig.storageBucket}'`)
        .replace("messagingSenderId: ''", `messagingSenderId: '${firebaseConfig.messagingSenderId}'`)
        .replace("appId: ''", `appId: '${firebaseConfig.appId}'`);
      writeFileSync(swPath, src, 'utf-8');
    },
  };
}

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Todo Witek',
        short_name: 'Todo',
        description: 'Todo PWA with reminders and push notifications',
        theme_color: '#1f2937',
        background_color: '#0b1220',
        display: 'standalone',
        start_url: base,
        scope: base,
        icons: [
          {
            src: 'favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      strategies: 'generateSW',
      workbox: {
        navigateFallbackDenylist: [/^\/firebase-messaging-sw\.js$/],
      },
    }),
    stampFirebaseSwPlugin(),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: false,
    exclude: ['scripts/**', 'node_modules/**'],
  },
});
