import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.financetracker.app',
  appName: 'Lifefe',
  webDir: 'dist/lifefe/browser',
  server: {
    androidScheme: 'https',
  },
};

export default config;
