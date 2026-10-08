import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.findmycoach.app',
  appName: 'FindMyCoach',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  ios: {
    contentInset: 'never',
    backgroundColor: '#1D1D1D',
  },
  android: {
    backgroundColor: '#1D1D1D',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: '#1D1D1D',
      showSpinner: false,
    },
    StatusBar: {
      overlaysWebView: false,
      style: 'LIGHT',
      backgroundColor: '#F6F9FA',
    },
    Keyboard: {
      resize: 'native',
    },
  },
};

export default config;
