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
  const audioRef = useRef<HTMLAudioElement | null>(null);

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
  }, []);

  useEffect(() => {
    if (currentSong && audioRef.current) {
      audioRef.current.src = `/api/stream/${currentSong.id}`;
      if (isPlaying) {
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch((error) => {
            if (error.name !== 'AbortError') {
              console.error('Playback error:', error);
            }
          });
        }
      }
    }
  }, [currentSong]);

  const togglePlay = () => {
    if (!audioRef.current || !currentSong) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => setIsPlaying(true))
          .catch((error) => {
            if (error.name !== 'AbortError') {
              console.error('Playback error:', error);
            }
          });
      }
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

  const handleSongSelect = (song: Song) => {
    setCurrentSong(song);
    setIsPlaying(true);
  };

  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      {/* Event onEnded akan otomatis memanggil handleNextSong */}
      <audio ref={audioRef} onEnded={handleNextSong} />

      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-800 p-6 flex flex-col justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-wider text-emerald-400">
            REY MUSIC
          </h1>
          <p className="text-xs text-slate-400 mt-1">Personal Cloud Player</p>
        </div>

        {currentSong && (
          <div className="flex items-center gap-3 bg-slate-900 p-3 rounded-xl border border-slate-800">
            <div className="w-10 h-10 bg-emerald-500/10 text-emerald-400 rounded-lg flex items-center justify-center font-bold">
              N
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-semibold truncate">{currentSong.name}</p>
              <p className="text-xs text-slate-400">Google Drive</p>
            </div>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 pb-28">
        <h2 className="text-xl font-bold mb-6">Koleksi Lagu Saya</h2>

        {loading ? (
          <p className="text-slate-400 text-sm">Memuat lagu dari Drive...</p>
        ) : songs.length === 0 ? (
          <p className="text-slate-400 text-sm">Tidak ada lagu yang ditemukan.</p>
        ) : (
          <div className="space-y-2">
            {songs.map((song, index) => {
              const isSelected = currentSong?.id === song.id;
              return (
                <div
                  key={song.id}
                  onClick={() => handleSongSelect(song)}
                  className={`flex items-center justify-between p-4 rounded-xl cursor-pointer transition ${
                    isSelected
                      ? 'bg-emerald-950/40 border border-emerald-500/30 text-emerald-300'
                      : 'bg-slate-900/50 hover:bg-slate-900 text-slate-300 border border-slate-800/50'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-slate-500 w-4">{index + 1}</span>
                    <span className="font-medium text-sm">{song.name}</span>
                  </div>
                  <span className="text-xs text-slate-400">
                    {isSelected && isPlaying ? 'Playing' : ''}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Bottom Player Controls */}
      <footer className="fixed bottom-0 left-0 right-0 h-20 bg-slate-900/90 backdrop-blur-md border-t border-slate-800 px-8 flex items-center justify-between">
        <div>
          {currentSong && (
            <div>
              <p className="text-sm font-semibold text-white">{currentSong.name}</p>
              <p className="text-xs text-slate-400">Google Drive</p>
            </div>
          )}
        </div>

        {/* Player Controls (Prev, Play/Pause, Next) */}
        <div className="flex items-center gap-4">
          <button
            onClick={handlePrevSong}
            disabled={!currentSong}
            className="text-slate-400 hover:text-white transition disabled:opacity-50 text-xl font-bold px-2"
          >
            ⏮
          </button>

          <button
            onClick={togglePlay}
            disabled={!currentSong}
            className="w-12 h-12 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center font-bold hover:scale-105 transition disabled:opacity-50"
          >
            {isPlaying ? '❚❚' : '▶'}
          </button>

          <button
            onClick={handleNextSong}
            disabled={!currentSong}
            className="text-slate-400 hover:text-white transition disabled:opacity-50 text-xl font-bold px-2"
          >
            ⏭
          </button>
        </div>
      </footer>
    </div>
  );
}