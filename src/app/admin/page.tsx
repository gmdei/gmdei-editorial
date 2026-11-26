'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  DEFAULT_PRICING_SETTINGS,
  EDITORIAL_STAGES_11,
  EditorialProject,
  PricingSettings,
} from '@/lib/editorial-data';
import {
  AuthSessionUser,
  authenticateUser,
  fetchPricingSettings,
  getActiveSession,
  getLocalProjects,
  saveOrUpdateProject,
  savePricingSettings,
  setActiveSession,
} from '@/lib/supabase';
import { withBasePath } from '@/lib/audiobooks-config';
import {
  ArrowLeft,
  CheckCircle2,
  DollarSign,
  ExternalLink,
  FileText,
  Layers,
  Lock,
  LogOut,
  PackageCheck,
  PlusCircle,
  Save,
  Settings,
  ShieldAlert,
  Sparkles,
  Users,
} from 'lucide-react';

export default function AdminDashboardPage() {
  const [session, setSession] = useState<AuthSessionUser | null>(null);
  const [adminEmail, setAdminEmail] = useState<string>('admin@gmdei.com');
  const [adminPassword, setAdminPassword] = useState<string>('admin123');
  const [authError, setAuthError] = useState<string>('');

  // Datos Administrativos
  const [pricing, setPricing] = useState<PricingSettings>(DEFAULT_PRICING_SETTINGS);
  const [projects, setProjects] = useState<EditorialProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [feedbackMsg, setFeedbackMsg] = useState<string>('');

  const loadAdminData = async () => {
    const currentPricing = await fetchPricingSettings();
    setPricing(currentPricing);
    const list = getLocalProjects();
    setProjects(list);
    if (list.length > 0 && !selectedProjectId) {
      setSelectedProjectId(list[0].id);
    }
  };

  useEffect(() => {
    const active = getActiveSession();
    if (active && active.role === 'admin') {
      setSession(active);
    }
    loadAdminData();
  }, []);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    const res = await authenticateUser(adminEmail, adminPassword);
    if (res.error || !res.session || res.session.role !== 'admin') {
      setAuthError(
        'Acceso restringido exclusivamente al rol Administrador (admin@gmdei.com / admin123).'
      );
      return;
    }
    setSession(res.session);
    loadAdminData();
  };

  const handleAdminLogout = () => {
    setActiveSession(null);
    setSession(null);
  };

  // Guardar Tarifario Global y Estándares
  const handleSaveGlobalPricing = async (e: React.FormEvent) => {
    e.preventDefault();
    await savePricingSettings(pricing);
    setFeedbackMsg(
      '✓ Tarifario global y estándares actualizados correctamente. El cotizador público (/) ya utiliza estos valores.'
    );
  };

  const selectedProject =
    projects.find((p) => p.id === selectedProjectId) || projects[0] || null;

  const updateSelectedProject = async (updater: (p: EditorialProject) => EditorialProject) => {
    if (!selectedProject) return;
    const updated = updater(selectedProject);
    await saveOrUpdateProject(updated);
    const refreshed = getLocalProjects();
    setProjects(refreshed);
  };

  // Control 1: Aprobar / Revocar Portada (Desbloquea o bloquea Etapa 9 para el cliente)
  const handleToggleCoverApproval = async () => {
    if (!selectedProject) return;
    const nextState = !selectedProject.coverApproved;
    await updateSelectedProject((p) => ({
      ...p,
      coverApproved: nextState,
    }));
    setFeedbackMsg(
      nextState
        ? `✓ Portada marcada como APROBADA para "${selectedProject.bookTitle}". La Etapa 9 ha quedado desbloqueada en /mi-proyecto.`
        : `Portada marcada como pendiente. La Etapa 9 vuelve a estar bloqueada.`
    );
  };

  // Control 2: Registrar muestra física entregada (descuenta de muestras restantes y suma entregadas)
  const handleRegisterPhysicalSampleDelivered = async () => {
    if (!selectedProject) return;
    await updateSelectedProject((p) => ({
      ...p,
      printedSamplesDelivered: p.printedSamplesDelivered + 1,
      printedSamplesLeft: Math.max(0, p.printedSamplesLeft - 1),
    }));
    setFeedbackMsg(
      `✓ Muestra física impresa registrada como entregada para "${selectedProject.bookTitle}".`
    );
  };

  // Control 3: Actualizar precio individual de una etapa en el proyecto seleccionado
  const handleStagePriceChange = async (stageId: number, newPrice: number) => {
    if (!selectedProject) return;
    await updateSelectedProject((p) => {
      const updatedStages = p.stages.map((st) =>
        st.id === stageId ? { ...st, customPrice: Math.max(0, newPrice) } : st
      );
      const stagesSum = updatedStages.reduce((acc, s) => acc + s.customPrice, 0);
      return {
        ...p,
        stages: updatedStages,
        totalCost: Number(stagesSum.toFixed(2)),
        deposit50: Number((stagesSum * 0.5).toFixed(2)),
      };
    });
    setFeedbackMsg(`✓ Precio de la Etapa ${stageId} actualizado y total del proyecto recalculado.`);
  };

  // Control 4: Aprobar adenda de costo extra (restaura chances al cliente y suma al total)
  const handleApproveAddendum = async (addendumId: string) => {
    if (!selectedProject) return;
    await updateSelectedProject((p) => {
      const target = p.addendums.find((a) => a.id === addendumId);
      if (!target || target.status === 'approved_paid') return p;

      const updatedAddendums = p.addendums.map((a) =>
        a.id === addendumId
          ? {
              ...a,
              status: 'approved_paid' as const,
              approvedAt: new Date().toISOString(),
            }
          : a
      );

      const updatedStages = p.stages.map((st) =>
        st.id === target.stageId ? { ...st, maxRounds: st.maxRounds + 1 } : st
      );

      return {
        ...p,
        totalCost: Number((p.totalCost + target.amount).toFixed(2)),
        digitacionJpgChancesLeft:
          target.stageId === 3 ? p.digitacionJpgChancesLeft + 1 : p.digitacionJpgChancesLeft,
        generalDiagramChancesLeft:
          target.type === 'extra_round'
            ? p.generalDiagramChancesLeft + 1
            : p.generalDiagramChancesLeft,
        printedSamplesLeft:
          target.type === 'extra_sample' ? p.printedSamplesLeft + 1 : p.printedSamplesLeft,
        printedSamplesMax:
          target.type === 'extra_sample' ? p.printedSamplesMax + 1 : p.printedSamplesMax,
        stages: updatedStages,
        addendums: updatedAddendums,
      };
    });
    setFeedbackMsg(
      '✓ Adenda de costo extra aprobada. Se habilitó +1 chance adicional en el portal del cliente.'
    );
  };

  // Control 5: Crear una adenda manual desde Admin
  const handleCreateAdminAddendum = async () => {
    if (!selectedProject) return;
    await updateSelectedProject((p) => ({
      ...p,
      addendums: [
        {
          id: `add-adm-${Date.now()}`,
          type: 'extra_round',
          stageId: p.currentStage,
          stageTitle: `Etapa ${p.currentStage}`,
          description: `Ronda extra autorizada desde Administración (+1 chance)`,
          amount: pricing.extra_round_cost,
          status: 'approved_paid',
          requestedAt: new Date().toISOString(),
          approvedAt: new Date().toISOString(),
        },
        ...p.addendums,
      ],
      totalCost: Number((p.totalCost + pricing.extra_round_cost).toFixed(2)),
      generalDiagramChancesLeft: p.generalDiagramChancesLeft + 1,
      stages: p.stages.map((st) =>
        st.id === p.currentStage ? { ...st, maxRounds: st.maxRounds + 1 } : st
      ),
    }));
    setFeedbackMsg('✓ Ronda extra agregada y aprobada directamente para este proyecto.');
  };

  // Si no está autenticado como Admin -> Pantalla de Login de Rol Administrador
  if (!session || session.role !== 'admin') {
    return (
      <div className="min-h-screen flex flex-col bg-[#F7F4EE] text-[#193847]">
        <header className="border-b border-[#DCE4E4] bg-[#07517A] text-white">
          <div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-6">
            <Link href="/" className="flex items-center gap-3">
              <img
                src={withBasePath('/assets/gmdei.png')}
                alt="gmDEI"
                className="h-10 w-auto rounded bg-[#F7F4EE] px-2 py-1"
              />
              <span className="text-xs font-bold uppercase tracking-widest text-[#FFC0AE]">
                Panel Administrativo (/admin)
              </span>
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-white hover:text-[#FFC0AE]"
            >
              <ArrowLeft className="h-4 w-4" /> Volver a Inicio
            </Link>
          </div>
        </header>

        <main className="mx-auto flex flex-1 max-w-md flex-col justify-center px-6 py-14">
          <div className="rounded-2xl border border-[#DCE4E4] bg-white p-8 shadow-md">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-[#E93416]/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#E93416]">
              <ShieldAlert className="h-3.5 w-3.5" />
              Acceso Exclusivo Rol Administrador
            </div>
            <h1 className="font-editorial mt-3 text-3xl font-bold text-[#07517A]">
              Dirección Editorial gmDEI
            </h1>
            <p className="mt-2 text-sm text-[#526C7A]">
              Ingresa con credenciales de administrador para editar el tarifario global, precios por
              etapa, aprobar portadas y gestionar muestras físicas.
            </p>

            <form onSubmit={handleAdminLogin} className="mt-6 space-y-4">
              <div>
                <label
                  htmlFor="adminEmail"
                  className="block text-xs font-bold uppercase tracking-wider text-[#193847]"
                >
                  Correo Administrador
                </label>
                <input
                  id="adminEmail"
                  type="email"
                  required
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-[#767676] px-3.5 py-2.5 text-sm"
                />
              </div>

              <div>
                <label
                  htmlFor="adminPassword"
                  className="block text-xs font-bold uppercase tracking-wider text-[#193847]"
                >
                  Contraseña Administrador
                </label>
                <input
                  id="adminPassword"
                  type="password"
                  required
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-[#767676] px-3.5 py-2.5 text-sm"
                />
              </div>

              {authError && (
                <div
                  role="alert"
                  className="rounded-lg border border-[#E93416] bg-[#FFF5F2] p-3 text-xs font-bold text-[#A23A1F]"
                >
                  {authError}
                </div>
              )}

              <button
                type="submit"
                className="w-full rounded-xl bg-[#E93416] py-3.5 text-sm font-bold text-white hover:bg-[#d12c10]"
              >
                Entrar al Panel Administrativo →
              </button>
            </form>

            <div className="mt-5 rounded-xl bg-[#F7F4EE] p-3.5 font-mono text-xs text-[#07517A]">
              Credenciales Admin precargadas:
              <br />
              Usuario: <strong>admin@gmdei.com</strong>
              <br />
              Clave: <strong>admin123</strong>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F4EE] text-[#193847]">
      {/* Header Admin */}
      <header className="sticky top-0 z-40 border-b border-[#DCE4E4] bg-[#07517A] text-white">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6 lg:px-10">
          <div className="flex items-center gap-4">
            <Link href="/">
              <img
                src={withBasePath('/assets/gmdei.png')}
                alt="gmDEI"
                className="h-10 w-auto rounded bg-[#F7F4EE] px-2 py-1"
              />
            </Link>
            <div>
              <span className="block text-[11px] font-bold uppercase tracking-widest text-[#FFC0AE]">
                PANEL ADMINISTRATIVO GMDEI · ROL ADMIN
              </span>
              <span className="font-editorial text-lg font-bold text-white">
                Tarifario Global, Cotizaciones y Control de Producción
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/audiolibros"
              className="rounded-lg bg-[#E93416] px-3 py-2 text-xs font-bold text-white hover:bg-[#d12c10]"
            >
              Audiolibros (Studio)
            </Link>
            <Link
              href="/"
              className="rounded-lg bg-white/10 px-3 py-2 text-xs font-bold text-white hover:bg-white/20"
            >
              Cotizador Público (/)
            </Link>
            <Link
              href="/mi-proyecto"
              className="rounded-lg bg-white/10 px-3 py-2 text-xs font-bold text-white hover:bg-white/20"
            >
              Vista Cliente (/mi-proyecto)
            </Link>
            <button
              type="button"
              onClick={handleAdminLogout}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#E93416] px-3 py-2 text-xs font-bold text-white hover:bg-[#d12c10]"
            >
              <LogOut className="h-3.5 w-3.5" /> Cerrar Admin
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 space-y-10 px-6 py-10 lg:px-10">
        {feedbackMsg && (
          <div
            role="status"
            aria-live="polite"
            className="rounded-xl border border-[#28765A] bg-[#E8F2ED] p-4 text-sm font-bold text-[#193847]"
          >
            {feedbackMsg}
          </div>
        )}

        {/* SECCIÓN 1: EDITOR DE TARIFARIO GLOBAL Y ESTÁNDARES */}
        <section
          aria-labelledby="pricing-editor-heading"
          className="rounded-2xl border border-[#DCE4E4] bg-white p-6 shadow-xs sm:p-8"
        >
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#DCE4E4] pb-4">
            <div>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-[#E93416]">
                <Settings className="h-4 w-4" /> CONFIGURACIÓN GLOBAL DE COSTOS ESTÁNDAR
              </span>
              <h2
                id="pricing-editor-heading"
                className="font-editorial mt-1 text-2xl font-bold text-[#07517A]"
              >
                1. Editor de Tarifario Global y Escalera de Formatos
              </h2>
            </div>
          </div>

          <form onSubmit={handleSaveGlobalPricing} className="mt-6">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="block text-xs font-bold text-[#07517A]">
                  Tarifa base por página (USD)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={pricing.base_rate_per_page}
                  onChange={(e) =>
                    setPricing({ ...pricing, base_rate_per_page: Number(e.target.value) })
                  }
                  className="mt-1 w-full rounded-lg border border-[#767676] px-3 py-2 text-sm font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#07517A]">
                  +4 Word listo (Recargo USD)
                </label>
                <input
                  type="number"
                  step="1"
                  value={pricing.surcharge_word_ready}
                  onChange={(e) =>
                    setPricing({ ...pricing, surcharge_word_ready: Number(e.target.value) })
                  }
                  className="mt-1 w-full rounded-lg border border-[#767676] px-3 py-2 text-sm font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#07517A]">
                  +3 PDF conversión a Word (USD)
                </label>
                <input
                  type="number"
                  step="1"
                  value={pricing.surcharge_pdf_conversion}
                  onChange={(e) =>
                    setPricing({ ...pricing, surcharge_pdf_conversion: Number(e.target.value) })
                  }
                  className="mt-1 w-full rounded-lg border border-[#767676] px-3 py-2 text-sm font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#07517A]">
                  +2 JPG numerados OCR (USD)
                </label>
                <input
                  type="number"
                  step="1"
                  value={pricing.surcharge_jpg_numbered}
                  onChange={(e) =>
                    setPricing({ ...pricing, surcharge_jpg_numbered: Number(e.target.value) })
                  }
                  className="mt-1 w-full rounded-lg border border-[#767676] px-3 py-2 text-sm font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#07517A]">
                  +1 Archivos sueltos compilación (USD)
                </label>
                <input
                  type="number"
                  step="1"
                  value={pricing.surcharge_loose_files}
                  onChange={(e) =>
                    setPricing({ ...pricing, surcharge_loose_files: Number(e.target.value) })
                  }
                  className="mt-1 w-full rounded-lg border border-[#767676] px-3 py-2 text-sm font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#07517A]">
                  0 JPG sin organizar + OCR (USD)
                </label>
                <input
                  type="number"
                  step="1"
                  value={pricing.surcharge_jpg_unorganized}
                  onChange={(e) =>
                    setPricing({ ...pricing, surcharge_jpg_unorganized: Number(e.target.value) })
                  }
                  className="mt-1 w-full rounded-lg border border-[#767676] px-3 py-2 text-sm font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#07517A]">
                  0 Manuscrito digitación completa (USD)
                </label>
                <input
                  type="number"
                  step="1"
                  value={pricing.surcharge_manuscript}
                  onChange={(e) =>
                    setPricing({ ...pricing, surcharge_manuscript: Number(e.target.value) })
                  }
                  className="mt-1 w-full rounded-lg border border-[#767676] px-3 py-2 text-sm font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#07517A]">
                  Edición de imagen detectada (USD)
                </label>
                <input
                  type="number"
                  step="1"
                  value={pricing.image_edit_cost}
                  onChange={(e) =>
                    setPricing({ ...pricing, image_edit_cost: Number(e.target.value) })
                  }
                  className="mt-1 w-full rounded-lg border border-[#767676] px-3 py-2 text-sm font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#07517A]">
                  Inclusión de imagen nueva (USD)
                </label>
                <input
                  type="number"
                  step="1"
                  value={pricing.image_insert_cost}
                  onChange={(e) =>
                    setPricing({ ...pricing, image_insert_cost: Number(e.target.value) })
                  }
                  className="mt-1 w-full rounded-lg border border-[#767676] px-3 py-2 text-sm font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#07517A]">
                  Maquetación por tabla (USD)
                </label>
                <input
                  type="number"
                  step="1"
                  value={pricing.table_layout_cost}
                  onChange={(e) =>
                    setPricing({ ...pricing, table_layout_cost: Number(e.target.value) })
                  }
                  className="mt-1 w-full rounded-lg border border-[#767676] px-3 py-2 text-sm font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#E93416]">
                  Ronda de corrección extra (USD)
                </label>
                <input
                  type="number"
                  step="1"
                  value={pricing.extra_round_cost}
                  onChange={(e) =>
                    setPricing({ ...pricing, extra_round_cost: Number(e.target.value) })
                  }
                  className="mt-1 w-full rounded-lg border border-[#767676] px-3 py-2 text-sm font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#E93416]">
                  Muestra física extra (USD)
                </label>
                <input
                  type="number"
                  step="1"
                  value={pricing.extra_printed_sample_cost}
                  onChange={(e) =>
                    setPricing({
                      ...pricing,
                      extra_printed_sample_cost: Number(e.target.value),
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-[#767676] px-3 py-2 text-sm font-bold"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-xl bg-[#07517A] px-6 py-3 text-sm font-bold text-white hover:bg-[#07517A]/90"
              >
                <Save className="h-4 w-4" /> Guardar Tarifario Global y Estándares
              </button>
            </div>
          </form>
        </section>

        {/* SECCIÓN 2: GESTIÓN DE PROYECTOS INDIVIDUALES, PRECIOS POR ETAPA, PORTADA, MUESTRAS Y ADENDAS */}
        {selectedProject && (
          <section
            aria-labelledby="project-editor-heading"
            className="rounded-2xl border border-[#DCE4E4] bg-white p-6 shadow-xs sm:p-8"
          >
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#DCE4E4] pb-5">
              <div>
                <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-[#E93416]">
                  <Users className="h-4 w-4" /> GESTIÓN INDIVIDUAL DE PROYECTO / COTIZACIÓN
                </span>
                <h2
                  id="project-editor-heading"
                  className="font-editorial mt-1 text-2xl font-bold text-[#07517A]"
                >
                  2. Control de Proyecto, Precios por Etapa, Portada, Flip/PDF y Adendas
                </h2>
              </div>

              <div className="flex items-center gap-2">
                <label htmlFor="selectProject" className="text-xs font-bold text-[#526C7A]">
                  Proyecto activo:
                </label>
                <select
                  id="selectProject"
                  value={selectedProject.id}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="rounded-xl border border-[#07517A] bg-[#F7F4EE] px-3.5 py-2 text-sm font-bold text-[#07517A]"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.code} — {p.bookTitle} ({p.clientName})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Controles Rápidos: Aprobar Portada, Muestras Físicas Entregadas y Enlaces Flip/PDF */}
            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Tarjeta Aprobar Portada (Candado Etapa 9) */}
              <div className="rounded-xl border border-[#DCE4E4] bg-[#F7F4EE] p-5">
                <span className="text-xs font-bold uppercase tracking-wider text-[#E93416]">
                  CONTROL DE CUBIERTA (CANDADO ETAPA 9)
                </span>
                <h3 className="font-editorial mt-1 text-lg font-bold text-[#07517A]">
                  Estado: {selectedProject.coverApproved ? 'Portada Aprobada ✓' : 'Bloqueada 🔒'}
                </h3>
                <p className="mt-1 text-xs text-[#526C7A]">
                  La Etapa 9 (Segundo borrador físico con portada aprobada) permanece bloqueada en
                  <code> /mi-proyecto</code> hasta activar este control.
                </p>
                <button
                  type="button"
                  onClick={handleToggleCoverApproval}
                  className={`mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-xs font-bold text-white transition ${
                    selectedProject.coverApproved
                      ? 'bg-[#28765A] hover:bg-[#28765A]/90'
                      : 'bg-[#E93416] hover:bg-[#d12c10]'
                  }`}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {selectedProject.coverApproved
                    ? 'Portada Aprobada (Clic para revocar)'
                    : 'Aprobar Portada y Desbloquear Etapa 9'}
                </button>
              </div>

              {/* Tarjeta Registrar Muestras Físicas Entregadas */}
              <div className="rounded-xl border border-[#DCE4E4] bg-[#F7F4EE] p-5">
                <span className="text-xs font-bold uppercase tracking-wider text-[#07517A]">
                  CONTROL DE MUESTRAS IMPRESAS (BORRADOR 1 / 2)
                </span>
                <h3 className="font-editorial mt-1 text-lg font-bold text-[#07517A]">
                  Entregadas: {selectedProject.printedSamplesDelivered} · Restantes:{' '}
                  {selectedProject.printedSamplesLeft}/{selectedProject.printedSamplesMax}
                </h3>
                <p className="mt-1 text-xs text-[#526C7A]">
                  Registra cada entrega física por delivery o presencial (máximo 3 muestras
                  incluidas por proyecto).
                </p>
                <button
                  type="button"
                  onClick={handleRegisterPhysicalSampleDelivered}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#07517A] px-4 py-3 text-xs font-bold text-white hover:bg-[#07517A]/90"
                >
                  <PackageCheck className="h-4 w-4" />
                  Registrar +1 Muestra Física Entregada
                </button>
              </div>

              {/* Tarjeta Publicar Enlaces Flipbook, PDF de Prueba e ISBN */}
              <div className="rounded-xl border border-[#DCE4E4] bg-[#F7F4EE] p-5 space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-[#07517A]">
                  PUBLICACIÓN DE ENLACES FLIP / PDF / ISBN
                </span>
                <div>
                  <label className="block text-[11px] font-bold text-[#193847]">
                    URL de Flipbook Interactivo:
                  </label>
                  <input
                    type="text"
                    value={selectedProject.flipbookUrl}
                    onChange={(e) =>
                      updateSelectedProject((p) => ({ ...p, flipbookUrl: e.target.value }))
                    }
                    className="mt-1 w-full rounded-lg border border-[#767676] bg-white px-2.5 py-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#193847]">
                    URL de PDF de Prueba / Arte Final:
                  </label>
                  <input
                    type="text"
                    value={selectedProject.proofPdfUrl}
                    onChange={(e) =>
                      updateSelectedProject((p) => ({ ...p, proofPdfUrl: e.target.value }))
                    }
                    className="mt-1 w-full rounded-lg border border-[#767676] bg-white px-2.5 py-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#193847]">
                    Código Oficial ISBN:
                  </label>
                  <input
                    type="text"
                    value={selectedProject.isbnCode}
                    onChange={(e) =>
                      updateSelectedProject((p) => ({ ...p, isbnCode: e.target.value }))
                    }
                    className="mt-1 w-full rounded-lg border border-[#767676] bg-white px-2.5 py-1.5 text-xs font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Editor de Precios por Etapa Individual (Las 11 Etapas) */}
            <div className="mt-8">
              <div className="flex items-center justify-between">
                <h3 className="font-editorial text-xl font-bold text-[#07517A]">
                  Editor de Precios por Etapa en este Proyecto (Total Actual: USD{' '}
                  {selectedProject.totalCost.toFixed(2)})
                </h3>
                <span className="text-xs font-bold text-[#526C7A]">
                  Modifica cualquier etapa para ajustar la cotización individual
                </span>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {EDITORIAL_STAGES_11.map((stageDef) => {
                  const stState = selectedProject.stages.find((s) => s.id === stageDef.id);
                  const priceValue = stState ? stState.customPrice : stageDef.defaultStagePrice;

                  return (
                    <div
                      key={stageDef.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-[#DCE4E4] bg-[#F7F4EE]/50 p-3.5"
                    >
                      <div className="min-w-0 flex-1">
                        <span className="block text-[10px] font-bold text-[#E93416]">
                          {stageDef.code}
                        </span>
                        <p className="truncate text-xs font-bold text-[#07517A]">
                          {stageDef.title}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-[#526C7A]">USD</span>
                        <input
                          type="number"
                          min={0}
                          step="5"
                          value={priceValue}
                          onChange={(e) =>
                            handleStagePriceChange(stageDef.id, Number(e.target.value))
                          }
                          className="w-20 rounded-lg border border-[#767676] bg-white px-2 py-1 text-right text-xs font-bold text-[#07517A]"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Aprobación de Adendas de Costo Extra */}
            <div className="mt-8 border-t border-[#DCE4E4] pt-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-editorial text-xl font-bold text-[#07517A]">
                    Adendas de Costo Extra (Rondas Extra y Muestras Extra)
                  </h3>
                  <p className="text-xs text-[#526C7A]">
                    Cuando el cliente llega a 0 chances y solicita cotización extra, puedes
                    aprobarla aquí para habilitarle nuevas chances.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleCreateAdminAddendum}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#07517A] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#07517A]/90"
                >
                  <PlusCircle className="h-4 w-4" /> Otorgar +1 Ronda Extra (USD{' '}
                  {pricing.extra_round_cost})
                </button>
              </div>

              {selectedProject.addendums.length === 0 ? (
                <p className="mt-4 rounded-xl bg-[#F7F4EE] p-4 text-xs text-[#526C7A]">
                  Este proyecto aún no tiene adendas de costo extra pendientes.
                </p>
              ) : (
                <div className="mt-4 space-y-3">
                  {selectedProject.addendums.map((add) => (
                    <div
                      key={add.id}
                      className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#DCE4E4] bg-[#F7F4EE] p-4"
                    >
                      <div>
                        <span className="text-xs font-bold text-[#07517A]">
                          {add.description} — <strong>USD {add.amount.toFixed(2)}</strong>
                        </span>
                        <span className="block text-[11px] text-[#526C7A]">
                          Solicitada: {new Date(add.requestedAt).toLocaleString('es-BO')}
                        </span>
                      </div>

                      {add.status === 'pending' ? (
                        <button
                          type="button"
                          onClick={() => handleApproveAddendum(add.id)}
                          className="rounded-xl bg-[#E93416] px-4 py-2 text-xs font-bold text-white hover:bg-[#d12c10]"
                        >
                          Aprobar Adenda y Habilitar +1 Chance →
                        </button>
                      ) : (
                        <span className="rounded-lg bg-[#E8F2ED] px-3 py-1.5 text-xs font-bold text-[#28765A]">
                          ✓ Adenda Aprobada y Acreditada
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
