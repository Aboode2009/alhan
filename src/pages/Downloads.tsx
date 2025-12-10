import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { SongCard } from "@/components/SongCard";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Layout } from "@/components/Layout";
import { useOfflineDownload } from "@/hooks/useOfflineDownload";

interface Song {
  id: string;
  title: string;
  artist: string;
  thumbnail: string;
  duration: string;
}

const Downloads = () => {
  const [downloads, setDownloads] = useState<Song[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { getDownloadedSongs } = useOfflineDownload();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }
    setUser(user);
    loadDownloads(user.id);
  };

  const loadDownloads = async (userId: string) => {
    setIsLoading(true);
    try {
      // Load offline downloads from IndexedDB
      const offlineDownloads = await getDownloadedSongs();
      const offlineSongs: Song[] = offlineDownloads.map((download) => ({
        id: download.id,
        title: download.title,
        artist: download.artist,
        thumbnail: download.thumbnail,
        duration: download.duration,
      }));

      setDownloads(offlineSongs);
    } catch (error) {
      console.error("Error loading downloads:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تحميل التنزيلات",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlaySong = (song: Song) => {
    navigate(`/now-playing?song=${encodeURIComponent(JSON.stringify(song))}`);
  };

  return (
    <Layout>
      <Header searchQuery="" onSearchChange={() => {}} />

      <div className="container px-4 py-8 md:px-6">
        <div className="mb-8">
          <h2 className="text-4xl font-bold mb-2 text-foreground">
            التنزيلات
          </h2>
          <p className="text-muted-foreground text-lg">
            الأغاني المحملة للاستماع بدون إنترنت
          </p>
        </div>

        {isLoading ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground text-lg">جاري التحميل...</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
              {downloads.map((song) => (
                <SongCard
                  key={song.id}
                  song={song}
                  isPlaying={false}
                  onPlayPause={() => handlePlaySong(song)}
                />
              ))}
            </div>

            {downloads.length === 0 && (
              <div className="text-center py-20">
                <p className="text-muted-foreground text-lg">
                  لا توجد تنزيلات
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
};

export default Downloads;
