'use client';

import React, { useEffect, useState } from 'react';
import {
  AudiobookProject,
  DEFAULT_AUDIOBOOKS_CATALOG,
  decodeInstantSharePayload,
  loadAudiobooksCatalog,
} from '@/lib/audiobooks-config';
import ClientAudiobookPlayer from '@/components/ClientAudiobookPlayer';
import AudiobookStudioAdmin from '@/components/AudiobookStudioAdmin';

/**
 * Ecosistema Completo de Audiolibros gmDEI (/audiolibros):
 * - Soporta enrutamiento 100% compatible con GitHub Pages y enlaces de WhatsApp:
 *   1) Query params: `/audiolibros?libro=slug-del-libro`
 *   2) Payload instantáneo: `/audiolibros?libro=slug&data=BASE64`
 *   3) Hash routing: `/audiolibros#/audiolibros/slug-del-libro` o `#slug-del-libro`
 * - Si no hay ningún libro especificado en la URL (ej. al hacer clic en "Audiolibros"
 *   desde el menú principal), abre la vista protegida por PIN/contraseña de
 *   administrador (`gmDEI Studio`).
 */
export default function AudiolibrosPage() {
  const [catalog, setCatalog] = useState<AudiobookProject[]>(DEFAULT_AUDIOBOOKS_CATALOG);
  const [activeBook, setActiveBook] = useState<AudiobookProject | null>(null);
  const [viewMode, setViewMode] = useState<'studio' | 'player'>('studio');

  useEffect(() => {
    let isMounted = true;

    const resolveBookFromUrl = (loadedCatalog: AudiobookProject[]) => {
      if (typeof window === 'undefined') return;

      const params = new URLSearchParams(window.location.search);
      const querySlug = params.get('libro') || params.get('book') || '';
      const instantDataParam = params.get('data') || '';

      // 1. Si el enlace incluye payload instantáneo (?data=...), decodificarlo de inmediato
      if (instantDataParam) {
        const decoded = decodeInstantSharePayload(instantDataParam);
        if (decoded) {
          setActiveBook(decoded);
          setViewMode('player');
          return;
        }
      }

      // 2. Extraer slug de hash routing (#/audiolibros/slug-del-libro o #slug-del-libro)
      const rawHash = window.location.hash.replace(/^#/, '');
      let hashSlug = '';
      if (rawHash.startsWith('/audiolibros/')) {
        hashSlug = rawHash.replace('/audiolibros/', '').split('?')[0].trim();
      } else if (rawHash && !rawHash.startsWith('/')) {
        hashSlug = rawHash.trim();
      }

      const targetSlug = (querySlug || hashSlug).toLowerCase();

      if (targetSlug) {
        const matched =
          loadedCatalog.find((b) => b.slug.toLowerCase() === targetSlug) ||
          loadedCatalog[0];
        if (matched) {
          setActiveBook(matched);
          setViewMode('player');
          return;
        }
      }

      // 3. Si entró desde el botón "Audiolibros" del menú principal sin ?libro=..., abrir el Panel Privado (gmDEI Studio)
      setViewMode('studio');
    };

    loadAudiobooksCatalog().then((loaded) => {
      if (!isMounted) return;
      setCatalog(loaded);
      resolveBookFromUrl(loaded);
    });

    const handleHashChange = () => {
      loadAudiobooksCatalog().then((loaded) => {
        setCatalog(loaded);
        resolveBookFromUrl(loaded);
      });
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => {
      isMounted = false;
      window.removeEventListener('hashchange', handleHashChange);
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

  return (
    <AudiobookStudioAdmin
      catalog={catalog}
      onUpdateCatalog={(updated) => setCatalog(updated)}
      onPreviewBook={(book) => {
        setActiveBook(book);
        setViewMode('player');
        if (typeof window !== 'undefined') {
          window.history.replaceState(
            null,
            '',
            `/audiolibros?libro=${encodeURIComponent(book.slug)}#/audiolibros/${encodeURIComponent(
              book.slug
            )}`
          );
        }
      }}
    />
  );
}
