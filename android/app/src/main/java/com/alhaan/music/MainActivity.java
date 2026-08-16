package com.alhaan.music;

import android.os.Bundle;
import android.util.Log;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "AlhanStartup";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        try { registerPlugin(YoutubeDownloaderPlugin.class); } catch (Throwable t) { Log.e(TAG, "YoutubeDownloader registration failed", t); }
        try { registerPlugin(MediaPlayerPlugin.class); } catch (Throwable t) { Log.e(TAG, "MediaPlayer registration failed", t); }
        try { registerPlugin(YoutubeSearchPlugin.class); } catch (Throwable t) { Log.e(TAG, "YoutubeSearch registration failed", t); }
        super.onCreate(savedInstanceState);
    }
}
