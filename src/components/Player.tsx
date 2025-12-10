import { Play, Pause, SkipBack, SkipForward, Volume2, Download } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";

interface Song {
  id: string;
  title: string;
  artist: string;
  thumbnail: string;
  duration: string;
}

interface PlayerProps {
  currentSong: Song | null;
  isPlaying: boolean;
  onPlayPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
  progress: number;
  volume: number;
  onProgressChange: (value: number[]) => void;
  onVolumeChange: (value: number[]) => void;
}

export const Player = ({
  currentSong,
  isPlaying,
  onPlayPause,
  onNext,
  onPrevious,
  progress,
  volume,
  onProgressChange,
  onVolumeChange,
}: PlayerProps) => {
  const { toast } = useToast();

  const handleDownload = async () => {
    if (!currentSong) return;

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/download-song`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            videoId: currentSong.id,
            title: currentSong.title 
          }),
        }
      );

      const data = await response.json();
      
      if (data.downloadUrl) {
        window.open(data.downloadUrl, '_blank');
        toast({
          title: "جاري التحميل",
          description: data.message,
        });
      }
    } catch (error) {
      console.error('Error downloading song:', error);
      toast({
        title: "خطأ في التحميل",
        description: "حدث خطأ أثناء تحميل الأغنية",
        variant: "destructive",
      });
    }
  };

  if (!currentSong) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur">
      <div className="container px-4 py-3 md:px-6" style={{ paddingBottom: "calc(0.5rem + env(safe-area-inset-bottom))" }}>
        <div className="flex items-center gap-4">
          {/* Song Info */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <img
              src={currentSong.thumbnail}
              alt={currentSong.title}
              className="h-14 w-14 rounded-md object-cover"
            />
            <div className="min-w-0 flex-1 text-right">
              <p className="font-semibold text-sm text-foreground truncate">
                {currentSong.title}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {currentSong.artist}
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-col items-center gap-2 flex-1 max-w-2xl">
            <div className="flex items-center gap-4">
              <button
                onClick={onPrevious}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <SkipBack className="h-4 w-4" />
              </button>
              
              <button
                onClick={onPlayPause}
                className="flex items-center justify-center h-8 w-8 rounded-full bg-primary text-black hover:scale-105 transition-transform"
              >
                {isPlaying ? (
                  <Pause className="h-4 w-4" fill="currentColor" />
                ) : (
                  <Play className="h-4 w-4 mr-0.5" fill="currentColor" />
                )}
              </button>

              <button
                onClick={onNext}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <SkipForward className="h-4 w-4" />
              </button>
            </div>

            <div className="w-full">
              <Slider
                value={[progress]}
                onValueChange={onProgressChange}
                max={100}
                step={1}
                className="w-full"
              />
            </div>
          </div>

          {/* Volume & Download */}
          <div className="hidden md:flex items-center gap-4 flex-1 justify-end">
            <button
              onClick={handleDownload}
              className="text-muted-foreground hover:text-foreground transition-colors"
              disabled={!currentSong}
            >
              <Download className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-2 w-32">
              <Volume2 className="h-4 w-4 text-muted-foreground" />
              <Slider
                value={[volume]}
                onValueChange={onVolumeChange}
                max={100}
                step={1}
                className="flex-1"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
