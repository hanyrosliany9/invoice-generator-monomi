/// <reference types='vitest' />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path'

export default defineConfig({
  plugins: [react({ jsxRuntime: 'automatic' })],
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'antd',
      '@ant-design/icons',
      'axios',
      'dayjs',
      'recharts',
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
    port: 3000,
    watch: { usePolling: true, interval: 1000 },
    fs: { strict: false, allow: ['..'] },
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
        ws: true,
      },
    },
    middlewareMode: false,
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
    minify: false, // Disabled temporarily to catch TDZ errors with real variable names
    target: 'es2020',
    cssCodeSplit: true,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
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
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    css: true,
    include: ['**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'dist', '.idea', '.git', '.cache'],
  },
})
