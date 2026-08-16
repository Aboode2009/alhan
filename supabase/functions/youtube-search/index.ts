import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PIPED_INSTANCES = [
  "https://pipedapi.kavin.rocks",
  "https://pipedapi.tokhmi.xyz",
  "https://pipedapi.moomoo.me",
  "https://pipedapi.syncpundit.io",
];

type Song = {
  id: string;
  title: string;
  artist: string;
  thumbnail: string;
  duration: string;
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const query = String(body?.query || "").trim();
    if (!query) return json({ songs: [] });

    // Primary source: official YouTube Data API when the project has a valid key.
    const apiKey = Deno.env.get("YOUTUBE_API_KEY");
    if (apiKey) {
      try {
        const response = await fetch(
          `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoCategoryId=10&maxResults=25&q=${encodeURIComponent(query)}&key=${apiKey}`,
        );
        if (response.ok) {
          const data = await response.json();
          const items = Array.isArray(data.items) ? data.items : [];
          const ids = items.map((item: any) => item?.id?.videoId).filter(Boolean).join(",");
          let durations = new Map<string, string>();
          if (ids) {
            const details = await fetch(
              `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${ids}&key=${apiKey}`,
            );
            if (details.ok) {
              const detailData = await details.json();
              for (const item of detailData.items || []) durations.set(item.id, formatDuration(item.contentDetails?.duration || "PT0S"));
            }
          }
          const songs: Song[] = items.map((item: any) => ({
            id: item.id.videoId,
            title: decodeHtml(item.snippet?.title || ""),
            artist: decodeHtml(item.snippet?.channelTitle || ""),
            thumbnail: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || "",
            duration: durations.get(item.id.videoId) || "0:00",
          }));
          if (songs.length) return json({ songs });
        }
      } catch (error) {
        console.error("YouTube API search failed; using Piped fallback", error);
      }
    }

    // Fallback: Piped search keeps search working when the YouTube API quota/key is unavailable.
    let lastError = "No search provider available";
    for (const base of PIPED_INSTANCES) {
      try {
        const response = await fetch(`${base}/search?q=${encodeURIComponent(query)}&filter=music`);
        if (!response.ok) throw new Error(`Piped HTTP ${response.status}`);
        const data = await response.json();
        const items = Array.isArray(data?.items) ? data.items : [];
        const songs: Song[] = items
          .filter((item: any) => item?.type === "stream" && item?.url)
          .slice(0, 25)
          .map((item: any) => ({
            id: extractVideoId(item.url),
            title: decodeHtml(item.title || ""),
            artist: decodeHtml(item.uploaderName || item.uploaderUrl || ""),
            thumbnail: item.thumbnail || "",
            duration: formatSeconds(Number(item.duration || 0)),
          }))
          .filter((song: Song) => !!song.id);
        if (songs.length) return json({ songs });
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
      }
    }

    return new Response(JSON.stringify({ error: lastError, songs: [] }), {
      status: 503,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Search failed", songs: [] }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function json(value: unknown) {
  return new Response(JSON.stringify(value), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

function extractVideoId(url: string): string {
  const match = String(url).match(/[?&]v=([^&]+)/);
  return match?.[1] || "";
}

function formatSeconds(total: number): string {
  if (!Number.isFinite(total) || total < 0) return "0:00";
  const seconds = Math.floor(total % 60);
  const minutes = Math.floor(total / 60) % 60;
  const hours = Math.floor(total / 3600);
  return hours ? `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}` : `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function formatDuration(duration: string): string {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return "0:00";
  const hours = Number(match[1] || 0);
  const minutes = Number(match[2] || 0);
  const seconds = Number(match[3] || 0);
  return hours ? `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}` : `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function decodeHtml(value: string): string {
  return value.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}
