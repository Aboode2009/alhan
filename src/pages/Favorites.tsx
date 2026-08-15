import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { SongCard } from "@/components/SongCard";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Layout } from "@/components/Layout";
import { useOfflineDownload } from "@/hooks/useOfflineDownload";
import { Download, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Song { id: string; title: string; artist: string; thumbnail: string; duration: string; }

const Favorites = () => {
  const [favorites, setFavorites] = useState<Song[]>([]); const [isLoading, setIsLoading] = useState(true); const [isDownloadingAll, setIsDownloadingAll] = useState(false); const [downloadedCount, setDownloadedCount] = useState(0);
  const navigate = useNavigate(); const { toast } = useToast(); const { downloadSong, isSongDownloaded } = useOfflineDownload();
  useEffect(() => { checkAuth(); }, []);
  const checkAuth = async () => { const { data: { user } } = await supabase.auth.getUser(); if (!user) { navigate("/auth"); return; } loadFavorites(user.id); };
  const loadFavorites = async (userId: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.from("favorites").select("*").eq("user_id", userId).order("created_at", { ascending: false }); if (error) throw error;
      setFavorites(data.map((fav) => ({ id: fav.song_id, title: fav.song_title, artist: fav.song_artist, thumbnail: fav.song_thumbnail, duration: fav.song_duration })));
    } catch (error) { console.error(error); toast({ title: "خطأ", description: "حدث خطأ أثناء تحميل المفضلة", variant: "destructive" }); } finally { setIsLoading(false); }
  };
  const handlePlaySong = (song: Song) => {
    localStorage.setItem("alhan_queue_v1", JSON.stringify(favorites));
    navigate(`/now-playing?song=${encodeURIComponent(JSON.stringify(song))}`);
  };
  const downloadAll = async () => {
    if (!favorites.length || isDownloadingAll) return;
    setIsDownloadingAll(true); setDownloadedCount(0);
    try {
      for (const song of favorites) {
        if (!(await isSongDownloaded(song.id))) { await downloadSong(song); }
        setDownloadedCount((n) => n + 1);
      }
      toast({ title: "اكتمل التنزيل", description: `تم تنزيل ${favorites.length} أغنية إلى هذا الجهاز` });
    } catch (e) { toast({ title: "توقف التنزيل", description: e instanceof Error ? e.message : "حدث خطأ أثناء التنزيل", variant: "destructive" }); }
    finally { setIsDownloadingAll(false); }
  };
  return (
    <Layout>
      <Header searchQuery="" onSearchChange={() => {}} />
      <div className="container px-4 py-8 md:px-6 pb-32">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div><h2 className="text-4xl font-bold mb-2 text-foreground">المفضلة</h2><p className="text-muted-foreground text-lg">أغانيك المفضلة في مكان واحد</p></div>
          {favorites.length > 0 && <Button onClick={downloadAll} disabled={isDownloadingAll} className="gap-2">{isDownloadingAll ? <><Download className="h-4 w-4 animate-pulse" /> {downloadedCount}/{favorites.length}</> : <><Download className="h-4 w-4" /> تنزيل الكل</>}</Button>}
        </div>
        {isLoading ? <div className="text-center py-20"><p className="text-muted-foreground text-lg">جاري التحميل...</p></div> : <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">{favorites.map((song) => <SongCard key={song.id} song={song} isPlaying={false} onPlayPause={() => handlePlaySong(song)} />)}</div>
          {favorites.length === 0 && <div className="text-center py-20"><p className="text-muted-foreground text-lg">لا توجد أغاني في المفضلة</p></div>}
        </>}
      </div>
    </Layout>
  );
};
export default Favorites;
