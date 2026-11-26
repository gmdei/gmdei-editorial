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
  {
    slug: 'el-hombre-y-la-bendicion-del-hombre-de-elohe',
    title: 'El hombre y la bendición del hombre de Elohé',
    author: 'Hipólito Peña',
    narrator: 'Estudio de Voz gmDEI',
    coverUrl: '/audiolibros/el-hombre-y-la-bendicion-del-hombre-de-elohe/portada.jpg',
    clientPin: '',
    description: 'Audiolibro oficial producido por Editora gmDEI.',
    chapters: [
      { id: 'elohe-1', number: 1, title: '00 Titulo', src: '/audiolibros/el-hombre-y-la-bendicion-del-hombre-de-elohe/cap-00.mp3', fileName: 'cap-00.mp3', durationSeconds: 5 },
      { id: 'elohe-2', number: 2, title: '01 Creditos', src: '/audiolibros/el-hombre-y-la-bendicion-del-hombre-de-elohe/cap-01.mp3', fileName: 'cap-01.mp3', durationSeconds: 36 },
      { id: 'elohe-3', number: 3, title: '02 Introducción', src: '/audiolibros/el-hombre-y-la-bendicion-del-hombre-de-elohe/cap-02.mp3', fileName: 'cap-02.mp3', durationSeconds: 129 },
      { id: 'elohe-4', number: 4, title: '03 La llave de la bendición “El shabbat”', src: '/audiolibros/el-hombre-y-la-bendicion-del-hombre-de-elohe/cap-03.mp3', fileName: 'cap-03.mp3', durationSeconds: 490 },
      { id: 'elohe-5', number: 5, title: '04 Institución del Shabbat para el hombre', src: '/audiolibros/el-hombre-y-la-bendicion-del-hombre-de-elohe/cap-04.mp3', fileName: 'cap-04.mp3', durationSeconds: 690 },
      { id: 'elohe-6', number: 6, title: '05 El Shabbat', src: '/audiolibros/el-hombre-y-la-bendicion-del-hombre-de-elohe/cap-05.mp3', fileName: 'cap-05.mp3', durationSeconds: 4983 },
      { id: 'elohe-7', number: 7, title: '06 El Shabbat es la puerta y Yahshua es el portero', src: '/audiolibros/el-hombre-y-la-bendicion-del-hombre-de-elohe/cap-06.mp3', fileName: 'cap-06.mp3', durationSeconds: 1292 },
      { id: 'elohe-8', number: 8, title: '07 Linaje de Avraham en el Mashíaj, Yáshua HaMashíaj, descendencia de Avraham', src: '/audiolibros/el-hombre-y-la-bendicion-del-hombre-de-elohe/cap-07.mp3', fileName: 'cap-07.mp3', durationSeconds: 937 },
      { id: 'elohe-9', number: 9, title: '08 El Shabbat Tiene Prohibiciones en su Bendita Torá, Revelada por El Ruaj de Kadusha a su Pueblo', src: '/audiolibros/el-hombre-y-la-bendicion-del-hombre-de-elohe/cap-08.mp3', fileName: 'cap-08.mp3', durationSeconds: 519 },
      { id: 'elohe-10', number: 10, title: '09 El shabbat torático de yahweh nunca cae sábado', src: '/audiolibros/el-hombre-y-la-bendicion-del-hombre-de-elohe/cap-09.mp3', fileName: 'cap-09.mp3', durationSeconds: 292 },
      { id: 'elohe-11', number: 11, title: '10 La Cena del Shabbat', src: '/audiolibros/el-hombre-y-la-bendicion-del-hombre-de-elohe/cap-10.mp3', fileName: 'cap-10.mp3', durationSeconds: 163 },
      { id: 'elohe-12', number: 12, title: '11 La Ceremonia de la Cena del Shabbat Puesta del Sol, Calendario de la Torá', src: '/audiolibros/el-hombre-y-la-bendicion-del-hombre-de-elohe/cap-11.mp3', fileName: 'cap-11.mp3', durationSeconds: 898 },
      { id: 'elohe-13', number: 13, title: '12 Rosh Jodesh', src: '/audiolibros/el-hombre-y-la-bendicion-del-hombre-de-elohe/cap-12.mp3', fileName: 'cap-12.mp3', durationSeconds: 1360 },
      { id: 'elohe-14', number: 14, title: '13 La Fiesta de Yahweh y La Bendición por Obedecer', src: '/audiolibros/el-hombre-y-la-bendicion-del-hombre-de-elohe/cap-13.mp3', fileName: 'cap-13.mp3', durationSeconds: 163 },
      { id: 'elohe-15', number: 15, title: '14 1a – La cena memorial de la pascua de nuestro Mashíaj Yahshua', src: '/audiolibros/el-hombre-y-la-bendicion-del-hombre-de-elohe/cap-14.mp3', fileName: 'cap-14.mp3', durationSeconds: 604 },
      { id: 'elohe-16', number: 16, title: '15 Pésaj – Pascua', src: '/audiolibros/el-hombre-y-la-bendicion-del-hombre-de-elohe/cap-15.mp3', fileName: 'cap-15.mp3', durationSeconds: 1259 },
      { id: 'elohe-17', number: 17, title: '16 Moedim de Jag Ha-Matzot', src: '/audiolibros/el-hombre-y-la-bendicion-del-hombre-de-elohe/cap-16.mp3', fileName: 'cap-16.mp3', durationSeconds: 385 },
      { id: 'elohe-18', number: 18, title: '17 Shavuot', src: '/audiolibros/el-hombre-y-la-bendicion-del-hombre-de-elohe/cap-17.mp3', fileName: 'cap-17.mp3', durationSeconds: 122 },
      { id: 'elohe-19', number: 19, title: '18 Cuenta final del haomer', src: '/audiolibros/el-hombre-y-la-bendicion-del-hombre-de-elohe/cap-18.mp3', fileName: 'cap-18.mp3', durationSeconds: 341 },
      { id: 'elohe-20', number: 20, title: '19 Yom Teruaj', src: '/audiolibros/el-hombre-y-la-bendicion-del-hombre-de-elohe/cap-19.mp3', fileName: 'cap-19.mp3', durationSeconds: 1166 },
      { id: 'elohe-21', number: 21, title: '20 Yom Kippur', src: '/audiolibros/el-hombre-y-la-bendicion-del-hombre-de-elohe/cap-20.mp3', fileName: 'cap-20.mp3', durationSeconds: 869 },
      { id: 'elohe-22', number: 22, title: '21 Yom Sukkot – Tabernáculo', src: '/audiolibros/el-hombre-y-la-bendicion-del-hombre-de-elohe/cap-21.mp3', fileName: 'cap-21.mp3', durationSeconds: 158 },
      { id: 'elohe-23', number: 23, title: '22 Institución de la fiesta de los tabernáculos', src: '/audiolibros/el-hombre-y-la-bendicion-del-hombre-de-elohe/cap-22.mp3', fileName: 'cap-22.mp3', durationSeconds: 83 },
      { id: 'elohe-24', number: 24, title: '23 Regocijo aceptable a Elohé altísimo', src: '/audiolibros/el-hombre-y-la-bendicion-del-hombre-de-elohe/cap-23.mp3', fileName: 'cap-23.mp3', durationSeconds: 1105 },
      { id: 'elohe-25', number: 25, title: '24 Jag Sameaj Sukkot – Feliz Fiesta de los Tabernáculos, Cabañas', src: '/audiolibros/el-hombre-y-la-bendicion-del-hombre-de-elohe/cap-24.mp3', fileName: 'cap-24.mp3', durationSeconds: 257 },
      { id: 'elohe-26', number: 26, title: '25 Honras a tus Padres y a tu Madre', src: '/audiolibros/el-hombre-y-la-bendicion-del-hombre-de-elohe/cap-25.mp3', fileName: 'cap-25.mp3', durationSeconds: 2589 },
      { id: 'elohe-27', number: 27, title: '26 Bendición y Protección por la Obediencia', src: '/audiolibros/el-hombre-y-la-bendicion-del-hombre-de-elohe/cap-26.mp3', fileName: 'cap-26.mp3', durationSeconds: 3122 },
      { id: 'elohe-28', number: 28, title: '27 La Bendición por Obedecer o La Maldicion por Desobedeser', src: '/audiolibros/el-hombre-y-la-bendicion-del-hombre-de-elohe/cap-27.mp3', fileName: 'cap-27.mp3', durationSeconds: 2640 },
      { id: 'elohe-29', number: 29, title: '28 La Berajot del Hombre de Elohé', src: '/audiolibros/el-hombre-y-la-bendicion-del-hombre-de-elohe/cap-28.mp3', fileName: 'cap-28.mp3', durationSeconds: 2545 },
      { id: 'elohe-30', number: 30, title: '29 La Bendición Existe Antes de la Desobediencia de Adán Y Jawa', src: '/audiolibros/el-hombre-y-la-bendicion-del-hombre-de-elohe/cap-29.mp3', fileName: 'cap-29.mp3', durationSeconds: 2685 },
      { id: 'elohe-31', number: 31, title: '30 Conflicto Espiritual', src: '/audiolibros/el-hombre-y-la-bendicion-del-hombre-de-elohe/cap-30.mp3', fileName: 'cap-30.mp3', durationSeconds: 1925 },
      { id: 'elohe-32', number: 32, title: '31 La aparición de los Hermanos de Yosef', src: '/audiolibros/el-hombre-y-la-bendicion-del-hombre-de-elohe/cap-31.mp3', fileName: 'cap-31.mp3', durationSeconds: 1820 },
      { id: 'elohe-33', number: 33, title: '32 Revelación y ordenanza del calendario de la torá de Yahweh', src: '/audiolibros/el-hombre-y-la-bendicion-del-hombre-de-elohe/cap-32.mp3', fileName: 'cap-32.mp3', durationSeconds: 383 },
      { id: 'elohe-34', number: 34, title: '33 Historia de Avraham', src: '/audiolibros/el-hombre-y-la-bendicion-del-hombre-de-elohe/cap-33.mp3', fileName: 'cap-33.mp3', durationSeconds: 5118 },
      { id: 'elohe-35', number: 35, title: '34 La bendición del hombre de Elohé', src: '/audiolibros/el-hombre-y-la-bendicion-del-hombre-de-elohe/cap-34.mp3', fileName: 'cap-34.mp3', durationSeconds: 141 },
      { id: 'elohe-36', number: 36, title: '35 La condición de tener éxito o prosperar', src: '/audiolibros/el-hombre-y-la-bendicion-del-hombre-de-elohe/cap-35.mp3', fileName: 'cap-35.mp3', durationSeconds: 322 },
      { id: 'elohe-37', number: 37, title: '36 La Conclusión de la Bendición del Hombre de Elohé', src: '/audiolibros/el-hombre-y-la-bendicion-del-hombre-de-elohe/cap-36.mp3', fileName: 'cap-36.mp3', durationSeconds: 342 },
      { id: 'elohe-38', number: 38, title: '37 Agradecimiento y referencias', src: '/audiolibros/el-hombre-y-la-bendicion-del-hombre-de-elohe/cap-37.mp3', fileName: 'cap-37.mp3', durationSeconds: 34 },
    ],
    createdAt: '2026-11-26T18:54:55.186Z',
    updatedAt: '2026-11-26T19:15:00.000Z',
  },
];

const AUDIOBOOKS_STORAGE_KEY = 'gmdei_audiobooks_catalog_v1';

// Sincronización en la nube vía Supabase (si está configurado) o almacén JSON compartido gratuito
// para que cualquier audiolibro creado en PC aparezca de inmediato en el móvil con el enlace corto #slug.
const CLOUD_CATALOG_ENDPOINT = 'https://jsonblob.com/api/jsonBlob';
const CLOUD_CATALOG_ID_KEY = 'gmdei_cloud_catalog_blob_id_v1';
// ID de catálogo compartido por defecto para gmDEI Studio
const DEFAULT_SHARED_BLOB_ID = '01972b3e-8f42-7c90-9a1b-4c2d8e5f1a09';

const INDEXED_DB_NAME = 'gmdei_audiobooks_files_db';
const INDEXED_DB_STORE = 'audio_files';

function openAudioFilesDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      reject(new Error('IndexedDB no disponible'));
      return;
    }
    const req = window.indexedDB.open(INDEXED_DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(INDEXED_DB_STORE)) {
        db.createObjectStore(INDEXED_DB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Guarda un archivo de audio o portada en IndexedDB del navegador para que siga
 * reproduciéndose incluso después de recargar la página o abrir el enlace en otra pestaña.
 */
export async function saveAudioBlobToIndexedDb(key: string, blob: Blob): Promise<void> {
  try {
    const db = await openAudioFilesDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(INDEXED_DB_STORE, 'readwrite');
      tx.objectStore(INDEXED_DB_STORE).put(blob, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Fallback silencioso
  }
}

export async function getAudioBlobUrlFromIndexedDb(key: string): Promise<string | null> {
  try {
    const db = await openAudioFilesDb();
    const blob = await new Promise<Blob | undefined>((resolve, reject) => {
      const tx = db.transaction(INDEXED_DB_STORE, 'readonly');
      const req = tx.objectStore(INDEXED_DB_STORE).get(key);
      req.onsuccess = () => resolve(req.result as Blob | undefined);
      req.onerror = () => reject(req.error);
    });
    if (blob instanceof Blob) {
      return URL.createObjectURL(blob);
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Sincroniza un libro recién creado o editado directamente con el repositorio
 * de GitHub (`public/audiolibros/audiobooks.json` y archivos `.mp3` en `public/audiolibros/[slug]/`)
 * usando un GitHub Personal Access Token para que el link corto `#slug` funcione
 * en cualquier teléfono o navegador sin que caiga en el libro de ejemplo.
 */
export async function publishAudiobookToGitHubRepo(params: {
  githubToken: string;
  owner?: string;
  repo?: string;
  catalog: AudiobookProject[];
  bookSlug: string;
  localFiles?: Record<string, File>;
  onProgress?: (msg: string) => void;
}): Promise<{ ok: boolean; message: string }> {
  const owner = params.owner || 'gmdei';
  const repo = params.repo || 'gmdei-editorial';
  const headers: Record<string, string> = {
    Authorization: `Bearer ${params.githubToken.trim()}`,
    Accept: 'application/vnd.github+json',
    'Content-Type': 'application/json',
  };

  const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode.apply(null, Array.from(chunk));
    }
    return btoa(binary);
  };

  const upsertGitHubFile = async (repoPath: string, base64Content: string, commitMsg: string) => {
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${repoPath}`;
    let existingSha: string | undefined;
    try {
      const getRes = await fetch(apiUrl, { headers });
      if (getRes.ok) {
        const info = await getRes.json();
        existingSha = info.sha;
      }
    } catch {
      // Archivo nuevo
    }

    const putRes = await fetch(apiUrl, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        message: commitMsg,
        content: base64Content,
        ...(existingSha ? { sha: existingSha } : {}),
      }),
    });

    if (!putRes.ok) {
      const errText = await putRes.text();
      throw new Error(`Error al subir ${repoPath}: ${putRes.status} ${errText}`);
    }
  };

  try {
    // 1. Subir cada archivo .mp3 arrastrado a public/audiolibros/[slug]/[fileName]
    if (params.localFiles) {
      const entries = Object.entries(params.localFiles);
      for (let i = 0; i < entries.length; i++) {
        const [fileName, fileObj] = entries[i];
        params.onProgress?.(
          `Subiendo audio (${i + 1}/${entries.length}): ${fileName} a GitHub...`
        );
        const buf = await fileObj.arrayBuffer();
        const b64 = arrayBufferToBase64(buf);
        await upsertGitHubFile(
          `public/audiolibros/${params.bookSlug}/${fileName}`,
          b64,
          `feat(audiolibro): subir audio ${fileName} en ${params.bookSlug}`
        );
      }
    }

    // 2. Actualizar public/audiolibros/audiobooks.json con el catálogo limpio
    params.onProgress?.('Actualizando catálogo public/audiolibros/audiobooks.json en GitHub...');
    const cleanCatalog = params.catalog.map((b) => ({
      ...b,
      chapters: b.chapters.map((c) => ({
        ...c,
        src:
          c.src.startsWith('blob:') || c.src.startsWith('idb://')
            ? `/audiolibros/${b.slug}/${c.fileName || `capitulo-${c.number}.mp3`}`
            : c.src,
      })),
    }));
    const jsonString = JSON.stringify(cleanCatalog, null, 2);
    const jsonBase64 = btoa(unescape(encodeURIComponent(jsonString)));

    await upsertGitHubFile(
      'public/audiolibros/audiobooks.json',
      jsonBase64,
      `feat(audiolibros): publicar/actualizar ${params.bookSlug} en audiobooks.json`
    );

    return {
      ok: true,
      message: `✓ Publicado en GitHub (gmdei/gmdei-editorial). En ~1 minuto el enlace corto #${params.bookSlug} estará actualizado en todos los dispositivos.`,
    };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : 'No se pudo publicar en GitHub.',
    };
  }
}

/**
 * Carga el catálogo combinando:
 * 1) Catálogo en la nube de Supabase (tabla projects / audiobooks) o JSON remoto
 * 2) El archivo estático /audiolibros/audiobooks.json del repositorio GitHub Pages
 * 3) Los proyectos guardados en localStorage
 */
export async function loadAudiobooksCatalog(): Promise<AudiobookProject[]> {
  const map = new Map<string, AudiobookProject>();
  DEFAULT_AUDIOBOOKS_CATALOG.forEach((b) => map.set(b.slug, b));

  if (typeof window !== 'undefined') {
    // 1. Leer archivo estático del repositorio (/audiolibros/audiobooks.json)
    try {
      const res = await fetch(withBasePath(`/audiolibros/audiobooks.json?t=${Date.now()}`), {
        cache: 'no-store',
      });
      if (res.ok) {
        const json = (await res.json()) as AudiobookProject[];
        if (Array.isArray(json)) {
          json.forEach((b) => map.set(b.slug, b));
        }
      }
    } catch {
      // Continúa con el catálogo en memoria
    }

    // 2. Leer directamente del repositorio de GitHub API (sin caché de CDN de GitHub Pages)
    // para que apenas se publique un libro aparezca en el móvil al segundo siguiente
    try {
      const ghRawRes = await fetch(
        `https://raw.githubusercontent.com/gmdei/gmdei-editorial/main/public/audiolibros/audiobooks.json?t=${Date.now()}`,
        { cache: 'no-store' }
      );
      if (ghRawRes.ok) {
        const ghJson = (await ghRawRes.json()) as AudiobookProject[];
        if (Array.isArray(ghJson)) {
          ghJson.forEach((b) => map.set(b.slug, b));
        }
      }
    } catch {
      // Fallback silencioso si no hay conexión
    }

    // 3. Combinar con localStorage local del dispositivo
    const localRaw = localStorage.getItem(AUDIOBOOKS_STORAGE_KEY);
    if (localRaw) {
      try {
        const localParsed = JSON.parse(localRaw) as AudiobookProject[];
        if (Array.isArray(localParsed)) {
          localParsed.forEach((b) => map.set(b.slug, b));
        }
      } catch {
        // Ignorar JSON corrupto
      }
    }
  }

  return Array.from(map.values());
}

export function saveAudiobooksCatalogToLocal(catalog: AudiobookProject[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(AUDIOBOOKS_STORAGE_KEY, JSON.stringify(catalog));
}

/**
 * Codifica un proyecto en Base64 URL-safe compacto para que el enlace compartido por WhatsApp
 * (#slug~PAYLOAD o ?d=PAYLOAD) abra SIEMPRE el libro exacto en cualquier dispositivo,
 * incluso si el editor aún no ha hecho push de audiobooks.json a GitHub.
 */
export function encodeInstantSharePayload(book: AudiobookProject): string {
  try {
    // Si la portada es una imagen base64 gigante (> 2KB), usamos la ruta relativa en el enlace para mantener el URL corto
    const safeCover =
      book.coverUrl && book.coverUrl.startsWith('data:') && book.coverUrl.length > 2000
        ? '/assets/portada-1.jpg'
        : book.coverUrl;

    const compact: AudiobookProject = {
      ...book,
      coverUrl: safeCover,
      chapters: book.chapters.map((c) => ({
        id: c.id,
        number: c.number,
        title: c.title,
        src:
          c.src.startsWith('blob:') || c.src.startsWith('idb://')
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
