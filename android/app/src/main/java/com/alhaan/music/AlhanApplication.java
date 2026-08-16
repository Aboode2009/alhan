package com.alhaan.music;

import android.app.Application;
import android.util.Log;

import com.yausername.youtubedl_android.YoutubeDL;

public class AlhanApplication extends Application {
    private static final String TAG = "AlhanStartup";
    /** True once yt-dlp native libs finish loading on the background thread. */
    public static volatile boolean ytdlpReady = false;

    @Override
    public void onCreate() {
        super.onCreate();
        // Run yt-dlp init off the main thread so a slow or failing native
        // library never crashes the Activity before the UI even appears.
        new Thread(() -> {
            try {
                YoutubeDL.getInstance().init(AlhanApplication.this);
                ytdlpReady = true;
                Log.i(TAG, "yt-dlp initialized");
            } catch (Throwable t) {
                Log.e(TAG, "yt-dlp init failed (non-fatal) -- downloads will use Piped only", t);
            }
        }, "alhan-ytdlp-init").start();
    }
}
