"use client";

import { useState, useEffect, useRef } from 'react';

interface Song {
  id: string;
  name: string;
}

export default function Home() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(true);

  // State Fitur Pemutar ala Spotify
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>('off');

  // State Caching Offline
  const [offlineSongs, setOfflineSongs] = useState<string[]>([]);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const formatSongTitle = (filename: string) => {
    return filename.replace(/\.(opus|mp3|m4a|wav|flac)$/i, '');
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds === 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // 1. Fetch Daftar Lagu & Fallback Offline
  useEffect(() => {
    const loadSongs = async () => {
      try {
        const res = await fetch('/api/songs');
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setSongs(data);
          setCurrentSong(data[0]);
          localStorage.setItem('rey_music_cached_songs', JSON.stringify(data));
        }
      } catch (err) {
        console.warn('Gagal koneksi server, mencoba memuat lagu tersimpan...', err);
        const savedSongs = localStorage.getItem('rey_music_cached_songs');
        if (savedSongs) {
          const parsed = JSON.parse(savedSongs);
          setSongs(parsed);
          if (parsed.length > 0) setCurrentSong(parsed[0]);
        }
      } finally {
        setLoading(false);
      }
    };

    loadSongs();

    if ('caches' in window) {
      caches.open('rey-music-audio-v1').then(async (cache) => {
        const keys = await cache.keys();
        const cachedIds = keys
          .map((req) => req.url.split('/api/stream/')[1])
          .filter(Boolean);
        setOfflineSongs(cachedIds);
      });
    }
  }, []);

  // 2. Pasang Sumber Audio (Aman dari null TypeScript)
  useEffect(() => {
    if (!currentSong || !audioRef.current) return;
    const audio = audioRef.current;

    const setupAudioSource = async () => {
      const streamUrl = `/api/stream/${currentSong.id}`;

      if ('caches' in window) {
        const cache = await caches.open('rey-music-audio-v1');
        const matchedResponse = await cache.match(streamUrl);

        if (matchedResponse) {
          const blob = await matchedResponse.blob();
          audio.src = URL.createObjectURL(blob);
        } else {
          audio.src = streamUrl;
        }
      } else {
        audio.src = streamUrl;
      }

      if (isPlaying) {
        audio.play().catch((err) => {
          if (err.name !== 'AbortError') console.error('Playback error:', err);
        });
      }
    };

    setupAudioSource();
  }, [currentSong]);

  // 3. Logika Next & Prev
  const handleNextSong = () => {
    if (!currentSong || songs.length === 0) return;

    if (repeatMode === 'one' && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play();
      return;
    }

    if (isShuffle) {
      const randomIndex = Math.floor(Math.random() * songs.length);
      setCurrentSong(songs[randomIndex]);
    } else {
      const currentIndex = songs.findIndex((s) => s.id === currentSong.id);
      const nextIndex = (currentIndex + 1) % songs.length;
      if (nextIndex === 0 && repeatMode === 'off') {
        setIsPlaying(false);
        return;
      }
      setCurrentSong(songs[nextIndex]);
    }
    setIsPlaying(true);
  };

  const handlePrevSong = () => {
    if (!currentSong || songs.length === 0) return;

    if (audioRef.current && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      return;
    }

    const currentIndex = songs.findIndex((s) => s.id === currentSong.id);
    const prevIndex = (currentIndex - 1 + songs.length) % songs.length;
    setCurrentSong(songs[prevIndex]);
    setIsPlaying(true);
  };

  // 4. Update Time & Seekbar
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const targetTime = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = targetTime;
      setCurrentTime(targetTime);
    }
  };

  // 5. Unduh Lagu untuk Offline
  const handleDownloadOffline = async (e: React.MouseEvent, song: Song) => {
    e.stopPropagation();
    if (!('caches' in window)) return;

    setDownloadingId(song.id);
    try {
      const cache = await caches.open('rey-music-audio-v1');
      const response = await fetch(`/api/stream/${song.id}`);
      if (response.ok) {
        await cache.put(`/api/stream/${song.id}`, response);
        setOfflineSongs((prev) => [...prev, song.id]);
      }
    } catch (err) {
      console.error("Gagal download offline:", err);
    } finally {
      setDownloadingId(null);
    }
  };

  // 6. Media Session (Lockscreen HP)
  useEffect(() => {
    if ('mediaSession' in navigator && currentSong) {
      const cleanTitle = formatSongTitle(currentSong.name);

      navigator.mediaSession.metadata = new MediaMetadata({
        title: cleanTitle,
        artist: 'Rey Music',
        album: 'Personal Cloud Player',
        artwork: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      });

      navigator.mediaSession.setActionHandler('play', () => audioRef.current?.play());
      navigator.mediaSession.setActionHandler('pause', () => audioRef.current?.pause());
      navigator.mediaSession.setActionHandler('previoustrack', handlePrevSong);
      navigator.mediaSession.setActionHandler('nexttrack', handleNextSong);
    }
  }, [currentSong, songs, isShuffle, repeatMode]);

  const togglePlay = () => {
    if (!audioRef.current || !currentSong) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch((err) => console.error(err));
    }
  };

  const toggleRepeat = () => {
    if (repeatMode === 'off') setRepeatMode('all');
    else if (repeatMode === 'all') setRepeatMode('one');
    else setRepeatMode('off');
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-slate-950 text-white antialiased selection:bg-emerald-500 selection:text-black">
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleNextSong}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />

      {/* Sidebar Desktop / Top Nav Mobile */}
      <aside className="w-full md:w-64 border-b md:border-b-0 md:border-r border-slate-800/80 p-4 md:p-6 flex flex-row md:flex-col justify-between items-center md:items-stretch shrink-0 bg-slate-950/90 backdrop-blur-md sticky top-0 z-20">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center text-slate-950 font-black text-sm">
              R
            </div>
            <h1 className="text-xl font-extrabold tracking-wider text-white">
              REY MUSIC
            </h1>
          </div>
          <p className="text-xs text-slate-400 hidden md:block mt-1 font-medium">Spotify Cloud Player</p>
        </div>

        {currentSong && (
          <div className="hidden md:flex items-center gap-3 bg-slate-900/80 p-3 rounded-xl border border-slate-800/80 min-w-0">
            <div className="w-10 h-10 bg-emerald-500/10 text-emerald-400 rounded-lg flex items-center justify-center font-bold shrink-0">
              🎵
            </div>
            <div className="overflow-hidden min-w-0">
              <p className="text-sm font-semibold truncate text-slate-200">{formatSongTitle(currentSong.name)}</p>
              <p className="text-xs text-slate-400">
                {offlineSongs.includes(currentSong.id) ? '⚡ Mode Offline' : '☁️ Google Drive'}
              </p>
            </div>
          </div>
        )}
      </aside>

      {/* Main Content (Daftar Lagu) */}
      <main className="flex-1 p-4 md:p-8 pb-36 min-w-0 max-w-5xl mx-auto w-full">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl md:text-2xl font-bold tracking-tight">Koleksi Lagu Saya</h2>
          <span className="text-xs text-slate-400 font-medium">{songs.length} Lagu</span>
        </div>

        {loading ? (
          <p className="text-slate-400 text-sm">Memuat lagu...</p>
        ) : songs.length === 0 ? (
          <p className="text-slate-400 text-sm">Tidak ada lagu yang ditemukan.</p>
        ) : (
          <div className="space-y-1.5">
            {songs.map((song, index) => {
              const isSelected = currentSong?.id === song.id;
              const cleanTitle = formatSongTitle(song.name);
              const isDownloaded = offlineSongs.includes(song.id);
              const isDownloading = downloadingId === song.id;

              return (
                <div
                  key={song.id}
                  onClick={() => {
                    setCurrentSong(song);
                    setIsPlaying(true);
                  }}
                  className={`group flex items-center justify-between p-3.5 rounded-xl cursor-pointer transition-all gap-3 ${
                    isSelected
                      ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                      : 'bg-slate-900/40 hover:bg-slate-900 text-slate-300 border border-slate-800/40'
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    <span className="text-xs font-semibold text-slate-500 w-5 shrink-0 text-right">
                      {isSelected && isPlaying ? '▶' : index + 1}
                    </span>
                    <span className={`font-medium text-sm truncate ${isSelected ? 'text-emerald-400 font-semibold' : ''}`}>
                      {cleanTitle}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={(e) => handleDownloadOffline(e, song)}
                      disabled={isDownloaded || isDownloading}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                        isDownloaded
                          ? 'text-emerald-400 bg-emerald-500/10 cursor-default'
                          : isDownloading
                          ? 'text-amber-400 bg-amber-500/10 animate-pulse'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      {isDownloaded ? '✓ Offline' : isDownloading ? 'Unduh...' : '⬇ Simpan'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Footer Player Control ala Spotify */}
      <footer className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-xl border-t border-slate-800/80 px-4 md:px-8 py-3 z-30 flex flex-col gap-2">
        <div className="w-full flex items-center gap-3 max-w-4xl mx-auto text-xs text-slate-400 font-mono">
          <span>{formatTime(currentTime)}</span>
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={handleSeek}
            className="flex-1 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500 hover:h-1.5 transition-all"
          />
          <span>{formatTime(duration)}</span>
        </div>

        <div className="flex items-center justify-between gap-4 max-w-4xl mx-auto w-full">
          <div className="min-w-0 flex-1 max-w-[40%] md:max-w-xs">
            {currentSong && (
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white truncate">
                  {formatSongTitle(currentSong.name)}
                </p>
                <p className="text-xs text-slate-400 truncate">
                  {offlineSongs.includes(currentSong.id) ? '⚡ Diputar Offline' : '☁️ Streaming Cloud'}
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 md:gap-5 shrink-0">
            <button
              onClick={() => setIsShuffle(!isShuffle)}
              className={`text-lg transition ${isShuffle ? 'text-emerald-400 font-bold' : 'text-slate-500 hover:text-slate-300'}`}
              title="Acak Lagu"
            >
              🔀
            </button>

            <button
              onClick={handlePrevSong}
              disabled={!currentSong}
              className="text-slate-300 hover:text-white transition text-xl p-1 disabled:opacity-40"
            >
              ⏮
            </button>

            <button
              onClick={togglePlay}
              disabled={!currentSong}
              className="w-11 h-11 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center font-bold hover:scale-105 active:scale-95 transition shadow-lg shadow-emerald-500/20 disabled:opacity-50"
            >
              {isPlaying ? '❚❚' : '▶'}
            </button>

            <button
              onClick={handleNextSong}
              disabled={!currentSong}
              className="text-slate-300 hover:text-white transition text-xl p-1 disabled:opacity-40"
            >
              ⏭
            </button>

            <button
              onClick={toggleRepeat}
              className={`text-lg transition ${repeatMode !== 'off' ? 'text-emerald-400 font-bold' : 'text-slate-500 hover:text-slate-300'}`}
              title={repeatMode === 'one' ? 'Repeat 1 Lagu' : repeatMode === 'all' ? 'Repeat All' : 'Repeat Off'}
            >
              {repeatMode === 'one' ? '🔂' : '🔁'}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}