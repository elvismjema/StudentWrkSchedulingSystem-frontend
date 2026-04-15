/// <reference types="@southdevs/capacitor-google-auth" />
import "dotenv/config";
import type { CapacitorConfig } from '@capacitor/cli';

const DEFAULT_WEB_CLIENT_ID =
  '249489666247-vpkk3eqqsubpekr5pt166prhhi32t4to.apps.googleusercontent.com';
const DEFAULT_IOS_CLIENT_ID =
  '249489666247-vhnci059dbsgp2i8mm8gh40fjlargsrk.apps.googleusercontent.com';

const webClientId = process.env.VITE_APP_CLIENT_ID ?? DEFAULT_WEB_CLIENT_ID;
const iosClientId = process.env.VITE_APP_IOS_CLIENT_ID ?? DEFAULT_IOS_CLIENT_ID;

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
    GoogleAuth: {
      scopes: ['profile', 'email', 'openid'],
      iosClientId,
      serverClientId: webClientId,
      forceCodeForRefreshToken: true,
    },
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
