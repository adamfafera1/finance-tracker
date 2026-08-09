import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.financetracker.app',
  appName: 'Finance Tracker',
  webDir: 'dist/finance-tracker/browser',
  server: {
    androidScheme: 'https',
  },
};

export default config;
