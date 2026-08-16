package com.alhaan.music;

import android.app.Application;
import android.util.Log;

import com.yausername.youtubedl_android.YoutubeDL;
import com.yausername.youtubedl_android.YoutubeDLException;

public class AlhanApplication extends Application {
    private static final String TAG = "AlhanStartup";

    @Override
    public void onCreate() {
        super.onCreate();
        try {
            YoutubeDL.getInstance().init(this);
            Log.i(TAG, "yt-dlp initialized");
        } catch (YoutubeDLException e) {
            // Do not block app startup if the downloader runtime cannot initialize.
            // Download/playback code will report a user-facing error when invoked.
            Log.e(TAG, "yt-dlp initialization failed", e);
        } catch (Throwable t) {
            Log.e(TAG, "Unexpected yt-dlp initialization failure", t);
        }
    }
}
