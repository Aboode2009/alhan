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
    private static AlhanMediaService instance;
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
        player.setAudioAttributes(audioAttributes, true);
        player.setHandleAudioBecomingNoisy(true);
        Intent intent = new Intent(this, MainActivity.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(
                this, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        mediaSession = new MediaSession.Builder(this, player)
                .setSessionActivity(pendingIntent)
                .build();
    }

    public static synchronized void play(Uri uri, String title, String artist, String artwork) {
        if (instance == null || instance.player == null) return;
        MediaMetadata.Builder metadata = new MediaMetadata.Builder()
                .setTitle(title == null ? "Alhan" : title)
                .setArtist(artist == null ? "" : artist)
                .setAlbumTitle("ألحان");
        if (artwork != null && !artwork.isEmpty()) metadata.setArtworkUri(Uri.parse(artwork));
        MediaItem item = new MediaItem.Builder()
                .setUri(uri)
                .setMediaMetadata(metadata.build())
                .build();
        instance.player.setMediaItem(item);
        instance.player.prepare();
        instance.player.play();
    }

    public static synchronized void pause() {
        if (instance != null && instance.player != null) instance.player.pause();
    }

    public static synchronized void resume() {
        if (instance != null && instance.player != null) instance.player.play();
    }

    public static synchronized void stop() {
        if (instance != null && instance.player != null) instance.player.stop();
    }

    public static synchronized void seek(long positionMs) {
        if (instance != null && instance.player != null) instance.player.seekTo(positionMs);
    }

    public static synchronized void setVolume(float volume) {
        if (instance != null && instance.player != null) instance.player.setVolume(volume);
    }

    public static synchronized long getPosition() {
        return instance != null && instance.player != null ? instance.player.getCurrentPosition() : 0;
    }

    public static synchronized long getDuration() {
        return instance != null && instance.player != null ? instance.player.getDuration() : 0;
    }

    public static synchronized boolean isPlaying() {
        return instance != null && instance.player != null && instance.player.isPlaying();
    }

    @Nullable
    @Override
    public MediaSession onGetSession(MediaSession.ControllerInfo controllerInfo) {
        return mediaSession;
    }

    @Override
    public void onTaskRemoved(Intent rootIntent) {
        if (player != null && player.isPlaying()) {
            // Keep the foreground media service alive for background playback.
            return;
        }
        stopSelf();
    }

    @Override
    public void onDestroy() {
        instance = null;
        if (mediaSession != null) mediaSession.release();
        if (player != null) player.release();
        player = null;
        super.onDestroy();
    }
}
