import { Capacitor, registerPlugin } from "@capacitor/core";
import { useCallback, useEffect, useRef, useState } from "react";

interface NativeMediaPlayer {
  startService(): Promise<void>;
  play(options: { videoId?: string; localPath?: string; title: string; artist: string; artwork?: string }): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  stop(): Promise<void>;
  seek(options: { seconds: number }): Promise<void>;
  setVolume(options: { volume: number }): Promise<void>;
  getState(): Promise<{ isPlaying: boolean; position: number; duration: number }>;
}

const MediaPlayer = registerPlugin<NativeMediaPlayer>("MediaPlayer");

export const useNativeMediaPlayer = () => {
  const isAndroid = Capacitor.getPlatform() === "android";
  const [state, setState] = useState({ isPlaying: false, position: 0, duration: 0 });
  const timer = useRef<number | null>(null);

  const refresh = useCallback(async () => {
    if (!isAndroid) return;
    try { setState(await MediaPlayer.getState()); } catch {}
  }, [isAndroid]);

  useEffect(() => {
    if (!isAndroid) return;
    // IMPORTANT: do not start the MediaSession foreground service during app boot.
    // On some Android/Huawei builds, creating a media foreground service before
    // playback is requested can terminate the Activity immediately. The service
    // is started lazily by play() below, only when the user actually plays music.
    timer.current = window.setInterval(refresh, 500);
    return () => { if (timer.current) window.clearInterval(timer.current); };
  }, [isAndroid, refresh]);

  const play = async (options: Parameters<NativeMediaPlayer["play"]>[0]) => {
    if (!isAndroid) return;
    await MediaPlayer.startService();
    await MediaPlayer.play(options);
    await refresh();
  };

  return {
    isAndroid,
    state,
    play,
    pause: () => isAndroid ? MediaPlayer.pause() : Promise.resolve(),
    resume: () => isAndroid ? MediaPlayer.resume() : Promise.resolve(),
    stop: () => isAndroid ? MediaPlayer.stop() : Promise.resolve(),
    seek: (seconds: number) => isAndroid ? MediaPlayer.seek({ seconds }) : Promise.resolve(),
    setVolume: (volume: number) => isAndroid ? MediaPlayer.setVolume({ volume }) : Promise.resolve(),
    refresh,
  };
};
