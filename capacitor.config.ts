import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.alhaan.music',
  appName: 'youtube-tarab-player',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    BackgroundRunner: {
      label: 'com.alhaan.music.background',
      src: 'background-runner.js',
      event: 'backgroundTaskEvent',
      repeat: true,
      interval: 15,
      autoStart: false
    }
  }
};

export default config;
