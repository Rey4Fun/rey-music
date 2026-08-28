"use client";

import { useState, useEffect, useRef, useMemo } from 'react';

interface Song {
  id: string;
  name: string;
}

export default function Home() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(true);

  // 1. Search & Filter Tab
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'liked'>('all');

  // 2. Liked Songs (Favorites)
  const [likedSongs, setLikedSongs] = useState<string[]>([]);

  // 3. Fullscreen Player State
  const [isPlayerExpanded, setIsPlayerExpanded] = useState(false);

  // 4. Batch Download State
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  // Player Control States
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>('off');

  // Offline Caching State
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

  // Initial Load (Songs, Liked Songs, Offline Cache, & Service Worker)
  useEffect(() => {
    // Registrasi Native Service Worker untuk Offline App Shell
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => console.log('Service Worker terpasang:', reg.scope))
        .catch((err) => console.error('Gagal memasang Service Worker:', err));
    }

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
        console.warn('Gagal memuat dari server, mengambil cache lokal...', err);
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

    // Load Liked Songs dari LocalStorage
    const savedLikes = localStorage.getItem('rey_music_liked');
    if (savedLikes) {
      try {
        setLikedSongs(JSON.parse(savedLikes));
      } catch (e) {
        console.error(e);
      }
    }

    // Cek Offline Cache
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

  // Filter Songs berdasarkan Search & Tab
  const filteredSongs = useMemo(() => {
    return songs.filter((song) => {
      const matchesSearch = song.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTab = activeTab === 'all' || likedSongs.includes(song.id);
      return matchesSearch && matchesTab;
    });
  }, [songs, searchQuery, activeTab, likedSongs]);

  // Handle Toggle Like / Favorite
  const toggleLikeSong = (e: React.MouseEvent, songId: string) => {
    e.stopPropagation();
    setLikedSongs((prev) => {
      const isLiked = prev.includes(songId);
      const updated = isLiked ? prev.filter((id) => id !== songId) : [...prev, songId];
      localStorage.setItem('rey_music_liked', JSON.stringify(updated));
      return updated;
    });
  };

  // Setup Audio Source (Safe from null)
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

  // Next & Prev Logic
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

  // Unduh 1 Lagu
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

  // Unduh SEMUA Lagu
  const handleDownloadAll = async () => {
    if (!('caches' in window) || isDownloadingAll || songs.length === 0) return;

    setIsDownloadingAll(true);
    setDownloadProgress(0);

    const cache = await caches.open('rey-music-audio-v1');
    let completed = 0;

    for (const song of songs) {
      if (!offlineSongs.includes(song.id)) {
        try {
          const response = await fetch(`/api/stream/${song.id}`);
          if (response.ok) {
            await cache.put(`/api/stream/${song.id}`, response);
            setOfflineSongs((prev) => [...prev, song.id]);
          }
        } catch (err) {
          console.error(`Gagal mengunduh lagu ${song.name}`, err);
        }
      }
      completed += 1;
      setDownloadProgress(completed);
    }

    setIsDownloadingAll(false);
  };

  // MediaSession Lockscreen
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

      {/* Sidebar Desktop / Top Header Mobile */}
      <aside className="w-full md:w-72 border-b md:border-b-0 md:border-r border-slate-800/80 p-4 md:p-6 flex flex-col gap-4 shrink-0 bg-slate-950/90 backdrop-blur-md sticky top-0 z-20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-black text-sm shadow-lg shadow-emerald-500/20">
              R
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-wider text-white leading-none">
                REY MUSIC
              </h1>
              <p className="text-[10px] text-slate-400 font-medium tracking-wide mt-0.5">Spotify Cloud Player</p>
            </div>
          </div>
        </div>

        {/* Search Bar Input */}
        <div className="relative w-full">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs">🔍</span>
          <input
            type="text"
            placeholder="Cari lagu..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800/80 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-all"
          />
        </div>

        {/* Navigation Tabs */}
        <div className="flex md:flex-col gap-1.5">
          <button
            onClick={() => setActiveTab('all')}
            className={`flex-1 md:flex-none text-left px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-between ${
              activeTab === 'all'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <span>🎶 Semua Lagu</span>
            <span className="text-[10px] opacity-70">({songs.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('liked')}
            className={`flex-1 md:flex-none text-left px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-between ${
              activeTab === 'liked'
                ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <span>❤️ Lagu Disukai</span>
            <span className="text-[10px] opacity-70">({likedSongs.length})</span>
          </button>
        </div>

        {/* Sidebar Info Card Desktop */}
        {currentSong && (
          <div className="hidden md:flex items-center gap-3 bg-slate-900/80 p-3 rounded-2xl border border-slate-800/80 mt-auto">
            <div className="w-10 h-10 bg-emerald-500/10 text-emerald-400 rounded-xl flex items-center justify-center font-bold shrink-0">
              🎵
            </div>
            <div className="overflow-hidden min-w-0">
              <p className="text-xs font-semibold truncate text-slate-200">{formatSongTitle(currentSong.name)}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {offlineSongs.includes(currentSong.id) ? '⚡ Tersimpan Offline' : '☁️ Google Drive'}
              </p>
            </div>
          </div>
        )}
      </aside>

      {/* Main Content (Daftar Lagu) */}
      <main className="flex-1 p-4 md:p-8 pb-36 min-w-0 max-w-5xl mx-auto w-full">
        {/* Header Content & Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h2 className="text-xl md:text-2xl font-extrabold tracking-tight">
              {activeTab === 'liked' ? 'Lagu Disukai ❤️' : 'Koleksi Lagu Saya'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {filteredSongs.length} lagu ditampilkan
            </p>
          </div>

          {/* Tombol Unduh Semua */}
          <button
            onClick={handleDownloadAll}
            disabled={isDownloadingAll || songs.length === 0}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/15 disabled:opacity-60 shrink-0"
          >
            {isDownloadingAll ? (
              <span>⏳ Mengunduh ({downloadProgress}/{songs.length})...</span>
            ) : (
              <span>⬇️ Unduh Semua Offline</span>
            )}
          </button>
        </div>

        {/* Daftar Lagu */}
        {loading ? (
          <p className="text-slate-400 text-sm">Memuat koleksi lagu...</p>
        ) : filteredSongs.length === 0 ? (
          <div className="text-center py-12 bg-slate-900/30 rounded-2xl border border-slate-800/50">
            <p className="text-slate-400 text-sm">Tidak ada lagu yang ditemukan.</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {filteredSongs.map((song, index) => {
              const isSelected = currentSong?.id === song.id;
              const cleanTitle = formatSongTitle(song.name);
              const isDownloaded = offlineSongs.includes(song.id);
              const isDownloading = downloadingId === song.id;
              const isLiked = likedSongs.includes(song.id);

              return (
                <div
                  key={song.id}
                  onClick={() => {
                    setCurrentSong(song);
                    setIsPlaying(true);
                  }}
                  className={`group flex items-center justify-between p-3 md:p-3.5 rounded-2xl cursor-pointer transition-all gap-3 ${
                    isSelected
                      ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                      : 'bg-slate-900/40 hover:bg-slate-900 text-slate-300 border border-slate-800/40'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className="text-xs font-semibold text-slate-500 w-5 shrink-0 text-right">
                      {isSelected && isPlaying ? '▶' : index + 1}
                    </span>
                    <span className={`font-medium text-xs md:text-sm truncate ${isSelected ? 'text-emerald-400 font-semibold' : ''}`}>
                      {cleanTitle}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* Tombol Liked / Favorite */}
                    <button
                      onClick={(e) => toggleLikeSong(e, song.id)}
                      className={`p-1.5 rounded-lg text-sm transition ${
                        isLiked ? 'text-rose-500' : 'text-slate-600 hover:text-slate-400'
                      }`}
                      title={isLiked ? "Hapus dari Favorit" : "Sukai Lagu"}
                    >
                      {isLiked ? '❤️' : '🤍'}
                    </button>

                    {/* Tombol Simpan Offline */}
                    <button
                      onClick={(e) => handleDownloadOffline(e, song)}
                      disabled={isDownloaded || isDownloading}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition ${
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

      {/* Mini-Player Footer (Baris Bawah) */}
      <footer className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-2xl border-t border-slate-800/80 px-4 md:px-8 py-2.5 z-30 flex flex-col gap-2">
        {/* Seekbar Slider Mini */}
        <div className="w-full flex items-center gap-2 max-w-4xl mx-auto text-[10px] text-slate-400 font-mono">
          <span>{formatTime(currentTime)}</span>
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={handleSeek}
            className="flex-1 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500 hover:h-1.5 transition-all"
          />
          <span>{formatTime(duration)}</span>
        </div>

        <div className="flex items-center justify-between gap-3 max-w-4xl mx-auto w-full">
          {/* Informational Judul Lagu (Klik untuk Expand Fullscreen) */}
          <div
            onClick={() => setIsPlayerExpanded(true)}
            className="min-w-0 flex-1 max-w-[50%] md:max-w-xs cursor-pointer group"
          >
            {currentSong && (
              <div className="min-w-0 flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold shrink-0 text-xs">
                  🎵
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white truncate group-hover:text-emerald-400 transition">
                    {formatSongTitle(currentSong.name)}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate">
                    {offlineSongs.includes(currentSong.id) ? '⚡ Mode Offline' : '☁️ Streaming Cloud'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Tombol Pemutar Audio */}
          <div className="flex items-center gap-3 md:gap-5 shrink-0">
            <button
              onClick={() => setIsShuffle(!isShuffle)}
              className={`text-sm md:text-base transition ${isShuffle ? 'text-emerald-400 font-bold' : 'text-slate-500 hover:text-slate-300'}`}
              title="Acak Lagu"
            >
              🔀
            </button>

            <button
              onClick={handlePrevSong}
              disabled={!currentSong}
              className="text-slate-300 hover:text-white transition text-lg md:text-xl p-1 disabled:opacity-40"
            >
              ⏮
            </button>

            <button
              onClick={togglePlay}
              disabled={!currentSong}
              className="w-10 h-10 md:w-11 md:h-11 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center font-bold hover:scale-105 active:scale-95 transition shadow-lg shadow-emerald-500/20 disabled:opacity-50"
            >
              {isPlaying ? '❚❚' : '▶'}
            </button>

            <button
              onClick={handleNextSong}
              disabled={!currentSong}
              className="text-slate-300 hover:text-white transition text-lg md:text-xl p-1 disabled:opacity-40"
            >
              ⏭
            </button>

            <button
              onClick={toggleRepeat}
              className={`text-sm md:text-base transition ${repeatMode !== 'off' ? 'text-emerald-400 font-bold' : 'text-slate-500 hover:text-slate-300'}`}
              title={repeatMode === 'one' ? 'Repeat 1 Lagu' : repeatMode === 'all' ? 'Repeat All' : 'Repeat Off'}
            >
              {repeatMode === 'one' ? '🔂' : '🔁'}
            </button>

            {/* Tombol Fullscreen Modal */}
            <button
              onClick={() => setIsPlayerExpanded(true)}
              className="text-slate-400 hover:text-white text-xs pl-2 border-l border-slate-800"
              title="Buka Player Penuh"
            >
              ⛶
            </button>
          </div>
        </div>
      </footer>

      {/* Fullscreen Mobile Player Overlay ala Spotify */}
      {isPlayerExpanded && currentSong && (
        <div className="fixed inset-0 bg-slate-950/98 backdrop-blur-3xl z-50 flex flex-col justify-between p-6 md:p-12 animate-in fade-in slide-in-from-bottom duration-300">
          {/* Top Bar Minimize */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setIsPlayerExpanded(false)}
              className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-300 text-xl hover:text-white"
            >
              ✕
            </button>
            <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
              Memutar Dari Koleksi
            </span>
            <button
              onClick={(e) => toggleLikeSong(e, currentSong.id)}
              className="text-xl"
            >
              {likedSongs.includes(currentSong.id) ? '❤️' : '🤍'}
            </button>
          </div>

          {/* Big Artwork Box */}
          <div className="my-auto flex flex-col items-center">
            <div className="w-64 h-64 sm:w-80 sm:h-80 rounded-3xl bg-gradient-to-tr from-emerald-500/20 via-teal-500/10 to-slate-900 border border-emerald-500/20 flex flex-col items-center justify-center shadow-2xl shadow-emerald-500/10 relative overflow-hidden group">
              <div className="w-24 h-24 rounded-2xl bg-emerald-500 text-slate-950 flex items-center justify-center font-black text-4xl shadow-lg">
                R
              </div>
              <span className="text-xs text-emerald-400/80 font-medium mt-4">Rey Music Player</span>
            </div>

            {/* Title */}
            <div className="text-center mt-8 max-w-sm">
              <h3 className="text-xl sm:text-2xl font-extrabold text-white truncate">
                {formatSongTitle(currentSong.name)}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {offlineSongs.includes(currentSong.id) ? '⚡ Mode Offline (Tersimpan)' : '☁️ Streaming Cloud'}
              </p>
            </div>
          </div>

          {/* Controls & Progress */}
          <div className="w-full max-w-md mx-auto flex flex-col gap-6">
            {/* Seekbar Big */}
            <div className="space-y-2">
              <input
                type="range"
                min={0}
                max={duration || 100}
                value={currentTime}
                onChange={handleSeek}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              <div className="flex justify-between text-xs text-slate-400 font-mono">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Big Control Buttons */}
            <div className="flex items-center justify-between px-4">
              <button
                onClick={() => setIsShuffle(!isShuffle)}
                className={`text-xl transition ${isShuffle ? 'text-emerald-400 font-bold' : 'text-slate-500'}`}
              >
                🔀
              </button>

              <button
                onClick={handlePrevSong}
                className="text-slate-200 text-2xl p-2"
              >
                ⏮
              </button>

              <button
                onClick={togglePlay}
                className="w-16 h-16 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center font-bold text-xl shadow-xl shadow-emerald-500/30 hover:scale-105 active:scale-95 transition"
              >
                {isPlaying ? '❚❚' : '▶'}
              </button>

              <button
                onClick={handleNextSong}
                className="text-slate-200 text-2xl p-2"
              >
                ⏭
              </button>

              <button
                onClick={toggleRepeat}
                className={`text-xl transition ${repeatMode !== 'off' ? 'text-emerald-400 font-bold' : 'text-slate-500'}`}
              >
                {repeatMode === 'one' ? '🔂' : '🔁'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}