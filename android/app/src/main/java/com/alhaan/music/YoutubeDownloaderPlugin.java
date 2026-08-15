package com.alhaan.music;

import android.os.Environment;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.yausername.ffmpeg.FFmpeg;
import com.yausername.youtubedl_android.YoutubeDL;
import com.yausername.youtubedl_android.YoutubeDLException;
import com.yausername.youtubedl_android.YoutubeDLRequest;

import java.io.File;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import kotlin.Unit;
import kotlin.jvm.functions.Function3;

@CapacitorPlugin(name = "YoutubeDownloader")
public class YoutubeDownloaderPlugin extends Plugin {
    private static final String TAG = "YoutubeDownloader";
    private final ExecutorService executor = Executors.newCachedThreadPool();
    private final ConcurrentHashMap<String, String> taskProcesses = new ConcurrentHashMap<>();

    @Override
    public void load() {
        super.load();
        try {
            YoutubeDL.getInstance().init(getContext());
            FFmpeg.getInstance().init(getContext());
        } catch (YoutubeDLException e) {
            Log.e(TAG, "Failed to initialize yt-dlp", e);
        }
    }

    private File getDownloadDirectory() {
        File base = getContext().getExternalFilesDir(Environment.DIRECTORY_MUSIC);
        File directory = new File(base, "Alhan");
        if (!directory.exists()) directory.mkdirs();
        return directory;
    }

    @PluginMethod
    public void download(final PluginCall call) {
        final String videoId = call.getString("videoId");
        if (videoId == null || videoId.trim().isEmpty()) {
            call.reject("videoId is required");
            return;
        }
        final String taskId = UUID.randomUUID().toString();
        final String processId = "alhan-" + taskId;
        taskProcesses.put(taskId, processId);
        JSObject accepted = new JSObject();
        accepted.put("taskId", taskId);
        call.resolve(accepted);

        executor.execute(() -> {
            try {
                final File directory = getDownloadDirectory();
                final YoutubeDLRequest request = new YoutubeDLRequest("https://www.youtube.com/watch?v=" + videoId);
                request.addOption("--no-playlist");
                request.addOption("--no-mtime");
                request.addOption("-x");
                request.addOption("--audio-format", "m4a");
                request.addOption("--audio-quality", "0");
                request.addOption("-o", new File(directory, "%(id)s.%(ext)s").getAbsolutePath());

                Function3<Float, Long, String, Unit> callback = (progress, eta, line) -> {
                    JSObject event = new JSObject();
                    event.put("taskId", taskId);
                    event.put("videoId", videoId);
                    event.put("progress", progress != null ? progress : 0);
                    event.put("status", line != null ? line : "");
                    notifyListeners("downloadProgress", event);
                    return Unit.INSTANCE;
                };

                YoutubeDL.getInstance().execute(request, processId, callback);
                File output = findDownloadedFile(directory, videoId);
                if (output == null) throw new IllegalStateException("Downloaded file was not found");

                JSObject complete = new JSObject();
                complete.put("taskId", taskId);
                complete.put("videoId", videoId);
                complete.put("localPath", output.getAbsolutePath());
                complete.put("size", output.length());
                notifyListeners("downloadComplete", complete);
            } catch (Exception e) {
                Log.e(TAG, "Download failed for " + videoId, e);
                JSObject error = new JSObject();
                error.put("taskId", taskId);
                error.put("videoId", videoId);
                error.put("message", e.getMessage() != null ? e.getMessage() : "Download failed");
                notifyListeners("downloadError", error);
            } finally {
                taskProcesses.remove(taskId);
            }
        });
    }

    private File findDownloadedFile(File directory, String videoId) {
        File[] files = directory.listFiles();
        if (files == null) return null;
        for (File file : files) if (file.isFile() && file.getName().startsWith(videoId + ".")) return file;
        return null;
    }

    @PluginMethod
    public void cancel(PluginCall call) {
        String taskId = call.getString("taskId");
        if (taskId == null) { call.reject("taskId is required"); return; }
        String processId = taskProcesses.get(taskId);
        if (processId != null) {
            try { YoutubeDL.getInstance().destroyProcessById(processId); } catch (Exception e) { Log.w(TAG, "Failed to cancel process", e); }
        }
        call.resolve();
    }

    @PluginMethod
    public void getDownloaded(PluginCall call) {
        File[] files = getDownloadDirectory().listFiles();
        List<JSObject> songs = new ArrayList<>();
        if (files != null) for (File file : files) {
            if (!file.isFile()) continue;
            String name = file.getName();
            int dot = name.lastIndexOf('.');
            String id = dot > 0 ? name.substring(0, dot) : name;
            JSObject song = new JSObject();
            song.put("id", id);
            song.put("localPath", file.getAbsolutePath());
            song.put("downloadedAt", file.lastModified());
            song.put("size", file.length());
            songs.add(song);
        }
        JSObject result = new JSObject();
        result.put("songs", songs);
        call.resolve(result);
    }

    @PluginMethod
    public void getLocalPath(PluginCall call) {
        String videoId = call.getString("videoId");
        if (videoId == null) { call.reject("videoId is required"); return; }
        File file = findDownloadedFile(getDownloadDirectory(), videoId);
        JSObject result = new JSObject();
        result.put("localPath", file != null ? file.getAbsolutePath() : null);
        call.resolve(result);
    }

    @PluginMethod
    public void delete(PluginCall call) {
        String videoId = call.getString("videoId");
        if (videoId == null) { call.reject("videoId is required"); return; }
        File file = findDownloadedFile(getDownloadDirectory(), videoId);
        if (file != null && file.exists()) file.delete();
        call.resolve();
    }

    @PluginMethod
    public void getStorageUsage(PluginCall call) {
        long total = 0;
        File[] files = getDownloadDirectory().listFiles();
        if (files != null) for (File file : files) if (file.isFile()) total += file.length();
        JSObject result = new JSObject();
        result.put("bytes", total);
        call.resolve(result);
    }

    @Override
    protected void handleOnDestroy() {
        executor.shutdownNow();
        super.handleOnDestroy();
    }
}
