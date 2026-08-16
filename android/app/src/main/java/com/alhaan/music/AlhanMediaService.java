package com.alhaan.music;

import android.app.PendingIntent;
import android.content.Intent;
import android.net.Uri;
import androidx.annotation.Nullable;
import androidx.media3.common.AudioAttributes;
import androidx.media3.common.C;
import androidx.media3.common.MediaItem;
import androidx.media3.common.MediaMetadata;
import androidx.media3.exoplayer.ExoPlayer;
import androidx.media3.session.MediaSession;
import androidx.media3.session.MediaSessionService;

public class AlhanMediaService extends MediaSessionService {
    public static final String ACTION_PLAY  = "com.alhaan.music.PLAY";
    public static final String EXTRA_URI    = "uri";
    public static final String EXTRA_TITLE  = "title";
    public static final String EXTRA_ARTIST = "artist";
    public static final String EXTRA_ARTWORK = "artwork";

    private static volatile AlhanMediaService instance;
    private ExoPlayer player;
    private MediaSession mediaSession;

    @Override
    public void onCreate() {
        super.onCreate();
        instance = this;

        AudioAttributes audioAttributes = new AudioAttributes.Builder()
                .setUsage(C.USAGE_MEDIA)
                .setContentType(C.AUDIO_CONTENT_TYPE_MUSIC)
                .build();

        player = new ExoPlayer.Builder(this).build();
        player.setAudioAttributes(audioAttributes, /* handleAudioFocus= */ true);
        player.setHandleAudioBecomingNoisy(true);

        Intent activityIntent = new Intent(this, MainActivity.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(
                this, 0, activityIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        // Build the MediaSession so the OS shows lock-screen / notification controls
        mediaSession = new MediaSession.Builder(this, player)
                .setSessionActivity(pendingIntent)
                .setCallback(new MediaSession.Callback() {
                    // Default implementation accepts all system controllers
                    // (lock screen, Bluetooth headset, Android Auto, etc.)
                })
                .build();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        super.onStartCommand(intent, flags, startId);
        if (intent != null && ACTION_PLAY.equals(intent.getAction())) {
            String uri = intent.getStringExtra(EXTRA_URI);
            if (uri != null && !uri.isEmpty()) {
                playUri(Uri.parse(uri),
                        intent.getStringExtra(EXTRA_TITLE),
                        intent.getStringExtra(EXTRA_ARTIST),
                        intent.getStringExtra(EXTRA_ARTWORK));
            }
        }
        return START_STICKY;
    }

    private void playUri(Uri uri, String title, String artist, String artwork) {
        MediaMetadata.Builder meta = new MediaMetadata.Builder()
                .setTitle(title  != null ? title  : "Alhan")
                .setArtist(artist != null ? artist : "")
                .setAlbumTitle("ألحان");
        if (artwork != null && !artwork.isEmpty()) meta.setArtworkUri(Uri.parse(artwork));

        MediaItem item = new MediaItem.Builder()
                .setUri(uri)
                .setMediaMetadata(meta.build())
                .build();
        player.setMediaItem(item);
        player.prepare();
        player.play();
    }

    // ── Static helpers called from MediaPlayerPlugin ─────────────────────────
    public static synchronized void pause()  { if (instance != null && instance.player != null) instance.player.pause(); }
    public static synchronized void resume() { if (instance != null && instance.player != null) instance.player.play(); }
    public static synchronized void stop() {
        if (instance != null && instance.player != null) {
            instance.player.stop();
            instance.player.clearMediaItems();
        }
    }
    public static synchronized void seek(long positionMs) {
        if (instance != null && instance.player != null) instance.player.seekTo(positionMs);
    }
    public static synchronized void setVolume(float volume) {
        if (instance != null && instance.player != null) instance.player.setVolume(volume);
    }
    public static synchronized long getPosition() {
        return (instance != null && instance.player != null) ? instance.player.getCurrentPosition() : 0;
    }
    public static synchronized long getDuration() {
        if (instance == null || instance.player == null) return 0;
        long d = instance.player.getDuration();
        return (d == C.TIME_UNSET) ? 0 : Math.max(0, d);
    }
    public static synchronized boolean isPlaying() {
        return instance != null && instance.player != null && instance.player.isPlaying();
    }

    @Nullable @Override
    public MediaSession onGetSession(MediaSession.ControllerInfo controllerInfo) { return mediaSession; }

    /** Keep running while audio plays even if the user swipes the app away. */
    @Override
    public void onTaskRemoved(Intent rootIntent) {
        if (player != null && player.isPlaying()) return;
        stopSelf();
    }

    @Override
    public void onDestroy() {
        instance = null;
        if (mediaSession != null) mediaSession.release();
        if (player != null) player.release();
        mediaSession = null;
        player = null;
        super.onDestroy();
    }
}