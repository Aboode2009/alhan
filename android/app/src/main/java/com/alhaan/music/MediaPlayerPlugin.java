package com.alhaan.music;

import android.content.Intent;
import android.net.Uri;
import android.util.Log;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.yausername.youtubedl_android.YoutubeDL;
import com.yausername.youtubedl_android.YoutubeDLRequest;
import java.io.File;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@CapacitorPlugin(name = "MediaPlayer")
public class MediaPlayerPlugin extends Plugin {
    private static final String TAG = "MediaPlayerPlugin";
    private final ExecutorService executor = Executors.newCachedThreadPool();

    private void startPlaybackService(String uri, String title, String artist, String artwork) {
        Intent intent = new Intent(getContext(), AlhanMediaService.class);
        intent.setAction(AlhanMediaService.ACTION_PLAY);
        intent.putExtra(AlhanMediaService.EXTRA_URI, uri);
        intent.putExtra(AlhanMediaService.EXTRA_TITLE, title);
        intent.putExtra(AlhanMediaService.EXTRA_ARTIST, artist);
        intent.putExtra(AlhanMediaService.EXTRA_ARTWORK, artwork);
        if (android.os.Build.VERSION.SDK_INT >= 26) getContext().startForegroundService(intent); else getContext().startService(intent);
    }

    @PluginMethod public void startService(PluginCall call) { call.resolve(); }

    @PluginMethod
    public void play(PluginCall call) {
        String videoId = call.getString("videoId");
        String localPath = call.getString("localPath");
        String title = call.getString("title", "Alhan");
        String artist = call.getString("artist", "");
        String artwork = call.getString("artwork", "");
        if ((videoId == null || videoId.isEmpty()) && (localPath == null || localPath.isEmpty())) { call.reject("videoId or localPath is required"); return; }

        if (localPath != null && !localPath.isEmpty()) {
            try {
                String path = localPath.startsWith("file://") ? Uri.parse(localPath).getPath() : localPath;
                File file = new File(path);
                if (!file.exists()) { call.reject("Local audio file not found"); return; }
                startPlaybackService(Uri.fromFile(file).toString(), title, artist, artwork);
                call.resolve();
            } catch (Exception e) { call.reject("Unable to start local playback: " + e.getMessage()); }
            return;
        }

        final String id = videoId;
        executor.execute(() -> {
            try {
                YoutubeDLRequest request = new YoutubeDLRequest("https://www.youtube.com/watch?v=" + id);
                request.addOption("--no-playlist");
                request.addOption("-f", "bestaudio[ext=m4a]/bestaudio/best");
                request.addOption("-g");
                String processId = "alhan-play-" + UUID.randomUUID();
                String output = YoutubeDL.getInstance().execute(request, processId).getOut();
                if (output == null || output.trim().isEmpty()) throw new IllegalStateException("Could not resolve audio stream");
                String url = output.trim().split("\\R")[0].trim();
                getActivity().runOnUiThread(() -> {
                    try { startPlaybackService(url, title, artist, artwork); call.resolve(); }
                    catch (Exception e) { Log.e(TAG, "Unable to start playback service", e); call.reject("Playback service failed: " + e.getMessage()); }
                });
            } catch (Exception e) {
                Log.e(TAG, "Unable to resolve/play YouTube audio", e);
                getActivity().runOnUiThread(() -> call.reject(e.getMessage() == null ? "Playback failed" : e.getMessage()));
            }
        });
    }

    @PluginMethod public void pause(PluginCall call) { AlhanMediaService.pause(); call.resolve(); }
    @PluginMethod public void resume(PluginCall call) { AlhanMediaService.resume(); call.resolve(); }
    @PluginMethod public void stop(PluginCall call) { AlhanMediaService.stop(); call.resolve(); }
    @PluginMethod public void seek(PluginCall call) { Double seconds = call.getDouble("seconds"); if (seconds == null) { call.reject("seconds is required"); return; } AlhanMediaService.seek((long)(seconds * 1000)); call.resolve(); }
    @PluginMethod public void setVolume(PluginCall call) { Double volume = call.getDouble("volume"); if (volume == null) { call.reject("volume is required"); return; } AlhanMediaService.setVolume(Math.max(0f, Math.min(1f, volume.floatValue()))); call.resolve(); }
    @PluginMethod public void getState(PluginCall call) { JSObject result = new JSObject(); result.put("isPlaying", AlhanMediaService.isPlaying()); result.put("position", AlhanMediaService.getPosition()); result.put("duration", AlhanMediaService.getDuration()); call.resolve(result); }
    @Override protected void handleOnDestroy() { executor.shutdownNow(); super.handleOnDestroy(); }
}
