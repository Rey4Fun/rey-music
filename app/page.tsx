"use client";

import { useState, useEffect, useRef, useMemo } from 'react';

interface Song {
  id: string;
  name: string;
}

interface Playlist {
  id: string;
  name: string;
  songIds: string[];
}

export default function Home() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(true);

  // 1. Search & Navigation Tabs ('all' | 'liked' | 'library')
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'liked' | 'library'>('all');

  // 2. Liked Songs (Favorites)
  const [likedSongs, setLikedSongs] = useState<string[]>([]);

  // 3. Playlists & Library State
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [selectedSongForModal, setSelectedSongForModal] = useState<string | null>(null);

  // 4. Fullscreen Player State
  const [isPlayerExpanded, setIsPlayerExpanded] = useState(false);

  // 5. Batch Download State
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

  // Initial Load (Songs, Liked Songs, Playlists, Offline Cache, & Service Worker)
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
        // Dipaksa ambil data paling baru dari server tanpa menyimpan cache API lama
        const res = await fetch(`/api/songs?t=${Date.now()}`, { cache: 'no-store' });
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

    // Load Playlists dari LocalStorage
    const savedPlaylists = localStorage.getItem('rey_music_playlists');
    if (savedPlaylists) {
      try {
        setPlaylists(JSON.parse(savedPlaylists));
      } catch (e) {
        console.error(e);
      }
    } else {
      // Playlist default jika pertama kali buka
      const defaultPlaylists: Playlist[] = [
        { id: '1', name: 'Lagu Enak 🎧', songIds: [] },
        { id: '2', name: 'Santai / Chill ☕', songIds: [] },
      ];
      setPlaylists(defaultPlaylists);
      localStorage.setItem('rey_music_playlists', JSON.stringify(defaultPlaylists));
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

  // Simpan Playlist ke LocalStorage setiap ada perubahan
  useEffect(() => {
    if (playlists.length > 0) {
      localStorage.setItem('rey_music_playlists', JSON.stringify(playlists));
    }
  }, [playlists]);

  // Filter Songs berdasarkan Search, Tab, & Selected Playlist
  const filteredSongs = useMemo(() => {
    return songs.filter((song) => {
      const matchesSearch = song.name.toLowerCase().includes(searchQuery.toLowerCase());

      if (activeTab === 'liked') {
        return matchesSearch && likedSongs.includes(song.id);
      }

      if (activeTab === 'library' && selectedPlaylistId) {
        const targetPlaylist = playlists.find((p) => p.id === selectedPlaylistId);
        return matchesSearch && targetPlaylist?.songIds.includes(song.id);
      }

      return matchesSearch;
    });
  }, [songs, searchQuery, activeTab, likedSongs, selectedPlaylistId, playlists]);

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

  // Playlist Handler Functions
  const handleCreatePlaylist = () => {
    const name = prompt('Masukkan nama playlist baru:');
    if (name && name.trim() !== '') {
      const newPl: Playlist = {
        id: Date.now().toString(),
        name: name.trim(),
        songIds: [],
      };
      setPlaylists((prev) => [...prev, newPl]);
    }
  };

  const handleDeletePlaylist = (e: React.MouseEvent, playlistId: string) => {
    e.stopPropagation();
    if (confirm('Yakin ingin menghapus playlist ini?')) {
      setPlaylists((prev) => prev.filter((p) => p.id !== playlistId));
      if (selectedPlaylistId === playlistId) setSelectedPlaylistId(null);
    }
  };

  const toggleSongInPlaylist = (playlistId: string, songId: string) => {
    setPlaylists((prev) =>
      prev.map((pl) => {
        if (pl.id === playlistId) {
          const exists = pl.songIds.includes(songId);
          return {
            ...pl,
            songIds: exists
              ? pl.songIds.filter((id) => id !== songId)
              : [...pl.songIds, songId],
          };
        }
        return pl;
      })
    );
  };

  // Setup Audio Source
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

  const activePlaylist = playlists.find((p) => p.id === selectedPlaylistId);

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
            onClick={() => { setActiveTab('all'); setSelectedPlaylistId(null); }}
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
            onClick={() => { setActiveTab('liked'); setSelectedPlaylistId(null); }}
            className={`flex-1 md:flex-none text-left px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-between ${
              activeTab === 'liked'
                ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <span>❤️ Lagu Disukai</span>
            <span className="text-[10px] opacity-70">({likedSongs.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('library')}
            className={`flex-1 md:flex-none text-left px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-between ${
              activeTab === 'library'
                ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <span>📚 Koleksi Kamu</span>
            <span className="text-[10px] opacity-70">({playlists.length})</span>
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

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 pb-36 min-w-0 max-w-5xl mx-auto w-full">
        {/* VIEW 1: KOLEKSI / DAFTAR PLAYLIST (Jika di tab Library & belum pilih playlist) */}
        {activeTab === 'library' && !selectedPlaylistId ? (
          <div>
            <div className="flex items-center justify-between gap-3 mb-6">
              <div>
                <h2 className="text-xl md:text-2xl font-extrabold tracking-tight">Koleksi Kamu 📚</h2>
                <p className="text-xs text-slate-400 mt-0.5">Kelola playlist & mood lagu kamu</p>
              </div>

              <button
                onClick={handleCreatePlaylist}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-purple-600 text-white hover:bg-purple-500 transition-all shadow-lg shadow-purple-600/20"
              >
                <span>➕ Buat Playlist</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {playlists.map((pl) => (
                <div
                  key={pl.id}
                  onClick={() => setSelectedPlaylistId(pl.id)}
                  className="group flex items-center justify-between p-4 rounded-2xl bg-slate-900/60 hover:bg-slate-900 border border-slate-800/60 cursor-pointer transition-all"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center font-black text-lg text-white shadow-md">
                      {pl.name[0]?.toUpperCase() || '🎵'}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-white truncate group-hover:text-purple-400 transition">
                        {pl.name}
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">{pl.songIds.length} lagu</p>
                    </div>
                  </div>

                  <button
                    onClick={(e) => handleDeletePlaylist(e, pl.id)}
                    className="p-1.5 text-slate-600 hover:text-rose-400 text-xs transition"
                    title="Hapus Playlist"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* VIEW 2: DAFTAR LAGU (Tampilan Utama / Liked / Detail Playlist) */
          <div>
            {/* Header Content & Action Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div>
                {activeTab === 'library' && selectedPlaylistId && (
                  <button
                    onClick={() => setSelectedPlaylistId(null)}
                    className="text-xs text-purple-400 font-medium mb-1 hover:underline flex items-center gap-1"
                  >
                    ← Kembali ke Koleksi
                  </button>
                )}
                <h2 className="text-xl md:text-2xl font-extrabold tracking-tight">
                  {activeTab === 'liked'
                    ? 'Lagu Disukai ❤️'
                    : activeTab === 'library' && activePlaylist
                    ? activePlaylist.name
                    : 'Koleksi Lagu Saya'}
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
                        {/* Tombol Simpan ke Playlist */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedSongForModal(song.id);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-purple-400 hover:bg-slate-800 transition text-xs font-bold"
                          title="Tambah ke Playlist"
                        >
                          ➕
                        </button>

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
          </div>
        )}
      </main>

      {/* POP-UP MODAL: SIMPAN KE PLAYLIST */}
      {selectedSongForModal && (
        <div 
          onClick={() => setSelectedSongForModal(null)}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-2xl p-5 space-y-4 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-200"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-white">Simpan ke Playlist</h3>
              <button 
                onClick={() => setSelectedSongForModal(null)}
                className="text-slate-400 hover:text-white text-xs p-1"
              >
                ✕
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2">
              {playlists.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-4">Belum ada playlist. Buat playlist baru dulu.</p>
              ) : (
                playlists.map((pl) => {
                  const isAdded = pl.songIds.includes(selectedSongForModal);
                  return (
                    <button
                      key={pl.id}
                      onClick={() => toggleSongInPlaylist(pl.id, selectedSongForModal)}
                      className={`w-full text-left p-3 rounded-xl border flex items-center justify-between text-xs transition ${
                        isAdded
                          ? 'bg-purple-500/10 border-purple-500/30 text-purple-300'
                          : 'bg-slate-800/50 border-slate-700/50 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <span className="font-medium truncate">{pl.name}</span>
                      <span className={`text-[11px] font-semibold ${isAdded ? 'text-purple-400' : 'text-slate-500'}`}>
                        {isAdded ? '✓ Tersimpan' : '+ Tambah'}
                      </span>
                    </button>
                  );
                })
              )}
            </div>

            <button
              onClick={() => {
                handleCreatePlaylist();
              }}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-purple-400 border border-purple-500/20 transition"
            >
              ➕ Buat Playlist Baru
            </button>
          </div>
        </div>
      )}

      {/* Mini-Player Footer */}
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
          {/* Informational Judul Lagu */}
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

          <div className="my-auto flex flex-col items-center">
            <div className="w-64 h-64 sm:w-80 sm:h-80 rounded-3xl bg-gradient-to-tr from-emerald-500/20 via-teal-500/10 to-slate-900 border border-emerald-500/20 flex flex-col items-center justify-center shadow-2xl shadow-emerald-500/10 relative overflow-hidden group">
              <div className="w-24 h-24 rounded-2xl bg-emerald-500 text-slate-950 flex items-center justify-center font-black text-4xl shadow-lg">
                R
              </div>
              <span className="text-xs text-emerald-400/80 font-medium mt-4">Rey Music Player</span>
            </div>

            <div className="text-center mt-8 max-w-sm">
              <h3 className="text-xl sm:text-2xl font-extrabold text-white truncate">
                {formatSongTitle(currentSong.name)}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {offlineSongs.includes(currentSong.id) ? '⚡ Mode Offline (Tersimpan)' : '☁️ Streaming Cloud'}
              </p>
            </div>
          </div>

          <div className="w-full max-w-md mx-auto flex flex-col gap-6">
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