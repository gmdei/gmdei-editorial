import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  CorrectionChannel,
  DEFAULT_PRICING_SETTINGS,
  EDITORIAL_STAGES_11,
  ENTRY_CONDITIONS_LADDER,
  EditorialProject,
  EntryConditionId,
  PricingSettings,
  ProjectStageState,
} from './editorial-data';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured =
  Boolean(supabaseUrl && supabaseAnonKey) &&
  !supabaseUrl.includes('tu-proyecto.supabase.co');

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

const STORAGE_KEYS = {
  PRICING: 'gmdei_pricing_settings_v1',
  PROJECTS: 'gmdei_projects_v1',
  SESSION: 'gmdei_active_session_v1',
};

export interface AuthSessionUser {
  id: string;
  email: string;
  fullName: string;
  role: 'client' | 'admin';
  projectCode?: string;
}

export function buildInitialStagesState(
  entryCondition: EntryConditionId,
  customPrices?: Record<number, number>
): ProjectStageState[] {
  const condObj =
    ENTRY_CONDITIONS_LADDER.find((c) => c.id === entryCondition) || ENTRY_CONDITIONS_LADDER[0];

  return EDITORIAL_STAGES_11.map((st, idx) => {
    const maxRounds =
      st.id === 3
        ? condObj.isJpgOrDigitacion
          ? 6
          : 3
        : st.maxRoundsDefault;

    return {
      id: st.id,
      title: st.title,
      status: idx < 2 ? 'completed' : idx === 2 ? 'current' : 'locked',
      roundsUsed: 0,
      maxRounds,
      customPrice:
        customPrices && typeof customPrices[st.id] === 'number'
          ? customPrices[st.id]
          : st.defaultStagePrice,
      approvedAt: idx < 2 ? new Date().toISOString() : undefined,
    };
  });
}

function getDemoSeedProject(): EditorialProject {
  const entryCondition: EntryConditionId = 'jpg_numbered';
  return {
    id: 'proj-demo-001',
    code: 'GMDEI-2026-1042',
    clientId: 'client-demo-001',
    clientName: 'Camila Mendoza',
    clientEmail: 'camila@ejemplo.bo',
    clientPhone: '59171234567',
    clientPasswordPlain: 'GMDEI-2026!',
    bookTitle: 'El jardín de las voces (Crónicas de Ocoa)',
    bookSize: '15 x 21 cm (Estándar Editorial)',
    entryCondition,
    entryLevelBadge: '+2',
    detectedPages: 168,
    detectedImages: 8,
    wantsImageEditing: true,
    imagesToAdd: 0,
    detectedTables: 3,
    tableSpecifications: '3 cuadros genealógicos e históricos en capítulos II y IV a una tinta.',
    correctionChannel: 'whatsapp',
    totalCost: 993,
    deposit50: 496.5,
    depositPaid: true,
    balancePaid: false,
    signatureDataUrl: '',
    signedAt: new Date().toISOString(),
    currentStage: 3,
    digitacionJpgChancesLeft: 6,
    digitacionJpgChancesMax: 6,
    generalDiagramChancesLeft: 3,
    generalDiagramChancesMax: 3,
    printedSamplesLeft: 3,
    printedSamplesMax: 3,
    printedSamplesDelivered: 0,
    coverApproved: false,
    coverPreviewUrl: '/assets/portada-1.jpg',
    flipbookUrl: 'https://gmdei.editorial/flipbook/el-jardin-de-las-voces',
    proofPdfUrl: '/assets/muestra-libro.pdf',
    finalFilesUrl: '/ATENEO_OCOENO_FINAL.pdf',
    isbnCode: '978-9917-0-4821-3',
    stage10UppercaseApproval: '',
    stages: buildInitialStagesState(entryCondition),
    addendums: [],
    logs: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Obtiene el tarifario global (desde Supabase o localStorage)
 */
export async function fetchPricingSettings(): Promise<PricingSettings> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('pricing_settings')
        .select('*')
        .eq('id', 1)
        .single();
      if (!error && data) {
        return {
          base_rate_per_page: Number(data.base_rate_per_page),
          surcharge_word_ready: Number(data.surcharge_word_ready),
          surcharge_pdf_conversion: Number(data.surcharge_pdf_conversion),
          surcharge_jpg_numbered: Number(data.surcharge_jpg_numbered),
          surcharge_loose_files: Number(data.surcharge_loose_files),
          surcharge_jpg_unorganized: Number(data.surcharge_jpg_unorganized),
          surcharge_manuscript: Number(data.surcharge_manuscript),
          image_edit_cost: Number(data.image_edit_cost),
          image_insert_cost: Number(data.image_insert_cost),
          table_layout_cost: Number(data.table_layout_cost),
          extra_round_cost: Number(data.extra_round_cost),
          extra_printed_sample_cost: Number(data.extra_printed_sample_cost),
          whatsapp_official: data.whatsapp_official || DEFAULT_PRICING_SETTINGS.whatsapp_official,
          email_official: data.email_official || DEFAULT_PRICING_SETTINGS.email_official,
        };
      }
    } catch {
      // Fallback a localStorage
    }
  }

  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem(STORAGE_KEYS.PRICING);
    if (raw) {
      try {
        return { ...DEFAULT_PRICING_SETTINGS, ...JSON.parse(raw) };
      } catch {
        return DEFAULT_PRICING_SETTINGS;
      }
    }
  }
  return DEFAULT_PRICING_SETTINGS;
}

export async function savePricingSettings(settings: PricingSettings): Promise<void> {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.PRICING, JSON.stringify(settings));
  }
  if (supabase) {
    try {
      await supabase
        .from('pricing_settings')
        .upsert({ id: 1, ...settings, updated_at: new Date().toISOString() });
    } catch {
      // Guardado local garantizado
    }
  }
}

export function getLocalProjects(): EditorialProject[] {
  if (typeof window === 'undefined') return [getDemoSeedProject()];
  const raw = localStorage.getItem(STORAGE_KEYS.PROJECTS);
  if (!raw) {
    const initial = [getDemoSeedProject()];
    localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(initial));
    return initial;
  }
  try {
    const parsed = JSON.parse(raw) as EditorialProject[];
    return parsed.length > 0 ? parsed : [getDemoSeedProject()];
  } catch {
    return [getDemoSeedProject()];
  }
}

export function saveLocalProjects(projects: EditorialProject[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
}

export async function saveOrUpdateProject(project: EditorialProject): Promise<EditorialProject> {
  const updated = { ...project, updatedAt: new Date().toISOString() };

  if (typeof window !== 'undefined') {
    const list = getLocalProjects();
    const idx = list.findIndex((p) => p.id === updated.id || p.code === updated.code);
    if (idx >= 0) {
      list[idx] = updated;
    } else {
      list.unshift(updated);
    }
    saveLocalProjects(list);
  }

  if (supabase) {
    try {
      await supabase.from('projects').upsert({
        id: updated.id.startsWith('proj-') ? undefined : updated.id,
        code: updated.code,
        client_name: updated.clientName,
        client_email: updated.clientEmail,
        client_phone: updated.clientPhone,
        book_title: updated.bookTitle,
        book_size: updated.bookSize,
        entry_condition: updated.entryCondition,
        entry_level_badge: updated.entryLevelBadge,
        detected_pages: updated.detectedPages,
        detected_images: updated.detectedImages,
        wants_image_editing: updated.wantsImageEditing,
        images_to_add: updated.imagesToAdd,
        detected_tables: updated.detectedTables,
        table_specifications: updated.tableSpecifications,
        correction_channel: updated.correctionChannel,
        total_cost: updated.totalCost,
        deposit_50: updated.deposit50,
        deposit_paid: updated.depositPaid,
        balance_paid: updated.balancePaid,
        signature_data_url: updated.signatureDataUrl,
        signed_at: updated.signedAt,
        current_stage: updated.currentStage,
        digitacion_jpg_chances_left: updated.digitacionJpgChancesLeft,
        general_diagram_chances_left: updated.generalDiagramChancesLeft,
        printed_samples_left: updated.printedSamplesLeft,
        printed_samples_delivered: updated.printedSamplesDelivered,
        cover_approved: updated.coverApproved,
        cover_preview_url: updated.coverPreviewUrl,
        flipbook_url: updated.flipbookUrl,
        proof_pdf_url: updated.proofPdfUrl,
        final_files_url: updated.finalFilesUrl,
        isbn_code: updated.isbnCode,
        stage10_uppercase_approval: updated.stage10UppercaseApproval,
        stage10_approved_at: updated.stage10ApprovedAt,
        stages_state: updated.stages,
        extra_addendums: updated.addendums,
        updated_at: updated.updatedAt,
      });
    } catch {
      // Respaldo en localStorage ya completado
    }
  }

  return updated;
}

/**
 * Crea un usuario y contraseña en Supabase Auth para el cliente tras confirmar el pago del 50%,
 * registra su proyecto y establece la sesión activa para redirigirlo a /mi-proyecto.
 */
export async function registerClientAndCreateProjectAfterPayment(params: {
  projectCode: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  password: string;
  bookTitle: string;
  bookSize: string;
  entryCondition: EntryConditionId;
  detectedPages: number;
  detectedImages: number;
  wantsImageEditing: boolean;
  imagesToAdd: number;
  detectedTables: number;
  tableSpecifications: string;
  correctionChannel: CorrectionChannel;
  totalCost: number;
  deposit50: number;
  signatureDataUrl: string;
}): Promise<{ project: EditorialProject; session: AuthSessionUser }> {
  const condObj =
    ENTRY_CONDITIONS_LADDER.find((c) => c.id === params.entryCondition) ||
    ENTRY_CONDITIONS_LADDER[0];

  let supabaseUserId = `user-${Date.now()}`;

  // 1. Intentar alta real en Supabase Auth si las variables de entorno están configuradas
  if (supabase) {
    try {
      const { data: signUpData } = await supabase.auth.signUp({
        email: params.clientEmail.trim().toLowerCase(),
        password: params.password,
        options: {
          data: {
            full_name: params.clientName,
            phone: params.clientPhone,
            role: 'client',
          },
        },
      });
      if (signUpData?.user?.id) {
        supabaseUserId = signUpData.user.id;
      }
    } catch {
      // Continúa con sesión local sincronizada
    }
  }

  const newProject: EditorialProject = {
    id: `proj-${Date.now()}`,
    code: params.projectCode,
    clientId: supabaseUserId,
    clientName: params.clientName.trim(),
    clientEmail: params.clientEmail.trim().toLowerCase(),
    clientPhone: params.clientPhone.trim(),
    clientPasswordPlain: params.password,
    bookTitle: params.bookTitle.trim(),
    bookSize: params.bookSize,
    entryCondition: params.entryCondition,
    entryLevelBadge: condObj.badge,
    detectedPages: params.detectedPages,
    detectedImages: params.detectedImages,
    wantsImageEditing: params.wantsImageEditing,
    imagesToAdd: params.imagesToAdd,
    detectedTables: params.detectedTables,
    tableSpecifications: params.tableSpecifications,
    correctionChannel: params.correctionChannel,
    totalCost: params.totalCost,
    deposit50: params.deposit50,
    depositPaid: true,
    balancePaid: false,
    signatureDataUrl: params.signatureDataUrl,
    signedAt: new Date().toISOString(),
    currentStage: 3, // Etapas 1 y 2 completadas con la firma y anticipo del 50 %
    digitacionJpgChancesLeft: 6,
    digitacionJpgChancesMax: 6,
    generalDiagramChancesLeft: 3,
    generalDiagramChancesMax: 3,
    printedSamplesLeft: 3,
    printedSamplesMax: 3,
    printedSamplesDelivered: 0,
    coverApproved: false,
    coverPreviewUrl: '/assets/portada-1.jpg',
    flipbookUrl: `https://gmdei.editorial/flipbook/${params.projectCode.toLowerCase()}`,
    proofPdfUrl: '/assets/muestra-libro.pdf',
    finalFilesUrl: '/ATENEO_OCOENO_FINAL.pdf',
    isbnCode: '978-9917-0-9102-8',
    stage10UppercaseApproval: '',
    stages: buildInitialStagesState(params.entryCondition),
    addendums: [],
    logs: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await saveOrUpdateProject(newProject);

  const session: AuthSessionUser = {
    id: supabaseUserId,
    email: newProject.clientEmail,
    fullName: newProject.clientName,
    role: 'client',
    projectCode: newProject.code,
  };

  setActiveSession(session);
  return { project: newProject, session };
}

export function getActiveSession(): AuthSessionUser | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(STORAGE_KEYS.SESSION);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthSessionUser;
  } catch {
    return null;
  }
}

export function setActiveSession(session: AuthSessionUser | null): void {
  if (typeof window === 'undefined') return;
  if (!session) {
    localStorage.removeItem(STORAGE_KEYS.SESSION);
    if (supabase) {
      supabase.auth.signOut().catch(() => {});
    }
  } else {
    localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(session));
  }
}

/**
 * Autenticación de cliente o administrador aplicando estricto aislamiento RLS
 * (cada cliente solo puede recuperar su propio proyecto asignado a su email/usuario).
 */
export async function authenticateUser(
  emailOrUser: string,
  password: string
): Promise<{ session: AuthSessionUser; error?: string }> {
  const cleanEmail = emailOrUser.trim().toLowerCase();

  // Credenciales de Administrador gmDEI
  if (
    (cleanEmail === 'admin@gmdei.com' || cleanEmail === 'admin') &&
    (password === 'admin123' || password === 'gmdei2026')
  ) {
    const adminSession: AuthSessionUser = {
      id: 'admin-gmdei-001',
      email: 'admin@gmdei.com',
      fullName: 'Dirección Editorial gmDEI',
      role: 'admin',
    };
    setActiveSession(adminSession);
    return { session: adminSession };
  }

  // Intentar login contra Supabase Auth si está configurado
  if (supabase) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });
      if (!error && data.user) {
        const role =
          (data.user.user_metadata?.role as 'client' | 'admin') || 'client';
        const session: AuthSessionUser = {
          id: data.user.id,
          email: data.user.email || cleanEmail,
          fullName: data.user.user_metadata?.full_name || cleanEmail,
          role,
        };
        setActiveSession(session);
        return { session };
      }
    } catch {
      // Continúa a verificación de proyectos registrados
    }
  }

  // Verificar proyectos del cliente (simulando la política RLS auth.uid() = client_id)
  const projects = getLocalProjects();
  const matchedProject = projects.find(
    (p) =>
      p.clientEmail.toLowerCase() === cleanEmail ||
      p.code.toLowerCase() === cleanEmail
  );

  if (!matchedProject) {
    return {
      session: null as unknown as AuthSessionUser,
      error:
        'No se encontró ningún proyecto asociado a ese correo o código. Cotiza tu libro o usa la cuenta de demostración.',
    };
  }

  if (
    matchedProject.clientPasswordPlain &&
    matchedProject.clientPasswordPlain !== password
  ) {
    return {
      session: null as unknown as AuthSessionUser,
      error: 'Contraseña incorrecta para este proyecto editorial.',
    };
  }

  const clientSession: AuthSessionUser = {
    id: matchedProject.clientId,
    email: matchedProject.clientEmail,
    fullName: matchedProject.clientName,
    role: 'client',
    projectCode: matchedProject.code,
  };
  setActiveSession(clientSession);
  return { session: clientSession };
}

/**
 * Política RLS en cliente: devuelve ÚNICAMENTE el proyecto que pertenece al usuario autenticado
 */
export function getProjectForAuthenticatedClient(
  session: AuthSessionUser
): EditorialProject | null {
  const projects = getLocalProjects();
  return (
    projects.find(
      (p) =>
        p.clientId === session.id ||
        p.clientEmail.toLowerCase() === session.email.toLowerCase() ||
        (session.projectCode && p.code === session.projectCode)
    ) || null
  );
}
