import { Capacitor, registerPlugin } from "@capacitor/core";
import { useEffect, useRef, useState } from "react";
import { useToast } from "./use-toast";

export interface OfflineSong {
  id: string;
  title: string;
  artist: string;
  thumbnail: string;
  duration: string;
  localPath: string;
  downloadedAt: number;
  size?: number;
}

interface NativeDownloader {
  download(options: { videoId: string; title?: string }): Promise<{ taskId: string }>;
  cancel(options: { taskId: string }): Promise<void>;
  getDownloaded(): Promise<{ songs: Array<{ id: string; localPath: string; downloadedAt: number; size: number }> }>;
  getLocalPath(options: { videoId: string }): Promise<{ localPath: string | null }>;
  delete(options: { videoId: string }): Promise<void>;
  getStorageUsage(): Promise<{ bytes: number }>;
  addListener(eventName: "downloadProgress", listener: (event: { taskId: string; videoId: string; progress: number; status?: string }) => void): Promise<{ remove: () => Promise<void> }>;
  addListener(eventName: "downloadComplete", listener: (event: { taskId: string; videoId: string; localPath: string; size: number }) => void): Promise<{ remove: () => Promise<void> }>;
  addListener(eventName: "downloadError", listener: (event: { taskId: string; videoId: string; message: string }) => void): Promise<{ remove: () => Promise<void> }>;
}

const YoutubeDownloader = registerPlugin<NativeDownloader>("YoutubeDownloader");
const META_KEY = "alhan_offline_song_metadata_v1";
type SongInput = Omit<OfflineSong, "localPath" | "downloadedAt" | "size">;

const readMetadata = (): Record<string, SongInput> => {
  try { return JSON.parse(localStorage.getItem(META_KEY) || "{}"); } catch { return {}; }
};
const writeMetadata = (metadata: Record<string, SongInput>) => localStorage.setItem(META_KEY, JSON.stringify(metadata));

export const useOfflineDownload = () => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const { toast } = useToast();
  const pending = useRef(new Map<string, { resolve: (song: OfflineSong) => void; reject: (error: Error) => void }>());

  useEffect(() => {
    if (Capacitor.getPlatform() !== "android") return;
    let active = true;
    const listeners: Array<{ remove: () => Promise<void> }> = [];
    (async () => {
      listeners.push(await YoutubeDownloader.addListener("downloadProgress", (event) => {
        if (active) { setDownloadProgress(Math.round(event.progress)); setIsDownloading(true); }
      }));
      listeners.push(await YoutubeDownloader.addListener("downloadComplete", (event) => {
        const request = pending.current.get(event.taskId);
        if (!request) return;
        pending.current.delete(event.taskId);
        setDownloadProgress(100);
        request.resolve({ id: event.videoId, title: "", artist: "", thumbnail: "", duration: "0:00", localPath: event.localPath, downloadedAt: Date.now(), size: event.size });
      }));
      listeners.push(await YoutubeDownloader.addListener("downloadError", (event) => {
        const request = pending.current.get(event.taskId);
        if (!request) return;
        pending.current.delete(event.taskId);
        request.reject(new Error(event.message || "Download failed"));
      }));
    })().catch((e) => console.error("Downloader listeners failed", e));
    return () => { active = false; listeners.forEach((l) => l.remove().catch(() => undefined)); };
  }, []);

  const downloadSong = async (song: SongInput): Promise<OfflineSong> => {
    setIsDownloading(true); setDownloadProgress(0);
    try {
      if (Capacitor.getPlatform() !== "android") throw new Error("Offline downloads are available in the Android app.");
      const existing = await YoutubeDownloader.getLocalPath({ videoId: song.id });
      if (existing.localPath) return { ...song, localPath: existing.localPath, downloadedAt: Date.now() };
      const { taskId } = await YoutubeDownloader.download({ videoId: song.id, title: song.title });
      const downloaded = await new Promise<OfflineSong>((resolve, reject) => pending.current.set(taskId, { resolve, reject }));
      const metadata = readMetadata(); metadata[song.id] = song; writeMetadata(metadata);
      toast({ title: "تم التحميل", description: `تم تحميل ${song.title} بنجاح` });
      return { ...song, ...downloaded };
    } catch (error) {
      console.error("Native offline download failed", error);
      toast({ title: "فشل التحميل", description: error instanceof Error ? error.message : "حدث خطأ أثناء التحميل", variant: "destructive" });
      throw error;
    } finally { setIsDownloading(false); }
  };

  const getDownloadedSongs = async (): Promise<OfflineSong[]> => {
    if (Capacitor.getPlatform() !== "android") return [];
    const { songs } = await YoutubeDownloader.getDownloaded();
    const metadata = readMetadata();
    return songs.map((song) => ({
      id: song.id, title: metadata[song.id]?.title || song.id, artist: metadata[song.id]?.artist || "YouTube",
      thumbnail: metadata[song.id]?.thumbnail || "", duration: metadata[song.id]?.duration || "0:00",
      localPath: song.localPath, downloadedAt: song.downloadedAt, size: song.size,
    }));
  };

  const isSongDownloaded = async (songId: string) => {
    if (Capacitor.getPlatform() !== "android") return false;
    const { localPath } = await YoutubeDownloader.getLocalPath({ videoId: songId }); return Boolean(localPath);
  };

  const getSong = async (songId: string): Promise<OfflineSong | null> => {
    if (Capacitor.getPlatform() !== "android") return null;
    const { localPath } = await YoutubeDownloader.getLocalPath({ videoId: songId }); if (!localPath) return null;
    const metadata = readMetadata()[songId];
    return { id: songId, title: metadata?.title || songId, artist: metadata?.artist || "YouTube", thumbnail: metadata?.thumbnail || "", duration: metadata?.duration || "0:00", localPath, downloadedAt: Date.now() };
  };

  const getAudioUrl = async (songId: string) => {
    const song = await getSong(songId); return song?.localPath ? Capacitor.convertFileSrc(song.localPath) : null;
  };

  const deleteSong = async (songId: string) => {
    if (Capacitor.getPlatform() !== "android") return;
    await YoutubeDownloader.delete({ videoId: songId });
    const metadata = readMetadata(); delete metadata[songId]; writeMetadata(metadata);
    toast({ title: "تم الحذف", description: "تم حذف الأغنية من التنزيلات" });
  };

  const getStorageUsage = async () => {
    if (Capacitor.getPlatform() !== "android") return 0;
    const { bytes } = await YoutubeDownloader.getStorageUsage(); return bytes;
  };

  return { downloadSong, getDownloadedSongs, deleteSong, isSongDownloaded, getSong, getAudioUrl, getStorageUsage, cancelDownload: (taskId: string) => YoutubeDownloader.cancel({ taskId }), isDownloading, downloadProgress };
};
