import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ChevronDown, Heart, Download, Play, Pause, SkipBack, SkipForward, Volume2, ListMusic, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useOfflineDownload } from "@/hooks/useOfflineDownload";
import { useNativeMediaPlayer } from "@/hooks/useNativeMediaPlayer";
import { addTick, recordPlay } from "@/lib/stats";
import { Capacitor } from "@capacitor/core";
import { YouTubePlayer } from "@/components/YouTubePlayer";

interface Song { id: string; title: string; artist: string; thumbnail: string; duration: string; }

const NowPlaying = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(70);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const native = useNativeMediaPlayer();
  const { downloadSong, isSongDownloaded, getSong, isDownloading, downloadProgress } = useOfflineDownload();
  const isAndroid = Capacitor.getPlatform() === "android";

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
    const songData = searchParams.get("song");
    if (!songData) { navigate("/"); return; }
    try {
      const song = JSON.parse(decodeURIComponent(songData));
      setCurrentSong(song); checkFavoriteStatus(song.id); checkDownloadStatus(song.id);
    } catch { navigate("/"); }
  }, [searchParams, navigate]);

  const checkFavoriteStatus = async (songId: string) => {
    const { data: { user } } = await supabase.auth.getUser(); if (!user) return;
    const { data } = await supabase.from("favorites").select("id").eq("user_id", user.id).eq("song_id", songId).single();
    setIsFavorite(!!data);
  };
  const checkDownloadStatus = async (songId: string) => setIsDownloaded(await isSongDownloaded(songId));

  useEffect(() => {
    if (!currentSong || !isAndroid) return;
    (async () => {
      try {
        const local = await getSong(currentSong.id);
        await native.play({ videoId: local ? undefined : currentSong.id, localPath: local?.localPath, title: currentSong.title, artist: currentSong.artist, artwork: currentSong.thumbnail });
      } catch (e) {
        console.error(e); setIsPlaying(false);
        toast({ title: "تعذر تشغيل الأغنية", description: "تعذر الوصول إلى مصدر الصوت.", variant: "destructive" });
      }
    })();
  }, [currentSong?.id, isAndroid]);

  useEffect(() => {
    if (!currentSong || isAndroid) return;
    // Web keeps the existing YouTube player below.
  }, [currentSong, isAndroid]);

  useEffect(() => {
    if (!isAndroid) return;
    if (isPlaying) native.resume().catch(() => undefined); else native.pause().catch(() => undefined);
  }, [isPlaying, isAndroid]);

  useEffect(() => {
    if (!isAndroid || native.state.duration <= 0) return;
    setProgress((native.state.position / native.state.duration) * 100);
  }, [native.state.position, native.state.duration, isAndroid]);

  useEffect(() => { native.setVolume(volume / 100).catch(() => undefined); }, [volume]);
  useEffect(() => {
    if (!currentSong || !isPlaying) return;
    const interval = window.setInterval(() => addTick({ id: currentSong.id, title: currentSong.title, artist: currentSong.artist }, 1), 1000);
    return () => window.clearInterval(interval);
  }, [isPlaying, currentSong]);
  useEffect(() => { if (currentSong && isPlaying) recordPlay({ id: currentSong.id, title: currentSong.title, artist: currentSong.artist }); }, [isPlaying, currentSong?.id]);

  const toggleFavorite = async () => {
    if (!user) { toast({ title: "تسجيل الدخول مطلوب", description: "يجب تسجيل الدخول لإضافة الأغاني للمفضلة", variant: "destructive" }); return; }
    if (!currentSong) return;
    if (isFavorite) {
      const { error } = await supabase.from("favorites").delete().eq("user_id", user.id).eq("song_id", currentSong.id);
      if (!error) setIsFavorite(false);
    } else {
      const { error } = await supabase.from("favorites").insert({ user_id: user.id, song_id: currentSong.id, song_title: currentSong.title, song_artist: currentSong.artist, song_thumbnail: currentSong.thumbnail, song_duration: currentSong.duration });
      if (!error) setIsFavorite(true);
    }
  };

  const handleDownload = async () => {
    if (!user) { toast({ title: "تسجيل الدخول مطلوب", description: "يجب تسجيل الدخول لتحميل الأغاني", variant: "destructive" }); return; }
    if (!currentSong || isDownloaded) return;
    try {
      await downloadSong(currentSong); setIsDownloaded(true);
      await supabase.from("downloads").upsert({ user_id: user.id, song_id: currentSong.id, song_title: currentSong.title, song_artist: currentSong.artist, song_thumbnail: currentSong.thumbnail, song_duration: currentSong.duration }, { onConflict: "user_id,song_id" });
    } catch {}
  };

  if (!currentSong) return <div className="min-h-screen bg-background flex items-center justify-center"><p className="text-muted-foreground">جاري التحميل...</p></div>;
  return (
    <div className="min-h-screen bg-background flex flex-col" dir="rtl">
      <div className="flex items-center justify-between p-4 sm:p-6 bg-background/95 backdrop-blur sticky top-0 z-20">
        <Button variant="ghost" size="icon" onClick={() => navigate("/")}><ChevronDown className="h-6 w-6" /></Button>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">الآن يتم التشغيل</h2>
        <Button variant="ghost" size="icon"><ListMusic className="h-5 w-5" /></Button>
      </div>
      <div className="flex-1 flex items-center justify-center p-5 sm:p-8 md:p-12 pb-4">
        <div className="relative w-full max-w-[min(78vw,620px)] aspect-square rounded-2xl overflow-hidden shadow-card">
          <img src={currentSong.thumbnail} alt={currentSong.title} className="w-full h-full object-cover" />
        </div>
      </div>
      <div className="bg-background/95 backdrop-blur pb-5 sm:pb-8 max-w-3xl w-full mx-auto">
        <div className="px-5 sm:px-8 py-3"><h1 className="text-xl sm:text-2xl font-bold mb-1 text-foreground truncate">{currentSong.title}</h1><p className="text-muted-foreground truncate">{currentSong.artist}</p></div>
        <div className="px-5 sm:px-8 py-2"><Slider value={[progress]} onValueChange={(value) => { const pct = value[0]; setProgress(pct); if (isAndroid && native.state.duration > 0) native.seek((pct / 100) * native.state.duration / 1000); }} max={100} step={1} /></div>
        <div className="flex items-center justify-center gap-7 sm:gap-10 px-5 py-5">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}><SkipBack className="h-5 w-5" /></Button>
          <Button variant="default" size="icon" onClick={() => setIsPlaying(!isPlaying)} className="h-14 w-14 rounded-full bg-primary hover:bg-primary/90">{isPlaying ? <Pause className="h-6 w-6 text-black" fill="currentColor" /> : <Play className="h-6 w-6 text-black" fill="currentColor" />}</Button>
          <Button variant="ghost" size="icon" onClick={() => setIsPlaying(true)}><SkipForward className="h-5 w-5" /></Button>
        </div>
        <div className="flex items-center justify-between px-5 sm:px-8 py-2">
          <Button variant="ghost" size="icon" onClick={toggleFavorite} className={isFavorite ? "text-primary" : "text-muted-foreground"}><Heart className={`h-6 w-6 ${isFavorite ? "fill-current" : ""}`} /></Button>
          <div className="flex items-center gap-2"><Volume2 className="h-5 w-5 text-muted-foreground" /><Slider value={[volume]} onValueChange={(v) => setVolume(v[0])} max={100} step={1} className="w-20 sm:w-28" /></div>
          <Button variant="ghost" size="icon" onClick={handleDownload} disabled={isDownloading || isDownloaded} className={isDownloaded ? "text-primary" : "text-muted-foreground"}>{isDownloaded ? <Check className="h-6 w-6" /> : <Download className="h-6 w-6" />}</Button>
        </div>
        {isDownloading && <div className="mx-5 sm:mx-8 mt-2 h-1 bg-muted rounded-full overflow-hidden"><div className="h-full bg-primary" style={{ width: `${downloadProgress}%` }} /></div>}
      </div>
      {!isAndroid && <div className="hidden"><YouTubePlayer videoId={currentSong.id} isPlaying={isPlaying} onEnded={() => setIsPlaying(false)} volume={volume} onProgress={setProgress} autoPlay={true} /></div>}
    </div>
  );
};

export default NowPlaying;
