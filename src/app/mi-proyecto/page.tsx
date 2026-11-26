'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  DEFAULT_PRICING_SETTINGS,
  EDITORIAL_STAGES_11,
  ENTRY_CONDITIONS_LADDER,
  EditorialProject,
  ExtraAddendum,
  PricingSettings,
} from '@/lib/editorial-data';
import {
  AuthSessionUser,
  authenticateUser,
  fetchPricingSettings,
  getActiveSession,
  getProjectForAuthenticatedClient,
  saveOrUpdateProject,
  setActiveSession,
} from '@/lib/supabase';
import { withBasePath } from '@/lib/audiobooks-config';
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Download,
  ExternalLink,
  FileText,
  Lock,
  LogOut,
  Mail,
  MessageCircle,
  Package,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

/**
 * Valida la frase solemne exigida en Etapa 10:
 * Al menos 20 palabras y completamente en MAYÚSCULAS (permitiendo signos de puntuación y números).
 */
function validateStage10UppercasePhrase(input: string): {
  isValid: boolean;
  wordCount: number;
  isAllUppercase: boolean;
  reason: string;
} {
  const trimmed = input.trim();
  if (!trimmed) {
    return {
      isValid: false,
      wordCount: 0,
      isAllUppercase: false,
      reason: 'Escribe la frase de aprobación (mínimo 20 palabras en MAYÚSCULAS).',
    };
  }
  const words = trimmed.split(/\s+/).filter((w) => w.length > 0);
  const wordCount = words.length;
  // Debe tener letras y no contener ninguna minúscula (incluyendo áéíóúñü)
  const hasLetters = /[A-ZÁÉÍÓÚÑÜ]/.test(trimmed);
  const hasLowercase = /[a-záéíóúñü]/.test(trimmed);
  const isAllUppercase = hasLetters && !hasLowercase;

  if (!isAllUppercase) {
    return {
      isValid: false,
      wordCount,
      isAllUppercase: false,
      reason:
        'La declaración contiene letras minúsculas. Debe estar escrita COMPLETAMENTE EN MAYÚSCULAS.',
    };
  }
  if (wordCount < 20) {
    return {
      isValid: false,
      wordCount,
      isAllUppercase: true,
      reason: `Faltan ${20 - wordCount} palabras para alcanzar el mínimo de 20 palabras en MAYÚSCULAS.`,
    };
  }
  return {
    isValid: true,
    wordCount,
    isAllUppercase: true,
    reason: `✓ Declaración válida (${wordCount} palabras en MAYÚSCULAS). Descarga del archivo final habilitada.`,
  };
}

export default function MiProyectoPage() {
  const [session, setSession] = useState<AuthSessionUser | null>(null);
  const [project, setProject] = useState<EditorialProject | null>(null);
  const [pricing, setPricing] = useState<PricingSettings>(DEFAULT_PRICING_SETTINGS);

  // Estado de Login
  const [loginEmail, setLoginEmail] = useState<string>('camila@ejemplo.bo');
  const [loginPassword, setLoginPassword] = useState<string>('GMDEI-2026!');
  const [loginError, setLoginError] = useState<string>('');

  // Etapa seleccionada en la vista del portal
  const [selectedStageId, setSelectedStageId] = useState<number>(3);
  const [correctionNotes, setCorrectionNotes] = useState<string>('');
  const [statusBanner, setStatusBanner] = useState<string>('');
  const [uppercasePhraseInput, setUppercasePhraseInput] = useState<string>('');

  const loadClientContext = () => {
    const active = getActiveSession();
    setSession(active);
    if (active) {
      const clientProj = getProjectForAuthenticatedClient(active);
      setProject(clientProj);
      if (clientProj) {
        setSelectedStageId(clientProj.currentStage);
        setUppercasePhraseInput(clientProj.stage10UppercaseApproval || '');
      }
    }
    fetchPricingSettings().then(setPricing);
  };

  useEffect(() => {
    loadClientContext();
  }, []);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    const res = await authenticateUser(loginEmail, loginPassword);
    if (res.error || !res.session) {
      setLoginError(res.error || 'Error de autenticación.');
      return;
    }
    setSession(res.session);
    const clientProj = getProjectForAuthenticatedClient(res.session);
    setProject(clientProj);
    if (clientProj) {
      setSelectedStageId(clientProj.currentStage);
      setUppercasePhraseInput(clientProj.stage10UppercaseApproval || '');
    }
  };

  const handleLogout = () => {
    setActiveSession(null);
    setSession(null);
    setProject(null);
  };

  // Si no hay sesión activa -> Mostrar pantalla de Login con protección RLS
  if (!session || !project) {
    return (
      <div className="min-h-screen flex flex-col bg-[#F7F4EE] text-[#193847]">
        <header className="border-b border-[#DCE4E4] bg-white">
          <div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-6">
            <Link href="/" className="flex items-center gap-3">
              <img src={withBasePath('/assets/gmdei.png')} alt="gmDEI" className="h-10 w-auto" />
              <span className="text-xs font-bold uppercase tracking-widest text-[#07517A]">
                Portal Privado del Cliente
              </span>
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#07517A] hover:text-[#E93416]"
            >
              <ArrowLeft className="h-4 w-4" /> Volver a Cotizador Público
            </Link>
          </div>
        </header>

        <main className="mx-auto flex flex-1 max-w-md flex-col justify-center px-6 py-14">
          <div className="rounded-2xl border border-[#DCE4E4] bg-white p-8 shadow-md">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-[#07517A]/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#07517A]">
              <ShieldCheck className="h-3.5 w-3.5 text-[#E93416]" />
              Supabase Auth + Políticas RLS
            </div>
            <h1 className="font-editorial mt-3 text-3xl font-bold text-[#07517A]">
              Ingresa a tu Proyecto
            </h1>
            <p className="mt-2 text-sm text-[#526C7A]">
              Cada autor accede únicamente a su propio proyecto editorial mediante aislamiento Row
              Level Security (RLS).
            </p>

            <form onSubmit={handleLoginSubmit} className="mt-6 space-y-4">
              <div>
                <label
                  htmlFor="loginEmail"
                  className="block text-xs font-bold uppercase tracking-wider text-[#193847]"
                >
                  Correo Electrónico o Código de Proyecto
                </label>
                <input
                  id="loginEmail"
                  name="loginEmail"
                  type="text"
                  autoComplete="username"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-[#767676] px-3.5 py-2.5 text-sm"
                />
              </div>

              <div>
                <label
                  htmlFor="loginPassword"
                  className="block text-xs font-bold uppercase tracking-wider text-[#193847]"
                >
                  Contraseña
                </label>
                <input
                  id="loginPassword"
                  name="loginPassword"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-[#767676] px-3.5 py-2.5 text-sm"
                />
              </div>

              {loginError && (
                <div
                  role="alert"
                  className="rounded-lg border border-[#E93416] bg-[#FFF5F2] p-3 text-xs font-bold text-[#A23A1F]"
                >
                  {loginError}
                </div>
              )}

              <button
                type="submit"
                className="w-full rounded-xl bg-[#07517A] py-3.5 text-sm font-bold text-white hover:bg-[#07517A]/90"
              >
                Iniciar Sesión en /mi-proyecto →
              </button>
            </form>

            <div className="mt-6 rounded-xl bg-[#F7F4EE] p-4 text-xs text-[#526C7A]">
              <p className="font-bold text-[#07517A]">Credenciales de prueba precargadas:</p>
              <p className="mt-1 font-mono">
                Usuario: <strong>camila@ejemplo.bo</strong>
                <br />
                Contraseña: <strong>GMDEI-2026!</strong>
              </p>
              <p className="mt-2">
                O cotiza un libro nuevo en{' '}
                <Link href="/#cotizador" className="font-bold text-[#E93416] underline">
                  la página pública
                </Link>{' '}
                para crear tu propio usuario al instante.
              </p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Datos de la etapa activa seleccionada
  const stageDef =
    EDITORIAL_STAGES_11.find((s) => s.id === selectedStageId) || EDITORIAL_STAGES_11[0];
  const stageState =
    project.stages.find((s) => s.id === selectedStageId) || project.stages[0];
  const entryCondObj =
    ENTRY_CONDITIONS_LADDER.find((c) => c.id === project.entryCondition) ||
    ENTRY_CONDITIONS_LADDER[0];

  // Cálculo de chances restantes para la etapa seleccionada y los límites globales
  const stageChancesLeft = Math.max(0, stageState.maxRounds - stageState.roundsUsed);

  const relevantGlobalPoolLeft = stageDef.usesDigitacionJpgPool
    ? project.digitacionJpgChancesLeft
    : stageDef.usesGeneralDiagramPool
    ? project.generalDiagramChancesLeft
    : 99;

  const isPhysicalSampleStage = stageDef.id === 8 || stageDef.id === 9;
  const physicalSamplePoolLeft = isPhysicalSampleStage ? project.printedSamplesLeft : 99;

  // Determina si algún límite aplicable llegó a 0 chances
  const hasZeroChancesInApplicableLimit =
    stageChancesLeft === 0 ||
    relevantGlobalPoolLeft === 0 ||
    physicalSamplePoolLeft === 0;

  // Candado obligatorio Etapa 9: bloqueada hasta que el Admin marque la portada como aprobada
  const isStage9BlockedByCover = stageDef.id === 9 && !project.coverApproved;

  // Validación obligatoria Etapa 10: frase de al menos 20 palabras en MAYÚSCULAS
  const stage10Validation = validateStage10UppercasePhrase(uppercasePhraseInput);

  // Acción 1: Aprobar Etapa Actual
  const handleApproveStage = async () => {
    setStatusBanner('');

    if (isStage9BlockedByCover) {
      setStatusBanner(
        'La Etapa 9 (Segundo borrador físico con portada aprobada) está bloqueada hasta que Administración apruebe la portada en /admin.'
      );
      return;
    }

    if (stageDef.id === 10 && !stage10Validation.isValid) {
      setStatusBanner(stage10Validation.reason);
      return;
    }

    const nextStageId = Math.min(11, selectedStageId + 1);
    const updatedStages = project.stages.map((st) => {
      if (st.id === selectedStageId) {
        return {
          ...st,
          status: 'completed' as const,
          approvedAt: new Date().toISOString(),
        };
      }
      if (st.id === nextStageId && st.status === 'locked') {
        return {
          ...st,
          status: 'current' as const,
        };
      }
      return st;
    });

    const updatedProject: EditorialProject = {
      ...project,
      currentStage: Math.max(project.currentStage, nextStageId),
      stage10UppercaseApproval:
        stageDef.id === 10 ? uppercasePhraseInput.trim() : project.stage10UppercaseApproval,
      stage10ApprovedAt:
        stageDef.id === 10 ? new Date().toISOString() : project.stage10ApprovedAt,
      stages: updatedStages,
    };

    const saved = await saveOrUpdateProject(updatedProject);
    setProject(saved);
    setSelectedStageId(nextStageId);
    setStatusBanner(
      `✓ Etapa ${String(stageDef.id).padStart(2, '0')} ("${stageDef.title}") aprobada con éxito.`
    );
  };

  // Acción 2: Pedir Corrección -> Descuenta 1 chance, genera código [CODIGO | ETAPA | Ronda X/Y] y abre ÚNICAMENTE el canal elegido
  const handleRequestCorrection = async () => {
    setStatusBanner('');

    if (isStage9BlockedByCover) {
      setStatusBanner(
        'La Etapa 9 se encuentra bloqueada hasta que el Administrador marque la portada como aprobada.'
      );
      return;
    }

    if (hasZeroChancesInApplicableLimit) {
      setStatusBanner(
        'Has alcanzado 0 chances restantes en este límite. Solicita una cotización por costo extra.'
      );
      return;
    }

    const newRoundNumber = stageState.roundsUsed + 1;
    const roundCode = `[${project.code} | ETAPA ${String(stageDef.id).padStart(
      2,
      '0'
    )} - ${stageDef.title.toUpperCase()} | Ronda ${newRoundNumber}/${stageState.maxRounds}]`;

    const updatedStages = project.stages.map((st) =>
      st.id === selectedStageId
        ? {
            ...st,
            roundsUsed: newRoundNumber,
            lastRoundCode: roundCode,
          }
        : st
    );

    const newDigitacionLeft = stageDef.usesDigitacionJpgPool
      ? Math.max(0, project.digitacionJpgChancesLeft - 1)
      : project.digitacionJpgChancesLeft;

    const newGeneralLeft = stageDef.usesGeneralDiagramPool
      ? Math.max(0, project.generalDiagramChancesLeft - 1)
      : project.generalDiagramChancesLeft;

    const newSamplesLeft = isPhysicalSampleStage
      ? Math.max(0, project.printedSamplesLeft - 1)
      : project.printedSamplesLeft;

    const logEntry = {
      id: `log-${Date.now()}`,
      stageId: stageDef.id,
      stageTitle: stageDef.title,
      roundCode,
      channel: project.correctionChannel,
      notes:
        correctionNotes.trim() ||
        'Solicitud de corrección enviada por canal oficial.',
      createdAt: new Date().toISOString(),
    };

    const updatedProject: EditorialProject = {
      ...project,
      digitacionJpgChancesLeft: newDigitacionLeft,
      generalDiagramChancesLeft: newGeneralLeft,
      printedSamplesLeft: newSamplesLeft,
      stages: updatedStages,
      logs: [logEntry, ...project.logs],
    };

    const saved = await saveOrUpdateProject(updatedProject);
    setProject(saved);
    setCorrectionNotes('');

    // Abrir ÚNICAMENTE el canal elegido (wa.me prellenado o mailto:)
    const messageBody = `${roundCode}\nObra: "${project.bookTitle}"\nCliente: ${
      project.clientName
    }\nObservaciones: ${
      logEntry.notes
    }`;

    if (project.correctionChannel === 'whatsapp') {
      const waUrl = `https://wa.me/${pricing.whatsapp_official.replace(
        /\D/g,
        ''
      )}?text=${encodeURIComponent(messageBody)}`;
      window.open(waUrl, '_blank', 'noopener,noreferrer');
      setStatusBanner(
        `✓ Se descontó 1 chance y se generó el código ${roundCode}. Abriendo canal exclusivo WhatsApp...`
      );
    } else {
      const mailtoUrl = `mailto:${pricing.email_official}?subject=${encodeURIComponent(
        roundCode
      )}&body=${encodeURIComponent(messageBody)}`;
      window.location.href = mailtoUrl;
      setStatusBanner(
        `✓ Se descontó 1 chance y se generó el código ${roundCode}. Abriendo canal exclusivo Email...`
      );
    }
  };

  // Acción 3: Cuando llega a 0 chances -> "Solicitar cotización por costo extra"
  const handleRequestExtraCostQuote = async () => {
    const isSampleZero = isPhysicalSampleStage && project.printedSamplesLeft === 0;
    const amount = isSampleZero
      ? pricing.extra_printed_sample_cost
      : pricing.extra_round_cost;

    const newAddendum: ExtraAddendum = {
      id: `add-${Date.now()}`,
      type: isSampleZero ? 'extra_sample' : 'extra_round',
      stageId: stageDef.id,
      stageTitle: stageDef.title,
      description: isSampleZero
        ? `Solicitud de muestra física impresa adicional en ${stageDef.code}`
        : `Solicitud de ronda de corrección extra en ${stageDef.code} (${stageDef.title})`,
      amount,
      status: 'pending',
      requestedAt: new Date().toISOString(),
    };

    const updatedProject: EditorialProject = {
      ...project,
      addendums: [newAddendum, ...project.addendums],
    };

    const saved = await saveOrUpdateProject(updatedProject);
    setProject(saved);
    setStatusBanner(
      `✓ Solicitud de cotización por costo extra (USD ${amount.toFixed(
        2
      )}) enviada al Panel Administrativo (/admin). Una vez aprobada por el Admin se restaurarán tus chances.`
    );
  };

  // Guardar frase en mayúsculas de Etapa 10
  const handleSaveStage10Phrase = async () => {
    if (!stage10Validation.isValid) {
      setStatusBanner(stage10Validation.reason);
      return;
    }
    const updatedProject: EditorialProject = {
      ...project,
      stage10UppercaseApproval: uppercasePhraseInput.trim(),
      stage10ApprovedAt: new Date().toISOString(),
    };
    const saved = await saveOrUpdateProject(updatedProject);
    setProject(saved);
    setStatusBanner(
      '✓ Declaración solemne de ≥ 20 palabras en MAYÚSCULAS registrada. ¡Descarga del archivo final habilitada!'
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F4EE] text-[#193847]">
      {/* Barra superior del Portal del Cliente */}
      <header className="sticky top-0 z-40 border-b border-[#DCE4E4] bg-white">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6 lg:px-10">
          <div className="flex items-center gap-4">
            <Link href="/">
              <img src={withBasePath('/assets/gmdei.png')} alt="gmDEI" className="h-10 w-auto" />
            </Link>
            <div className="border-l border-[#DCE4E4] pl-4">
              <span className="block text-[11px] font-bold uppercase tracking-widest text-[#E93416]">
                PORTAL PRIVADO DEL CLIENTE · RLS ACTIVO
              </span>
              <span className="font-editorial text-lg font-bold text-[#07517A]">
                {project.bookTitle}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/audiolibros"
              className="rounded-lg border border-[#E93416] bg-[#FFF5F2] px-3 py-2 text-xs font-bold text-[#E93416] hover:bg-[#E93416] hover:text-white"
            >
              Audiolibros
            </Link>
            <button
              type="button"
              onClick={loadClientContext}
              title="Sincronizar cambios del Admin"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#DCE4E4] bg-[#F7F4EE] px-3 py-2 text-xs font-bold text-[#07517A] hover:bg-[#DCE4E4]/50"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Sincronizar
            </button>
            <Link
              href="/admin"
              className="rounded-lg border border-[#07517A] px-3 py-2 text-xs font-bold text-[#07517A] hover:bg-[#07517A] hover:text-white"
            >
              Ir a /admin
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#193847] px-3 py-2 text-xs font-bold text-white hover:bg-[#193847]/90"
            >
              <LogOut className="h-3.5 w-3.5" /> Salir
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-10 lg:px-10">
        {/* TABLERO SUPERIOR DE CONTADORES VISIBLES DE CHANCES RESTANTES */}
        <section aria-label="Contadores de revisiones y límites" className="mb-8">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-[#E93416]">
                CÓDIGO DE PROYECTO: {project.code} · CLIENTE: {project.clientName}
              </p>
              <h1 className="font-editorial text-2xl font-bold text-[#07517A] sm:text-3xl">
                Línea de Seguimiento y Contadores de Chances Restantes
              </h1>
            </div>

            {/* Indicador del Canal Único Elegido (y el otro bloqueado) */}
            <div className="flex items-center gap-2 rounded-xl border border-[#07517A]/30 bg-white px-4 py-2.5 text-xs shadow-2xs">
              {project.correctionChannel === 'whatsapp' ? (
                <>
                  <MessageCircle className="h-4 w-4 text-[#28765A]" />
                  <span>
                    Canal Único Activo: <strong className="text-[#28765A]">WhatsApp</strong>
                  </span>
                  <span className="ml-2 rounded bg-gray-200 px-2 py-0.5 text-[10px] font-bold text-gray-600">
                    Email Bloqueado 🔒
                  </span>
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 text-[#07517A]" />
                  <span>
                    Canal Único Activo: <strong className="text-[#07517A]">Email Oficial</strong>
                  </span>
                  <span className="ml-2 rounded bg-gray-200 px-2 py-0.5 text-[10px] font-bold text-gray-600">
                    WhatsApp Bloqueado 🔒
                  </span>
                </>
              )}
            </div>
          </div>

          {/* 4 Tarjetas de Contadores Obligatorios */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-[#DCE4E4] bg-white p-4 shadow-2xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#526C7A]">
                Rondas Etapa Seleccionada ({stageDef.code})
              </span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="font-editorial text-3xl font-bold text-[#07517A]">
                  {stageChancesLeft} / {stageState.maxRounds}
                </span>
                <span className="text-xs font-bold text-[#E93416]">
                  Máx. 3 por etapa gral.
                </span>
              </div>
              <p className="mt-1 text-xs text-[#526C7A]">
                Chances restantes en esta etapa específica.
              </p>
            </div>

            <div className="rounded-xl border border-[#DCE4E4] bg-white p-4 shadow-2xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#526C7A]">
                Digitación y Condición JPG ({entryCondObj.badge})
              </span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="font-editorial text-3xl font-bold text-[#07517A]">
                  {project.digitacionJpgChancesLeft} / {project.digitacionJpgChancesMax}
                </span>
                <span className="text-xs font-bold text-[#28765A]">Hasta 6 correcciones</span>
              </div>
              <p className="mt-1 text-xs text-[#526C7A]">
                Bolsa especial para etapa de Digitación / OCR JPG.
              </p>
            </div>

            <div className="rounded-xl border border-[#DCE4E4] bg-white p-4 shadow-2xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#526C7A]">
                Correcciones Generales Diagramación
              </span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="font-editorial text-3xl font-bold text-[#07517A]">
                  {project.generalDiagramChancesLeft} / {project.generalDiagramChancesMax}
                </span>
                <span className="text-xs font-bold text-[#07517A]">Hasta 3 generales</span>
              </div>
              <p className="mt-1 text-xs text-[#526C7A]">
                Chances globales de revisión de maquetación.
              </p>
            </div>

            <div className="rounded-xl border border-[#DCE4E4] bg-white p-4 shadow-2xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#526C7A]">
                Muestras Físicas Impresas
              </span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="font-editorial text-3xl font-bold text-[#E93416]">
                  {project.printedSamplesLeft} / {project.printedSamplesMax}
                </span>
                <span className="text-xs font-bold text-[#193847]">
                  Entregadas: {project.printedSamplesDelivered}
                </span>
              </div>
              <p className="mt-1 text-xs text-[#526C7A]">
                Hasta 3 muestras físicas impresas por proyecto.
              </p>
            </div>
          </div>
        </section>

        {/* Enlaces publicados por Admin (Flipbook / PDF de prueba / Estado de Portada) */}
        <section className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="flex items-center justify-between rounded-xl border border-[#DCE4E4] bg-white p-4">
            <div>
              <span className="text-xs font-bold uppercase text-[#526C7A]">
                Estado de la Portada (Candado Etapa 9)
              </span>
              <p className="mt-1 text-sm font-bold text-[#07517A]">
                {project.coverApproved
                  ? '✓ Portada Aprobada por Admin (Etapa 9 Desbloqueada)'
                  : '🔒 Portada en revisión (Etapa 9 Bloqueada)'}
              </p>
            </div>
            <span
              className={`h-3 w-3 rounded-full ${
                project.coverApproved ? 'bg-[#28765A]' : 'bg-[#E93416]'
              }`}
            />
          </div>

          <div className="flex items-center justify-between rounded-xl border border-[#DCE4E4] bg-white p-4">
            <div>
              <span className="text-xs font-bold uppercase text-[#526C7A]">
                Previsualización Flipbook Digital
              </span>
              <p className="mt-1 text-sm font-bold text-[#07517A] truncate max-w-[220px]">
                {project.flipbookUrl || 'Pendiente de publicación'}
              </p>
            </div>
            {project.flipbookUrl && (
              <a
                href={project.flipbookUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-lg bg-[#07517A] px-3 py-1.5 text-xs font-bold text-white"
              >
                Abrir Flip <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>

          <div className="flex items-center justify-between rounded-xl border border-[#DCE4E4] bg-white p-4">
            <div>
              <span className="text-xs font-bold uppercase text-[#526C7A]">
                PDF de Prueba / Revisión Actual
              </span>
              <p className="mt-1 text-sm font-bold text-[#07517A]">
                {project.proofPdfUrl ? 'PDF disponible para descarga' : 'En preparación'}
              </p>
            </div>
            {project.proofPdfUrl && (
              <a
                href={project.proofPdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-lg bg-[#E93416] px-3 py-1.5 text-xs font-bold text-white"
              >
                Ver PDF <FileText className="h-3 w-3" />
              </a>
            )}
          </div>
        </section>

        {statusBanner && (
          <div
            role="status"
            aria-live="polite"
            className="mb-6 rounded-xl border border-[#07517A] bg-[#F0F6FA] p-4 text-sm font-bold text-[#07517A]"
          >
            {statusBanner}
          </div>
        )}

        {/* LAYOUT PRINCIPAL: 11 Etapas a la izquierda + Detalle e Interacción de Etapa a la derecha */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Barra lateral con las 11 Etapas */}
          <aside className="lg:col-span-4">
            <div className="rounded-2xl border border-[#DCE4E4] bg-white p-5 shadow-xs">
              <h2 className="text-xs font-bold uppercase tracking-widest text-[#526C7A]">
                LAS 11 ETAPAS DE TU LIBRO
              </h2>
              <div className="mt-4 space-y-2">
                {EDITORIAL_STAGES_11.map((st) => {
                  const stState = project.stages.find((s) => s.id === st.id);
                  const isSelected = selectedStageId === st.id;
                  const isStage9Locked = st.id === 9 && !project.coverApproved;
                  const left = stState ? Math.max(0, stState.maxRounds - stState.roundsUsed) : 3;

                  return (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => {
                        setSelectedStageId(st.id);
                        setStatusBanner('');
                      }}
                      className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition ${
                        isSelected
                          ? 'border-[#E93416] bg-[#FFF5F2]'
                          : stState?.status === 'completed'
                          ? 'border-[#DCE4E4] bg-[#F8FAF9]'
                          : 'border-transparent hover:bg-[#F7F4EE]'
                      }`}
                    >
                      <span
                        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                          stState?.status === 'completed'
                            ? 'bg-[#28765A] text-white'
                            : isSelected
                            ? 'bg-[#E93416] text-white'
                            : 'border border-[#DCE4E4] bg-white text-[#526C7A]'
                        }`}
                      >
                        {stState?.status === 'completed' ? '✓' : st.id}
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[11px] font-bold text-[#E93416]">
                            {st.code}
                          </span>
                          <span className="rounded bg-[#F7F4EE] px-1.5 py-0.5 text-[10px] font-bold text-[#07517A]">
                            {left}/{stState?.maxRounds || 3} rondas
                          </span>
                        </div>
                        <p className="truncate text-xs font-bold text-[#07517A]">
                          {st.title}
                        </p>
                        {isStage9Locked && (
                          <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-[#A23A1F]">
                            <Lock className="h-3 w-3" /> Requiere Portada Aprobada
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>

          {/* Panel Central de la Etapa Seleccionada */}
          <div className="space-y-6 lg:col-span-8">
            <div className="rounded-2xl border border-[#DCE4E4] bg-white p-6 shadow-xs sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#DCE4E4] pb-4">
                <div>
                  <span className="text-xs font-bold uppercase tracking-widest text-[#E93416]">
                    {stageDef.code} · TARIFA DE ETAPA: USD {stageState.customPrice.toFixed(2)}
                  </span>
                  <h2 className="font-editorial mt-1 text-2xl font-bold text-[#07517A] sm:text-3xl">
                    {stageDef.title}
                  </h2>
                </div>

                <span
                  className={`rounded-full px-3.5 py-1 text-xs font-bold uppercase ${
                    stageState.status === 'completed'
                      ? 'bg-[#E8F2ED] text-[#28765A]'
                      : isStage9BlockedByCover
                      ? 'bg-[#FFF2E9] text-[#A23A1F]'
                      : 'bg-[#F0F6FA] text-[#07517A]'
                  }`}
                >
                  {stageState.status === 'completed'
                    ? 'Etapa Aprobada'
                    : isStage9BlockedByCover
                    ? 'Bloqueada por Portada'
                    : 'Etapa en Curso'}
                </span>
              </div>

              <p className="mt-4 text-sm leading-relaxed text-[#526C7A]">
                {stageDef.description}
              </p>

              <div className="mt-4 rounded-xl border-l-4 border-[#E93416] bg-[#FFF8F5] p-4 text-sm">
                <strong className="text-[#07517A]">Acción del Autor / Cliente:</strong>{' '}
                <span className="text-[#193847]">{stageDef.clientAction}</span>
              </div>

              {/* REGLA OBLIGATORIA ETAPA 9: Bloqueada hasta que el Admin marque la portada como aprobada */}
              {stageDef.id === 9 && (
                <div
                  className={`mt-6 rounded-xl border-2 p-5 ${
                    project.coverApproved
                      ? 'border-[#28765A] bg-[#E8F2ED]'
                      : 'border-[#E93416] bg-[#FFF5F2]'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {project.coverApproved ? (
                      <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-[#28765A]" />
                    ) : (
                      <Lock className="mt-0.5 h-6 w-6 shrink-0 text-[#E93416]" />
                    )}
                    <div>
                      <h3 className="font-bold text-[#07517A]">
                        {project.coverApproved
                          ? '✓ Portada Oficial Aprobada por Administración — Etapa 9 Habilitada'
                          : 'CANDADO DE ETAPA 9: Segundo borrador físico bloqueado hasta aprobar portada'}
                      </h3>
                      <p className="mt-1 text-xs text-[#193847]">
                        {project.coverApproved
                          ? 'El Administrador ya marcó la portada como aprobada. Puedes revisar el Segundo Borrador Físico con su cubierta oficial.'
                          : 'El Segundo Borrador Físico (Borrador 2) se imprime con la cubierta definitiva. Esta etapa permanece bloqueada hasta que el Admin marque la portada como aprobada en /admin.'}
                      </p>
                      {!project.coverApproved && (
                        <Link
                          href="/admin"
                          className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[#07517A] px-3.5 py-2 text-xs font-bold text-white"
                        >
                          Ir a /admin para aprobar portada (Demo) →
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* REGLA OBLIGATORIA ETAPA 10: Frase de al menos 20 palabras completamente en MAYÚSCULAS antes de habilitar descarga */}
              {stageDef.id === 10 && (
                <div className="mt-6 rounded-2xl border-2 border-[#07517A] bg-[#F0F6FA] p-6">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-widest text-[#E93416]">
                      ETAPA 10 · LIBERACIÓN DE ARCHIVO FINAL + ISBN ({project.isbnCode})
                    </span>
                    <span className="rounded bg-white px-2.5 py-1 text-xs font-bold text-[#07517A]">
                      Palabras actuales: {stage10Validation.wordCount} / 20 mín.
                    </span>
                  </div>

                  <h3 className="font-editorial mt-2 text-xl font-bold text-[#07517A]">
                    Declaración Solemne de Aprobación en MAYÚSCULAS (Mínimo 20 palabras)
                  </h3>
                  <p className="mt-1 text-xs text-[#193847]">
                    Para habilitar la descarga del archivo final de impresión y registro ISBN,
                    escribe una frase de <strong>al menos 20 palabras completamente en MAYÚSCULAS</strong>{' '}
                    aprobando el contenido definitivo de tu obra.
                  </p>

                  <div className="mt-3">
                    <label htmlFor="uppercasePhraseInput" className="sr-only">
                      Frase de aprobación de al menos 20 palabras en MAYÚSCULAS
                    </label>
                    <textarea
                      id="uppercasePhraseInput"
                      rows={3}
                      value={uppercasePhraseInput}
                      onChange={(e) => setUppercasePhraseInput(e.target.value)}
                      placeholder="EJEMPLO: YO APRUEBO DE FORMA DEFINITIVA Y SOLEMNE TODO EL CONTENIDO INTERIOR Y LA CUBIERTA DE MI OBRA EDITORIAL PARA SU IMPRESIÓN FINAL CON REGISTRO ISBN OFICIAL"
                      className="w-full rounded-xl border border-[#07517A] bg-white p-3.5 font-mono text-sm text-[#07517A]"
                    />
                  </div>

                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <span
                      className={`text-xs font-bold ${
                        stage10Validation.isValid ? 'text-[#28765A]' : 'text-[#A23A1F]'
                      }`}
                    >
                      {stage10Validation.reason}
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        setUppercasePhraseInput(
                          'YO APRUEBO DE FORMA DEFINITIVA Y SOLEMNE TODO EL CONTENIDO INTERIOR Y LA CUBIERTA DE MI OBRA EDITORIAL PARA SU IMPRESIÓN FINAL CON REGISTRO ISBN OFICIAL EN GMDEI'
                        )
                      }
                      className="text-xs font-bold text-[#07517A] underline hover:text-[#E93416]"
                    >
                      Insertar frase modelo de 28 palabras en MAYÚSCULAS
                    </button>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={handleSaveStage10Phrase}
                      className="rounded-xl bg-[#07517A] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#07517A]/90"
                    >
                      Registrar Declaración en MAYÚSCULAS
                    </button>

                    {stage10Validation.isValid ? (
                      <a
                        href={withBasePath(project.finalFilesUrl || '/ATENEO_OCOENO_FINAL.pdf')}
                        download={`ARTE_FINAL_${project.code}.pdf`}
                        className="inline-flex items-center gap-2 rounded-xl bg-[#28765A] px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#28765A]/90"
                      >
                        <Download className="h-4 w-4" />
                        Descargar Archivo Final + ISBN ({project.isbnCode})
                      </a>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-xl bg-gray-200 px-4 py-2.5 text-xs font-bold text-gray-600">
                        <Lock className="h-3.5 w-3.5" />
                        Descarga final bloqueada hasta cumplir las 20 palabras en MAYÚSCULAS
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Área de Observaciones y Botones "Aprobar etapa" y "Pedir corrección" */}
              <div className="mt-6 border-t border-[#DCE4E4] pt-6">
                <label
                  htmlFor="correctionNotes"
                  className="block text-xs font-bold uppercase tracking-wider text-[#07517A]"
                >
                  Detalle de observaciones para esta ronda (se incluirá con el código [CODIGO | ETAPA | Ronda X/Y]):
                </label>
                <textarea
                  id="correctionNotes"
                  rows={3}
                  disabled={isStage9BlockedByCover}
                  value={correctionNotes}
                  onChange={(e) => setCorrectionNotes(e.target.value)}
                  placeholder="Describe las correcciones puntuales de esta etapa (página, párrafo, línea)..."
                  className="mt-2 w-full rounded-xl border border-[#767676] bg-white p-3 text-sm disabled:bg-gray-100"
                />

                <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
                  {/* BOTÓN DE CORRECCIÓN O SOLICITUD DE COTIZACIÓN EXTRA SI LLEGÓ A 0 CHANCES */}
                  {!hasZeroChancesInApplicableLimit ? (
                    <button
                      type="button"
                      disabled={isStage9BlockedByCover}
                      onClick={handleRequestCorrection}
                      className="inline-flex items-center gap-2 rounded-xl border-2 border-[#07517A] bg-white px-5 py-3 text-sm font-bold text-[#07517A] transition hover:bg-[#07517A] hover:text-white disabled:opacity-40"
                    >
                      {project.correctionChannel === 'whatsapp' ? (
                        <MessageCircle className="h-4 w-4 text-[#28765A]" />
                      ) : (
                        <Mail className="h-4 w-4 text-[#07517A]" />
                      )}
                      Pedir corrección (-1 chance · Abrir{' '}
                      {project.correctionChannel === 'whatsapp' ? 'WhatsApp' : 'Email'})
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleRequestExtraCostQuote}
                      className="inline-flex items-center gap-2 rounded-xl border-2 border-[#E93416] bg-[#FFF5F2] px-5 py-3 text-sm font-bold text-[#E93416] transition hover:bg-[#E93416] hover:text-white"
                    >
                      <AlertTriangle className="h-4 w-4" />
                      Solicitar cotización por costo extra (0 chances restantes)
                    </button>
                  )}

                  {/* BOTÓN APROBAR ETAPA */}
                  <button
                    type="button"
                    disabled={isStage9BlockedByCover}
                    onClick={handleApproveStage}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#E93416] px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#d12c10] disabled:opacity-40"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Aprobar etapa {String(stageDef.id).padStart(2, '0')} →
                  </button>
                </div>
              </div>
            </div>

            {/* Historial de Códigos de Ronda Generados [CODIGO | ETAPA | Ronda X/Y] y Adendas */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="rounded-2xl border border-[#DCE4E4] bg-white p-6">
                <h3 className="text-xs font-bold uppercase tracking-widest text-[#07517A]">
                  Historial de Rondas Emitidas
                </h3>
                {project.logs.length === 0 ? (
                  <p className="mt-3 text-xs text-[#526C7A]">
                    Aún no has solicitado rondas de corrección en este proyecto.
                  </p>
                ) : (
                  <ul className="mt-3 space-y-2.5 text-xs">
                    {project.logs.map((log) => (
                      <li
                        key={log.id}
                        className="rounded-lg border border-[#DCE4E4] bg-[#F7F4EE] p-3"
                      >
                        <span className="block font-mono font-bold text-[#07517A]">
                          {log.roundCode}
                        </span>
                        <span className="mt-1 block text-[#193847]">{log.notes}</span>
                        <span className="mt-1 block text-[10px] text-[#526C7A]">
                          Canal: {log.channel.toUpperCase()} ·{' '}
                          {new Date(log.createdAt).toLocaleString('es-BO')}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="rounded-2xl border border-[#DCE4E4] bg-white p-6">
                <h3 className="text-xs font-bold uppercase tracking-widest text-[#07517A]">
                  Adendas y Solicitudes por Costo Extra
                </h3>
                {project.addendums.length === 0 ? (
                  <p className="mt-3 text-xs text-[#526C7A]">
                    Sin adendas por costo extra solicitadas.
                  </p>
                ) : (
                  <ul className="mt-3 space-y-2.5 text-xs">
                    {project.addendums.map((add) => (
                      <li
                        key={add.id}
                        className="rounded-lg border border-[#DCE4E4] bg-[#F7F4EE] p-3"
                      >
                        <div className="flex items-center justify-between">
                          <strong className="text-[#07517A]">
                            USD {add.amount.toFixed(2)}
                          </strong>
                          <span
                            className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                              add.status === 'approved_paid'
                                ? 'bg-[#E8F2ED] text-[#28765A]'
                                : 'bg-[#FFF2E9] text-[#A23A1F]'
                            }`}
                          >
                            {add.status === 'approved_paid'
                              ? 'Aprobada por Admin (+Chances)'
                              : 'Pendiente de Aprobación Admin'}
                          </span>
                        </div>
                        <p className="mt-1 text-[#193847]">{add.description}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
