'use client';

import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { EDITORIAL_STAGES_11, EditorialStageDefinition } from '@/lib/editorial-data';
import { ArrowLeft, ArrowRight, Film, Pause, Play, Sparkles } from 'lucide-react';

/**
 * Reproductor de Video Minimalista y Divertido para cada una de las 11 Etapas.
 * Utiliza los videos reales de la carpeta `video para web/` copiados a `/videos/*.mp4`.
 * Incluye botón de Pausa/Reproducir accesible (WCAG 2.2.2) y etiquetas flotantes tipo sticker.
 */
function StageVideoPlayer({
  stage,
  isPaused,
  onTogglePause,
}: {
  stage: EditorialStageDefinition;
  isPaused: boolean;
  onTogglePause: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    vid.currentTime = 0;
    if (!isPaused) {
      vid.play().catch(() => {});
    } else {
      vid.pause();
    }
  }, [stage.id, stage.videoUrl, isPaused]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#151515]">
      <video
        ref={videoRef}
        key={stage.videoUrl + '-' + stage.id}
        src={stage.videoUrl}
        muted
        loop
        playsInline
        autoPlay={!isPaused}
        className="h-full w-full object-cover"
      />

      {/* Degradado sutil inferior y superior para lectura limpia de stickers sobre el video */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#151515]/80 via-transparent to-[#151515]/40"
      />

      {/* Etiqueta sticker superior izquierda con el nombre del clip */}
      <div className="absolute top-3.5 left-3.5 z-10 flex items-center gap-2 -rotate-1 border border-[#151515] bg-[#EFEFEA] px-3 py-1 text-[#151515] shadow-md">
        <Film className="h-3.5 w-3.5 text-[#E93416]" />
        <span className="type-label text-[10px] text-[#07517A]">{stage.videoBadge}</span>
      </div>

      {/* Botón accesible para Pausar / Reproducir el video (WCAG 2.2.2 Pause, Stop, Hide) */}
      <button
        type="button"
        onClick={onTogglePause}
        className="absolute top-3.5 right-3.5 z-10 inline-flex items-center gap-1.5 border border-[#151515] bg-[#EFEFEA] px-2.5 py-1 font-mono text-[10px] font-bold uppercase text-[#151515] shadow-md transition hover:bg-[#E93416] hover:text-white"
      >
        {isPaused ? (
          <>
            <Play className="h-3 w-3" /> Reproducir
          </>
        ) : (
          <>
            <Pause className="h-3 w-3" /> Pausar
          </>
        )}
      </button>

      {/* Sello especial en etapas clave (Etapa 3, 8, 9, 10) */}
      <div className="absolute bottom-3.5 left-3.5 right-3.5 z-10 flex flex-wrap items-center justify-between gap-2">
        <span className="border border-white/25 bg-[#151515]/85 px-2.5 py-1 font-mono text-[10px] font-bold uppercase text-[#FFC0AE] backdrop-blur-xs">
          {stage.code} · {stage.deliverable}
        </span>

        {stage.requiresCoverApproved && (
          <span className="rotate-1 bg-[#28765A] px-2.5 py-1 font-mono text-[10px] font-bold uppercase text-white shadow-md">
            🔒 Requiere Portada Aprobada
          </span>
        )}

        {stage.requires20WordsUppercase && (
          <span className="rotate-1 bg-[#E93416] px-2.5 py-1 font-mono text-[10px] font-bold uppercase text-white shadow-md">
            ≥ 20 PALABRAS MAYÚSCULAS + ISBN
          </span>
        )}
      </div>
    </div>
  );
}

export default function BookJourneyScroll() {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [activeStage, setActiveStage] = useState<number>(1);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setIsPaused(true);
    }
    if (!trackRef.current) return;

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: trackRef.current,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0.2,
        onUpdate: (self) => {
          const idx = Math.min(
            11,
            Math.max(1, Math.floor(self.progress * EDITORIAL_STAGES_11.length) + 1)
          );
          setActiveStage(idx);
        },
      });
    }, trackRef);

    return () => ctx.revert();
  }, []);

  const currentStage =
    EDITORIAL_STAGES_11.find((s) => s.id === activeStage) || EDITORIAL_STAGES_11[0];
  const progressPercent = (activeStage / EDITORIAL_STAGES_11.length) * 100;

  const jumpToStage = (stageNum: number) => {
    const clamped = Math.min(11, Math.max(1, stageNum));
    setActiveStage(clamped);
  };

  return (
    <>
      {/* SECCIÓN DE LAS 11 ETAPAS EN VIDEO CON SCROLL INTERACTIVO Y DISEÑO MINIMALISTA:
          Contenedor con altura explícita h-[480svh] y escenario sticky 100svh opaco */}
      <section
        id="viaje-editorial"
        aria-labelledby="slider-title"
        className="relative z-10 border-b-2 border-[#151515] bg-[#C9C9C4]"
      >
        <div ref={trackRef} className="relative h-[480svh] w-full">
          <div className="sticky top-0 flex h-[100svh] w-full items-center overflow-hidden bg-[#C9C9C4] pt-[68px]">
            <div className="mx-auto grid w-full max-w-[1440px] grid-cols-1 items-center gap-6 px-[var(--gutter)] py-4 lg:grid-cols-12 lg:gap-7">
              {/* LADO IZQUIERDO DEL VIDEO (4 cols):
                  Minimalista, letras ajustadas al cuadro y navegación divertida */}
              <div className="flex flex-col justify-between space-y-4 border-2 border-[#151515] bg-[#EFEFEA] p-5 shadow-[0_14px_34px_rgb(30_30_26/0.22)] lg:col-span-4">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="type-label inline-block bg-[#151515] px-2.5 py-1 text-[10px] text-[#EFEFEA]">
                      ETAPA {String(activeStage).padStart(2, '0')} DE 11
                    </span>
                    <span className="type-label bg-[#E93416]/15 px-2.5 py-1 text-[10px] text-[#E93416]">
                      {currentStage.owner === 'cliente'
                        ? 'Turno Autor'
                        : currentStage.owner === 'gmdei'
                        ? 'Taller gmDEI'
                        : 'Compartido'}
                    </span>
                  </div>

                  <h2
                    id="slider-title"
                    className="type-poster mt-3 text-xl leading-snug text-[#07517A] sm:text-2xl"
                  >
                    {currentStage.title}
                  </h2>

                  <p className="mt-2 text-xs leading-relaxed text-[#151515] sm:text-sm">
                    {currentStage.subtitle}
                  </p>
                </div>

                {/* Barra de progreso + Botones ← → */}
                <div className="border-t-2 border-[#151515]/20 pt-3.5" aria-live="polite">
                  <div className="type-label flex items-center gap-3 text-[#151515]">
                    <span className="tabular-nums text-xs font-bold">
                      {String(activeStage).padStart(2, '0')} / 11
                    </span>
                    <span className="relative h-[4px] flex-1 bg-[#151515]/15" aria-hidden="true">
                      <span
                        className="absolute inset-y-0 left-0 bg-[#E93416] transition-all duration-300"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </span>
                    <span className="font-mono text-[10px] text-[#45453F]">
                      {Math.round(progressPercent)}%
                    </span>
                  </div>

                  <div className="mt-3.5 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => jumpToStage(activeStage - 1)}
                      disabled={activeStage === 1}
                      className="btn-brutalist px-3 py-2 disabled:opacity-35"
                      aria-label="Etapa anterior"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => jumpToStage(activeStage + 1)}
                      disabled={activeStage === 11}
                      className="btn-brutalist px-3 py-2 disabled:opacity-35"
                      aria-label="Siguiente etapa"
                    >
                      <ArrowRight className="h-4 w-4" />
                    </button>
                    <a
                      href="#cotizador"
                      className="btn-brutalist btn-brutalist--primary flex-1 py-2 text-center text-xs"
                    >
                      Cotizar mi libro ↓
                    </a>
                  </div>
                </div>
              </div>

              {/* CENTRO PROTAGONISTA (5 cols):
                  El Video Real de la Etapa enmarcado en Polaroid Sticker con cinta adhesiva */}
              <div className="flex items-center justify-center lg:col-span-5">
                <div className="relative aspect-[4/4.2] w-full max-w-[440px] border-2 border-[#151515] bg-[#EFEFEA] p-[8px] shadow-[0_24px_50px_rgb(30_30_26/0.35)] transition-transform duration-300">
                  {/* Cinta adhesiva superior estilo street-art */}
                  <div
                    aria-hidden="true"
                    className="absolute -top-3 left-1/2 z-20 h-6 w-28 -translate-x-1/2 -rotate-2 border border-[#151515]/20 bg-[#F7F4EE] shadow-xs"
                  />
                  <StageVideoPlayer
                    stage={currentStage}
                    isPaused={isPaused}
                    onTogglePause={() => setIsPaused((p) => !p)}
                  />
                </div>
              </div>

              {/* LADO DERECHO DEL VIDEO (3 cols):
                  Cápsula minimalista con desplegable <details> y botonera 01—11 */}
              <div className="hidden flex-col justify-between space-y-3.5 lg:flex lg:col-span-3">
                <div className="border-2 border-[#151515] bg-[#EFEFEA] p-4 shadow-[0_14px_34px_rgb(30_30_26/0.22)]">
                  <span className="type-label text-[10px] text-[#E93416]">
                    GARANTÍA DE REVISIÓN
                  </span>
                  <p className="type-poster mt-1 text-base leading-snug text-[#07517A] xl:text-lg">
                    {currentStage.usesDigitacionJpgPool
                      ? 'HASTA 6 CORRECCIONES (JPG / DIGITACIÓN)'
                      : `MÁXIMO ${currentStage.maxRoundsDefault} RONDAS POR ETAPA`}
                  </p>

                  {/* Desplegable para que la pantalla se mantenga súper limpia */}
                  <details className="editorial-disclosure mt-3 border-t-2 border-[#151515]/20 pt-2.5 text-xs">
                    <summary className="type-label text-[11px] text-[#07517A] select-none">
                      + ¿Qué hacemos en este paso?
                    </summary>
                    <div className="mt-2.5 space-y-1.5 rounded border border-[#151515]/15 bg-white p-2.5 text-[11px] leading-relaxed text-[#151515]">
                      <p>{currentStage.description}</p>
                      <p className="font-bold text-[#E93416]">
                        Tu acción: {currentStage.clientAction}
                      </p>
                    </div>
                  </details>
                </div>

                {/* Selector rápido de las 11 etapas en video */}
                <div className="border-2 border-[#151515] bg-[#EFEFEA] p-3.5 shadow-md">
                  <span className="type-meta mb-2 flex items-center justify-between text-[11px] font-bold uppercase text-[#151515]">
                    <span>Ver video de etapa:</span>
                    <Sparkles className="h-3.5 w-3.5 text-[#E93416]" />
                  </span>
                  <div className="grid grid-cols-4 gap-1.5">
                    {EDITORIAL_STAGES_11.map((st) => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => jumpToStage(st.id)}
                        className={`py-1 font-mono text-xs font-bold border transition ${
                          st.id === activeStage
                            ? 'border-[#151515] bg-[#E93416] text-white shadow-xs'
                            : 'border-[#151515]/30 bg-white text-[#151515] hover:bg-[#151515] hover:text-white'
                        }`}
                      >
                        {String(st.id).padStart(2, '0')}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECCIÓN INTERACTIVA DE FORMATOS EN VIDEO + CUERDAS ELÁSTICAS SVG */}
      <InteractiveFormatsAndRulesSection />
    </>
  );
}

/**
 * Sección divertida y minimalista con los videos de la carpeta `video para web`
 * y las cuerdas SVG que vibran al pasar el mouse.
 */
function InteractiveFormatsAndRulesSection() {
  const [selectedClip, setSelectedClip] = useState<{
    title: string;
    badge: string;
    desc: string;
    video: string;
  }>({
    title: 'Word Listo (+4)',
    badge: 'RUTA BASE MÁS ECONÓMICA',
    desc: 'Tu archivo .docx entra directo a jerarquía tipográfica y estilado sin costos extra de conversión.',
    video: '/videos/word.mp4',
  });

  const clips = [
    {
      title: 'Word Listo (+4)',
      badge: 'RUTA BASE MÁS ECONÓMICA',
      desc: 'Tu archivo .docx entra directo a jerarquía tipográfica y estilado sin costos extra de conversión.',
      video: '/videos/word.mp4',
    },
    {
      title: 'PDF a Word (+3)',
      badge: 'EXTRACCIÓN Y CONVERSIÓN',
      desc: 'Convertimos tu PDF a Word editable, limpiando saltos rotos para llevarlo a nivel +4.',
      video: '/videos/pdf.mp4',
    },
    {
      title: 'JPG y OCR (+2 / 0)',
      badge: 'HASTA 6 CORRECCIONES INCLUIDAS',
      desc: 'Organizamos y pasamos por reconocimiento óptico tus fotos o escaneos JPG hasta armar el Word maestro.',
      video: '/videos/jotapege.mp4',
    },
    {
      title: 'Maquetación InDesign',
      badge: 'DISEÑO EDITORIAL DE CAJA',
      desc: 'Componemos cada pliego, tabla e imagen con precisión tipográfica profesional.',
      video: '/videos/indesing.mp4',
    },
    {
      title: 'Flipbook + Muestra Impresa',
      badge: 'HASTA 3 BORRADORES FÍSICOS',
      desc: 'Revisas en Flipbook interactivo y recibes tus ejemplares impresos (Borrador 1 y Borrador 2 con portada aprobada).',
      video: '/videos/muestra-impresa.mp4',
    },
    {
      title: 'Libro Final + ISBN',
      badge: 'LISTO PARA IMPRENTA',
      desc: 'Tras tu declaración de 20 palabras en MAYÚSCULAS, liberamos los artes finales PDF/X con su registro ISBN.',
      video: '/videos/libro-final.mp4',
    },
  ];

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const svg = e.currentTarget.querySelector('svg path');
    if (!svg) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = e.clientX - rect.left;
    const relY = e.clientY - rect.top - 50;
    const bendY = Math.max(-35, Math.min(35, relY * 1.35));
    svg.setAttribute('d', `M 0 50 Q ${relX} ${50 + bendY} ${rect.width} 50`);
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    const path = e.currentTarget.querySelector('svg path');
    if (!path) return;
    const rect = e.currentTarget.getBoundingClientRect();
    gsap.to(path, {
      attr: { d: `M 0 50 Q ${rect.width / 2} 50 ${rect.width} 50` },
      duration: 0.6,
      ease: 'elastic.out(1, 0.3)',
    });
  };

  return (
    <section className="relative z-20 border-b-2 border-[#151515] bg-[#BDBDB7] px-[var(--gutter)] py-20">
      <div className="mx-auto max-w-[1400px]">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12">
          {/* Lista interactiva de formatos con cuerdas elásticas SVG */}
          <div className="lg:col-span-6">
            <span className="sticker-hint type-label inline-block text-[#E93416]">
              EXPLORA EN VIDEO · TOCA CADA FORMATO
            </span>
            <h2 className="type-poster mt-4 text-3xl text-[#151515] sm:text-5xl">
              DE CUALQUIER FORMATO A TU LIBRO FINAL
            </h2>

            <ul className="mt-8">
              {clips.map((clip, i) => {
                const isSelected = selectedClip.title === clip.title;
                return (
                  <li key={clip.title}>
                    <div
                      onMouseMove={handleMouseMove}
                      onMouseLeave={handleMouseLeave}
                      className="relative h-px w-full text-[#151515]/40"
                      aria-hidden="true"
                    >
                      <div className="absolute inset-x-0 -top-6 z-10 h-12" />
                      <svg className="pointer-events-none absolute -top-[50px] left-0 h-[100px] w-full overflow-visible">
                        <path
                          d="M 0 50 Q 350 50 700 50"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                        />
                      </svg>
                    </div>

                    <button
                      type="button"
                      onMouseEnter={() => setSelectedClip(clip)}
                      onClick={() => setSelectedClip(clip)}
                      className="group flex w-full items-baseline justify-between gap-4 py-3.5 text-left transition"
                    >
                      <div className="flex items-baseline gap-3">
                        <span className="font-mono text-xs font-bold text-[#E93416]">
                          0{i + 1}
                        </span>
                        <span
                          className={`type-poster text-xl sm:text-2xl transition-colors ${
                            isSelected
                              ? 'text-[#E93416]'
                              : 'text-[#07517A] group-hover:text-[#E93416]'
                          }`}
                        >
                          {clip.title}
                        </span>
                      </div>
                      <span className="type-meta text-[11px] font-bold text-[#45453F]">
                        {clip.badge} →
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Visor de Video Instantáneo al pasar el mouse o hacer clic */}
          <div className="lg:col-span-6">
            <div className="mx-auto max-w-lg border-2 border-[#151515] bg-[#EFEFEA] p-3 shadow-[0_24px_50px_rgb(30_30_26/0.3)]">
              <div className="relative aspect-[16/11] w-full overflow-hidden bg-[#151515]">
                <video
                  key={selectedClip.video}
                  src={selectedClip.video}
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="h-full w-full object-cover"
                />
                <span className="absolute top-3 left-3 bg-[#E93416] px-2.5 py-1 font-mono text-[10px] font-bold uppercase text-white shadow">
                  {selectedClip.badge}
                </span>
              </div>
              <div className="mt-3 flex items-start justify-between gap-4 p-2">
                <div>
                  <h3 className="type-poster text-xl text-[#07517A]">
                    {selectedClip.title}
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-[#151515]">
                    {selectedClip.desc}
                  </p>
                </div>
                <a
                  href="#cotizador"
                  className="btn-brutalist btn-brutalist--primary shrink-0 px-3 py-2 text-[11px]"
                >
                  Cotizar →
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
