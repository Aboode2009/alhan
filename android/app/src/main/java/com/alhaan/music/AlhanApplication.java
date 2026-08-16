package com.alhaan.music;

import android.app.Application;
import android.util.Log;

public class AlhanApplication extends Application {
    private static final String TAG = "AlhanStartup";
    // Whether yt-dlp initialized successfully — checked before use in plugins.
    static volatile boolean ytdlpReady = false;

    @Override
    public void onCreate() {
        super.onCreate();
        try {
            // Defer yt-dlp init to a background thread so the app never
            // crashes at launch on devices where native libs are slow/missing.
            new Thread(() -> {
                try {
                    com.yausername.youtubedl_android.YoutubeDL.getInstance().init(this);
                    ytdlpReady = true;
                    Log.i(TAG, "yt-dlp initialized");
                } catch (Throwable t) {
                    Log.e(TAG, "yt-dlp init failed (non-fatal)", t);
                }
            }, "alhan-ytdlp-init").start();
        } catch (Throwable t) {
            Log.e(TAG, "Could not start yt-dlp init thread", t);
        }
    }
}
