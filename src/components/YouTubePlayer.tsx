import { useEffect, useRef } from "react";

type PlayerAPI = {
  setVolume: (v: number) => void;
  playVideo: () => void;
  pauseVideo: () => void;
  destroy: () => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  loadVideoById: (id: string) => void;
  seekTo: (sec: number, allow: boolean) => void;
};

interface YouTubePlayerProps {
  videoId: string;
  isPlaying: boolean;
  onEnded: () => void;
  volume: number;
  onProgress: (progress: number) => void;
  autoPlay?: boolean;
  onReady?: (player: PlayerAPI) => void;
}

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export const YouTubePlayer = ({
  videoId,
  isPlaying,
  onEnded,
  volume,
  onProgress,
  autoPlay = true,
  onReady,
}: YouTubePlayerProps) => {
  const playerRef = useRef<PlayerAPI | null>(null);
  const intervalRef = useRef<number>();

  useEffect(() => {
    // Load YouTube IFrame API
    if (!window.YT) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName("script")[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }

    window.onYouTubeIframeAPIReady = () => {
      playerRef.current = new window.YT.Player("youtube-player", {
        height: "0",
        width: "0",
        videoId: videoId,
        playerVars: {
          autoplay: 1,
          controls: 0,
        },
        events: {
          onReady: (event: { target: PlayerAPI }) => {
            event.target.setVolume(volume);
            if (onReady) {
              onReady(event.target);
            }
          },
          onStateChange: (event: any) => {
            if (event.data === window.YT.PlayerState.ENDED) {
              onEnded();
            }
          },
        },
      });
    };

    if (window.YT && window.YT.Player) {
      window.onYouTubeIframeAPIReady();
    }

    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (playerRef.current) {
      playerRef.current.loadVideoById(videoId);
    }
  }, [videoId]);

  useEffect(() => {
    if (playerRef.current) {
      playerRef.current.setVolume(volume);
    }
  }, [volume]);

  useEffect(() => {
    if (playerRef.current) {
      if (isPlaying) {
        playerRef.current.playVideo();
        intervalRef.current = window.setInterval(() => {
          const current = playerRef.current?.getCurrentTime();
          const duration = playerRef.current?.getDuration();
          if (duration && duration > 0 && typeof current === "number") {
            onProgress((current / duration) * 100);
          }
        }, 1000);
      } else {
        playerRef.current.pauseVideo();
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      }
    }
  }, [isPlaying]);

  return <div id="youtube-player" className="hidden" />;
};
