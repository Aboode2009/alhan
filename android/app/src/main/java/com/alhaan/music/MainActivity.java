package com.alhaan.music;

import android.Manifest;
import android.os.Build;
import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(YoutubeDownloaderPlugin.class);
        registerPlugin(MediaPlayerPlugin.class);
        super.onCreate(savedInstanceState);
        if (Build.VERSION.SDK_INT >= 33) {
            requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, 7001);
        }
    }
}
