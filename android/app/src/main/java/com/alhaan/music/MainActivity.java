package com.alhaan.music;

import android.os.Bundle;
import android.util.Log;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "AlhanStartup";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Capacitor requires custom plugins to be registered before super.onCreate().
        // Keep each registration isolated so one optional native feature can never
        // prevent the main Alhan UI from starting.
        try {
            registerPlugin(YoutubeDownloaderPlugin.class);
        } catch (Throwable t) {
            Log.e(TAG, "YoutubeDownloader plugin registration failed", t);
        }
        try {
            registerPlugin(MediaPlayerPlugin.class);
        } catch (Throwable t) {
            Log.e(TAG, "MediaPlayer plugin registration failed", t);
        }

        super.onCreate(savedInstanceState);
    }
}
