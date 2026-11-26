/**
 * ============================================================================
 * gmDEI Editorial — Configuración y Tipos del Ecosistema de Audiolibros
 * ============================================================================
 *
 * 1. DÓNDE CAMBIAR LA CONTRASEÑA / PIN DEL PANEL PRIVADO DE AUDIOLIBROS:
 *    Edita la constante `GMDEI_AUDIOBOOK_ADMIN_PIN` abajo (o define
 *    NEXT_PUBLIC_GMDEI_AUDIOBOOK_PIN en tu archivo .env).
 *
 * 2. DÓNDE CONFIGURAR EL NÚMERO DE WHATSAPP OFICIAL DE gmDEI:
 *    Edita la constante `GMDEI_OFFICIAL_WHATSAPP` abajo (formato internacional
 *    sin signos +, ej. '59170000000').
 */

export const GMDEI_AUDIOBOOK_ADMIN_PIN =
  process.env.NEXT_PUBLIC_GMDEI_AUDIOBOOK_PIN || '2026';

export const GMDEI_AUDIOBOOK_ADMIN_PASSWORD =
  process.env.NEXT_PUBLIC_GMDEI_AUDIOBOOK_PASSWORD || 'gmdei2026';

export const GMDEI_OFFICIAL_WHATSAPP =
  process.env.NEXT_PUBLIC_GMDEI_WHATSAPP || '59170000000';

/**
 * Prefijo de ruta base (ej. "/gmdei-editorial" en GitHub Pages o "" en dominio propio / localhost)
 */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || '';

export function withBasePath(path: string): string {
  if (!path) return path;
  if (
    path.startsWith('http://') ||
    path.startsWith('https://') ||
    path.startsWith('data:') ||
    path.startsWith('blob:')
  ) {
    return path;
  }
  const normalized = path.startsWith('/') ? path : `/${path}`;
  if (BASE_PATH && normalized.startsWith(`${BASE_PATH}/`)) {
    return normalized;
  }
  return `${BASE_PATH}${normalized}`;
}

export interface AudiobookChapter {
  id: string;
  number: number;
  title: string;
  src: string; // Ruta relativa (/audiolibros/[slug]/cap-01.mp3) o URL externa (Cloudflare R2, S3, etc.)
  durationSeconds?: number;
  fileName?: string;
}

export interface AudiobookProject {
  slug: string;
  title: string;
  author: string;
  narrator?: string;
  coverUrl: string;
  clientPin?: string; // PIN opcional de 4 dígitos para privacidad del cliente
  description?: string;
  chapters: AudiobookChapter[];
  createdAt: string;
  updatedAt: string;
}

export interface AudiobookCorrectionNote {
  id: string;
  bookSlug: string;
  chapterId: string;
  chapterNumber: number;
  chapterTitle: string;
  timestampSeconds: number;
  formattedTime: string; // MM:SS
  note: string;
  createdAt: string;
}

export interface AudiobookListeningProgress {
  bookSlug: string;
  chapterIndex: number;
  currentTime: number;
  playbackRate: number;
  completedChapterIds: string[];
  updatedAt: string;
}

/**
 * Convierte segundos en formato MM:SS (o HH:MM:SS si supera 1 hora)
 */
export function formatAudioTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '00:00';
  const totalSeconds = Math.floor(seconds);
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  if (hrs > 0) {
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(
      secs
    ).padStart(2, '0')}`;
  }
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

/**
 * Convierte el título de un libro en un slug limpio para URL y carpetas (/audiolibros/[slug]/)
 */
export function slugifyAudiobookTitle(text: string): string {
  return (
    text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'audiolibro-gmdei'
  );
}

/**
 * Catálogo inicial de demostración (también se sincroniza con /audiolibros/audiobooks.json y localStorage)
 */
export const DEFAULT_AUDIOBOOKS_CATALOG: AudiobookProject[] = [
  {
    slug: 'el-jardin-de-las-voces',
    title: 'El jardín de las voces (Crónicas de Ocoa)',
    author: 'Camila Mendoza',
    narrator: 'Estudio de Voz gmDEI',
    coverUrl: '/assets/portada-1.jpg',
    clientPin: '',
    description:
      'Edición sonora masterizada por Editora gmDEI. Escucha cada capítulo, valida la entonación y marca cualquier observación en el segundo exacto.',
    chapters: [
      {
        id: 'cap-1',
        number: 1,
        title: 'Capítulo I · La memoria del valle',
        src: '/videos/audio-libro.mp4',
        durationSeconds: 45,
        fileName: '01-la-memoria-del-valle.mp3',
      },
      {
        id: 'cap-2',
        number: 2,
        title: 'Capítulo II · Cartas desde la imprenta',
        src: '/videos/libro-final.mp4',
        durationSeconds: 38,
        fileName: '02-cartas-desde-la-imprenta.mp3',
      },
      {
        id: 'cap-3',
        number: 3,
        title: 'Capítulo III · El eco de las montañas',
        src: '/videos/ebook.mp4',
        durationSeconds: 52,
        fileName: '03-el-eco-de-las-montanas.mp3',
      },
    ],
    createdAt: '2026-11-18T12:00:00.000Z',
    updatedAt: '2026-11-26T09:00:00.000Z',
  },
  {
    slug: 'cronicas-del-ateneo',
    title: 'Crónicas del Ateneo Ocoeño',
    author: 'Gregorio Martínez',
    narrator: 'Archivo Sonoro gmDEI',
    coverUrl: '/assets/portada-2.jpg',
    clientPin: '1234',
    description:
      'Audiolibro con PIN de cliente activo (PIN de demostración: 1234). Incluye control de velocidad y notas vinculadas al segundo exacto.',
    chapters: [
      {
        id: 'ateneo-1',
        number: 1,
        title: 'Prólogo · Fundación y primeras voces',
        src: '/videos/audio-libro.mp4',
        durationSeconds: 45,
        fileName: '01-prologo.mp3',
      },
      {
        id: 'ateneo-2',
        number: 2,
        title: 'Capítulo I · Los años del taller editorial',
        src: '/videos/indesing.mp4',
        durationSeconds: 42,
        fileName: '02-taller-editorial.mp3',
      },
    ],
    createdAt: '2026-11-20T14:00:00.000Z',
    updatedAt: '2026-11-26T09:00:00.000Z',
  },
];

const AUDIOBOOKS_STORAGE_KEY = 'gmdei_audiobooks_catalog_v1';

/**
 * Carga el catálogo combinando el archivo estático /audiolibros/audiobooks.json
 * con los proyectos creados/editados en localStorage desde el panel gmDEI Studio,
 * además de soportar enlaces con configuración embebida en URL (?data=...) para
 * compartir al instante por WhatsApp sin esperar redespliegue.
 */
export async function loadAudiobooksCatalog(): Promise<AudiobookProject[]> {
  let baseList: AudiobookProject[] = [...DEFAULT_AUDIOBOOKS_CATALOG];

  if (typeof window !== 'undefined') {
    try {
      const res = await fetch(withBasePath('/audiolibros/audiobooks.json'), { cache: 'no-store' });
      if (res.ok) {
        const json = (await res.json()) as AudiobookProject[];
        if (Array.isArray(json) && json.length > 0) {
          baseList = json;
        }
      }
    } catch {
      // Usa DEFAULT_AUDIOBOOKS_CATALOG si aún no existe o está offline
    }

    const localRaw = localStorage.getItem(AUDIOBOOKS_STORAGE_KEY);
    if (localRaw) {
      try {
        const localParsed = JSON.parse(localRaw) as AudiobookProject[];
        if (Array.isArray(localParsed)) {
          const map = new Map<string, AudiobookProject>();
          baseList.forEach((b) => map.set(b.slug, b));
          localParsed.forEach((b) => map.set(b.slug, b));
          return Array.from(map.values());
        }
      } catch {
        // Ignorar JSON corrupto
      }
    }
  }

  return baseList;
}

export function saveAudiobooksCatalogToLocal(catalog: AudiobookProject[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(AUDIOBOOKS_STORAGE_KEY, JSON.stringify(catalog));
}

/**
 * Codifica un proyecto con URLs externas en Base64 URL-safe para que el enlace
 * compartido por WhatsApp funcione en cualquier dispositivo de inmediato incluso
 * antes de hacer commit de audiobooks.json al repositorio.
 */
export function encodeInstantSharePayload(book: AudiobookProject): string {
  try {
    const compact: AudiobookProject = {
      ...book,
      chapters: book.chapters.map((c) => ({
        id: c.id,
        number: c.number,
        title: c.title,
        src: c.src.startsWith('blob:')
          ? `/audiolibros/${book.slug}/${c.fileName || `capitulo-${c.number}.mp3`}`
          : c.src,
        durationSeconds: c.durationSeconds,
        fileName: c.fileName,
      })),
    };
    const jsonStr = JSON.stringify(compact);
    if (typeof window !== 'undefined') {
      return btoa(encodeURIComponent(jsonStr));
    }
    return '';
  } catch {
    return '';
  }
}

export function decodeInstantSharePayload(encoded: string): AudiobookProject | null {
  try {
    if (typeof window === 'undefined' || !encoded) return null;
    const jsonStr = decodeURIComponent(atob(encoded));
    const parsed = JSON.parse(jsonStr) as AudiobookProject;
    if (parsed && parsed.slug && Array.isArray(parsed.chapters)) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}
