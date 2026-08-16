package com.alhaan.music;

import android.content.Intent;
import android.net.Uri;
import android.util.Log;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

@CapacitorPlugin(name = "MediaPlayer")
public class MediaPlayerPlugin extends Plugin {
    private static final String TAG = "MediaPlayerPlugin";
    // Single-thread: only one stream resolution at a time; cancel the old one on new play()
    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private volatile Future<?> pendingTask = null;

    private void startPlaybackService(String uri, String title, String artist, String artwork) {
        Intent intent = new Intent(getContext(), AlhanMediaService.class);
        intent.setAction(AlhanMediaService.ACTION_PLAY);
        intent.putExtra(AlhanMediaService.EXTRA_URI, uri);
        intent.putExtra(AlhanMediaService.EXTRA_TITLE, title);
        intent.putExtra(AlhanMediaService.EXTRA_ARTIST, artist);
        intent.putExtra(AlhanMediaService.EXTRA_ARTWORK, artwork);
        if (android.os.Build.VERSION.SDK_INT >= 26) {
            getContext().startForegroundService(intent);
        } else {
            getContext().startService(intent);
        }
    }

    @PluginMethod
    public void startService(PluginCall call) {
        // No-op: service starts lazily when play() is called
        call.resolve();
    }

    @PluginMethod
    public void play(PluginCall call) {
        String videoId   = call.getString("videoId");
        String localPath = call.getString("localPath");
        String title     = call.getString("title", "Alhan");
        String artist    = call.getString("artist", "");
        String artwork   = call.getString("artwork", "");

        boolean hasVideoId   = videoId != null && !videoId.isEmpty();
        boolean hasLocalPath = localPath != null && !localPath.isEmpty();

        if (!hasVideoId && !hasLocalPath) {
            call.reject("videoId or localPath is required");
            return;
        }

        // ── Local file (downloaded song) ──────────────────────────────────
        if (hasLocalPath) {
            try {
                String path = localPath.startsWith("file://") ? Uri.parse(localPath).getPath() : localPath;
                File file = new File(path);
                if (!file.exists()) { call.reject("Local audio file not found"); return; }
                startPlaybackService(Uri.fromFile(file).toString(), title, artist, artwork);
                call.resolve();
            } catch (Exception e) {
                Log.e(TAG, "Local playback failed", e);
                call.reject("Unable to start local playback: " + e.getMessage());
            }
            return;
        }

        // ── YouTube stream via Piped API ──────────────────────────────────
        // Cancel any in-flight resolution (user tapped a different song)
        Future<?> prev = pendingTask;
        if (prev != null && !prev.isDone()) prev.cancel(true);

        final String id = videoId;
        final String fTitle = title, fArtist = artist, fArtwork = artwork;

        pendingTask = executor.submit(() -> {
            try {
                String url = PipedStreamResolver.resolveAudio(id);
                if (Thread.currentThread().isInterrupted()) return;
                getActivity().runOnUiThread(() -> {
                    try {
                        startPlaybackService(url, fTitle, fArtist, fArtwork);
                        call.resolve();
                    } catch (Exception e) {
                        Log.e(TAG, "Playback service start failed", e);
                        call.reject("Playback service failed: " + e.getMessage());
                    }
                });
            } catch (InterruptedException ie) {
                Thread.currentThread().interrupt();
                // Superseded by a newer play() call — no reject needed
            } catch (Exception e) {
                Log.e(TAG, "Stream resolution failed for " + id, e);
                if (!Thread.currentThread().isInterrupted()) {
                    getActivity().runOnUiThread(() ->
                        call.reject("تعذر الحصول على مصدر الصوت. جرّب أغنية أخرى أو أعد المحاولة."));
                }
            }
        });
    }

    @PluginMethod public void pause(PluginCall call)  { AlhanMediaService.pause();  call.resolve(); }
    @PluginMethod public void resume(PluginCall call) { AlhanMediaService.resume(); call.resolve(); }
    @PluginMethod public void stop(PluginCall call)   { AlhanMediaService.stop();   call.resolve(); }

    @PluginMethod
    public void seek(PluginCall call) {
        Double seconds = call.getDouble("seconds");
        if (seconds == null) { call.reject("seconds is required"); return; }
        AlhanMediaService.seek((long)(seconds * 1000));
        call.resolve();
    }

    @PluginMethod
    public void setVolume(PluginCall call) {
        Double volume = call.getDouble("volume");
        if (volume == null) { call.reject("volume is required"); return; }
        AlhanMediaService.setVolume(Math.max(0f, Math.min(1f, volume.floatValue())));
        call.resolve();
    }

    @PluginMethod
    public void getState(PluginCall call) {
        JSObject r = new JSObject();
        r.put("isPlaying", AlhanMediaService.isPlaying());
        r.put("position",  AlhanMediaService.getPosition());
        r.put("duration",  AlhanMediaService.getDuration());
        call.resolve(r);
    }

    @Override
    protected void handleOnDestroy() {
        Future<?> t = pendingTask;
        if (t != null) t.cancel(true);
        executor.shutdownNow();
        super.handleOnDestroy();
    }
}