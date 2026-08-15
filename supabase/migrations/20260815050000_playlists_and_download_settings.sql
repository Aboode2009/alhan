-- Alhan synced playlists. Audio files are NEVER stored in Supabase.
CREATE TABLE IF NOT EXISTS public.playlists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  thumbnail TEXT,
  auto_download BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, name)
);

CREATE TABLE IF NOT EXISTS public.playlist_tracks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  playlist_id UUID NOT NULL REFERENCES public.playlists(id) ON DELETE CASCADE,
  song_id TEXT NOT NULL,
  song_title TEXT NOT NULL,
  song_artist TEXT NOT NULL,
  song_thumbnail TEXT NOT NULL,
  song_duration TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(playlist_id, song_id)
);

ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlist_tracks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their playlists" ON public.playlists;
DROP POLICY IF EXISTS "Users can create their playlists" ON public.playlists;
DROP POLICY IF EXISTS "Users can update their playlists" ON public.playlists;
DROP POLICY IF EXISTS "Users can delete their playlists" ON public.playlists;
CREATE POLICY "Users can view their playlists" ON public.playlists FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their playlists" ON public.playlists FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their playlists" ON public.playlists FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their playlists" ON public.playlists FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their playlist tracks" ON public.playlist_tracks;
DROP POLICY IF EXISTS "Users can add their playlist tracks" ON public.playlist_tracks;
DROP POLICY IF EXISTS "Users can update their playlist tracks" ON public.playlist_tracks;
DROP POLICY IF EXISTS "Users can delete their playlist tracks" ON public.playlist_tracks;
CREATE POLICY "Users can view their playlist tracks" ON public.playlist_tracks FOR SELECT USING (EXISTS (SELECT 1 FROM public.playlists p WHERE p.id = playlist_id AND p.user_id = auth.uid()));
CREATE POLICY "Users can add their playlist tracks" ON public.playlist_tracks FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.playlists p WHERE p.id = playlist_id AND p.user_id = auth.uid()));
CREATE POLICY "Users can update their playlist tracks" ON public.playlist_tracks FOR UPDATE USING (EXISTS (SELECT 1 FROM public.playlists p WHERE p.id = playlist_id AND p.user_id = auth.uid()));
CREATE POLICY "Users can delete their playlist tracks" ON public.playlist_tracks FOR DELETE USING (EXISTS (SELECT 1 FROM public.playlists p WHERE p.id = playlist_id AND p.user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS playlists_user_id_idx ON public.playlists(user_id);
CREATE INDEX IF NOT EXISTS playlist_tracks_playlist_id_idx ON public.playlist_tracks(playlist_id, position);
