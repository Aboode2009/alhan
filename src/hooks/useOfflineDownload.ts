import { useState } from "react";
import { useToast } from "./use-toast";

interface DownloadedSong {
  id: string;
  title: string;
  artist: string;
  thumbnail: string;
  duration: string;
  audioBlob: Blob;
  downloadedAt: number;
}

const DB_NAME = "AlhanDB";
const STORE_NAME = "downloads";
const DB_VERSION = 1;

export const useOfflineDownload = () => {
  const [isDownloading, setIsDownloading] = useState(false);
  const { toast } = useToast();

  const openDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "id" });
        }
      };
    });
  };

  const downloadSong = async (song: {
    id: string;
    title: string;
    artist: string;
    thumbnail: string;
    duration: string;
  }) => {
    setIsDownloading(true);
    try {
      const streamsRes = await fetch(`https://piped.video/api/v1/streams?video=${encodeURIComponent(song.id)}`);
      if (!streamsRes.ok) throw new Error("Failed to fetch streams");
      const streamsData = await streamsRes.json();
      type PipedAudioStream = { bitrate?: number; url: string };
      const audioStreams: PipedAudioStream[] = streamsData.audioStreams || [];
      const audio = audioStreams.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0];
      if (!audio || !audio.url) throw new Error("No audio stream available");
      const audioRes = await fetch(audio.url);
      if (!audioRes.ok) throw new Error("Failed to download audio");
      const blob = await audioRes.blob();
      const db = await openDB();
      const transaction = db.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);

      const downloadedSong: DownloadedSong = {
        ...song,
        audioBlob: blob,
        downloadedAt: Date.now(),
      };

      await store.put(downloadedSong);

      toast({
        title: "تم التحميل",
        description: `تم تحميل ${song.title} بنجاح`,
      });
    } catch (error) {
      console.error("Download error:", error);
      toast({
        title: "فشل التحميل",
        description: "حدث خطأ أثناء تحميل الأغنية",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const getDownloadedSongs = async (): Promise<DownloadedSong[]> => {
    try {
      const db = await openDB();
      const transaction = db.transaction([STORE_NAME], "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error("Error fetching downloads:", error);
      return [];
    }
  };

  const deleteSong = async (songId: string) => {
    try {
      const db = await openDB();
      const transaction = db.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      await store.delete(songId);

      toast({
        title: "تم الحذف",
        description: "تم حذف الأغنية من التنزيلات",
      });
    } catch (error) {
      console.error("Delete error:", error);
      toast({
        title: "فشل الحذف",
        description: "حدث خطأ أثناء حذف الأغنية",
        variant: "destructive",
      });
    }
  };

  const isSongDownloaded = async (songId: string): Promise<boolean> => {
    try {
      const db = await openDB();
      const transaction = db.transaction([STORE_NAME], "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(songId);

      return new Promise((resolve) => {
        request.onsuccess = () => resolve(!!request.result);
        request.onerror = () => resolve(false);
      });
    } catch (error) {
      return false;
    }
  };

  const getSong = async (songId: string): Promise<DownloadedSong | null> => {
    try {
      const db = await openDB();
      const transaction = db.transaction([STORE_NAME], "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(songId);
      return new Promise((resolve) => {
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  };

  const getAudioUrl = async (songId: string): Promise<string | null> => {
    const item = await getSong(songId);
    if (!item) return null;
    try {
      const url = URL.createObjectURL(item.audioBlob);
      return url;
    } catch {
      return null;
    }
  };

  return {
    downloadSong,
    getDownloadedSongs,
    deleteSong,
    isSongDownloaded,
    getSong,
    getAudioUrl,
    isDownloading,
  };
};
