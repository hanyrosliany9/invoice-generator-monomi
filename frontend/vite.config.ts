/// <reference types='vitest' />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [tailwindcss(), react({ jsxRuntime: 'automatic' })],
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'antd',
      '@ant-design/icons',
      'axios',
      'dayjs',
      'recharts',
      'react-is',
      'slate',
      'slate-dom',
      'slate-react',
      'slate-history',
    ],
    exclude: [
      '@testing-library/react',
      '@fullcalendar/core',
      '@fullcalendar/daygrid',
      '@fullcalendar/timegrid',
      '@fullcalendar/interaction',
      '@fullcalendar/react',
    ],
    esbuildOptions: { target: 'es2020' },
  },
  cacheDir: 'node_modules/.vite',
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    host: '0.0.0.0',
    // Dev port + proxy target are env-overridable so a second instance can run
    // alongside another project. Defaults are unchanged (3000 → backend 5000).
    port: Number(process.env.VITE_PORT) || 3000,
    // Accept tunnel hostnames (cloudflared / ngrok). Dev-only; build output is unaffected.
    allowedHosts: true,
    // VITE_TUNNEL=1 routes HMR through the tunnel on wss:443. Used with
    // cloudflared (--protocol http2) which handles WSS fine. Don't use with
    // ngrok-free — its connection limit blows up under HMR reconnects.
    hmr: process.env.VITE_TUNNEL ? { clientPort: 443, protocol: 'wss' } : true,
    watch: { usePolling: true, interval: 1000 },
    fs: { strict: false, allow: ['..'] },
    proxy: {
      '/api': {
        target: process.env.VITE_PROXY_TARGET || 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
        ws: true,
      },
    },
    middlewareMode: false,
  },
  // `vite preview` mode — used when serving the production build for QA
  // through the cloudflared tunnel. Each page load fires ~10 requests instead
  // of Vite dev's ~100+ unbundled module requests, which prevents cloudflared
  // 2026.5.1 from hitting its "no more connections active and exiting" guard.
  preview: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
        ws: true,
      },
    },
  },
  css: {
    modules: {
      localsConvention: 'camelCase',
      generateScopedName: '[name]__[local]___[hash:base64:5]',
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'esbuild', // re-enabled: the TDZ/init-order errors came from the manualChunks vendor split, now fixed (single vendor chunk)
    target: 'es2020',
    cssCodeSplit: true,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
        /**
         * Single `vendor` chunk for ALL node_modules.
         *
         * Splitting vendors into focused chunks (react / antd / charts / …)
         * created circular chunk edges: many libs read React (React.version,
         * React.useState) at MODULE TOP LEVEL, and Rollup's cross-chunk import
         * graph let a consumer chunk evaluate before the React chunk finished
         * exporting — so `React` was undefined and the whole app blanked out
         * (first antd, then recharts, etc.). Keeping every node_module in one
         * chunk makes all those reads intra-chunk and dependency-ordered, which
         * is the only cycle-proof option. App code still splits per route, so
         * page-level caching is preserved.
         */
        manualChunks(id) {
          if (id.includes('node_modules')) return 'vendor'
        },
      },
    },
    esbuild: {
      drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
      legalComments: 'none',
      minifyIdentifiers: true,
      minifySyntax: true,
      minifyWhitespace: true,
    },
  },
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./src/test-setup.ts'],
    css: true,
    include: ['**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'dist', '.idea', '.git', '.cache'],
  },
})
