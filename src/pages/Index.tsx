import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { SongCard } from "@/components/SongCard";
import { Player } from "@/components/Player";
import { YouTubePlayer } from "@/components/YouTubePlayer";
import { useToast } from "@/hooks/use-toast";
import { Layout } from "@/components/Layout";
import { addTick, recordPlay, getStats, getTop, getTopSearchQueries, recordSearch } from "@/lib/stats";
import { Capacitor, registerPlugin } from "@capacitor/core";
import { useNativeMediaPlayer } from "@/hooks/useNativeMediaPlayer";
import { useOfflineDownload } from "@/hooks/useOfflineDownload";
import { supabase } from "@/integrations/supabase/client";

interface Song { id: string; title: string; artist: string; thumbnail: string; duration: string; }
interface NativeSearch { search(options: { query: string }): Promise<{ songs: Song[] }>; }
const NativeSearch = registerPlugin<NativeSearch>("YoutubeSearch");
const QUEUE_KEY = "alhan_queue_v1";

const Index = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [songs, setSongs] = useState<Song[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(70);
  const { toast } = useToast();
  const native = useNativeMediaPlayer();
  const { getSong } = useOfflineDownload();
  const isAndroid = Capacitor.getPlatform() === "android";

  const fetchSongsByQuery = async (query: string): Promise<Song[]> => {
    if (isAndroid) {
      const result = await NativeSearch.search({ query });
      return result.songs || [];
    }
    const { data, error } = await supabase.functions.invoke("youtube-search", { body: { query } });
    if (error) throw new Error(error.message);
    return (data?.songs || []) as Song[];
  };

  const searchYouTube = async (query: string) => {
    if (!query.trim()) { setSongs([]); return; }
    setIsSearching(true);
    try {
      const results = await fetchSongsByQuery(query);
      setSongs(results); recordSearch(query);
    } catch (e) {
      console.error("Alhan search error", e);
      toast({ title: "البحث غير متاح", description: "تعذر الوصول إلى خدمة البحث. حاول مرة أخرى بعد لحظات.", variant: "destructive" });
      setSongs([]);
    } finally { setIsSearching(false); }
  };

  useEffect(() => { searchYouTube("أغاني عربية"); }, []);
  useEffect(() => { const debounce = setTimeout(() => { if (searchQuery.trim()) searchYouTube(searchQuery); }, 500); return () => clearTimeout(debounce); }, [searchQuery]);

  const handlePlayPause = async (song: Song) => {
    try {
      if (!currentSong || currentSong.id !== song.id) {
        localStorage.setItem(QUEUE_KEY, JSON.stringify(songs.length ? songs : [song]));
        setCurrentSong(song); setIsPlaying(true); setProgress(0);
        recordPlay({ id: song.id, title: song.title, artist: song.artist });
        if (isAndroid) {
          const downloaded = await getSong(song.id);
          await native.play({ videoId: downloaded ? undefined : song.id, localPath: downloaded?.localPath, title: song.title, artist: song.artist, artwork: song.thumbnail });
        }
      } else {
        const next = !isPlaying; setIsPlaying(next);
        if (next) { recordPlay({ id: song.id, title: song.title, artist: song.artist }); await native.resume(); }
        else await native.pause();
      }
    } catch (e) {
      console.error("Alhan playback error", e);
      setIsPlaying(false);
      toast({ title: "تعذر تشغيل الأغنية", description: "مصدر الصوت غير متاح حالياً. جرّب أغنية أخرى أو أعد المحاولة.", variant: "destructive" });
    }
  };

  const handleNext = async () => { if (!currentSong || songs.length === 0) return; const i = songs.findIndex((s) => s.id === currentSong.id); await handlePlayPause(songs[(i + 1) % songs.length]); };
  const handlePrevious = async () => { if (!currentSong || songs.length === 0) return; const i = songs.findIndex((s) => s.id === currentSong.id); await handlePlayPause(songs[(i - 1 + songs.length) % songs.length]); };
  useEffect(() => { if (!isAndroid || native.state.duration <= 0) return; setProgress((native.state.position / native.state.duration) * 100); }, [native.state.position, native.state.duration, isAndroid]);
  useEffect(() => { native.setVolume(volume / 100).catch(() => undefined); }, [volume]);
  useEffect(() => { let interval: number | undefined; if (isPlaying && currentSong) interval = window.setInterval(() => addTick({ id: currentSong.id, title: currentSong.title, artist: currentSong.artist }, 1), 1000); return () => { if (interval) window.clearInterval(interval); }; }, [isPlaying, currentSong]);

  const [suggestions, setSuggestions] = useState<Song[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  useEffect(() => {
    const loadRecommendations = async () => {
      setLoadingSuggestions(true);
      try {
        const s = getStats(); const seeds: string[] = [];
        seeds.push(...getTopSearchQueries(3)); seeds.push(...getTop(s.playCountsArtist, 2).map(([name]) => name)); seeds.push(...getTop(s.playCountsSong, 2).map(([id]) => s.songTitles[id]).filter((t): t is string => !!t));
        const queries = Array.from(new Set(seeds)).slice(0, 3);
        if (!queries.length) { setSuggestions([]); return; }
        const results: Song[] = [];
        for (const q of queries) results.push(...await fetchSongsByQuery(q));
        const dedup = new Map<string, Song>(); results.forEach((song) => { if (!dedup.has(song.id)) dedup.set(song.id, song); }); setSuggestions(Array.from(dedup.values()).slice(0, 20));
      } catch { setSuggestions([]); } finally { setLoadingSuggestions(false); }
    };
    loadRecommendations();
  }, [isAndroid]);

  return <Layout><Header searchQuery={searchQuery} onSearchChange={setSearchQuery} /><div className="container px-4 py-8 md:px-6 pb-32"><div className="mb-8"><h2 className="text-3xl font-bold mb-2 text-foreground">اقتراحات لك</h2>{loadingSuggestions ? <div className="text-muted-foreground">جاري التحضير...</div> : <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">{suggestions.map((song) => <SongCard key={song.id} song={song} isPlaying={isPlaying && currentSong?.id === song.id} onPlayPause={() => handlePlayPause(song)} />)}</div>}</div><div className="mb-8"><h2 className="text-4xl font-bold mb-2 text-foreground">اكتشف الموسيقى</h2><p className="text-muted-foreground text-lg">ابحث عن أغانيك المفضلة واستمع إليها</p></div>{isSearching ? <div className="text-center py-20"><p className="text-muted-foreground text-lg">جاري البحث...</p></div> : <><div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">{songs.map((song) => <SongCard key={song.id} song={song} isPlaying={isPlaying && currentSong?.id === song.id} onPlayPause={() => handlePlayPause(song)} />)}</div>{songs.length === 0 && !isSearching && <div className="text-center py-20"><p className="text-muted-foreground text-lg">{searchQuery ? `لا توجد نتائج للبحث "${searchQuery}"` : "ابحث عن أغنية"}</p></div>}</>}</div>{currentSong && <><Player currentSong={currentSong} isPlaying={isPlaying} onPlayPause={() => handlePlayPause(currentSong)} onNext={handleNext} onPrevious={handlePrevious} progress={progress} volume={volume} onProgressChange={(value) => { const pct = value[0]; setProgress(pct); if (isAndroid && native.state.duration > 0) native.seek((pct / 100) * (native.state.duration / 1000)).catch(() => undefined); }} onVolumeChange={(value) => setVolume(value[0])} />{!isAndroid && <YouTubePlayer videoId={currentSong.id} isPlaying={isPlaying} onEnded={handleNext} volume={volume} onProgress={setProgress} autoPlay={true} />}</>}</Layout>;
};
export default Index;
