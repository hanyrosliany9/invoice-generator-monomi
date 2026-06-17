import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'id.monomi.app',
  appName: 'Monomi',
  webDir: 'dist',
  server: {
    // Load the live production site — this ensures all API calls and WebSockets
    // route through production nginx correctly. The APK acts as a native shell
    // around the real web app; no relative-URL issues possible.
    url: 'https://admin.monomiagency.com',
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
