import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ isSsrBuild }) => ({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': 'http://localhost:5000',
    },
  },
  ssr: {
    // The prerender SSR bundle (src/prerender/render.tsx) is run directly by
    // Node. Inlining every dependency removes the native-import interop boundary
    // that otherwise breaks on Fluent UI's extensionless ESM imports and on
    // mixed CJS/ESM default-interop (e.g. @floating-ui, @swc/helpers). Only
    // affects the SSR (prerender) build.
    noExternal: true,
  },
  build: {
    rollupOptions: {
      // The SSR prerender build (src/prerender/render.tsx) externalizes react,
      // react-dom and friends, so manualChunks — which names them explicitly —
      // is only valid for the client build.
      output: isSsrBuild
        ? {}
        : {
            manualChunks: {
              'vendor-react': ['react', 'react-dom', 'react-router-dom'],
              'vendor-fluent': ['@fluentui/react-components', '@fluentui/react-icons'],
              'vendor-zustand': ['zustand'],
              'vendor-docx': ['docxtemplater', 'pizzip'],
              'vendor-xlsx': ['xlsx'],
              'vendor-zip': ['jszip'],
            },
          },
    },
    chunkSizeWarningLimit: 600,
  },
}));
