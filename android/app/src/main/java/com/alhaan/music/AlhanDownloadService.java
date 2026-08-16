package com.alhaan.music;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.os.Build;
import android.os.Environment;
import android.os.IBinder;
import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;
import java.io.BufferedInputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.net.HttpURLConnection;
import java.net.URL;

public class AlhanDownloadService extends Service {
    public static final String ACTION_PROGRESS = "com.alhaan.music.DOWNLOAD_PROGRESS";
    public static final String ACTION_COMPLETE = "com.alhaan.music.DOWNLOAD_COMPLETE";
    public static final String ACTION_ERROR = "com.alhaan.music.DOWNLOAD_ERROR";
    private static final String CHANNEL_ID = "alhan_downloads";

    @Override public void onCreate() { super.onCreate(); createChannel(); }

    @Override public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null) return START_NOT_STICKY;
        final String taskId = intent.getStringExtra("taskId");
        final String videoId = intent.getStringExtra("videoId");
        if (taskId == null || videoId == null) { stopSelf(startId); return START_NOT_STICKY; }
        final String title = intent.getStringExtra("title");
        startForeground(4101, notification(title == null ? "جاري تحميل الأغنية" : title, 0));
        new Thread(() -> download(startId, taskId, videoId, title)).start();
        return START_NOT_STICKY;
    }

    private void download(int startId, String taskId, String videoId, String title) {
        HttpURLConnection connection = null;
        try {
            String streamUrl = PipedStreamResolver.resolveAudio(videoId);
            File directory = new File(getExternalFilesDir(Environment.DIRECTORY_MUSIC), "Alhan");
            if (!directory.exists() && !directory.mkdirs()) throw new IllegalStateException("Cannot create Alhan music directory");
            File output = new File(directory, videoId + ".m4a");
            URL url = new URL(streamUrl);
            connection = (HttpURLConnection) url.openConnection();
            connection.setConnectTimeout(10000); connection.setReadTimeout(20000);
            connection.setRequestProperty("User-Agent", "Alhan/1.0 Android");
            int code = connection.getResponseCode();
            if (code < 200 || code >= 300) throw new IllegalStateException("Download HTTP " + code);
            long total = connection.getContentLengthLong(); long done = 0; int lastProgress = -1;
            try (BufferedInputStream input = new BufferedInputStream(connection.getInputStream()); FileOutputStream outputStream = new FileOutputStream(output)) {
                byte[] buffer = new byte[64 * 1024]; int read;
                while ((read = input.read(buffer)) != -1) {
                    outputStream.write(buffer, 0, read); done += read;
                    int progress = total > 0 ? (int)Math.max(0, Math.min(100, (done * 100) / total)) : Math.min(99, lastProgress + 1);
                    if (progress != lastProgress) { lastProgress = progress; publishProgress(taskId, videoId, progress, title); }
                }
            }
            if (!output.exists() || output.length() == 0) throw new IllegalStateException("Downloaded file is empty");
            Intent event = new Intent(ACTION_COMPLETE).setPackage(getPackageName()); event.putExtra("taskId", taskId); event.putExtra("videoId", videoId); event.putExtra("localPath", output.getAbsolutePath()); event.putExtra("size", output.length()); sendBroadcast(event);
            stopForeground(STOP_FOREGROUND_REMOVE); stopSelf(startId);
        } catch (Exception e) {
            Intent event = new Intent(ACTION_ERROR).setPackage(getPackageName()); event.putExtra("taskId", taskId); event.putExtra("videoId", videoId); event.putExtra("message", e.getMessage() == null ? "Download failed" : e.getMessage()); sendBroadcast(event);
            stopForeground(STOP_FOREGROUND_REMOVE); stopSelf(startId);
        } finally { if (connection != null) connection.disconnect(); }
    }

    private void publishProgress(String taskId, String videoId, int progress, String title) {
        NotificationManager manager = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        manager.notify(4101, notification(title == null ? "جاري تحميل الأغنية" : title, progress));
        Intent event = new Intent(ACTION_PROGRESS).setPackage(getPackageName()); event.putExtra("taskId", taskId); event.putExtra("videoId", videoId); event.putExtra("progress", progress); sendBroadcast(event);
    }

    private Notification notification(String title, int progress) {
        Intent open = new Intent(this, MainActivity.class);
        PendingIntent pi = PendingIntent.getActivity(this, 0, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        return new NotificationCompat.Builder(this, CHANNEL_ID).setSmallIcon(android.R.drawable.stat_sys_download).setContentTitle("Alhan").setContentText(title).setOngoing(progress < 100).setOnlyAlertOnce(true).setProgress(100, progress, false).setContentIntent(pi).build();
    }
    private void createChannel() { if (Build.VERSION.SDK_INT >= 26) { NotificationChannel channel = new NotificationChannel(CHANNEL_ID, "Downloads", NotificationManager.IMPORTANCE_LOW); ((NotificationManager)getSystemService(NOTIFICATION_SERVICE)).createNotificationChannel(channel); } }
    @Override public void onDestroy() { super.onDestroy(); }
    @Nullable @Override public IBinder onBind(Intent intent) { return null; }
}
