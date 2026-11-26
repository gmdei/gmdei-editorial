export type EntryConditionId =
  | 'word_ready'
  | 'pdf'
  | 'jpg_numbered'
  | 'loose_files'
  | 'jpg_unorganized'
  | 'manuscript';

export type CorrectionChannel = 'whatsapp' | 'email';

export interface EntryConditionOption {
  id: EntryConditionId;
  badge: string;
  levelNumber: number;
  title: string;
  subtitle: string;
  processDescription: string;
  isJpgOrDigitacion: boolean;
  prerequisiteSteps: string[];
  surchargeKey: keyof PricingSettings;
}

export interface PricingSettings {
  base_rate_per_page: number;
  surcharge_word_ready: number;
  surcharge_pdf_conversion: number;
  surcharge_jpg_numbered: number;
  surcharge_loose_files: number;
  surcharge_jpg_unorganized: number;
  surcharge_manuscript: number;
  image_edit_cost: number;
  image_insert_cost: number;
  table_layout_cost: number;
  extra_round_cost: number;
  extra_printed_sample_cost: number;
  whatsapp_official: string;
  email_official: string;
}

export interface EditorialStageDefinition {
  id: number;
  code: string;
  title: string;
  subtitle: string;
  owner: 'cliente' | 'gmdei' | 'compartido';
  description: string;
  deliverable: string;
  clientAction: string;
  maxRoundsDefault: number;
  usesDigitacionJpgPool?: boolean;
  usesGeneralDiagramPool?: boolean;
  requiresCoverApproved?: boolean;
  requires20WordsUppercase?: boolean;
  defaultStagePrice: number;
  videoUrl: string;
  videoBadge: string;
}

export interface ProjectStageState {
  id: number;
  title: string;
  status: 'completed' | 'current' | 'locked';
  roundsUsed: number;
  maxRounds: number;
  customPrice: number;
  approvedAt?: string;
  lastRoundCode?: string;
}

export interface ExtraAddendum {
  id: string;
  type: 'extra_round' | 'extra_sample' | 'custom';
  stageId: number;
  stageTitle: string;
  description: string;
  amount: number;
  status: 'pending' | 'approved_paid';
  requestedAt: string;
  approvedAt?: string;
}

export interface CorrectionLogItem {
  id: string;
  stageId: number;
  stageTitle: string;
  roundCode: string; // [CODIGO | ETAPA | Ronda X/Y]
  channel: CorrectionChannel;
  notes: string;
  createdAt: string;
}

export interface EditorialProject {
  id: string;
  code: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  clientPasswordPlain?: string; // Mostrado al crear el usuario para que el cliente pueda ingresar
  bookTitle: string;
  bookSize: string;
  entryCondition: EntryConditionId;
  entryLevelBadge: string;
  detectedPages: number;
  detectedImages: number;
  wantsImageEditing: boolean;
  imagesToAdd: number;
  detectedTables: number;
  tableSpecifications: string;
  correctionChannel: CorrectionChannel;
  totalCost: number;
  deposit50: number;
  depositPaid: boolean;
  balancePaid: boolean;
  signatureDataUrl: string;
  signedAt: string;
  currentStage: number;
  // Contadores globales visibles
  digitacionJpgChancesLeft: number;
  digitacionJpgChancesMax: number;
  generalDiagramChancesLeft: number;
  generalDiagramChancesMax: number;
  printedSamplesLeft: number;
  printedSamplesMax: number;
  printedSamplesDelivered: number;
  // Controles de etapa 9 y 10 y enlaces Admin
  coverApproved: boolean;
  coverPreviewUrl: string;
  flipbookUrl: string;
  proofPdfUrl: string;
  finalFilesUrl: string;
  isbnCode: string;
  stage10UppercaseApproval: string;
  stage10ApprovedAt?: string;
  stages: ProjectStageState[];
  addendums: ExtraAddendum[];
  logs: CorrectionLogItem[];
  createdAt: string;
  updatedAt: string;
}

export const DEFAULT_PRICING_SETTINGS: PricingSettings = {
  base_rate_per_page: 3.5,
  surcharge_word_ready: 0,
  surcharge_pdf_conversion: 120,
  surcharge_jpg_numbered: 210,
  surcharge_loose_files: 280,
  surcharge_jpg_unorganized: 390,
  surcharge_manuscript: 650,
  image_edit_cost: 15,
  image_insert_cost: 18,
  table_layout_cost: 25,
  extra_round_cost: 85,
  extra_printed_sample_cost: 95,
  whatsapp_official: '59170000000',
  email_official: 'correcciones@gmdei.com',
};

/**
 * Escalera de prerrequisitos hasta llegar a Word listo para estilado
 * Exactamente con las 6 condiciones de entrada obligatorias:
 */
export const ENTRY_CONDITIONS_LADDER: EntryConditionOption[] = [
  {
    id: 'word_ready',
    badge: '+4',
    levelNumber: 4,
    title: 'Word listo (+4, ruta base más económica)',
    subtitle: 'Archivo .docx unificado y limpio, directo a jerarquía y estilado editorial.',
    processDescription:
      'Ingresa directamente a preparación de estilos y maquetación sin costos de conversión ni transcripción.',
    isJpgOrDigitacion: false,
    prerequisiteSteps: ['Word unificado listo para estilado (+4)'],
    surchargeKey: 'surcharge_word_ready',
  },
  {
    id: 'pdf',
    badge: '+3',
    levelNumber: 3,
    title: 'PDF (+3, conversión a Word)',
    subtitle: 'Documento en formato PDF que requiere extracción estructural y conversión a Word editable.',
    processDescription:
      'Conversión técnica de PDF a Word editable, limpieza de saltos de línea rotos y paso a Word listo (+4).',
    isJpgOrDigitacion: false,
    prerequisiteSteps: ['Conversión técnica de PDF (+3)', 'Word unificado listo para estilado (+4)'],
    surchargeKey: 'surcharge_pdf_conversion',
  },
  {
    id: 'jpg_numbered',
    badge: '+2',
    levelNumber: 2,
    title: 'JPG numerados por página (+2, OCR + compilación)',
    subtitle: 'Imágenes escaneadas o fotografiadas en secuencia numerada listas para reconocimiento óptico.',
    processDescription:
      'Reconocimiento óptico de caracteres (OCR), compilación secuencial y limpieza hasta Word listo (+4). Incluye hasta 6 correcciones en etapa de Digitación/JPG.',
    isJpgOrDigitacion: true,
    prerequisiteSteps: [
      'OCR de JPG numerados (+2)',
      'Compilación de páginas (+3)',
      'Word unificado listo para estilado (+4)',
    ],
    surchargeKey: 'surcharge_jpg_numbered',
  },
  {
    id: 'loose_files',
    badge: '+1',
    levelNumber: 1,
    title: 'Digitado en archivos sueltos (+1, compilación)',
    subtitle: 'Capítulos, poemas o secciones dispersos en múltiples documentos que requieren orden y compilación.',
    processDescription:
      'Estandarización de archivos sueltos, armado del índice maestro y compilación en un único Word (+4).',
    isJpgOrDigitacion: true,
    prerequisiteSteps: [
      'Ordenamiento de archivos sueltos (+1)',
      'Compilación maestra de capítulos (+3)',
      'Word unificado listo para estilado (+4)',
    ],
    surchargeKey: 'surcharge_loose_files',
  },
  {
    id: 'jpg_unorganized',
    badge: '0',
    levelNumber: 0,
    title: 'JPG sin organizar (0, organización + OCR, menor costo que digitación)',
    subtitle: 'Capturas o fotos de páginas sin numeración que requieren curaduría de orden antes del OCR.',
    processDescription:
      'Clasificación y foliación página por página, procesamiento OCR asistido y compilación a Word (+4). Menor costo que digitación completa. Incluye hasta 6 correcciones.',
    isJpgOrDigitacion: true,
    prerequisiteSteps: [
      'Organización y foliación de JPG (0)',
      'Secuencia numerada (+2)',
      'OCR y compilación (+3)',
      'Word unificado listo para estilado (+4)',
    ],
    surchargeKey: 'surcharge_jpg_unorganized',
  },
  {
    id: 'manuscript',
    badge: '0',
    levelNumber: 0,
    title: 'Manuscrito (0, digitación completa, recorrido más largo y mayor costo)',
    subtitle: 'Original en papel físico, mecanografiado o manuscrito que requiere transcripción íntegra.',
    processDescription:
      'Digitación editorial completa desde cero, cotejo de fidelidad con hasta 6 rondas de corrección de digitación y armado en Word listo para estilado (+4).',
    isJpgOrDigitacion: true,
    prerequisiteSteps: [
      'Digitación completa desde Manuscrito (0)',
      'Cotejo de transcripción (+1)',
      'Compilación de capítulos (+3)',
      'Word unificado listo para estilado (+4)',
    ],
    surchargeKey: 'surcharge_manuscript',
  },
];

/**
 * Las 11 Etapas Oficiales del Viaje del Libro en gmDEI Editorial
 */
export const EDITORIAL_STAGES_11: EditorialStageDefinition[] = [
  {
    id: 1,
    code: 'ETAPA 01',
    title: 'Recepción y Diagnóstico del Original',
    subtitle: 'Escalera de prerrequisitos (0 a +4) y análisis estructural de páginas, imágenes y tablas.',
    owner: 'cliente',
    description:
      'Recibimos tu obra en cualquiera de las 6 condiciones de entrada (desde Manuscrito o JPG hasta Word listo +4) y auditamos tablas, imágenes y extensión.',
    deliverable: 'Ficha técnica de ingreso y ruta de prerrequisitos',
    clientAction: 'Confirmar que el documento e inventario de imágenes/tablas corresponden al proyecto.',
    maxRoundsDefault: 3,
    defaultStagePrice: 40,
    videoUrl: '/videos/audio-libro.mp4',
    videoBadge: '01 · Recepción & Voz del Autor',
  },
  {
    id: 2,
    code: 'ETAPA 02',
    title: 'Cotización, Contrato Firmado y Anticipo 50 %',
    subtitle: 'Definición de formato, canal único de correcciones, firma en pantalla y depósito inicial.',
    owner: 'compartido',
    description:
      'Establecemos el tamaño del libro, sellamos el contrato PDF con firma electrónica en pantalla y con el anticipo del 50 % ponemos en marcha el taller editorial.',
    deliverable: 'Contrato PDF estampado con firma digital y recibo de anticipo 50 %',
    clientAction: 'Revisar y aprobar el presupuesto firmado y el formato del libro.',
    maxRoundsDefault: 3,
    defaultStagePrice: 0,
    videoUrl: '/videos/ebook.mp4',
    videoBadge: '02 · Contrato Digital & Formato',
  },
  {
    id: 3,
    code: 'ETAPA 03',
    title: 'Nivelación a Word Listo (+4): Digitación, OCR o Compilación',
    subtitle: 'Transformación del material de entrada hasta obtener un archivo Word limpio y unificado.',
    owner: 'gmdei',
    description:
      'Ejecutamos la escalera de prerrequisitos según tu condición de entrada (digitación completa, organización + OCR, compilación de sueltos o conversión de PDF) con hasta 6 correcciones en condición Manuscrito/JPG.',
    deliverable: 'Documento Word maestro nivel +4 listo para estilado',
    clientAction: 'Revisar el texto base compilado/digitado y validar que no falten secciones.',
    maxRoundsDefault: 6,
    usesDigitacionJpgPool: true,
    defaultStagePrice: 120,
    videoUrl: '/videos/jotapege.mp4',
    videoBadge: '03 · Nivelación JPG / OCR / Digitación',
  },
  {
    id: 4,
    code: 'ETAPA 04',
    title: 'Preparación Editorial y Jerarquía Tipográfica',
    subtitle: 'Estudio de niveles de titulación, citas, notas al pie, tablas e imágenes.',
    owner: 'gmdei',
    description:
      'Preparamos el original para la maquetación: limpiamos estilos residuales, estructuramos la jerarquía de títulos, subtítulos, folios, tablas y tratamiento de imágenes.',
    deliverable: 'Matriz de estilos y jerarquía textual aprobada',
    clientAction: 'Confirmar la estructura de capítulos y criterios de tablas/imágenes.',
    maxRoundsDefault: 3,
    defaultStagePrice: 75,
    videoUrl: '/videos/word.mp4',
    videoBadge: '04 · Word Listo (+4) & Jerarquía',
  },
  {
    id: 5,
    code: 'ETAPA 05',
    title: 'Diagramación y Previsualización Estética',
    subtitle: 'Maquetación de pliegos y muestra visual de tipografías, márgenes y caja tipográfica.',
    owner: 'cliente',
    description:
      'Maquetamos el documento y enviamos una previsualización estética (tipos de letra, tamaños, márgenes y ritmo de página). Es una validación puramente estética antes de abrir las rondas de corrección.',
    deliverable: 'Muestra estética de diseño interior (InDesign / Pliegos)',
    clientAction: 'Revisar y aprobar la propuesta estética de tipografías, márgenes y estilos.',
    maxRoundsDefault: 3,
    defaultStagePrice: 160,
    videoUrl: '/videos/indesing.mp4',
    videoBadge: '05 · Maquetación en InDesign',
  },
  {
    id: 6,
    code: 'ETAPA 06',
    title: 'PDF de Corrección Digital y Rondas de Revisión',
    subtitle: 'Revisión sobre PDF maquetado a través del canal único elegido (WhatsApp o Email).',
    owner: 'cliente',
    description:
      'Recibes el PDF completo para corrección. Envías tus observaciones exclusivamente por el canal único elegido con código trazable [CODIGO | ETAPA | Ronda X/Y].',
    deliverable: 'PDF de corrección numerado línea por línea',
    clientAction: 'Revisar el PDF o enviar observaciones con tu código de ronda por el canal oficial.',
    maxRoundsDefault: 3,
    usesGeneralDiagramPool: true,
    defaultStagePrice: 110,
    videoUrl: '/videos/pdf.mp4',
    videoBadge: '06 · PDF Interactivo de Corrección',
  },
  {
    id: 7,
    code: 'ETAPA 07',
    title: 'Ejecución de Correcciones y Propuesta de Cubierta',
    subtitle: 'Aplicación de ajustes en tripa interior y entrega del diseño de portada/contraportada.',
    owner: 'compartido',
    description:
      'Respondemos con el nuevo PDF corregido y presentamos en paralelo el modelo de cubierta (portada, lomo y contraportada) sujeto a revisión y aprobación.',
    deliverable: 'Flipbook digital corregido + Propuesta de Cubierta gmDEI',
    clientAction: 'Verificar que las correcciones digitales fueron ejecutadas y revisar la cubierta.',
    maxRoundsDefault: 3,
    usesGeneralDiagramPool: true,
    defaultStagePrice: 130,
    videoUrl: '/videos/flip.mp4',
    videoBadge: '07 · Flipbook & Cubierta en Paralelo',
  },
  {
    id: 8,
    code: 'ETAPA 08',
    title: 'Primer Borrador Físico Impreso (Borrador 1 — Sin Portada)',
    subtitle: 'Ejemplar impreso de prueba (portada institucional) para lectura en forma y fondo.',
    owner: 'cliente',
    description:
      'Construimos y entregamos el BORRADOR 1 impreso (con portada institucional temporal, ya que la cubierta sigue su curso). Debes leer y revisar forma y fondo sobre papel real.',
    deliverable: 'Ejemplar físico Borrador 1 (entrega presencial o delivery)',
    clientAction: 'Leer el Borrador 1 físico y confirmar aprobación o reportar observaciones.',
    maxRoundsDefault: 3,
    usesGeneralDiagramPool: true,
    defaultStagePrice: 95,
    videoUrl: '/videos/muestra-impresa.mp4',
    videoBadge: '08 · Muestra Física Impresa (Borrador 1)',
  },
  {
    id: 9,
    code: 'ETAPA 09',
    title: 'Segundo Borrador Físico con Portada Aprobada (Borrador 2)',
    subtitle: 'Ejemplar físico definitivo con cubierta oficial aprobada para verificación final.',
    owner: 'cliente',
    description:
      'Entregamos el BORRADOR 2 impreso incorporando la portada aprobada y las correcciones del Borrador 1. En esta etapa ya no se admiten adiciones de texto sin costo extra. Bloqueada hasta que Administración apruebe la portada.',
    deliverable: 'Ejemplar físico Borrador 2 con cubierta aprobada',
    clientAction: 'Comprobar en papel que todas las correcciones anteriores estén ejecutadas.',
    maxRoundsDefault: 3,
    usesGeneralDiagramPool: true,
    requiresCoverApproved: true,
    defaultStagePrice: 95,
    videoUrl: '/videos/muestra-impresa.mp4',
    videoBadge: '09 · Borrador 2 con Portada Aprobada',
  },
  {
    id: 10,
    code: 'ETAPA 10',
    title: 'Entrega Final + Registro ISBN (Aprobación Solemne)',
    subtitle: 'Gestión de ISBN y declaración de aprobación de al menos 20 palabras en MAYÚSCULAS.',
    owner: 'compartido',
    description:
      'Tramitamos el registro ISBN oficial y preparamos los artes finales. Para liberar la descarga del archivo final de imprenta, el autor debe escribir una frase de al menos 20 palabras completamente en MAYÚSCULAS aprobando el contenido.',
    deliverable: 'Constancia ISBN + Artes finales liberados tras declaración en MAYÚSCULAS',
    clientAction: 'Escribir la declaración de al menos 20 palabras en MAYÚSCULAS y descargar el archivo final.',
    maxRoundsDefault: 3,
    requires20WordsUppercase: true,
    defaultStagePrice: 85,
    videoUrl: '/videos/libro-final.mp4',
    videoBadge: '10 · Declaración MAYÚSCULAS + ISBN',
  },
  {
    id: 11,
    code: 'ETAPA 11',
    title: 'Cierre Editorial, Saldo Final y Archivo de Imprenta',
    subtitle: 'Entrega de paquetes PDF/X de prensa, cubierta con código de barras ISBN y cierre.',
    owner: 'compartido',
    description:
      'Con el saldo total del proyecto completado y la declaración firmada, entregamos los paquetes finales de impresión y conservamos el respaldo histórico en el archivo editorial de gmDEI.',
    deliverable: 'Paquete maestro de imprenta (Tripa PDF/X + Cubierta + ISBN)',
    clientAction: 'Descargar el paquete completo de imprenta y certificado de cierre.',
    maxRoundsDefault: 1,
    defaultStagePrice: 50,
    videoUrl: '/videos/libro-final.mp4',
    videoBadge: '11 · Libro Final Listo para Imprenta',
  },
];
