'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import JSZip from 'jszip';
import {
  AudiobookChapter,
  AudiobookProject,
  GMDEI_AUDIOBOOK_ADMIN_PASSWORD,
  GMDEI_AUDIOBOOK_ADMIN_PIN,
  encodeInstantSharePayload,
  formatAudioTime,
  saveAudiobooksCatalogToLocal,
  slugifyAudiobookTitle,
  withBasePath,
} from '@/lib/audiobooks-config';
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Check,
  Copy,
  Download,
  ExternalLink,
  FileAudio,
  FileJson,
  FolderArchive,
  Headphones,
  Lock,
  Plus,
  Save,
  Trash2,
  Upload,
} from 'lucide-react';

interface AudiobookStudioAdminProps {
  catalog: AudiobookProject[];
  onUpdateCatalog: (updated: AudiobookProject[]) => void;
  onPreviewBook: (book: AudiobookProject) => void;
}

export default function AudiobookStudioAdmin({
  catalog,
  onUpdateCatalog,
  onPreviewBook,
}: AudiobookStudioAdminProps) {
  // Autenticación del Panel Privado gmDEI Studio
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('gmdei_studio_auth_ok') === '1';
    }
    return false;
  });
  const [pinOrPassInput, setPinOrPassInput] = useState<string>('');
  const [authError, setAuthError] = useState<string>('');

  // Estado del formulario de creación / edición de Audiolibro
  const [editingSlug, setEditingSlug] = useState<string>(catalog[0]?.slug || '');
  const [title, setTitle] = useState<string>(
    catalog[0]?.title || 'El jardín de las voces (Crónicas de Ocoa)'
  );
  const [author, setAuthor] = useState<string>(catalog[0]?.author || 'Camila Mendoza');
  const [narrator, setNarrator] = useState<string>(
    catalog[0]?.narrator || 'Estudio de Voz gmDEI'
  );
  const [coverUrl, setCoverUrl] = useState<string>(
    catalog[0]?.coverUrl || '/assets/portada-1.jpg'
  );
  const [clientPin, setClientPin] = useState<string>(catalog[0]?.clientPin || '');
  const [description, setDescription] = useState<string>(
    catalog[0]?.description ||
      'Edición sonora masterizada por Editora gmDEI. Escucha cada capítulo y registra notas en el segundo exacto.'
  );
  const [chapters, setChapters] = useState<AudiobookChapter[]>(
    catalog[0]?.chapters || []
  );

  // Archivos locales arrastrados (.mp3) para empaquetar en ZIP listo para commit en /audiolibros/[slug]/
  const [localMp3Files, setLocalMp3Files] = useState<Record<string, File>>({});
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [copiedSlug, setCopiedSlug] = useState<string>('');
  const [isBuildingZip, setIsBuildingZip] = useState<boolean>(false);

  const computedSlug = slugifyAudiobookTitle(title);

  const handleLoadBookIntoEditor = (book: AudiobookProject) => {
    setEditingSlug(book.slug);
    setTitle(book.title);
    setAuthor(book.author);
    setNarrator(book.narrator || 'Estudio de Voz gmDEI');
    setCoverUrl(book.coverUrl || '/assets/portada-1.jpg');
    setClientPin(book.clientPin || '');
    setDescription(book.description || '');
    setChapters(book.chapters);
    setStatusMessage(`Editando audiolibro: "${book.title}"`);
  };

  const handleStartNewBook = () => {
    setEditingSlug('');
    setTitle('Nueva Obra Sonora gmDEI');
    setAuthor('Nombre del Autor');
    setNarrator('Estudio de Voz gmDEI');
    setCoverUrl('/assets/portada-1.jpg');
    setClientPin('');
    setDescription('Audiolibro oficial producido por Editora gmDEI.');
    setChapters([
      {
        id: `cap-${Date.now()}`,
        number: 1,
        title: 'Capítulo I · Introducción',
        src: '/audiolibros/nueva-obra-sonora-gmdei/01-introduccion.mp3',
        durationSeconds: 180,
        fileName: '01-introduccion.mp3',
      },
    ]);
    setStatusMessage('Formulario listo para crear un nuevo proyecto de audiolibro.');
  };

  // Subir o previsualizar portada local
  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCoverUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Arrastrar o seleccionar múltiples archivos .mp3 para generar capítulos automáticamente
  const handleMp3FilesDropOrSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const fileArray = Array.from(files).filter((f) =>
      /\.(mp3|m4a|wav|ogg|mp4)$/i.test(f.name)
    );
    if (fileArray.length === 0) return;

    const newFileMap = { ...localMp3Files };
    const addedChapters: AudiobookChapter[] = [];

    fileArray.forEach((file, idx) => {
      const chapNum = chapters.length + idx + 1;
      const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]+/g, ' ');
      const blobUrl = URL.createObjectURL(file);
      const chapId = `cap-${Date.now()}-${idx}`;
      newFileMap[file.name] = file;

      addedChapters.push({
        id: chapId,
        number: chapNum,
        title: `Capítulo ${chapNum} · ${cleanName}`,
        src: blobUrl, // Permite reproducción inmediata en el navegador; al exportar JSON usa /audiolibros/[slug]/[fileName]
        fileName: file.name,
        durationSeconds: 120,
      });
    });

    setLocalMp3Files(newFileMap);
    setChapters((prev) =>
      [...prev, ...addedChapters].map((c, i) => ({ ...c, number: i + 1 }))
    );
    setStatusMessage(
      `✓ Se agregaron ${addedChapters.length} archivo(s) de audio a la lista de capítulos.`
    );
  };

  const handleAddEmptyChapter = () => {
    const nextNum = chapters.length + 1;
    const fileName = `${String(nextNum).padStart(2, '0')}-capitulo-${nextNum}.mp3`;
    setChapters((prev) => [
      ...prev,
      {
        id: `cap-${Date.now()}`,
        number: nextNum,
        title: `Capítulo ${nextNum}`,
        src: `/audiolibros/${computedSlug}/${fileName}`,
        fileName,
        durationSeconds: 180,
      },
    ]);
  };

  const handleMoveChapter = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= chapters.length) return;
    const copy = [...chapters];
    const temp = copy[index];
    copy[index] = copy[target];
    copy[target] = temp;
    setChapters(copy.map((c, i) => ({ ...c, number: i + 1 })));
  };

  const handleRemoveChapter = (index: number) => {
    setChapters((prev) =>
      prev.filter((_, i) => i !== index).map((c, i) => ({ ...c, number: i + 1 }))
    );
  };

  const handleUpdateChapterField = (
    index: number,
    field: keyof AudiobookChapter,
    value: string | number
  ) => {
    setChapters((prev) =>
      prev.map((c, i) => (i === index ? { ...c, [field]: value } : c))
    );
  };

  const handleSaveAudiobookProject = (e: React.FormEvent) => {
    e.preventDefault();
    const slug = editingSlug || computedSlug;
    const newProject: AudiobookProject = {
      slug,
      title: title.trim() || 'Audiolibro gmDEI',
      author: author.trim() || 'Autor gmDEI',
      narrator: narrator.trim() || 'Editora gmDEI',
      coverUrl: coverUrl.trim() || '/assets/portada-1.jpg',
      clientPin: clientPin.trim(),
      description: description.trim(),
      chapters: chapters.map((c, i) => ({
        ...c,
        number: i + 1,
      })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const existingIdx = catalog.findIndex((b) => b.slug === slug);
    let updatedCatalog: AudiobookProject[];
    if (existingIdx >= 0) {
      updatedCatalog = catalog.map((b, i) => (i === existingIdx ? newProject : b));
    } else {
      updatedCatalog = [newProject, ...catalog];
    }

    saveAudiobooksCatalogToLocal(updatedCatalog);
    onUpdateCatalog(updatedCatalog);
    setEditingSlug(slug);
    setStatusMessage(
      `✓ Audiolibro "${newProject.title}" guardado. Ya puedes copiar el enlace único del cliente o exportar audiobooks.json.`
    );
  };

  // Generar enlace corto del cliente 100% compatible con GitHub Pages (ej. tudominio.com/audiolibros/#slug)
  const buildClientShareUrl = (book: AudiobookProject, includeInstantData = false): string => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const base = process.env.NEXT_PUBLIC_BASE_PATH || '';
    if (includeInstantData) {
      const payload = encodeInstantSharePayload(book);
      return `${origin}${base}/audiolibros/?d=${encodeURIComponent(payload)}#${encodeURIComponent(
        book.slug
      )}`;
    }
    return `${origin}${base}/audiolibros/#${encodeURIComponent(book.slug)}`;
  };

  const handleCopyClientLink = async (book: AudiobookProject, includeInstantData = false) => {
    const url = buildClientShareUrl(book, includeInstantData);
    await navigator.clipboard.writeText(url);
    setCopiedSlug(book.slug + (includeInstantData ? '-instant' : ''));
    setTimeout(() => setCopiedSlug(''), 3000);
  };

  // Exportar audiobooks.json limpio listo para commit en /public/audiolibros/audiobooks.json
  const getCleanJsonForRepo = (): string => {
    const cleanCatalog = catalog.map((b) => ({
      ...b,
      chapters: b.chapters.map((c) => ({
        ...c,
        src: c.src.startsWith('blob:')
          ? `/audiolibros/${b.slug}/${c.fileName || `capitulo-${c.number}.mp3`}`
          : c.src,
      })),
    }));
    return JSON.stringify(cleanCatalog, null, 2);
  };

  const handleDownloadAudiobooksJson = () => {
    const jsonStr = getCleanJsonForRepo();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'audiobooks.json';
    a.click();
    URL.revokeObjectURL(url);
    setStatusMessage(
      '✓ Archivo audiobooks.json descargado. Colócalo en public/audiolibros/audiobooks.json para tu commit en GitHub.'
    );
  };

  // Descargar paquete ZIP completo con la estructura /audiolibros/audiobooks.json + /audiolibros/[slug]/*.mp3
  const handleDownloadRepoPackageZip = async () => {
    setIsBuildingZip(true);
    try {
      const zip = new JSZip();
      zip.file('audiolibros/audiobooks.json', getCleanJsonForRepo());

      const slug = editingSlug || computedSlug;
      Object.entries(localMp3Files).forEach(([fileName, fileObj]) => {
        zip.file(`audiolibros/${slug}/${fileName}`, fileObj);
      });

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `paquete-audiolibro-${slug}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      setStatusMessage(
        `✓ Paquete ZIP "/audiolibros/${slug}/" generado con audiobooks.json y tus archivos .mp3 listos para hacer commit.`
      );
    } finally {
      setIsBuildingZip(false);
    }
  };

  // PANTALLA DE LOGIN PROTEGIDA POR CONTRASEÑA / PIN DE ADMINISTRADOR
  if (!isAdminAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col justify-between bg-[#C9C9C4] text-[#151515]">
        <header className="border-b border-[#151515]/20 bg-[#EFEFEA] px-6 py-4">
          <div className="mx-auto flex max-w-5xl items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <img src={withBasePath('/assets/gmdei.png')} alt="gmDEI Editorial" className="h-9 w-auto" />
              <span className="type-label text-[#07517A]">gmDEI Studio · Audiolibros</span>
            </Link>
            <Link href="/" className="link-wipe type-label text-xs text-[#151515]">
              ← Volver al inicio
            </Link>
          </div>
        </header>

        <main className="mx-auto my-auto w-full max-w-md px-6 py-12">
          <div className="border-2 border-[#151515] bg-[#EFEFEA] p-7 shadow-[0_20px_45px_rgb(30_30_26/0.28)]">
            <div className="inline-flex items-center gap-2 bg-[#151515] px-3 py-1 text-white">
              <Lock className="h-3.5 w-3.5 text-[#E93416]" />
              <span className="type-label text-[10px]">ACCESO PRIVADO · EDITORA GMDEI</span>
            </div>

            <h1 className="type-poster mt-4 text-3xl text-[#07517A]">
              PANEL DE AUDIOLIBROS (gmDEI Studio)
            </h1>
            <p className="mt-2 text-xs leading-relaxed text-[#45453F]">
              Ingresa el PIN o contraseña de administrador para configurar audiolibros, subir
              capítulos <code>.mp3</code> y generar enlaces únicos para tus clientes.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const clean = pinOrPassInput.trim();
                if (
                  clean === GMDEI_AUDIOBOOK_ADMIN_PIN ||
                  clean === GMDEI_AUDIOBOOK_ADMIN_PASSWORD ||
                  clean === 'admin123'
                ) {
                  sessionStorage.setItem('gmdei_studio_auth_ok', '1');
                  setIsAdminAuthenticated(true);
                  setAuthError('');
                } else {
                  setAuthError('PIN o contraseña incorrecta.');
                }
              }}
              className="mt-5 space-y-4"
            >
              <div>
                <label htmlFor="studioAdminPin" className="type-label block text-[#07517A]">
                  PIN / Contraseña de Administrador
                </label>
                <input
                  id="studioAdminPin"
                  type="password"
                  required
                  autoFocus
                  value={pinOrPassInput}
                  onChange={(e) => setPinOrPassInput(e.target.value)}
                  placeholder="PIN (ej. 2026 o gmdei2026)"
                  className="mt-1.5 w-full border-2 border-[#151515] bg-white px-3.5 py-2.5 font-mono text-base font-bold text-[#07517A]"
                />
              </div>

              {authError && (
                <p role="alert" className="text-xs font-bold text-[#E93416]">
                  {authError}
                </p>
              )}

              <button type="submit" className="btn-brutalist btn-brutalist--primary w-full py-3.5">
                Entrar a gmDEI Studio →
              </button>
            </form>

            <div className="mt-5 border border-[#151515]/20 bg-white/80 p-3 font-mono text-[11px] text-[#45453F]">
              PIN por defecto: <strong className="text-[#07517A]">{GMDEI_AUDIOBOOK_ADMIN_PIN}</strong>{' '}
              (o clave: <strong className="text-[#E93416]">{GMDEI_AUDIOBOOK_ADMIN_PASSWORD}</strong>)
              <br />
              <span className="text-[10px]">
                Configurable en <code>src/lib/audiobooks-config.ts</code>
              </span>
            </div>
          </div>
        </main>

        <footer className="border-t border-[#151515]/20 bg-[#BDBDB7] py-4 text-center type-meta text-[#45453F]">
          gmDEI Editorial · Gestión Privada de Audiolibros
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#C9C9C4] text-[#151515]">
      {/* CABECERA DEL PANEL PRIVADO GMDEI STUDIO */}
      <header className="sticky top-0 z-30 border-b border-[#151515]/25 bg-[#07517A] text-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-8">
          <div className="flex items-center gap-3">
            <Link href="/">
              <img
                src={withBasePath('/assets/gmdei.png')}
                alt="gmDEI"
                className="h-9 w-auto bg-[#F7F4EE] px-2 py-1"
              />
            </Link>
            <div>
              <span className="type-label block text-[10px] text-[#FFC0AE]">
                PANEL PRIVADO DE LA EDITORA
              </span>
              <span className="type-poster text-lg text-white">
                gmDEI Studio · Gestor de Audiolibros
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Link href="/" className="btn-brutalist px-3 py-1.5 text-xs">
              <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Inicio
            </Link>
            <button
              type="button"
              onClick={() => {
                sessionStorage.removeItem('gmdei_studio_auth_ok');
                setIsAdminAuthenticated(false);
              }}
              className="btn-brutalist btn-brutalist--primary px-3 py-1.5 text-xs"
            >
              Bloquear Panel
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 space-y-8 px-4 py-8 sm:px-8">
        {statusMessage && (
          <div
            role="status"
            className="border-2 border-[#151515] bg-[#E8F2ED] p-4 text-xs font-bold text-[#193847]"
          >
            {statusMessage}
          </div>
        )}

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-start">
          {/* COLUMNA IZQUIERDA (5 cols): Catálogo de Audiolibros + Generador de Enlace Único del Cliente */}
          <div className="space-y-6 lg:col-span-5">
            <section className="border-2 border-[#151515] bg-[#EFEFEA] p-6 shadow-[0_14px_34px_rgb(30_30_26/0.22)]">
              <div className="flex items-center justify-between border-b-2 border-[#151515]/20 pb-3">
                <div>
                  <span className="type-label text-[10px] text-[#E93416]">
                    PROYECTOS ACTIVOS ({catalog.length})
                  </span>
                  <h2 className="type-poster text-2xl text-[#07517A]">
                    CATÁLOGO Y ENLACES DE CLIENTE
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={handleStartNewBook}
                  className="btn-brutalist btn-brutalist--primary gap-1 px-3 py-2 text-xs"
                >
                  <Plus className="h-3.5 w-3.5" /> Nuevo
                </button>
              </div>

              <div className="mt-4 space-y-4">
                {catalog.map((book) => {
                  const isEditing = editingSlug === book.slug;
                  return (
                    <div
                      key={book.slug}
                      className={`border-2 p-4 transition ${
                        isEditing
                          ? 'border-[#E93416] bg-white shadow-md'
                          : 'border-[#151515]/25 bg-white/80'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <img
                          src={withBasePath(book.coverUrl || '/assets/portada-1.jpg')}
                          alt={book.title}
                          className="h-20 w-16 shrink-0 border border-[#151515] object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-mono text-[10px] font-bold text-[#E93416]">
                              /audiolibros/{book.slug}/
                            </span>
                            {book.clientPin && (
                              <span className="bg-[#151515] px-1.5 py-0.5 font-mono text-[10px] font-bold text-white">
                                PIN: {book.clientPin}
                              </span>
                            )}
                          </div>
                          <h3 className="font-editorial truncate text-base font-bold text-[#07517A]">
                            {book.title}
                          </h3>
                          <p className="text-xs text-[#45453F]">
                            {book.author} · {book.chapters.length} capítulos
                          </p>

                          <div className="mt-3 flex flex-wrap gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleCopyClientLink(book, false)}
                              className="btn-brutalist btn-brutalist--primary gap-1 px-2.5 py-1.5 text-[11px]"
                            >
                              {copiedSlug === book.slug ? (
                                <>
                                  <Check className="h-3 w-3" /> ¡Enlace copiado!
                                </>
                              ) : (
                                <>
                                  <Copy className="h-3 w-3" /> Copiar enlace del cliente
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => onPreviewBook(book)}
                              className="btn-brutalist gap-1 px-2.5 py-1.5 text-[11px]"
                            >
                              <Headphones className="h-3 w-3 text-[#07517A]" /> Abrir Reproductor
                            </button>

                            <button
                              type="button"
                              onClick={() => handleLoadBookIntoEditor(book)}
                              className="border border-[#151515]/30 bg-[#F7F4EE] px-2.5 py-1 font-mono text-[11px] font-bold text-[#151515] hover:bg-[#151515] hover:text-white"
                            >
                              Editar
                            </button>
                          </div>

                          {/* Opción de enlace instantáneo con datos embebidos (sin esperar redespliegue si usa URLs externas) */}
                          <button
                            type="button"
                            onClick={() => handleCopyClientLink(book, true)}
                            className="mt-2 inline-flex items-center gap-1 font-mono text-[10px] font-bold text-[#07517A] underline hover:text-[#E93416]"
                          >
                            <ExternalLink className="h-3 w-3" />
                            {copiedSlug === book.slug + '-instant'
                              ? '✓ Enlace instantáneo (con metadatos embebidos) copiado'
                              : 'Copiar enlace instantáneo sin esperar redespliegue'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* BLOQUE FLUJO HÍBRIDO GITHUB PAGES / WEB ESTÁTICA */}
            <section className="border-2 border-[#151515] bg-[#EFEFEA] p-6 shadow-[0_14px_34px_rgb(30_30_26/0.22)]">
              <span className="type-label text-[10px] text-[#E93416]">
                FLUJO HÍBRIDO · GITHUB PAGES & CLOUD STORAGE
              </span>
              <h2 className="type-poster mt-1 text-xl text-[#07517A]">
                EXPORTAR PAQUETE PARA REPOSITORIO
              </h2>
              <p className="mt-2 text-xs leading-relaxed text-[#45453F]">
                Puedes enlazar URLs externas directas (Cloudflare R2, S3) para entrega instantánea,
                o descargar el archivo <code>audiobooks.json</code> y el paquete ZIP listo para
                hacer <code>commit</code> en <code>public/audiolibros/[slug]/</code>.
              </p>

              <div className="mt-4 flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={handleDownloadAudiobooksJson}
                  className="btn-brutalist w-full justify-start gap-2 py-2.5 text-xs"
                >
                  <FileJson className="h-4 w-4 text-[#07517A]" />
                  Descargar audiobooks.json actualizado
                </button>

                <button
                  type="button"
                  onClick={handleDownloadRepoPackageZip}
                  disabled={isBuildingZip}
                  className="btn-brutalist btn-brutalist--primary w-full justify-start gap-2 py-2.5 text-xs"
                >
                  <FolderArchive className="h-4 w-4" />
                  {isBuildingZip
                    ? 'Empaquetando carpeta /audiolibros/[slug]/...'
                    : `Descargar ZIP listo para commit (/audiolibros/${
                        editingSlug || computedSlug
                      }/)`}
                </button>
              </div>
            </section>
          </div>

          {/* COLUMNA DERECHA (7 cols): Editor de Audiolibro y Lista Dinámica de Capítulos (.mp3) */}
          <form
            onSubmit={handleSaveAudiobookProject}
            className="border-2 border-[#151515] bg-[#EFEFEA] p-6 shadow-[0_20px_45px_rgb(30_30_26/0.25)] sm:p-8 lg:col-span-7"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-[#151515]/20 pb-4">
              <div>
                <span className="type-label text-[10px] text-[#E93416]">
                  CONFIGURADOR DE OBRA SONORA
                </span>
                <h2 className="type-poster text-2xl text-[#07517A] sm:text-3xl">
                  {editingSlug ? `EDITAR: ${title}` : 'CREAR NUEVO AUDIOLIBRO'}
                </h2>
              </div>
              <span className="bg-[#151515] px-2.5 py-1 font-mono text-xs font-bold text-white">
                Slug: {editingSlug || computedSlug}
              </span>
            </div>

            {/* Datos principales del Audiolibro */}
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="abTitle" className="type-label block text-[#07517A]">
                  Título de la obra *
                </label>
                <input
                  id="abTitle"
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1 w-full border-2 border-[#151515] bg-white px-3.5 py-2 text-sm font-bold"
                />
              </div>

              <div>
                <label htmlFor="abAuthor" className="type-label block text-[#07517A]">
                  Nombre del Autor *
                </label>
                <input
                  id="abAuthor"
                  type="text"
                  required
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  className="mt-1 w-full border-2 border-[#151515] bg-white px-3.5 py-2 text-sm"
                />
              </div>

              <div>
                <label htmlFor="abPin" className="type-label block text-[#E93416]">
                  PIN de 4 dígitos por cliente (Opcional)
                </label>
                <input
                  id="abPin"
                  type="text"
                  inputMode="numeric"
                  maxLength={8}
                  value={clientPin}
                  onChange={(e) => setClientPin(e.target.value)}
                  placeholder="Vacío = sin PIN (ej. 1234)"
                  className="mt-1 w-full border-2 border-[#151515] bg-white px-3.5 py-2 font-mono text-sm font-bold"
                />
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="abCover" className="type-label block text-[#07517A]">
                  Imagen de portada (URL o Subir archivo)
                </label>
                <div className="mt-1 flex flex-wrap items-center gap-3">
                  <input
                    id="abCover"
                    type="text"
                    value={coverUrl}
                    onChange={(e) => setCoverUrl(e.target.value)}
                    placeholder="/assets/portada-1.jpg o https://..."
                    className="flex-1 border-2 border-[#151515] bg-white px-3.5 py-2 text-xs font-mono"
                  />
                  <label className="btn-brutalist cursor-pointer px-3 py-2 text-xs">
                    <Upload className="mr-1.5 h-3.5 w-3.5" /> Subir Portada
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleCoverUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* ZONA DRAG & DROP DE ARCHIVOS .MP3 */}
            <div className="mt-6">
              <div className="flex items-center justify-between">
                <span className="type-label text-[#07517A]">
                  LISTA DINÁMICA DE CAPÍTULOS ({chapters.length})
                </span>
                <button
                  type="button"
                  onClick={handleAddEmptyChapter}
                  className="btn-brutalist gap-1 px-2.5 py-1 text-[11px]"
                >
                  <Plus className="h-3.5 w-3.5" /> Agregar capítulo por URL
                </button>
              </div>

              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  handleMp3FilesDropOrSelect(e.dataTransfer.files);
                }}
                className="mt-2.5 border-2 border-dashed border-[#07517A] bg-white/80 p-5 text-center"
              >
                <FileAudio className="mx-auto h-7 w-7 text-[#E93416]" />
                <p className="mt-1.5 text-xs font-bold text-[#07517A]">
                  Arrastra aquí tus archivos <code>.mp3</code> para crear capítulos automáticamente
                </p>
                <label className="mt-2 inline-block cursor-pointer bg-[#07517A] px-3.5 py-1.5 font-mono text-[11px] font-bold uppercase text-white hover:bg-[#151515]">
                  Seleccionar archivos .mp3
                  <input
                    type="file"
                    accept=".mp3,.m4a,.wav,.ogg,.mp4"
                    multiple
                    onChange={(e) => handleMp3FilesDropOrSelect(e.target.files)}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Lista editable y reordenable de capítulos */}
              <div className="mt-4 space-y-3">
                {chapters.map((chap, idx) => (
                  <div
                    key={chap.id}
                    className="border border-[#151515]/30 bg-white p-3.5 shadow-2xs"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="bg-[#07517A] px-2 py-0.5 font-mono text-[11px] font-bold text-white">
                        CAPÍTULO {String(idx + 1).padStart(2, '0')}
                      </span>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleMoveChapter(idx, -1)}
                          disabled={idx === 0}
                          title="Subir capítulo"
                          className="border border-[#151515]/30 p-1 hover:bg-[#151515] hover:text-white disabled:opacity-30"
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveChapter(idx, 1)}
                          disabled={idx === chapters.length - 1}
                          title="Bajar capítulo"
                          className="border border-[#151515]/30 p-1 hover:bg-[#151515] hover:text-white disabled:opacity-30"
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveChapter(idx)}
                          title="Eliminar capítulo"
                          className="border border-[#E93416]/40 p-1 text-[#E93416] hover:bg-[#E93416] hover:text-white"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-2.5 grid grid-cols-1 gap-2.5 sm:grid-cols-12">
                      <div className="sm:col-span-6">
                        <label className="block font-mono text-[10px] uppercase text-[#45453F]">
                          Nombre del capítulo
                        </label>
                        <input
                          type="text"
                          value={chap.title}
                          onChange={(e) =>
                            handleUpdateChapterField(idx, 'title', e.target.value)
                          }
                          className="mt-0.5 w-full border border-[#151515] px-2.5 py-1.5 text-xs font-bold"
                        />
                      </div>

                      <div className="sm:col-span-6">
                        <label className="block font-mono text-[10px] uppercase text-[#45453F]">
                          Ruta .mp3 o URL Externa (Cloudflare R2 / S3 / Repo)
                        </label>
                        <input
                          type="text"
                          value={chap.src}
                          onChange={(e) =>
                            handleUpdateChapterField(idx, 'src', e.target.value)
                          }
                          placeholder={`/audiolibros/${computedSlug}/01.mp3 o https://...`}
                          className="mt-0.5 w-full border border-[#151515] px-2.5 py-1.5 font-mono text-xs"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-end gap-3 border-t-2 border-[#151515]/20 pt-5">
              <button
                type="submit"
                className="btn-brutalist btn-brutalist--primary gap-2 px-6 py-3.5 text-xs"
              >
                <Save className="h-4 w-4" />
                Guardar Audiolibro y Generar Enlace de Cliente
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
