import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { SongCard } from "@/components/SongCard";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Layout } from "@/components/Layout";

interface Song {
  id: string;
  title: string;
  artist: string;
  thumbnail: string;
  duration: string;
}

const Favorites = () => {
  const [favorites, setFavorites] = useState<Song[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

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
    loadFavorites(user.id);
  };

  const loadFavorites = async (userId: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("favorites")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const songs: Song[] = data.map((fav) => ({
        id: fav.song_id,
        title: fav.song_title,
        artist: fav.song_artist,
        thumbnail: fav.song_thumbnail,
        duration: fav.song_duration,
      }));

      setFavorites(songs);
    } catch (error) {
      console.error("Error loading favorites:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تحميل المفضلة",
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
            المفضلة
          </h2>
          <p className="text-muted-foreground text-lg">
            أغانيك المفضلة في مكان واحد
          </p>
        </div>

        {isLoading ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground text-lg">جاري التحميل...</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
              {favorites.map((song) => (
                <SongCard
                  key={song.id}
                  song={song}
                  isPlaying={false}
                  onPlayPause={() => handlePlaySong(song)}
                />
              ))}
            </div>

            {favorites.length === 0 && (
              <div className="text-center py-20">
                <p className="text-muted-foreground text-lg">
                  لا توجد أغاني في المفضلة
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
};

export default Favorites;
