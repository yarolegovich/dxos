//
// Copyright 2022 DXOS.org
//

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

import { dxosPlugin } from '@dxos/vite-plugin';

// https://vitejs.dev/config/
export default defineConfig({
  base: '', // Ensures relative path to assets.
  optimizeDeps: {
    force: true,
    include: [
      '@dxos/client',
      '@dxos/config',
      '@dxos/protocols',
      '@dxos/react-async',
      '@dxos/react-client',
      '@dxos/react-components',
      '@dxos/react-toolkit',
      '@dxos/util'
    ]
  },
  build: {
    commonjsOptions: {
      // TODO(wittjosiah): Why must org scope be omitted for this to work?
      // https://github.com/vitejs/vite/issues/5668#issuecomment-968125763
      include: [
        /client/,
        /config/,
        /protocols/,
        /react-async/,
        /react-client/,
        /react-components/,
        /react-toolkit/,
        /util/,
        /node_modules/
      ]
    }
  },
  plugins: [
    dxosPlugin(__dirname),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // TODO(wittjosiah): Bundle size is massive.
      workbox: {
        maximumFileSizeToCacheInBytes: 30000000
      },
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'HALO',
        short_name: 'HALO',
        description: 'DXOS HALO Application',
        theme_color: '#ffffff',
        icons: [
          {
            src: 'icons/icon-32.png',
            sizes: '32x32',
            type: 'image/png'
          },
          {
            src: 'icons/icon-256.png',
            sizes: '256x256',
            type: 'image/png'
          }
        ]
      }
    })
  ]
});