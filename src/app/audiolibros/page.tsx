'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AudiobookProject,
  DEFAULT_AUDIOBOOKS_CATALOG,
  decodeInstantSharePayload,
  loadAudiobooksCatalog,
  saveAudiobooksCatalogToLocal,
} from '@/lib/audiobooks-config';
import ClientAudiobookPlayer from '@/components/ClientAudiobookPlayer';
import AudiobookStudioAdmin from '@/components/AudiobookStudioAdmin';

/**
 * Ecosistema Completo de Audiolibros gmDEI (/audiolibros):
 * - Soporta enrutamiento 100% compatible con GitHub Pages y enlaces de WhatsApp:
 *   1) Hash corto: `/audiolibros/#slug-del-libro`
 *   2) Hash con datos autónomos: `/audiolibros/#slug-del-libro~BASE64`
 *   3) Query params: `/audiolibros/?libro=slug-del-libro` o `?d=BASE64`
 * - NUNCA reemplaza silenciosamente un libro solicitado por otro de ejemplo.
 */
export default function AudiolibrosPage() {
  const [catalog, setCatalog] = useState<AudiobookProject[]>(DEFAULT_AUDIOBOOKS_CATALOG);
  const [activeBook, setActiveBook] = useState<AudiobookProject | null>(null);
  const [missingSlug, setMissingSlug] = useState<string>('');
  const [viewMode, setViewMode] = useState<'studio' | 'player' | 'not_found'>('studio');

  useEffect(() => {
    let isMounted = true;

    const resolveBookFromUrl = (loadedCatalog: AudiobookProject[]) => {
      if (typeof window === 'undefined') return;

      const params = new URLSearchParams(window.location.search);
      const querySlug = params.get('libro') || params.get('book') || params.get('l') || '';
      const queryInstantData = params.get('data') || params.get('d') || '';

      // 1. Extraer hash: soporta `#slug`, `#/audiolibros/slug` y `#slug~PAYLOAD_BASE64`
      const rawHash = decodeURIComponent(window.location.hash.replace(/^#/, ''));
      let hashPart = rawHash;
      let hashInstantData = '';

      if (rawHash.includes('~')) {
        const parts = rawHash.split('~');
        hashPart = parts[0];
        hashInstantData = parts.slice(1).join('~');
      }

      let hashSlug = '';
      if (hashPart.startsWith('/audiolibros/')) {
        hashSlug = hashPart.replace('/audiolibros/', '').split('?')[0].trim();
      } else if (hashPart && !hashPart.startsWith('/')) {
        hashSlug = hashPart.trim();
      }

      const instantPayload = queryInstantData || hashInstantData;

      // 2. Si el enlace trae datos autónomos (~BASE64 o ?d=BASE64), decodificarlo y guardarlo en el catálogo local
      if (instantPayload) {
        const decoded = decodeInstantSharePayload(instantPayload);
        if (decoded) {
          const exists = loadedCatalog.some((b) => b.slug === decoded.slug);
          const merged = exists
            ? loadedCatalog.map((b) => (b.slug === decoded.slug ? decoded : b))
            : [decoded, ...loadedCatalog];
          saveAudiobooksCatalogToLocal(merged);
          setCatalog(merged);
          setActiveBook(decoded);
          setMissingSlug('');
          setViewMode('player');
          return;
        }
      }

      const targetSlug = (querySlug || hashSlug).toLowerCase().trim();

      if (targetSlug) {
        const matched = loadedCatalog.find((b) => b.slug.toLowerCase() === targetSlug);
        if (matched) {
          setActiveBook(matched);
          setMissingSlug('');
          setViewMode('player');
          return;
        }

        // Si el slug solicitado NO existe en este dispositivo/repositorio, NO mostrar otro libro de ejemplo por error
        setMissingSlug(targetSlug);
        setViewMode('not_found');
        return;
      }

      // 3. Si entró desde el botón "Audiolibros" del menú principal sin libro en la URL, abrir gmDEI Studio
      setMissingSlug('');
      setViewMode('studio');
    };

    loadAudiobooksCatalog().then((loaded) => {
      if (!isMounted) return;
      setCatalog(loaded);
      resolveBookFromUrl(loaded);
    });

    const handleUrlChange = () => {
      loadAudiobooksCatalog().then((loaded) => {
        setCatalog(loaded);
        resolveBookFromUrl(loaded);
      });
    };

    window.addEventListener('hashchange', handleUrlChange);
    window.addEventListener('popstate', handleUrlChange);
    return () => {
      isMounted = false;
      window.removeEventListener('hashchange', handleUrlChange);
      window.removeEventListener('popstate', handleUrlChange);
    };
  }, []);

  if (viewMode === 'player' && activeBook) {
    return (
      <ClientAudiobookPlayer
        book={activeBook}
        onOpenStudioAdmin={() => setViewMode('studio')}
      />
    );
  }

  if (viewMode === 'not_found') {
    return (
      <div className="min-h-screen flex flex-col justify-between bg-[#C9C9C4] text-[#151515] p-6">
        <div className="mx-auto my-auto max-w-lg border-2 border-[#151515] bg-[#EFEFEA] p-7 shadow-xl">
          <span className="type-label bg-[#E93416] px-2.5 py-1 text-white">
            AUDIOLIBRO NO SINCRONIZADO EN ESTE DISPOSITIVO
          </span>
          <h1 className="type-poster mt-3 text-3xl text-[#07517A]">
            No se encontró &ldquo;{missingSlug}&rdquo;
          </h1>
          <p className="mt-2 text-xs leading-relaxed text-[#45453F]">
            Este enlace busca el audiolibro <code>#{missingSlug}</code>, pero aún no ha sido
            publicado en <code>audiobooks.json</code> de GitHub o fue creado únicamente en otro
            navegador sin pulsar <strong>&ldquo;Guardar Audiolibro&rdquo;</strong> o{' '}
            <strong>&ldquo;Publicar en GitHub&rdquo;</strong>.
          </p>
          <div className="mt-5 flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={() => setViewMode('studio')}
              className="btn-brutalist btn-brutalist--primary text-xs"
            >
              Abrir Panel gmDEI Studio →
            </button>
            <Link href="/" className="btn-brutalist text-xs">
              Volver al inicio
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AudiobookStudioAdmin
      catalog={catalog}
      onUpdateCatalog={(updated) => setCatalog(updated)}
      onPreviewBook={(book) => {
        setActiveBook(book);
        setMissingSlug('');
        setViewMode('player');
        if (typeof window !== 'undefined') {
          const base = process.env.NEXT_PUBLIC_BASE_PATH || '';
          window.history.replaceState(
            null,
            '',
            `${base}/audiolibros/#${encodeURIComponent(book.slug)}`
          );
        }
      }}
    />
  );
}
