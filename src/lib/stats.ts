type SongInfo = {
  id: string;
  title: string;
  artist: string;
};

type Stats = {
  totalSeconds: number;
  byArtistSeconds: Record<string, number>;
  bySongSeconds: Record<string, number>;
  playCountsArtist: Record<string, number>;
  playCountsSong: Record<string, number>;
  searchCounts: Record<string, number>;
  songTitles: Record<string, string>;
  lastUpdated: number;
};

const KEY = "alhan_stats";

const defaultStats: Stats = {
  totalSeconds: 0,
  byArtistSeconds: {},
  bySongSeconds: {},
  playCountsArtist: {},
  playCountsSong: {},
  searchCounts: {},
  songTitles: {},
  lastUpdated: Date.now(),
};

export function getStats(): Stats {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...defaultStats };
    const parsed = JSON.parse(raw);
    return { ...defaultStats, ...parsed } as Stats;
  } catch {
    return { ...defaultStats };
  }
}

function saveStats(stats: Stats) {
  try {
    localStorage.setItem(KEY, JSON.stringify(stats));
  } catch {
    void 0;
  }
}

export function recordPlay(song: SongInfo) {
  const s = getStats();
  s.playCountsSong[song.id] = (s.playCountsSong[song.id] || 0) + 1;
  s.playCountsArtist[song.artist] = (s.playCountsArtist[song.artist] || 0) + 1;
  s.songTitles[song.id] = song.title;
  s.lastUpdated = Date.now();
  saveStats(s);
}

export function addTick(song: SongInfo, seconds: number) {
  const s = getStats();
  s.totalSeconds += seconds;
  s.bySongSeconds[song.id] = (s.bySongSeconds[song.id] || 0) + seconds;
  s.byArtistSeconds[song.artist] = (s.byArtistSeconds[song.artist] || 0) + seconds;
  s.lastUpdated = Date.now();
  saveStats(s);
}

export function formatTotalTime(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  if (h > 0) return `${h} ساعة ${m} دقيقة ${s} ثانية`;
  if (m > 0) return `${m} دقيقة ${s} ثانية`;
  return `${s} ثانية`;
}

export function getTop<T extends Record<string, number>>(map: T, limit = 5) {
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);
}

export function recordSearch(query: string) {
  const s = getStats();
  const key = query.trim().toLowerCase();
  if (key) {
    s.searchCounts[key] = (s.searchCounts[key] || 0) + 1;
    s.lastUpdated = Date.now();
    saveStats(s);
  }
}

export function getTopSearchQueries(limit = 5) {
  return getTop(getStats().searchCounts, limit).map(([q]) => q);
}
