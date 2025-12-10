import { useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ChevronDown, Heart, Download, Play, Pause, SkipBack, SkipForward, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { YouTubePlayer } from "@/components/YouTubePlayer";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useOfflineDownload } from "@/hooks/useOfflineDownload";
import { addTick, recordPlay } from "@/lib/stats";
import { BackgroundRunner } from "@capacitor/background-runner";

interface Song {
  id: string;
  title: string;
  artist: string;
  thumbnail: string;
  duration: string;
}

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
  const { downloadSong, isSongDownloaded, isDownloading, getAudioUrl } = useOfflineDownload();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });

    const songData = searchParams.get("song");
    if (songData) {
      try {
        const song = JSON.parse(decodeURIComponent(songData));
        setCurrentSong(song);
        checkFavoriteStatus(song.id);
        checkDownloadStatus(song.id);
      } catch (error) {
        console.error("Error parsing song data:", error);
        navigate("/");
      }
    } else {
      navigate("/");
    }
  }, [searchParams, navigate]);

  const checkFavoriteStatus = async (songId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("favorites")
      .select("id")
      .eq("user_id", user.id)
      .eq("song_id", songId)
      .single();

    setIsFavorite(!!data);
  };

  const checkDownloadStatus = async (songId: string) => {
    const downloaded = await isSongDownloaded(songId);
    setIsDownloaded(downloaded);
  };

  useEffect(() => {
    const setupAudio = async () => {
      if (!currentSong) return;
      if (isDownloaded) {
        const url = await getAudioUrl(currentSong.id);
        if (url) {
          if (!audioRef.current) {
            audioRef.current = new Audio(url);
          } else {
            audioRef.current.src = url;
          }
          audioRef.current.volume = volume / 100;
          if (isPlaying) audioRef.current.play(); else audioRef.current.pause();
          audioRef.current.ontimeupdate = () => {
            const c = audioRef.current?.currentTime || 0;
            const d = audioRef.current?.duration || 0;
            if (d > 0) setProgress((c / d) * 100);
          };
          audioRef.current.onended = () => {};
        }
      }
    };
    setupAudio();
    if (currentSong) {
      try {
        if ('mediaSession' in navigator) {
          // @ts-expect-error Media Session is not typed by TS DOM in some envs
          navigator.mediaSession.metadata = new window.MediaMetadata({
            title: currentSong.title,
            artist: currentSong.artist,
            album: "ألحان",
            artwork: [
              { src: currentSong.thumbnail, sizes: "512x512", type: "image/png" },
            ],
          });
          // @ts-expect-error
          navigator.mediaSession.setActionHandler('play', () => setIsPlaying(true));
          // @ts-expect-error
          navigator.mediaSession.setActionHandler('pause', () => setIsPlaying(false));
          // @ts-expect-error
          navigator.mediaSession.setActionHandler('seekto', (details: any) => {
            if (audioRef.current && isDownloaded && typeof details?.seekTime === 'number') {
              audioRef.current.currentTime = details.seekTime;
            }
          });
        }
      } catch {}
    }
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [currentSong, isDownloaded]);

  useEffect(() => {
    if (audioRef.current && isDownloaded) {
      audioRef.current.volume = volume / 100;
    }
  }, [volume, isDownloaded]);

  useEffect(() => {
    if (audioRef.current && isDownloaded) {
      if (isPlaying) audioRef.current.play(); else audioRef.current.pause();
    }
    (async () => {
      try {
        if (isPlaying) {
          await BackgroundRunner.start();
        } else {
          await BackgroundRunner.stop();
        }
      } catch {}
    })();
  }, [isPlaying, isDownloaded]);

  useEffect(() => {
    if (currentSong && isPlaying) {
      recordPlay({ id: currentSong.id, title: currentSong.title, artist: currentSong.artist });
    }
  }, [isPlaying, currentSong]);

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

  const toggleFavorite = async () => {
    if (!user) {
      toast({
        title: "تسجيل الدخول مطلوب",
        description: "يجب تسجيل الدخول لإضافة الأغاني للمفضلة",
        variant: "destructive",
      });
      return;
    }

    if (!currentSong) return;

    if (isFavorite) {
      const { error } = await supabase
        .from("favorites")
        .delete()
        .eq("user_id", user.id)
        .eq("song_id", currentSong.id);

      if (!error) {
        setIsFavorite(false);
        toast({
          title: "تم الإزالة",
          description: "تم إزالة الأغنية من المفضلة",
        });
      }
    } else {
      const { error } = await supabase
        .from("favorites")
        .insert({
          user_id: user.id,
          song_id: currentSong.id,
          song_title: currentSong.title,
          song_artist: currentSong.artist,
          song_thumbnail: currentSong.thumbnail,
          song_duration: currentSong.duration,
        });

      if (!error) {
        setIsFavorite(true);
        toast({
          title: "تمت الإضافة",
          description: "تمت إضافة الأغنية للمفضلة",
        });
      }
    }
  };

  const handleDownload = async () => {
    if (!user) {
      toast({
        title: "تسجيل الدخول مطلوب",
        description: "يجب تسجيل الدخول لتحميل الأغاني",
        variant: "destructive",
      });
      return;
    }

    if (!currentSong) return;

    try {
      await downloadSong(currentSong);
      setIsDownloaded(true);
      
      // Also save to database for tracking
      await supabase
        .from("downloads")
        .insert({
          user_id: user.id,
          song_id: currentSong.id,
          song_title: currentSong.title,
          song_artist: currentSong.artist,
          song_thumbnail: currentSong.thumbnail,
          song_duration: currentSong.duration,
        });
    } catch (error) {
      console.error("Error downloading song:", error);
    }
  };

  if (!currentSong) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground text-lg">جاري التحميل...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between p-6 bg-background/95 backdrop-blur">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/")}
          className="text-foreground hover:bg-muted"
        >
          <ChevronDown className="h-6 w-6" />
        </Button>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">الآن يتم التشغيل</h2>
        <div className="w-10" />
      </div>

      {/* Album Art */}
      <div className="flex-1 flex items-center justify-center p-12">
        <div className="relative w-full max-w-md aspect-square rounded-lg overflow-hidden shadow-card">
          <img
            src={currentSong.thumbnail}
            alt={currentSong.title}
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      {/* Song Info & Controls Container */}
      <div className="bg-background/95 backdrop-blur pb-8">
        {/* Song Info */}
        <div className="px-8 py-4">
          <h1 className="text-2xl font-bold mb-2 text-foreground text-right">
            {currentSong.title}
          </h1>
          <p className="text-muted-foreground text-right">{currentSong.artist}</p>
        </div>

        {/* Progress Bar */}
        <div className="px-8 py-2">
          <Slider
            value={[progress]}
            onValueChange={(value) => {
              const pct = value[0];
              setProgress(pct);
              if (audioRef.current && isDownloaded) {
                const d = audioRef.current.duration || 0;
                if (d > 0) {
                  audioRef.current.currentTime = (pct / 100) * d;
                }
              }
            }}
            max={100}
            step={1}
            className="w-full"
          />
        </div>

        {/* Playback Controls */}
        <div className="flex items-center justify-center gap-8 px-8 py-6">
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
            <SkipForward className="h-5 w-5 rotate-180" />
          </Button>
          <Button
            variant="default"
            size="icon"
            onClick={() => setIsPlaying(!isPlaying)}
            className="h-14 w-14 rounded-full bg-primary hover:bg-primary/90 hover:scale-105 transition-transform"
          >
            {isPlaying ? (
              <Pause className="h-6 w-6 text-black" fill="currentColor" />
            ) : (
              <Play className="h-6 w-6 mr-0.5 text-black" fill="currentColor" />
            )}
          </Button>
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
            <SkipForward className="h-5 w-5" />
          </Button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between px-8 py-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleFavorite}
            className={isFavorite ? "text-primary" : "text-muted-foreground hover:text-foreground"}
          >
            <Heart className={`h-6 w-6 ${isFavorite ? "fill-current" : ""}`} />
          </Button>
          
          <div className="flex items-center gap-3">
            <Volume2 className="h-5 w-5 text-muted-foreground" />
            <Slider
              value={[volume]}
              onValueChange={(value) => setVolume(value[0])}
              max={100}
              step={1}
              className="w-24"
            />
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleDownload}
            disabled={isDownloading}
            className={isDownloaded ? "text-primary" : "text-muted-foreground hover:text-foreground"}
          >
            <Download className="h-6 w-6" />
          </Button>
        </div>
      </div>

      {/* Hidden YouTube Player */}
      {currentSong && !isDownloaded && (
        <div className="hidden">
          <YouTubePlayer
            videoId={currentSong.id}
            isPlaying={isPlaying}
            onEnded={() => {}}
            volume={volume}
            onProgress={setProgress}
            autoPlay={true}
          />
        </div>
      )}
    </div>
  );
};

export default NowPlaying;
