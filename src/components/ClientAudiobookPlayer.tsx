'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  AudiobookCorrectionNote,
  AudiobookListeningProgress,
  AudiobookProject,
  GMDEI_OFFICIAL_WHATSAPP,
  formatAudioTime,
  withBasePath,
} from '@/lib/audiobooks-config';
import {
  BookmarkPlus,
  Check,
  Copy,
  Headphones,
  ListMusic,
  Lock,
  MessageCircle,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  Settings,
  SkipBack,
  SkipForward,
  Trash2,
  Volume2,
} from 'lucide-react';

interface ClientAudiobookPlayerProps {
  book: AudiobookProject;
  onOpenStudioAdmin?: () => void;
}

const SPEED_OPTIONS = [1.0, 1.25, 1.5, 2.0];

export default function ClientAudiobookPlayer({
  book,
  onOpenStudioAdmin,
}: ClientAudiobookPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Control de PIN opcional de 4 dígitos por cliente
  const requiresPin = Boolean(book.clientPin && book.clientPin.trim().length > 0);
  const [pinInput, setPinInput] = useState<string>('');
  const [isUnlocked, setIsUnlocked] = useState<boolean>(!requiresPin);
  const [pinError, setPinError] = useState<string>('');

  // Estado del reproductor HTMLAudioElement
  const [chapterIndex, setChapterIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [completedChapterIds, setCompletedChapterIds] = useState<string[]>([]);

  // Notas de corrección del cliente en el segundo exacto
  const [notes, setNotes] = useState<AudiobookCorrectionNote[]>([]);
  const [isAddingNote, setIsAddingNote] = useState<boolean>(false);
  const [capturedTimestamp, setCapturedTimestamp] = useState<number>(0);
  const [noteDraft, setNoteDraft] = useState<string>('');
  const [copiedFeedback, setCopiedFeedback] = useState<boolean>(false);

  const progressStorageKey = `gmdei_audiobook_progress_${book.slug}`;
  const notesStorageKey = `gmdei_audiobook_notes_${book.slug}`;
  const pinStorageKey = `gmdei_audiobook_pin_unlocked_${book.slug}`;

  const currentChapter = book.chapters[chapterIndex] || book.chapters[0];

  // 1. Restaurar estado guardado en localStorage (capítulo, segundo exacto, velocidad, notas y PIN)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (requiresPin) {
      const savedPin = sessionStorage.getItem(pinStorageKey);
      if (savedPin === book.clientPin) {
        setIsUnlocked(true);
      } else {
        setIsUnlocked(false);
      }
    } else {
      setIsUnlocked(true);
    }

    const rawProgress = localStorage.getItem(progressStorageKey);
    if (rawProgress) {
      try {
        const parsed = JSON.parse(rawProgress) as AudiobookListeningProgress;
        const validIdx =
          parsed.chapterIndex >= 0 && parsed.chapterIndex < book.chapters.length
            ? parsed.chapterIndex
            : 0;
        setChapterIndex(validIdx);
        setCurrentTime(parsed.currentTime || 0);
        setPlaybackRate(parsed.playbackRate || 1.0);
        setCompletedChapterIds(parsed.completedChapterIds || []);

        setTimeout(() => {
          if (audioRef.current && parsed.currentTime > 0) {
            audioRef.current.currentTime = parsed.currentTime;
            audioRef.current.playbackRate = parsed.playbackRate || 1.0;
          }
        }, 180);
      } catch {
        // Ignorar progreso corrupto
      }
    }

    const rawNotes = localStorage.getItem(notesStorageKey);
    if (rawNotes) {
      try {
        setNotes(JSON.parse(rawNotes));
      } catch {
        setNotes([]);
      }
    }
  }, [book.slug, book.clientPin, requiresPin, progressStorageKey, notesStorageKey, pinStorageKey]);

  // 2. Guardar automáticamente en localStorage el último capítulo y segundo escuchado
  useEffect(() => {
    if (typeof window === 'undefined' || !isUnlocked) return;
    const payload: AudiobookListeningProgress = {
      bookSlug: book.slug,
      chapterIndex,
      currentTime,
      playbackRate,
      completedChapterIds,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(progressStorageKey, JSON.stringify(payload));
  }, [
    book.slug,
    chapterIndex,
    currentTime,
    playbackRate,
    completedChapterIds,
    isUnlocked,
    progressStorageKey,
  ]);

  // 3. Aplicar velocidad de reproducción al HTMLAudioElement nativo
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate, chapterIndex]);

  // 4. Implementar Media Session API completa para reproducción en segundo plano y pantalla bloqueada (iOS Safari + Android Chrome)
  useEffect(() => {
    if (typeof window === 'undefined' || !('mediaSession' in navigator) || !currentChapter) {
      return;
    }

    const resolvedCover = withBasePath(book.coverUrl || '/assets/portada-1.jpg');
    const absoluteCoverUrl = resolvedCover.startsWith('http')
      ? resolvedCover
      : `${window.location.origin}${resolvedCover.startsWith('/') ? '' : '/'}${resolvedCover}`;

    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: `${currentChapter.title}`,
        artist: `${book.author} · Editora gmDEI`,
        album: book.title,
        artwork: [
          { src: absoluteCoverUrl, sizes: '96x96', type: 'image/jpeg' },
          { src: absoluteCoverUrl, sizes: '192x192', type: 'image/jpeg' },
          { src: absoluteCoverUrl, sizes: '512x512', type: 'image/jpeg' },
        ],
      });

      navigator.mediaSession.setActionHandler('play', () => {
        audioRef.current?.play().catch(() => {});
        setIsPlaying(true);
      });

      navigator.mediaSession.setActionHandler('pause', () => {
        audioRef.current?.pause();
        setIsPlaying(false);
      });

      navigator.mediaSession.setActionHandler('seekbackward', (details) => {
        const offset = details.seekOffset || 15;
        if (audioRef.current) {
          audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - offset);
          setCurrentTime(audioRef.current.currentTime);
        }
      });

      navigator.mediaSession.setActionHandler('seekforward', (details) => {
        const offset = details.seekOffset || 30;
        if (audioRef.current) {
          const maxDur = audioRef.current.duration || duration || 99999;
          audioRef.current.currentTime = Math.min(maxDur, audioRef.current.currentTime + offset);
          setCurrentTime(audioRef.current.currentTime);
        }
      });

      navigator.mediaSession.setActionHandler('previoustrack', () => {
        handleSelectChapter(Math.max(0, chapterIndex - 1), true);
      });

      navigator.mediaSession.setActionHandler('nexttrack', () => {
        if (chapterIndex < book.chapters.length - 1) {
          handleSelectChapter(chapterIndex + 1, true);
        }
      });

      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (audioRef.current && typeof details.seekTime === 'number') {
          audioRef.current.currentTime = details.seekTime;
          setCurrentTime(details.seekTime);
        }
      });
    } catch {
      // Fallback silencioso en navegadores que no soporten algún handler específico
    }
  }, [book, currentChapter, chapterIndex, duration]);

  // Actualizar PositionState en la pantalla bloqueada del teléfono
  const updateMediaSessionPosition = (time: number, dur: number, rate: number) => {
    if (
      typeof window !== 'undefined' &&
      'mediaSession' in navigator &&
      'setPositionState' in navigator.mediaSession &&
      Number.isFinite(dur) &&
      dur > 0
    ) {
      try {
        navigator.mediaSession.setPositionState({
          duration: dur,
          playbackRate: rate,
          position: Math.min(time, dur),
        });
      } catch {
        // Ignorar si position > duration temporalmente
      }
    }
  };

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio
        .play()
        .then(() => {
          setIsPlaying(true);
          if ('mediaSession' in navigator) {
            navigator.mediaSession.playbackState = 'playing';
          }
        })
        .catch(() => {});
    } else {
      audio.pause();
      setIsPlaying(false);
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'paused';
      }
    }
  };

  const handleSeekRelative = (deltaSeconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    const maxDur = Number.isFinite(audio.duration) ? audio.duration : duration || 9999;
    const nextTime = Math.max(0, Math.min(maxDur, audio.currentTime + deltaSeconds));
    audio.currentTime = nextTime;
    setCurrentTime(nextTime);
    updateMediaSessionPosition(nextTime, maxDur, playbackRate);
  };

  const handleSelectChapter = (newIndex: number, autoStart = true) => {
    if (newIndex < 0 || newIndex >= book.chapters.length) return;
    setChapterIndex(newIndex);
    setCurrentTime(0);
    setTimeout(() => {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.playbackRate = playbackRate;
        if (autoStart) {
          audioRef.current
            .play()
            .then(() => setIsPlaying(true))
            .catch(() => setIsPlaying(false));
        }
      }
    }, 60);
  };

  const handleChapterEnded = () => {
    if (currentChapter && !completedChapterIds.includes(currentChapter.id)) {
      setCompletedChapterIds((prev) => [...prev, currentChapter.id]);
    }
    if (chapterIndex < book.chapters.length - 1) {
      handleSelectChapter(chapterIndex + 1, true);
    } else {
      setIsPlaying(false);
    }
  };

  // Capturar segundo exacto para agregar nota de corrección
  const handleStartAddNoteAtCurrentSecond = () => {
    const exactSec = audioRef.current ? Math.floor(audioRef.current.currentTime) : Math.floor(currentTime);
    setCapturedTimestamp(exactSec);
    setIsAddingNote(true);
  };

  const handleSaveNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteDraft.trim() || !currentChapter) return;

    const newNote: AudiobookCorrectionNote = {
      id: `note-${Date.now()}`,
      bookSlug: book.slug,
      chapterId: currentChapter.id,
      chapterNumber: currentChapter.number,
      chapterTitle: currentChapter.title,
      timestampSeconds: capturedTimestamp,
      formattedTime: formatAudioTime(capturedTimestamp),
      note: noteDraft.trim(),
      createdAt: new Date().toISOString(),
    };

    const updated = [newNote, ...notes];
    setNotes(updated);
    localStorage.setItem(notesStorageKey, JSON.stringify(updated));
    setNoteDraft('');
    setIsAddingNote(false);
  };

  const handleDeleteNote = (id: string) => {
    const updated = notes.filter((n) => n.id !== id);
    setNotes(updated);
    localStorage.setItem(notesStorageKey, JSON.stringify(updated));
  };

  // Saltar exactamente al capítulo y segundo de una nota guardada
  const handleJumpToNoteTimestamp = (note: AudiobookCorrectionNote) => {
    const targetIdx = book.chapters.findIndex((c) => c.id === note.chapterId);
    const resolvedIdx = targetIdx >= 0 ? targetIdx : note.chapterNumber - 1;

    if (resolvedIdx !== chapterIndex && resolvedIdx >= 0 && resolvedIdx < book.chapters.length) {
      setChapterIndex(resolvedIdx);
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.currentTime = note.timestampSeconds;
          setCurrentTime(note.timestampSeconds);
          audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
        }
      }, 120);
    } else if (audioRef.current) {
      audioRef.current.currentTime = note.timestampSeconds;
      setCurrentTime(note.timestampSeconds);
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  // Formatear todas las notas para enviar a gmDEI por WhatsApp o copiar al portapapeles
  const buildCorrectionsReportText = (): string => {
    const header = `🎧 *CORRECCIONES DE AUDIOLIBRO — EDITORA gmDEI*\n📚 *Obra:* ${book.title}\n✍️ *Autor:* ${book.author}\nTotal de notas: ${notes.length}\n-----------------------------------`;
    const sorted = [...notes].sort((a, b) => {
      if (a.chapterNumber !== b.chapterNumber) return a.chapterNumber - b.chapterNumber;
      return a.timestampSeconds - b.timestampSeconds;
    });
    const lines = sorted.map(
      (n, idx) =>
        `${idx + 1}. *[Cap. ${String(n.chapterNumber).padStart(2, '0')} - ${n.chapterTitle} | Minuto ${
          n.formattedTime
        }]*\n   ↳ Observación: ${n.note}`
    );
    return `${header}\n${lines.join('\n\n')}`;
  };

  const handleCopyCorrections = async () => {
    const report = buildCorrectionsReportText();
    await navigator.clipboard.writeText(report);
    setCopiedFeedback(true);
    setTimeout(() => setCopiedFeedback(false), 3000);
  };

  const handleSendCorrectionsViaWhatsApp = () => {
    const report = buildCorrectionsReportText();
    const cleanPhone = GMDEI_OFFICIAL_WHATSAPP.replace(/\D/g, '');
    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(report)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  // Vista si el audiolibro tiene PIN de 4 dígitos configurado por el editor
  if (!isUnlocked) {
    return (
      <div className="min-h-screen flex flex-col justify-between bg-[#C9C9C4] text-[#151515]">
        <header className="border-b border-[#151515]/20 bg-[#EFEFEA] px-6 py-4">
          <div className="mx-auto flex max-w-3xl items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <img src={withBasePath('/assets/gmdei.png')} alt="gmDEI Editorial" className="h-9 w-auto" />
              <span className="type-label text-[#07517A]">Audiolibros</span>
            </Link>
            {onOpenStudioAdmin && (
              <button
                type="button"
                onClick={onOpenStudioAdmin}
                className="btn-brutalist px-3 py-1.5 text-xs"
              >
                Panel Editor
              </button>
            )}
          </div>
        </header>

        <main className="mx-auto my-auto w-full max-w-md px-6 py-12">
          <div className="border-2 border-[#151515] bg-[#EFEFEA] p-7 shadow-[0_18px_40px_rgb(30_30_26/0.28)]">
            <div className="flex items-center gap-2 text-[#E93416]">
              <Lock className="h-5 w-5" />
              <span className="type-label">AUDIOLIBRO PRIVADO · PIN DE CLIENTE</span>
            </div>
            <h1 className="type-poster mt-3 text-3xl text-[#07517A]">{book.title}</h1>
            <p className="mt-1 text-xs font-bold uppercase text-[#45453F]">Autor: {book.author}</p>
            <p className="mt-3 text-sm text-[#151515]">
              Ingresa el PIN de 4 dígitos proporcionado por <strong>Editora gmDEI</strong> para
              escuchar y anotar correcciones en este audiolibro.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (pinInput.trim() === book.clientPin) {
                  sessionStorage.setItem(pinStorageKey, book.clientPin || '');
                  setIsUnlocked(true);
                  setPinError('');
                } else {
                  setPinError('PIN incorrecto. Verifica el código enviado por gmDEI.');
                }
              }}
              className="mt-5 space-y-4"
            >
              <div>
                <label htmlFor="clientPinInput" className="type-label block text-[#07517A]">
                  PIN de Acceso (4 dígitos)
                </label>
                <input
                  id="clientPinInput"
                  type="text"
                  inputMode="numeric"
                  maxLength={8}
                  required
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  placeholder="••••"
                  className="mt-1.5 w-full border-2 border-[#151515] bg-white px-4 py-3 text-center font-mono text-2xl font-bold tracking-[0.4em] text-[#07517A]"
                />
              </div>
              {pinError && (
                <p role="alert" className="text-xs font-bold text-[#E93416]">
                  {pinError}
                </p>
              )}
              <button type="submit" className="btn-brutalist btn-brutalist--primary w-full py-3.5">
                Desbloquear Reproductor gmDEI →
              </button>
            </form>
          </div>
        </main>

        <footer className="border-t border-[#151515]/20 bg-[#BDBDB7] py-4 text-center type-meta text-[#45453F]">
          Editora gmDEI · Reproductor Oficial de Audiolibros
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#C9C9C4] text-[#151515]">
      {/* Elemento HTMLAudioElement nativo ultra ligero (funciona con pantalla bloqueada en iOS/Android) */}
      <audio
        ref={audioRef}
        src={withBasePath(currentChapter?.src || '')}
        preload="metadata"
        playsInline
        onLoadedMetadata={(e) => {
          const dur = e.currentTarget.duration;
          if (Number.isFinite(dur) && dur > 0) {
            setDuration(dur);
            updateMediaSessionPosition(e.currentTarget.currentTime, dur, playbackRate);
          } else if (currentChapter?.durationSeconds) {
            setDuration(currentChapter.durationSeconds);
          }
        }}
        onTimeUpdate={(e) => {
          const t = e.currentTarget.currentTime;
          setCurrentTime(t);
          if (Number.isFinite(e.currentTarget.duration) && e.currentTarget.duration > 0) {
            updateMediaSessionPosition(t, e.currentTarget.duration, playbackRate);
          }
        }}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={handleChapterEnded}
      />

      {/* CABECERA CON SELLO / LOGO DE GMDEI */}
      <header className="sticky top-0 z-30 border-b border-[#151515]/20 bg-[#EFEFEA]/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-3">
            <img
              src={withBasePath('/assets/gmdei.png')}
              alt="gmDEI Editorial"
              className="h-9 w-auto object-contain"
            />
            <div className="border-l border-[#151515]/20 pl-3">
              <span className="type-label block text-[10px] text-[#E93416]">
                EDITORA GMDEI · AUDIO
              </span>
              <span className="font-editorial text-xs font-bold text-[#07517A]">
                Reproductor de Revisión y Escucha
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            {onOpenStudioAdmin && (
              <button
                type="button"
                onClick={onOpenStudioAdmin}
                className="btn-brutalist px-3 py-1.5 text-[11px]"
              >
                <Settings className="mr-1.5 h-3.5 w-3.5 text-[#E93416]" />
                gmDEI Studio (Editor)
              </button>
            )}
          </div>
        </div>
      </header>

      {/* CUERPO PRINCIPAL MOBILE-FIRST */}
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6 sm:py-10">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-start">
          {/* COLUMNA IZQUIERDA (7 cols): Reproductor Principal y Controles Táctiles */}
          <section
            aria-label="Reproductor de audiolibro"
            className="border-2 border-[#151515] bg-[#EFEFEA] p-5 shadow-[0_20px_45px_rgb(30_30_26/0.25)] sm:p-7 lg:col-span-7"
          >
            {/* Cabecera del libro con portada enmarcada tipo Sticker Polaroid */}
            <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
              <div className="relative h-44 w-36 shrink-0 -rotate-1 border-2 border-[#151515] bg-white p-1.5 shadow-lg">
                <img
                  src={withBasePath(book.coverUrl || '/assets/portada-1.jpg')}
                  alt={`Portada de ${book.title}`}
                  className="h-full w-full object-cover"
                />
                <span className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap bg-[#07517A] px-2 py-0.5 font-mono text-[9px] font-bold uppercase text-white">
                  GMDEI AUDIO
                </span>
              </div>

              <div className="flex-1 text-center sm:text-left">
                <div className="inline-flex items-center gap-1.5 bg-[#151515] px-2.5 py-1 text-[10px] font-mono font-bold uppercase text-[#EFEFEA]">
                  <Headphones className="h-3 w-3 text-[#E93416]" />
                  CAPÍTULO {String(chapterIndex + 1).padStart(2, '0')} DE{' '}
                  {String(book.chapters.length).padStart(2, '0')}
                </div>

                <h1 className="type-poster mt-2.5 text-2xl text-[#07517A] sm:text-3xl">
                  {book.title}
                </h1>
                <p className="mt-1 text-xs font-bold uppercase tracking-wider text-[#45453F]">
                  Autor: {book.author}{' '}
                  {book.narrator ? `· Voz: ${book.narrator}` : '· Editora gmDEI'}
                </p>

                <div className="mt-3 border-l-4 border-[#E93416] bg-white px-3.5 py-2 text-left shadow-2xs">
                  <span className="type-meta block text-[10px] uppercase text-[#E93416]">
                    Reproduciendo ahora:
                  </span>
                  <p className="font-editorial text-sm font-bold text-[#151515] sm:text-base">
                    {currentChapter?.title || 'Capítulo sin título'}
                  </p>
                </div>
              </div>
            </div>

            {/* BARRA DE PROGRESO TÁCTIL FLUIDA */}
            <div className="mt-7">
              <label htmlFor="audioSeekSlider" className="sr-only">
                Progreso del capítulo
              </label>
              <input
                id="audioSeekSlider"
                type="range"
                min={0}
                max={duration > 0 ? duration : 100}
                step={0.5}
                value={Math.min(currentTime, duration > 0 ? duration : 100)}
                onChange={(e) => {
                  const nextVal = Number(e.target.value);
                  setCurrentTime(nextVal);
                  if (audioRef.current) {
                    audioRef.current.currentTime = nextVal;
                  }
                }}
                className="h-2.5 w-full cursor-pointer accent-[#E93416]"
              />
              <div className="mt-1.5 flex items-center justify-between font-mono text-xs font-bold text-[#151515]">
                <span>{formatAudioTime(currentTime)}</span>
                <span className="text-[11px] text-[#45453F]">
                  Restante: -{formatAudioTime(Math.max(0, (duration || 0) - currentTime))}
                </span>
                <span>{formatAudioTime(duration || currentChapter?.durationSeconds || 0)}</span>
              </div>
            </div>

            {/* CONTROLES PRINCIPALES: Cap. Anterior | -15s | PLAY/PAUSE | +30s | Cap. Siguiente */}
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
              <button
                type="button"
                onClick={() => handleSelectChapter(chapterIndex - 1, true)}
                disabled={chapterIndex === 0}
                title="Capítulo anterior"
                aria-label="Capítulo anterior"
                className="btn-brutalist px-3 py-3 disabled:opacity-35"
              >
                <SkipBack className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => handleSeekRelative(-15)}
                title="Retroceder 15 segundos"
                aria-label="Retroceder 15 segundos"
                className="btn-brutalist gap-1 px-3.5 py-3 text-xs"
              >
                <RotateCcw className="h-4 w-4 text-[#07517A]" />
                <span>-15s</span>
              </button>

              <button
                type="button"
                onClick={togglePlayPause}
                aria-label={isPlaying ? 'Pausar audiolibro' : 'Reproducir audiolibro'}
                className="flex h-16 w-16 items-center justify-center border-2 border-[#151515] bg-[#E93416] text-white shadow-[0_8px_20px_rgb(233_52_22/0.4)] transition hover:bg-[#151515] active:scale-95"
              >
                {isPlaying ? (
                  <Pause className="h-7 w-7" />
                ) : (
                  <Play className="h-7 w-7 translate-x-0.5" />
                )}
              </button>

              <button
                type="button"
                onClick={() => handleSeekRelative(30)}
                title="Adelantar 30 segundos"
                aria-label="Adelantar 30 segundos"
                className="btn-brutalist gap-1 px-3.5 py-3 text-xs"
              >
                <span>+30s</span>
                <RotateCw className="h-4 w-4 text-[#07517A]" />
              </button>

              <button
                type="button"
                onClick={() => handleSelectChapter(chapterIndex + 1, true)}
                disabled={chapterIndex >= book.chapters.length - 1}
                title="Capítulo siguiente"
                aria-label="Capítulo siguiente"
                className="btn-brutalist px-3 py-3 disabled:opacity-35"
              >
                <SkipForward className="h-4 w-4" />
              </button>
            </div>

            {/* BARRA SECUNDARIA: Selector de Velocidad (1.0x, 1.25x, 1.5x, 2.0x) + Botón Agregar Nota en este Segundo */}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t-2 border-[#151515]/15 pt-5">
              <div className="flex items-center gap-1.5">
                <span className="type-meta mr-1 text-[11px] font-bold uppercase text-[#45453F]">
                  Velocidad:
                </span>
                {SPEED_OPTIONS.map((spd) => (
                  <button
                    key={spd}
                    type="button"
                    onClick={() => setPlaybackRate(spd)}
                    className={`border px-2.5 py-1 font-mono text-xs font-bold transition ${
                      playbackRate === spd
                        ? 'border-[#151515] bg-[#07517A] text-white'
                        : 'border-[#151515]/30 bg-white text-[#151515] hover:bg-[#151515] hover:text-white'
                    }`}
                  >
                    {spd}x
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={handleStartAddNoteAtCurrentSecond}
                className="btn-brutalist btn-brutalist--primary gap-2 py-2.5 text-xs"
              >
                <BookmarkPlus className="h-4 w-4" />
                Agregar nota en este segundo ({formatAudioTime(currentTime)})
              </button>
            </div>

            {/* FORMULARIO RÁPIDO PARA GUARDAR LA NOTA CAPTURADA */}
            {isAddingNote && (
              <form
                onSubmit={handleSaveNote}
                className="mt-4 border-2 border-[#07517A] bg-white p-4 shadow-md"
              >
                <div className="flex items-center justify-between">
                  <span className="type-label text-[#07517A]">
                    Nueva nota en {currentChapter?.title} · Minuto{' '}
                    <strong className="text-[#E93416]">{formatAudioTime(capturedTimestamp)}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsAddingNote(false)}
                    className="text-xs font-bold text-[#45453F] hover:text-[#151515]"
                  >
                    Cancelar ✕
                  </button>
                </div>
                <label htmlFor="noteDraftInput" className="sr-only">
                  Observación o corrección de audio
                </label>
                <textarea
                  id="noteDraftInput"
                  rows={2}
                  required
                  autoFocus
                  value={noteDraft}
                  onChange={(e) => setNoteDraft(e.target.value)}
                  placeholder="Ej. Pronunciación de apellido Ocoeño, pausa larga o ruido de respiración..."
                  className="mt-2 w-full border border-[#151515] bg-[#F7F4EE] p-2.5 text-sm text-[#151515]"
                />
                <div className="mt-2.5 flex justify-end gap-2">
                  <button
                    type="submit"
                    className="btn-brutalist btn-brutalist--primary px-4 py-2 text-xs"
                  >
                    Guardar nota en {formatAudioTime(capturedTimestamp)}
                  </button>
                </div>
              </form>
            )}

            {/* Aviso de Reproducción en Segundo Plano (Media Session API) */}
            <div className="mt-5 flex items-center gap-2.5 bg-white/80 px-3.5 py-2.5 text-[11px] text-[#45453F] border border-[#151515]/15">
              <Volume2 className="h-4 w-4 shrink-0 text-[#07517A]" />
              <span>
                <strong>Audio en segundo plano activo:</strong> Puedes bloquear tu teléfono o abrir
                otra app; los controles aparecerán en tu pantalla de bloqueo.
              </span>
            </div>
          </section>

          {/* COLUMNA DERECHA (5 cols): Lista de Capítulos + Notas de Corrección del Cliente */}
          <div className="space-y-6 lg:col-span-5">
            {/* BLOQUE 1: LISTA DESPLEGABLE / INTERACTIVA DE CAPÍTULOS */}
            <details
              open
              className="editorial-disclosure border-2 border-[#151515] bg-[#EFEFEA] p-5 shadow-[0_14px_34px_rgb(30_30_26/0.2)]"
            >
              <summary className="text-base font-bold text-[#07517A]">
                <div className="flex flex-1 items-center justify-between">
                  <span className="inline-flex items-center gap-2 type-poster text-xl text-[#07517A]">
                    <ListMusic className="h-5 w-5 text-[#E93416]" />
                    CAPÍTULOS ({book.chapters.length})
                  </span>
                  <span className="type-meta bg-white px-2.5 py-0.5 font-bold text-[#151515] border border-[#151515]/20">
                    Escuchados: {completedChapterIds.length}/{book.chapters.length}
                  </span>
                </div>
              </summary>

              <div className="mt-4 max-h-72 space-y-2 overflow-y-auto border-t border-[#151515]/20 pt-4 pr-1">
                {book.chapters.map((chap, idx) => {
                  const isCurrent = idx === chapterIndex;
                  const isCompleted = completedChapterIds.includes(chap.id);
                  return (
                    <button
                      key={chap.id}
                      type="button"
                      onClick={() => handleSelectChapter(idx, true)}
                      className={`flex w-full items-center justify-between gap-3 border p-3 text-left transition ${
                        isCurrent
                          ? 'border-2 border-[#E93416] bg-white shadow-sm'
                          : 'border-[#151515]/20 bg-white/70 hover:bg-white'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-[#E93416]">
                            {String(chap.number).padStart(2, '0')}
                          </span>
                          <p className="truncate text-xs font-bold text-[#151515] sm:text-sm">
                            {chap.title}
                          </p>
                        </div>
                        {chap.durationSeconds ? (
                          <span className="type-meta mt-0.5 block text-[10px] text-[#45453F]">
                            Duración: {formatAudioTime(chap.durationSeconds)}
                          </span>
                        ) : null}
                      </div>

                      <span
                        className={`shrink-0 px-2 py-0.5 font-mono text-[10px] font-bold uppercase ${
                          isCurrent
                            ? 'bg-[#E93416] text-white'
                            : isCompleted
                            ? 'bg-[#28765A] text-white'
                            : 'bg-[#C9C9C4]/60 text-[#151515]'
                        }`}
                      >
                        {isCurrent
                          ? isPlaying
                            ? '▶ Reproduciendo'
                            : '❚❚ En pausa'
                          : isCompleted
                          ? '✓ Escuchado'
                          : 'Escuchar'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </details>

            {/* BLOQUE 2: NOTAS DE CORRECCIÓN DEL CLIENTE + ENVÍO POR WHATSAPP A GMDEI */}
            <section
              aria-labelledby="notes-heading"
              className="border-2 border-[#151515] bg-[#EFEFEA] p-5 shadow-[0_14px_34px_rgb(30_30_26/0.2)]"
            >
              <div className="flex items-center justify-between border-b border-[#151515]/20 pb-3">
                <div>
                  <span className="type-label text-[10px] text-[#E93416]">
                    BITÁCORA DE REVISIÓN SONORA
                  </span>
                  <h2 id="notes-heading" className="type-poster text-xl text-[#07517A]">
                    MIS NOTAS DE CORRECCIÓN ({notes.length})
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={handleStartAddNoteAtCurrentSecond}
                  className="btn-brutalist px-2.5 py-1.5 text-[11px]"
                >
                  + Nota en {formatAudioTime(currentTime)}
                </button>
              </div>

              {notes.length === 0 ? (
                <p className="mt-4 bg-white/70 p-4 text-xs leading-relaxed text-[#45453F] border border-[#151515]/15">
                  Aún no has guardado notas. Cuando escuches algún detalle a corregir, pulsa{' '}
                  <strong>&ldquo;Agregar nota en este segundo&rdquo;</strong> para registrar el
                  capítulo y minuto exacto (<code>MM:SS</code>).
                </p>
              ) : (
                <>
                  <ul className="mt-4 max-h-64 space-y-2.5 overflow-y-auto pr-1">
                    {notes.map((n) => (
                      <li
                        key={n.id}
                        className="border border-[#151515]/25 bg-white p-3 text-xs shadow-2xs"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => handleJumpToNoteTimestamp(n)}
                            title="Saltar directamente a este segundo del audio"
                            className="inline-flex items-center gap-1.5 bg-[#07517A] px-2.5 py-1 font-mono text-[11px] font-bold text-white transition hover:bg-[#E93416]"
                          >
                            <Play className="h-3 w-3" />
                            Cap. {String(n.chapterNumber).padStart(2, '0')} · {n.formattedTime}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteNote(n.id)}
                            title="Eliminar nota"
                            aria-label="Eliminar nota"
                            className="text-[#45453F] hover:text-[#E93416]"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <p className="mt-1.5 font-bold text-[#07517A]">{n.chapterTitle}</p>
                        <p className="mt-1 text-[#151515]">{n.note}</p>
                      </li>
                    ))}
                  </ul>

                  {/* Botones para Enviar correcciones a gmDEI (WhatsApp directo o Copiar) */}
                  <div className="mt-5 space-y-2.5 border-t-2 border-[#151515]/20 pt-4">
                    <button
                      type="button"
                      onClick={handleSendCorrectionsViaWhatsApp}
                      className="btn-brutalist btn-brutalist--primary w-full gap-2 py-3 text-xs"
                    >
                      <MessageCircle className="h-4 w-4" />
                      Enviar correcciones a gmDEI por WhatsApp
                    </button>

                    <button
                      type="button"
                      onClick={handleCopyCorrections}
                      className="btn-brutalist w-full gap-2 py-2.5 text-xs"
                    >
                      {copiedFeedback ? (
                        <>
                          <Check className="h-4 w-4 text-[#28765A]" />
                          ¡Reporte copiado al portapapeles!
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4" />
                          Copiar reporte formateado
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </section>
          </div>
        </div>
      </main>

      {/* PIE DEL REPRODUCTOR CON SELLO / LOGO DE GMDEI */}
      <footer className="mt-auto border-t border-[#151515]/25 bg-[#BDBDB7] px-4 py-6">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-3">
            <img
              src={withBasePath('/assets/gmdei.png')}
              alt="gmDEI Editorial"
              className="h-7 w-auto object-contain"
            />
            <span className="type-meta text-xs text-[#151515]">
              Editora gmDEI · Ecosistema de Audiolibros & Diagramación
            </span>
          </div>
          <Link href="/" className="link-wipe type-label text-xs text-[#07517A]">
            ← Volver al sitio principal de gmDEI
          </Link>
        </div>
      </footer>
    </div>
  );
}
