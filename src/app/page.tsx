'use client';

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import BookJourneyScroll from '@/components/BookJourneyScroll';
import DynamicQuoter from '@/components/DynamicQuoter';
import { withBasePath } from '@/lib/audiobooks-config';

export default function HomePage() {
  const heroRef = useRef<HTMLElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Efecto interactivo "From grey wall to colour" idéntico al Hero de biegajaca-sztuka.pl/en:
  // Al mover el cursor sobre el muro gris, limpias el estuco revelando las obras y portadas a todo color debajo.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const initWall = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgba(180, 180, 174, 0.78)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Abrir 3 ventanas orgánicas iniciales como el wall-fallback de biegajaca-sztuka.pl
      ctx.globalCompositeOperation = 'destination-out';
      const holes = [
        { x: canvas.width * 0.22, y: canvas.height * 0.38, r: 140 },
        { x: canvas.width * 0.62, y: canvas.height * 0.52, r: 175 },
        { x: canvas.width * 0.82, y: canvas.height * 0.28, r: 130 },
      ];
      holes.forEach((h) => {
        const grad = ctx.createRadialGradient(h.x, h.y, h.r * 0.2, h.x, h.y, h.r);
        grad.addColorStop(0, 'rgba(0,0,0,1)');
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(h.x, h.y, h.r, 0, Math.PI * 2);
        ctx.fill();
      });
    };

    initWall();
    window.addEventListener('resize', initWall);
    return () => window.removeEventListener('resize', initWall);
  }, []);

  const handleHeroMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.globalCompositeOperation = 'destination-out';
    const grad = ctx.createRadialGradient(x, y, 20, x, y, 135);
    grad.addColorStop(0, 'rgba(0,0,0,1)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, 135, 0, Math.PI * 2);
    ctx.fill();
  };

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion || !heroRef.current) return;

    const ctx = gsap.context(() => {
      gsap.from('.bs-sticker-slap', {
        scale: 1.18,
        opacity: 0,
        y: 24,
        duration: 0.55,
        stagger: 0.12,
        ease: 'back.out(1.6)',
      });
    }, heroRef);

    return () => ctx.revert();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#C9C9C4] text-[#151515]">
      {/* BARRA SUPERIOR ESTILO BIEGAJACA-SZTUKA.PL (3 columnas: enlaces izquierda, logo poster centro, acciones derecha) */}
      <header className="fixed inset-x-0 top-0 z-40 border-b border-[#151515]/20 bg-[#C9C9C4]/90 backdrop-blur-md">
        <nav
          aria-label="Navegación principal"
          className="mx-auto grid h-[68px] max-w-[1440px] grid-cols-3 items-center px-[var(--gutter)]"
        >
          <div className="flex items-center gap-5">
            <a href="#viaje-editorial" className="link-wipe type-label text-[#151515]">
              11 Etapas (Scroll)
            </a>
            <a
              href="#cotizador"
              className="link-wipe type-label hidden md:inline-block text-[#151515]"
            >
              Cotizador & Firma
            </a>
            <Link
              href="/audiolibros"
              className="link-wipe type-label font-bold text-[#E93416]"
            >
              Audiolibros
            </Link>
          </div>

          <Link
            href="/"
            className="justify-self-center flex items-center gap-2.5"
          >
            <img
              src={withBasePath('/assets/gmdei.png')}
              alt="gmDEI Editorial"
              className="h-10 w-auto object-contain"
            />
          </Link>

          <div className="flex items-center justify-end gap-3">
            <Link
              href="/mi-proyecto"
              className="btn-brutalist px-3.5 py-2 text-xs"
            >
              Mi Proyecto
            </Link>
            <Link
              href="/admin"
              className="btn-brutalist btn-brutalist--primary px-3.5 py-2 text-xs"
            >
              Admin
            </Link>
          </div>
        </nav>
      </header>

      {/* HERO INTERACTIVO ESTILO "WALL-HERO" DE BIEGAJACA-SZTUKA.PL/EN:
          - Mosaico de 4 columnas de portadas y pliegos al fondo
          - Lienzo gris interactivo que se limpia al mover el cursor ("Del borrador al libro")
          - Pegatinas `.wall-sticker` inclinadas `-rotate-2` con tipografía poster condensada */}
      <section
        ref={heroRef}
        onMouseMove={handleHeroMouseMove}
        aria-labelledby="hero-title"
        className="relative h-[100svh] min-h-[640px] overflow-hidden border-b border-[#151515]/25 pt-[68px]"
      >
        {/* Video protagonista de la diagramación a pantalla completa debajo del muro */}
        <div
          className="absolute inset-0"
          aria-hidden="true"
        >
          <video
            src={withBasePath('/videos/indesing.mp4')}
            autoPlay
            muted
            loop
            playsInline
            className="h-full w-full object-cover"
          />
        </div>

        {/* Lienzo interactivo que descubre el color al mover el mouse */}
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full"
        />

        {/* Pista superior derecha estilo sticker inclinado */}
        <div className="pointer-events-none absolute inset-0 flex flex-col justify-end px-[var(--gutter)] pb-[clamp(1.75rem,5svh,3.5rem)]">
          <div className="bs-sticker-slap absolute top-24 right-[var(--gutter)] flex flex-col items-end gap-1.5 text-right">
            <span className="type-poster rotate-1 bg-[#EFEFEA] px-3.5 py-1.5 text-[clamp(1.1rem,1.7vw,1.55rem)] leading-none text-[#151515] shadow-[0_6px_16px_rgb(0_0_0/0.22)]">
              Del manuscrito al color.
            </span>
            <span className="type-label hidden bg-[#EFEFEA] px-2.5 py-1 text-[#E93416] shadow-[0_6px_16px_rgb(0_0_0/0.18)] sm:inline-block">
              mueve el cursor por el muro →
            </span>
          </div>

          {/* Título gigante sobre pegatinas `.wall-sticker` inclinadas `-rotate-2` */}
          <h1
            id="hero-title"
            className="bs-sticker-slap type-poster -rotate-2 text-[clamp(3rem,8.8vw,9.5rem)] leading-[0.98] text-[#151515]"
          >
            <span className="block">
              <span className="wall-sticker">Tu libro sale</span>
            </span>
            <span className="block mt-1">
              <span className="wall-sticker text-[#07517A]">a la imprenta.</span>
            </span>
          </h1>

          {/* Subtítulo sticker + Botones brutalistas */}
          <div className="bs-sticker-slap mt-6 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <p className="max-w-[38ch] bg-[#EFEFEA] px-4 py-2.5 text-base font-medium leading-snug text-[#151515] shadow-[0_10px_24px_rgb(0_0_0/0.2)] sm:text-lg">
              Diagramamos tu obra en 11 etapas claras. Analiza tu archivo, firma en pantalla y
              sigue tus borradores físicos.
            </p>

            <div className="pointer-events-auto flex flex-wrap gap-3">
              <a href="#viaje-editorial" className="btn-brutalist btn-brutalist--primary">
                Recorrer las 11 etapas
              </a>
              <a href="#cotizador" className="btn-brutalist">
                Cotizar y firmar contrato
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* SECCIÓN 1: EL VIAJE DEL LIBRO EN PINS DE 100SVH + CUERDAS ELÁSTICAS */}
      <BookJourneyScroll />

      {/* SECCIÓN 2: COTIZADOR DINÁMICO, INSPECTOR .DOCX/.PDF Y FIRMA EN CANVAS */}
      <DynamicQuoter />

      {/* FOOTER MONUMENTAL ESTILO BIEGAJACA-SZTUKA.PL */}
      <footer className="overflow-hidden border-t border-[#151515]/25 bg-[#BDBDB7] px-[var(--gutter)] pt-16 pb-8 text-[#151515]">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-start justify-between gap-10">
          <div>
            <p className="type-poster text-3xl text-[#07517A]">gmDEI Editorial</p>
            <p className="mt-2 max-w-[34ch] text-base text-[#45453F]">
              Del manuscrito al libro listo para imprimir. Diagramación, pruebas físicas e ISBN.
            </p>
          </div>

          <div className="flex flex-wrap gap-4">
            <Link href="/audiolibros" className="btn-brutalist">
              Audiolibros
            </Link>
            <Link href="/mi-proyecto" className="btn-brutalist">
              Portal del Cliente (/mi-proyecto)
            </Link>
            <Link href="/admin" className="btn-brutalist btn-brutalist--primary">
              Panel Administrativo (/admin)
            </Link>
          </div>
        </div>

        {/* Firma tipográfica gigante de borde a borde como en biegajaca-sztuka.pl */}
        <p
          aria-hidden="true"
          className="type-poster mt-14 text-center text-[10.2vw] leading-[0.84] whitespace-nowrap select-none text-[#07517A]"
        >
          gmDEI Editorial
        </p>
      </footer>
    </div>
  );
}
