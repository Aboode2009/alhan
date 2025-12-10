import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { SongCard } from "@/components/SongCard";
import { Player } from "@/components/Player";
import { YouTubePlayer } from "@/components/YouTubePlayer";
import { useToast } from "@/hooks/use-toast";
import { Layout } from "@/components/Layout";
import { addTick, recordPlay, getStats, getTop, getTopSearchQueries, recordSearch } from "@/lib/stats";

interface Song {
  id: string;
  title: string;
  artist: string;
  thumbnail: string;
  duration: string;
}

const Index = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [songs, setSongs] = useState<Song[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(70);
  const { toast } = useToast();
  type PlayerAPI = {
    getDuration: () => number;
    seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  };
  const playerRef = useRef<PlayerAPI | null>(null);

  useEffect(() => {
    // البحث الافتراضي عند تحميل الصفحة
    searchYouTube("أغاني عربية");
  }, []);

  const searchYouTube = async (query: string) => {
    if (!query.trim()) {
      setSongs([]);
      return;
    }

    setIsSearching(true);
    try {
      const results = await fetchSongsByQuery(query);
      setSongs(results);
      recordSearch(query);
    } catch (e) {
      console.error(e);
      toast({
        title: "خطأ في البحث",
        description: "تعذر تنفيذ البحث حالياً. حاول لاحقاً.",
        variant: "destructive",
      });
      setSongs([]);
    } finally {
      setIsSearching(false);
    }
  };

  const fetchSongsByQuery = async (query: string): Promise<Song[]> => {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/youtube-search`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      }
    );
    const data = await response.json();
    if (response.ok) {
      return data.songs || [];
    }
    const alt = await fetch(`https://piped.video/api/v1/search?q=${encodeURIComponent(query)}`);
    const altData = await alt.json();
    type PipedItem = {
      type: string;
      id: string;
      title: string;
      uploaderName?: string;
      uploader?: string;
      thumbnail: string;
      duration?: string;
    };
    const items: PipedItem[] = altData.items || [];
    return items
      .filter((i) => i.type === 'video')
      .map((i) => ({
        id: i.id,
        title: i.title,
        artist: i.uploaderName || i.uploader || 'غير معروف',
        thumbnail: i.thumbnail,
        duration: i.duration || '0:00',
      }));
  };

  useEffect(() => {
    const debounce = setTimeout(() => {
      if (searchQuery) {
        searchYouTube(searchQuery);
      }
    }, 500);

    return () => clearTimeout(debounce);
  }, [searchQuery]);

  const handlePlayPause = (song: Song) => {
    if (!currentSong || currentSong.id !== song.id) {
      setCurrentSong(song);
      setIsPlaying(true);
      setProgress(0);
      recordPlay({ id: song.id, title: song.title, artist: song.artist });
    } else {
      const next = !isPlaying;
      setIsPlaying(next);
      if (next) {
        recordPlay({ id: song.id, title: song.title, artist: song.artist });
      }
    }
  };

  const handleNext = () => {
    if (!currentSong || songs.length === 0) return;
    const currentIndex = songs.findIndex((s) => s.id === currentSong.id);
    const nextSong = songs[(currentIndex + 1) % songs.length];
    setCurrentSong(nextSong);
    recordPlay({ id: nextSong.id, title: nextSong.title, artist: nextSong.artist });
  };

  const handlePrevious = () => {
    if (!currentSong || songs.length === 0) return;
    const currentIndex = songs.findIndex((s) => s.id === currentSong.id);
    const prevSong = songs[(currentIndex - 1 + songs.length) % songs.length];
    setCurrentSong(prevSong);
    recordPlay({ id: prevSong.id, title: prevSong.title, artist: prevSong.artist });
  };

  useEffect(() => {
    let interval: number | undefined;
    if (isPlaying && currentSong) {
      interval = window.setInterval(() => {
        addTick({ id: currentSong.id, title: currentSong.title, artist: currentSong.artist }, 1);
      }, 1000);
    }
    return () => {
      if (interval) window.clearInterval(interval);
    };
  }, [isPlaying, currentSong]);

  const [suggestions, setSuggestions] = useState<Song[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  useEffect(() => {
    const loadRecommendations = async () => {
      setLoadingSuggestions(true);
      try {
        const s = getStats();
        const seeds: string[] = [];
        seeds.push(...getTopSearchQueries(3));
        seeds.push(...getTop(s.playCountsArtist, 2).map(([name]) => name));
        const songTitleSeeds = getTop(s.playCountsSong, 2)
          .map(([id]) => s.songTitles[id])
          .filter((t): t is string => !!t);
        seeds.push(...songTitleSeeds);
        const uniqueSeeds = Array.from(new Set(seeds)).slice(0, 5);
        const results: Song[] = [];
        for (const q of uniqueSeeds) {
          const r = await fetchSongsByQuery(q);
          results.push(...r);
        }
        const dedup = new Map<string, Song>();
        results.forEach((song) => {
          if (!dedup.has(song.id)) dedup.set(song.id, song);
        });
        setSuggestions(Array.from(dedup.values()).slice(0, 20));
      } catch {
        setSuggestions([]);
      } finally {
        setLoadingSuggestions(false);
      }
    };
    loadRecommendations();
  }, []);

  return (
    <Layout>
      <Header searchQuery={searchQuery} onSearchChange={setSearchQuery} />

      <div className="container px-4 py-8 md:px-6">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2 text-foreground">اقتراحات لك</h2>
          {loadingSuggestions ? (
            <div className="text-muted-foreground">جاري التحضير...</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
              {suggestions.map((song) => (
                <SongCard
                  key={song.id}
                  song={song}
                  isPlaying={isPlaying && currentSong?.id === song.id}
                  onPlayPause={() => handlePlayPause(song)}
                />
              ))}
            </div>
          )}
        </div>
        <div className="mb-8">
          <h2 className="text-4xl font-bold mb-2 text-foreground">
            اكتشف الموسيقى
          </h2>
          <p className="text-muted-foreground text-lg">
            ابحث عن أغانيك المفضلة واستمع إليها
          </p>
        </div>

        {isSearching ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground text-lg">جاري البحث...</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
              {songs.map((song) => (
                <SongCard
                  key={song.id}
                  song={song}
                  isPlaying={isPlaying && currentSong?.id === song.id}
                  onPlayPause={() => handlePlayPause(song)}
                />
              ))}
            </div>

            {songs.length === 0 && !isSearching && (
              <div className="text-center py-20">
                <p className="text-muted-foreground text-lg">
                  {searchQuery ? `لا توجد نتائج للبحث "${searchQuery}"` : "ابحث عن أغنية"}
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {currentSong && (
        <>
          <Player
            currentSong={currentSong}
            isPlaying={isPlaying}
            onPlayPause={() => setIsPlaying(!isPlaying)}
            onNext={handleNext}
            onPrevious={handlePrevious}
            progress={progress}
            volume={volume}
            onProgressChange={(value) => {
              const pct = value[0];
              setProgress(pct);
              if (playerRef.current) {
                const duration = playerRef.current.getDuration();
                if (duration > 0) {
                  const target = (pct / 100) * duration;
                  playerRef.current.seekTo(target, true);
                }
              }
            }}
            onVolumeChange={(value) => setVolume(value[0])}
          />
          <YouTubePlayer
            videoId={currentSong.id}
            isPlaying={isPlaying}
            onEnded={handleNext}
            volume={volume}
            onProgress={setProgress}
            autoPlay={true}
            onReady={(p) => {
              playerRef.current = p;
            }}
          />
        </>
      )}
    </Layout>
  );
};

export default Index;
  
