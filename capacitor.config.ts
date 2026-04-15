import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'edu.oc.workerscheduling',
  appName: 'OC WorkSchedule',
  webDir: 'dist',
  // During development, point to your live dev server so you get
  // hot-reload on a real device.  Comment this out (or remove it)
  // for production builds — Capacitor will then serve the bundled
  // files from `webDir` instead.
  //
  // server: {
  //   url: 'http://<YOUR_LOCAL_IP>:8081',
  //   cleartext: true,
  // },

  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 2000,
      backgroundColor: '#80162B',          // OC maroon
      showSpinner: false,
    },
    StatusBar: {
      style: 'DARK',                       // light text on dark background
      backgroundColor: '#80162B',
    },
  },

  // iOS-specific
  ios: {
    contentInset: 'automatic',
    scheme: 'OC WorkSchedule',
  },

  // Android-specific
  android: {
    allowMixedContent: true,               // needed if API is HTTP during dev
  },
};

export default config;
