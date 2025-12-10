import { Play, Pause } from "lucide-react";
import { Card } from "@/components/ui/card";

interface Song {
  id: string;
  title: string;
  artist: string;
  thumbnail: string;
  duration: string;
}

interface SongCardProps {
  song: Song;
  isPlaying: boolean;
  onPlayPause: () => void;
}

export const SongCard = ({ song, isPlaying, onPlayPause }: SongCardProps) => {
  return (
    <Card className="group relative overflow-hidden bg-card hover:bg-card/80 border-0 transition-all duration-300 cursor-pointer p-4 rounded-lg hover:shadow-card">
      <div className="aspect-square relative overflow-hidden rounded-md mb-4">
        <img
          src={song.thumbnail}
          alt={song.title}
          className="w-full h-full object-cover transition-all duration-300 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        <button
          onClick={onPlayPause}
          className="absolute bottom-2 left-2 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300"
        >
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary shadow-lg hover:scale-110 transition-transform">
            {isPlaying ? (
              <Pause className="h-5 w-5 text-black" fill="currentColor" />
            ) : (
              <Play className="h-5 w-5 mr-0.5 text-black" fill="currentColor" />
            )}
          </div>
        </button>
      </div>

      <div>
        <h3 className="font-semibold text-base text-foreground truncate mb-1 text-right">
          {song.title}
        </h3>
        <p className="text-sm text-muted-foreground truncate text-right">
          {song.artist}
        </p>
      </div>
    </Card>
  );
};
