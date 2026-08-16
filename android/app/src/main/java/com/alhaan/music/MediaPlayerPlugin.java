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
import java.util.concurrent.Future;

@CapacitorPlugin(name = "MediaPlayer")
public class MediaPlayerPlugin extends Plugin {
    private static final String TAG = "MediaPlayerPlugin";
    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private volatile Future<?> pendingResolution = null;

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
        call.resolve();
    }

    @PluginMethod
    public void play(PluginCall call) {
        String videoId   = call.getString("videoId");
        String localPath = call.getString("localPath");
        String title     = call.getString("title", "Alhan");
        String artist    = call.getString("artist", "");
        String artwork   = call.getString("artwork", "");

        boolean hasVideoId   = videoId   != null && !videoId.isEmpty();
        boolean hasLocalPath = localPath != null && !localPath.isEmpty();

        if (!hasVideoId && !hasLocalPath) {
            call.reject("videoId or localPath is required");
            return;
        }

        // ── Local file (offline download) ──────────────────────────────────
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

        // ── YouTube stream resolution ──────────────────────────────────────
        if (!AlhanApplication.ytdlpReady) {
            call.reject("مشغل الصوت لا يزال يُحضّر، حاول مرة أخرى بعد لحظة.");
            return;
        }

        // Cancel any in-flight resolution
        Future<?> prev = pendingResolution;
        if (prev != null && !prev.isDone()) prev.cancel(true);

        final String id       = videoId;
        final String fTitle   = title;
        final String fArtist  = artist;
        final String fArtwork = artwork;

        Future<?> task = executor.submit(() -> {
            try {
                YoutubeDLRequest request = new YoutubeDLRequest("https://www.youtube.com/watch?v=" + id);
                request.addOption("--no-playlist");
                request.addOption("--no-warnings");
                request.addOption("-f", "bestaudio[ext=m4a]/bestaudio/best");
                request.addOption("-g");

                String processId = "alhan-play-" + UUID.randomUUID();
                String output = YoutubeDL.getInstance().execute(request, processId, null).getOut();

                if (Thread.currentThread().isInterrupted()) return;

                if (output == null || output.trim().isEmpty()) {
                    getActivity().runOnUiThread(() -> call.reject("Could not resolve audio stream URL"));
                    return;
                }

                String url = output.trim().split("[\\r\\n]+")[0].trim();
                Log.d(TAG, "Stream URL resolved for " + id);

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
                // Superseded by a newer play() call — no need to reject
            } catch (Exception e) {
                Log.e(TAG, "Stream resolution failed for " + id, e);
                if (!Thread.currentThread().isInterrupted()) {
                    getActivity().runOnUiThread(() ->
                        call.reject(e.getMessage() != null ? e.getMessage() : "Playback failed"));
                }
            }
        });

        pendingResolution = task;
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
        Future<?> pending = pendingResolution;
        if (pending != null) pending.cancel(true);
        executor.shutdownNow();
        super.handleOnDestroy();
    }
}
