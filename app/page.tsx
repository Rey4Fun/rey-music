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
  
  // State untuk melacak lagu yang sudah diunduh offline
  const [offlineSongs, setOfflineSongs] = useState<string[]>([]);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const formatSongTitle = (filename: string) => {
    return filename.replace(/\.(opus|mp3|m4a|wav|flac)$/i, '');
  };

  // 1. Fetch daftar lagu & cek lagu apa saja yang sudah tersimpan di Cache HP
  useEffect(() => {
    fetch('/api/songs')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setSongs(data);
          if (data.length > 0) {
            setCurrentSong(data[0]);
          }
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching songs:', err);
        setLoading(false);
      });

    // Cek isi Cache Storage HP saat aplikasi dibuka
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

  // 2. Putar lagu dari Cache HP jika ada (Offline Mode) atau dari Server Vercel (Online Mode)
  useEffect(() => {
    if (currentSong && audioRef.current) {
      const setupAudioSource = async () => {
        const streamUrl = `/api/stream/${currentSong.id}`;
        
        if ('caches' in window) {
          const cache = await caches.open('rey-music-audio-v1');
          const matchedResponse = await cache.match(streamUrl);
          
          if (matchedResponse) {
            // Ambil dari Cache HP (Offline)
            const blob = await matchedResponse.blob();
            audioRef.current!.src = URL.createObjectURL(blob);
          } else {
            // Ambil langsung dari Server (Online)
            audioRef.current!.src = streamUrl;
          }
        } else {
          audioRef.current.src = streamUrl;
        }

        if (isPlaying) {
          const playPromise = audioRef.current.play();
          if (playPromise !== undefined) {
            playPromise.catch((error) => {
              if (error.name !== 'AbortError') console.error('Playback error:', error);
            });
          }
        }
      };

      setupAudioSource();
    }
  }, [currentSong]);

  // 3. Fungsi untuk mengunduh lagu ke Cache HP
  const handleDownloadOffline = async (e: React.MouseEvent, song: Song) => {
    e.stopPropagation(); // Biar tidak memicu play lagu saat tombol download diklik
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
      console.error("Gagal menyimpan lagu offline:", err);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleNextSong = () => {
    if (!currentSong || songs.length === 0) return;
    const currentIndex = songs.findIndex((s) => s.id === currentSong.id);
    const nextIndex = (currentIndex + 1) % songs.length;
    setCurrentSong(songs[nextIndex]);
    setIsPlaying(true);
  };

  const handlePrevSong = () => {
    if (!currentSong || songs.length === 0) return;
    const currentIndex = songs.findIndex((s) => s.id === currentSong.id);
    const prevIndex = (currentIndex - 1 + songs.length) % songs.length;
    setCurrentSong(songs[prevIndex]);
    setIsPlaying(true);
  };

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
  }, [currentSong, songs]);

  const togglePlay = () => {
    if (!audioRef.current || !currentSong) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          if (error.name !== 'AbortError') console.error('Playback error:', error);
        });
      }
    }
  };

  const handleSongSelect = (song: Song) => {
    setCurrentSong(song);
    setIsPlaying(true);
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-slate-950 text-white antialiased">
      <audio
        ref={audioRef}
        onEnded={handleNextSong}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />

      {/* Header Mobile / Sidebar Desktop */}
      <aside className="w-full md:w-64 border-b md:border-b-0 md:border-r border-slate-800 p-4 md:p-6 flex flex-row md:flex-col justify-between items-center md:items-stretch shrink-0 bg-slate-950/90 backdrop-blur-md sticky top-0 z-20">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-wider text-emerald-400">
            REY MUSIC
          </h1>
          <p className="text-xs text-slate-400 hidden md:block mt-1">Personal Cloud Player</p>
        </div>

        {currentSong && (
          <div className="hidden md:flex items-center gap-3 bg-slate-900 p-3 rounded-xl border border-slate-800 min-w-0">
            <div className="w-10 h-10 bg-emerald-500/10 text-emerald-400 rounded-lg flex items-center justify-center font-bold shrink-0">
              🎵
            </div>
            <div className="overflow-hidden min-w-0">
              <p className="text-sm font-semibold truncate">{formatSongTitle(currentSong.name)}</p>
              <p className="text-xs text-slate-400">Google Drive</p>
            </div>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 pb-28 min-w-0">
        <h2 className="text-lg md:text-xl font-bold mb-4 md:mb-6">Koleksi Lagu Saya</h2>

        {loading ? (
          <p className="text-slate-400 text-sm">Memuat lagu dari Drive...</p>
        ) : songs.length === 0 ? (
          <p className="text-slate-400 text-sm">Tidak ada lagu yang ditemukan.</p>
        ) : (
          <div className="space-y-2">
            {songs.map((song, index) => {
              const isSelected = currentSong?.id === song.id;
              const cleanTitle = formatSongTitle(song.name);
              const isDownloaded = offlineSongs.includes(song.id);
              const isDownloading = downloadingId === song.id;

              return (
                <div
                  key={song.id}
                  onClick={() => handleSongSelect(song)}
                  className={`flex items-center justify-between p-3.5 md:p-4 rounded-xl cursor-pointer transition gap-3 ${
                    isSelected
                      ? 'bg-emerald-950/40 border border-emerald-500/30 text-emerald-300'
                      : 'bg-slate-900/50 hover:bg-slate-900 text-slate-300 border border-slate-800/50'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className="text-sm text-slate-500 w-5 shrink-0 text-right">{index + 1}</span>
                    <span className="font-medium text-sm truncate">{cleanTitle}</span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* Status Play */}
                    {isSelected && isPlaying && (
                      <span className="text-xs text-emerald-400 font-semibold bg-emerald-500/10 px-2.5 py-1 rounded-full">
                        Playing
                      </span>
                    )}

                    {/* Tombol Simpan Offline */}
                    <button
                      onClick={(e) => handleDownloadOffline(e, song)}
                      disabled={isDownloaded || isDownloading}
                      title={isDownloaded ? "Tersimpan Offline" : "Unduh untuk Offline"}
                      className={`p-2 rounded-lg text-xs font-medium transition ${
                        isDownloaded
                          ? 'text-emerald-400 bg-emerald-500/10 cursor-default'
                          : isDownloading
                          ? 'text-amber-400 bg-amber-500/10 animate-pulse'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      {isDownloaded ? '✓ Offline' : isDownloading ? '⏳...' : '⬇️ Simpan'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Footer Controls */}
      <footer className="fixed bottom-0 left-0 right-0 h-20 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 px-4 md:px-8 flex items-center justify-between gap-3 z-30">
        <div className="min-w-0 flex-1 max-w-[55%] md:max-w-xs">
          {currentSong && (
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">
                {formatSongTitle(currentSong.name)}
              </p>
              <p className="text-xs text-slate-400 truncate">
                {offlineSongs.includes(currentSong.id) ? '⚡ Diputar Offline' : '☁️ Streaming Online'}
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 md:gap-4 shrink-0">
          <button
            onClick={handlePrevSong}
            disabled={!currentSong}
            className="text-slate-400 hover:text-white transition disabled:opacity-50 text-xl font-bold p-2"
          >
            ⏮
          </button>

          <button
            onClick={togglePlay}
            disabled={!currentSong}
            className="w-11 h-11 md:w-12 md:h-12 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center font-bold hover:scale-105 transition disabled:opacity-50 shrink-0"
          >
            {isPlaying ? '❚❚' : '▶'}
          </button>

          <button
            onClick={handleNextSong}
            disabled={!currentSong}
            className="text-slate-400 hover:text-white transition disabled:opacity-50 text-xl font-bold p-2"
          >
            ⏭
          </button>
        </div>
      </footer>
    </div>
  );
}