import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Writes dist/version.json on a client build, so https://veidne.com/version.json
// names the commit that is live. The deployment passes the commit in
// VITE_BUILD_COMMIT; without it the file says "unknown". Nothing else in the
// output changes, and neither the dev server nor the prerender build runs it.
function buildProvenance(): Plugin {
  return {
    name: 'veidne-build-provenance',
    apply: 'build',
    generateBundle() {
      if (this.environment.config.build.ssr) return;
      const version = {
        repository: 'https://github.com/justsliepins/veidne-client',
        commit: process.env.VITE_BUILD_COMMIT || 'unknown',
        builtAt: new Date().toISOString(),
      };
      this.emitFile({ type: 'asset', fileName: 'version.json', source: `${JSON.stringify(version, null, 2)}\n` });
    },
  };
}

export default defineConfig(({ isSsrBuild }) => ({
  plugins: [react(), buildProvenance()],
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
