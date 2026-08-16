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
import com.yausername.youtubedl_android.YoutubeDL;
import com.yausername.youtubedl_android.YoutubeDLRequest;
import java.io.File;

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
        new Thread(() -> {
            try {
                File directory = new File(getExternalFilesDir(Environment.DIRECTORY_MUSIC), "Alhan");
                if (!directory.exists()) directory.mkdirs();
                YoutubeDLRequest request = new YoutubeDLRequest("https://www.youtube.com/watch?v=" + videoId);
                request.addOption("--no-playlist"); request.addOption("--no-mtime"); request.addOption("-x"); request.addOption("--audio-format", "m4a"); request.addOption("--audio-quality", "0");
                request.addOption("-o", new File(directory, "%(id)s.%(ext)s").getAbsolutePath());
                YoutubeDL.getInstance().execute(request, "alhan-" + taskId, (progress, eta, line) -> {
                    int p = progress == null ? 0 : Math.max(0, Math.min(100, Math.round(progress)));
                    NotificationManager manager = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
                    manager.notify(4101, notification(title == null ? "جاري التحميل" : title, p));
                    Intent event = new Intent(ACTION_PROGRESS).setPackage(getPackageName()); event.putExtra("taskId", taskId); event.putExtra("videoId", videoId); event.putExtra("progress", p); sendBroadcast(event);
                    return kotlin.Unit.INSTANCE;
                });
                File output = null; File[] files = directory.listFiles();
                if (files != null) for (File f : files) if (f.isFile() && f.getName().startsWith(videoId + ".")) { output = f; break; }
                if (output == null) throw new IllegalStateException("Downloaded file was not found");
                Intent event = new Intent(ACTION_COMPLETE).setPackage(getPackageName()); event.putExtra("taskId", taskId); event.putExtra("videoId", videoId); event.putExtra("localPath", output.getAbsolutePath()); event.putExtra("size", output.length()); sendBroadcast(event);
                stopForeground(STOP_FOREGROUND_REMOVE); stopSelf(startId);
            } catch (Exception e) {
                Intent event = new Intent(ACTION_ERROR).setPackage(getPackageName()); event.putExtra("taskId", taskId); event.putExtra("videoId", videoId); event.putExtra("message", e.getMessage() == null ? "Download failed" : e.getMessage()); sendBroadcast(event);
                stopForeground(STOP_FOREGROUND_REMOVE); stopSelf(startId);
            }
        }).start();
        return START_STICKY;
    }

    private Notification notification(String title, int progress) {
        Intent open = new Intent(this, MainActivity.class);
        PendingIntent pi = PendingIntent.getActivity(this, 0, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        return new NotificationCompat.Builder(this, CHANNEL_ID).setSmallIcon(android.R.drawable.stat_sys_download).setContentTitle("ألحان").setContentText(title).setOngoing(progress < 100).setOnlyAlertOnce(true).setProgress(100, progress, false).setContentIntent(pi).build();
    }
    private void createChannel() { if (Build.VERSION.SDK_INT >= 26) { NotificationChannel channel = new NotificationChannel(CHANNEL_ID, "Downloads", NotificationManager.IMPORTANCE_LOW); ((NotificationManager)getSystemService(NOTIFICATION_SERVICE)).createNotificationChannel(channel); } }
    @Override public void onDestroy() { super.onDestroy(); }
    @Nullable @Override public IBinder onBind(Intent intent) { return null; }
}
