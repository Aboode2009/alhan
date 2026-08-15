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
    MediaPlayer.startService().catch(() => undefined);
    timer.current = window.setInterval(refresh, 500);
    return () => { if (timer.current) window.clearInterval(timer.current); };
  }, [isAndroid, refresh]);

  return {
    isAndroid,
    state,
    play: (options: Parameters<NativeMediaPlayer["play"]>[0]) => isAndroid ? MediaPlayer.play(options) : Promise.resolve(),
    pause: () => isAndroid ? MediaPlayer.pause() : Promise.resolve(),
    resume: () => isAndroid ? MediaPlayer.resume() : Promise.resolve(),
    stop: () => isAndroid ? MediaPlayer.stop() : Promise.resolve(),
    seek: (seconds: number) => isAndroid ? MediaPlayer.seek({ seconds }) : Promise.resolve(),
    setVolume: (volume: number) => isAndroid ? MediaPlayer.setVolume({ volume }) : Promise.resolve(),
    refresh,
  };
};
