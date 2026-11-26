'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CorrectionChannel,
  DEFAULT_PRICING_SETTINGS,
  ENTRY_CONDITIONS_LADDER,
  EntryConditionId,
  PricingSettings,
} from '@/lib/editorial-data';
import { analyzeEditorialFile, FileAnalysisResult } from '@/lib/file-analyzer';
import { calculateQuoteBreakdown, generateContractPdfBytes } from '@/lib/pdf-contract';
import {
  fetchPricingSettings,
  registerClientAndCreateProjectAfterPayment,
} from '@/lib/supabase';
import { withBasePath } from '@/lib/audiobooks-config';
import {
  AlertCircle,
  CheckCircle2,
  CreditCard,
  Download,
  Eraser,
  FileCheck,
  FileSearch,
  Lock,
  Mail,
  MessageCircle,
  PenTool,
  Sparkles,
  Table,
  Image as ImageIcon,
} from 'lucide-react';

export default function DynamicQuoter() {
  const router = useRouter();
  const [pricing, setPricing] = useState<PricingSettings>(DEFAULT_PRICING_SETTINGS);

  // Datos del cliente y proyecto
  const [projectCode, setProjectCode] = useState<string>('GMDEI-2026-4810');
  const [clientName, setClientName] = useState<string>('');
  const [clientEmail, setClientEmail] = useState<string>('');
  const [clientPhone, setClientPhone] = useState<string>('');
  const [clientPassword, setClientPassword] = useState<string>('GMDEI-2026!');
  const [bookTitle, setBookTitle] = useState<string>('');
  const [bookSize, setBookSize] = useState<string>('15 x 21 cm (Estándar Editorial)');

  // 1. Escalera de prerrequisitos
  const [entryCondition, setEntryCondition] = useState<EntryConditionId>('word_ready');

  // 2. Analizador automático de archivos (.docx / .pdf)
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<FileAnalysisResult | null>(null);
  const [detectedPages, setDetectedPages] = useState<number>(120);
  const [detectedImages, setDetectedImages] = useState<number>(0);
  const [wantsImageEditing, setWantsImageEditing] = useState<boolean>(false);
  const [wantsToAddImagesWhenZero, setWantsToAddImagesWhenZero] = useState<boolean>(false);
  const [imagesToAdd, setImagesToAdd] = useState<number>(0);
  const [detectedTables, setDetectedTables] = useState<number>(0);
  const [tableSpecifications, setTableSpecifications] = useState<string>('');

  // 3. Selector obligatorio de CANAL ÚNICO de correcciones
  const [correctionChannel, setCorrectionChannel] = useState<CorrectionChannel | null>(null);

  // 4. Firma electrónica en pantalla (canvas)
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [hasSignatureStrokes, setHasSignatureStrokes] = useState<boolean>(false);
  const [signatureStampedUrl, setSignatureStampedUrl] = useState<string>('');
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string>('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);

  // 5. Pago del 50% y creación de usuario
  const [isProcessingPayment, setIsProcessingPayment] = useState<boolean>(false);
  const [formError, setFormError] = useState<string>('');
  const [createdCredentialsModal, setCreatedCredentialsModal] = useState<{
    email: string;
    password: string;
    code: string;
  } | null>(null);

  useEffect(() => {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    setProjectCode(`GMDEI-2026-${randomNum}`);
    fetchPricingSettings().then((s) => setPricing(s));
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.strokeStyle = '#07517A';
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsAnalyzing(true);
    setFormError('');
    try {
      const result = await analyzeEditorialFile(file);
      setAnalysisResult(result);
      setDetectedPages(result.pageCount);
      setDetectedImages(result.imageCount);
      setDetectedTables(result.tableCount);

      if (result.fileType === 'pdf' && entryCondition === 'word_ready') {
        setEntryCondition('pdf');
      }

      if (result.imageCount > 0) {
        setWantsToAddImagesWhenZero(false);
        setImagesToAdd(0);
      } else {
        setWantsImageEditing(false);
      }
    } catch {
      setFormError('No se pudo analizar el archivo automáticamente. Puedes ajustar los valores manualmente.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const loadSampleFileForAnalysis = async (sampleType: 'docx' | 'pdf' | 'rich_demo') => {
    setIsAnalyzing(true);
    setFormError('');
    try {
      if (sampleType === 'rich_demo') {
        setAnalysisResult({
          fileName: 'Manuscrito_Historia_Ocoa_Con_Tablas_e_Imagenes.docx',
          fileType: 'docx',
          fileSizeKB: 1420,
          pageCount: 164,
          wordCount: 41200,
          imageCount: 6,
          tableCount: 4,
          details: [
            'Estructura XML Word (.docx) inspeccionada con JSZip',
            '164 páginas estimadas (41.200 palabras)',
            '6 imágenes embebidas detectadas en word/media y nodos <w:drawing>',
            '4 tablas detectadas en nodos <w:tbl> de word/document.xml',
          ],
        });
        setDetectedPages(164);
        setDetectedImages(6);
        setWantsImageEditing(true);
        setImagesToAdd(0);
        setDetectedTables(4);
        if (!tableSpecifications) {
          setTableSpecifications('4 tablas estadísticas e históricas de media página a una tinta.');
        }
        if (!bookTitle) {
          setBookTitle('Crónicas y Genealogía del Valle');
        }
      } else {
        const url =
          sampleType === 'docx'
            ? withBasePath('/assets/muestra-manuscrito.docx')
            : withBasePath('/assets/muestra-libro.pdf');
        const res = await fetch(url);
        const blob = await res.blob();
        const fileName =
          sampleType === 'docx'
            ? 'pasos_para_diagramar_con_nosotros.docx'
            : 'tentable_original.pdf';
        const file = new File([blob], fileName, { type: blob.type });
        const result = await analyzeEditorialFile(file);
        setAnalysisResult(result);
        setDetectedPages(result.pageCount);
        setDetectedImages(result.imageCount);
        setDetectedTables(result.tableCount);
        if (sampleType === 'pdf') setEntryCondition('pdf');
      }
    } catch {
      setFormError('Error al cargar el archivo de muestra.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const effectiveImagesToAdd =
    detectedImages === 0 && wantsToAddImagesWhenZero ? imagesToAdd : 0;

  const breakdown = calculateQuoteBreakdown({
    clientName: clientName || 'Autor gmDEI',
    clientEmail: clientEmail || 'autor@ejemplo.com',
    clientPhone: clientPhone || '59170000000',
    bookTitle: bookTitle || 'Obra Editorial en Diagramación',
    bookSize,
    entryCondition,
    detectedPages,
    detectedImages,
    wantsImageEditing,
    imagesToAdd: effectiveImagesToAdd,
    detectedTables,
    tableSpecifications,
    correctionChannel: correctionChannel || 'whatsapp',
    pricing,
  });

  const getCoordinates = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ('touches' in e) {
      const touch = e.touches[0];
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasSignatureStrokes(true);
  };

  const draw = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignatureStrokes(false);
    setSignatureStampedUrl('');
  };

  const handleGenerateAndStampPdf = async (stampSignature: boolean) => {
    setFormError('');

    if (!correctionChannel) {
      setFormError(
        'Debes elegir obligatoriamente tu CANAL ÚNICO de correcciones (WhatsApp o Email) en el acordeón 3 antes de emitir o firmar el contrato PDF.'
      );
      return;
    }

    if (detectedTables > 0 && !tableSpecifications.trim()) {
      setFormError(
        'El archivo contiene tablas detectadas. Por favor escribe la especificación de las tablas en el acordeón 2.'
      );
      return;
    }

    let sigDataUrl = signatureStampedUrl;
    if (stampSignature) {
      if (!hasSignatureStrokes || !canvasRef.current) {
        setFormError('Por favor traza tu firma electrónica en el recuadro antes de estamparla en el PDF.');
        return;
      }
      sigDataUrl = canvasRef.current.toDataURL('image/png');
      setSignatureStampedUrl(sigDataUrl);
    }

    setIsGeneratingPdf(true);
    try {
      const pdfBytes = await generateContractPdfBytes({
        projectCode,
        clientName: clientName.trim() || 'Autor / Cliente gmDEI',
        clientEmail: clientEmail.trim() || 'cliente@ejemplo.com',
        clientPhone: clientPhone.trim() || '59170000000',
        bookTitle: bookTitle.trim() || 'Obra en Diagramación Editorial',
        bookSize,
        entryCondition,
        detectedPages,
        detectedImages,
        wantsImageEditing,
        imagesToAdd: effectiveImagesToAdd,
        detectedTables,
        tableSpecifications,
        correctionChannel,
        pricing,
        signatureDataUrl: sigDataUrl || undefined,
      });

      const blob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setPdfBlobUrl(url);
    } catch {
      setFormError('Ocurrió un problema al generar el PDF con pdf-lib.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleConfirm50PaymentAndCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!signatureStampedUrl) {
      setFormError('El link de pago del 50 % solo se libera tras estampar tu firma electrónica en el contrato PDF.');
      return;
    }
    if (!correctionChannel) {
      setFormError('Selecciona el canal único obligatorio de correcciones (WhatsApp o Email).');
      return;
    }
    if (!clientName.trim() || !clientEmail.trim() || !bookTitle.trim()) {
      setFormError('Por favor completa tu nombre, correo electrónico y el título del libro.');
      return;
    }

    setIsProcessingPayment(true);
    try {
      const { project } = await registerClientAndCreateProjectAfterPayment({
        projectCode,
        clientName,
        clientEmail,
        clientPhone: clientPhone || '59170000000',
        password: clientPassword || 'GMDEI-2026!',
        bookTitle,
        bookSize,
        entryCondition,
        detectedPages,
        detectedImages,
        wantsImageEditing,
        imagesToAdd: effectiveImagesToAdd,
        detectedTables,
        tableSpecifications,
        correctionChannel,
        totalCost: breakdown.totalCost,
        deposit50: breakdown.deposit50,
        signatureDataUrl: signatureStampedUrl,
      });

      setCreatedCredentialsModal({
        email: project.clientEmail,
        password: clientPassword || 'GMDEI-2026!',
        code: project.code,
      });
    } catch {
      setFormError('No se pudo procesar el alta del proyecto. Intenta nuevamente.');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  return (
    <section
      id="cotizador"
      aria-labelledby="quoter-heading"
      className="relative z-20 border-b-2 border-[#151515] bg-[#F7F4EE] py-24"
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
      <div className="mx-auto max-w-3xl text-center">
        <span className="inline-flex items-center gap-2 border border-[#151515] bg-white px-4 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-[#07517A] shadow-2xs">
          <Sparkles className="h-3.5 w-3.5 text-[#E93416]" />
          COTIZADOR INTELIGENTE Y FIRMA DIGITAL
        </span>
        <h2
          id="quoter-heading"
          className="type-poster mt-4 text-4xl text-[#07517A] sm:text-6xl"
        >
          Configura tu proyecto en 4 bloques.
        </h2>
        <p className="mt-3 text-base font-medium text-[#193847]">
          Sin formularios interminables: abre cada sección a tu ritmo, sube tu archivo para
          inspección automática y firma en pantalla para liberar tu acceso.
        </p>
      </div>

      <form
        onSubmit={handleConfirm50PaymentAndCreateAccount}
        aria-labelledby="quoter-heading"
        className="mt-14 grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-start"
      >
        {/* COLUMNA IZQUIERDA (7 cols): 4 Acordeones Desplegables (<details>) limpios y desahogados */}
        <div className="space-y-5 lg:col-span-7">
          {/* ACORDEÓN 1 (Abierto por defecto): Condición de Entrada (Escalera 0 a +4) */}
          <details
            open
            className="editorial-disclosure group rounded-2xl border border-[#DCE4E4] bg-white p-6 shadow-xs"
          >
            <summary className="text-lg font-bold text-[#07517A]">
              <div className="flex flex-1 flex-wrap items-center justify-between gap-2">
                <span>1. Escalera de Entrada hacia Word Listo (+4)</span>
                <span className="rounded-full bg-[#FFF5F2] px-3 py-1 text-xs font-bold text-[#E93416]">
                  Seleccionado: {breakdown.conditionObj.badge} · {breakdown.conditionObj.title.split('(')[0]}
                </span>
              </div>
            </summary>

            <div className="mt-6 border-t border-[#DCE4E4] pt-5">
              <fieldset>
                <legend className="text-xs font-bold uppercase tracking-wider text-[#526C7A] mb-3">
                  Elige cómo entregas tu original (prerrequisitos hasta Word listo para estilado):
                </legend>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {ENTRY_CONDITIONS_LADDER.map((cond) => {
                    const isSelected = entryCondition === cond.id;
                    const surchargeAmount = Number(pricing[cond.surchargeKey] || 0);
                    return (
                      <label
                        key={cond.id}
                        htmlFor={`cond-${cond.id}`}
                        className={`flex cursor-pointer flex-col justify-between rounded-xl border p-4 transition ${
                          isSelected
                            ? 'border-2 border-[#E93416] bg-[#FFF6F3] shadow-xs'
                            : 'border-[#DCE4E4] bg-white hover:border-[#07517A]/50'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className={`inline-flex h-6 w-8 items-center justify-center rounded text-xs font-bold ${
                                cond.badge === '+4'
                                  ? 'bg-[#28765A] text-white'
                                  : cond.badge === '0'
                                  ? 'bg-[#E93416] text-white'
                                  : 'bg-[#07517A] text-white'
                              }`}
                            >
                              {cond.badge}
                            </span>
                            <input
                              id={`cond-${cond.id}`}
                              type="radio"
                              name="entryCondition"
                              value={cond.id}
                              checked={isSelected}
                              onChange={() => setEntryCondition(cond.id)}
                              className="h-4 w-4 accent-[#E93416]"
                            />
                          </div>
                          <p className="mt-2.5 text-sm font-bold text-[#07517A]">
                            {cond.title}
                          </p>
                          <p className="mt-1 text-xs text-[#526C7A]">{cond.subtitle}</p>
                        </div>

                        <div className="mt-3 flex items-center justify-between border-t border-[#DCE4E4]/70 pt-2 text-[11px] font-bold">
                          <span className="text-[#526C7A]">
                            {cond.prerequisiteSteps.length} paso(s) a +4
                          </span>
                          <span className="text-[#E93416]">
                            {surchargeAmount === 0 ? 'Base (+USD 0)' : `+ USD ${surchargeAmount}`}
                          </span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            </div>
          </details>

          {/* ACORDEÓN 2: Analizador Automático (.docx / .pdf) de Páginas, Imágenes y Tablas */}
          <details
            open
            className="editorial-disclosure rounded-2xl border border-[#DCE4E4] bg-white p-6 shadow-xs"
          >
            <summary className="text-lg font-bold text-[#07517A]">
              <div className="flex flex-1 flex-wrap items-center justify-between gap-2">
                <span>2. Inspector Automático de Archivo (.DOCX / .PDF)</span>
                <span className="rounded-full bg-[#F7F4EE] px-3 py-1 text-xs font-bold text-[#07517A]">
                  {detectedPages} págs · {detectedImages} img · {detectedTables} tablas
                </span>
              </div>
            </summary>

            <div className="mt-6 border-t border-[#DCE4E4] pt-5 space-y-5">
              <div className="rounded-xl border-2 border-dashed border-[#07517A]/30 bg-[#F7F4EE]/60 p-5 text-center">
                <FileSearch className="mx-auto h-8 w-8 text-[#07517A]" />
                <label
                  htmlFor="manuscriptFile"
                  className="mt-2 block cursor-pointer text-sm font-bold text-[#07517A] hover:underline"
                >
                  Sube tu archivo .docx o .pdf para detectar imágenes y tablas
                </label>
                <input
                  id="manuscriptFile"
                  name="manuscriptFile"
                  type="file"
                  accept=".docx,.pdf"
                  onChange={handleFileUpload}
                  className="mt-2 text-xs text-[#526C7A] file:mr-3 file:rounded-lg file:border-0 file:bg-[#07517A] file:px-4 file:py-2 file:text-xs file:font-bold file:text-white"
                />

                <div className="mt-3 flex flex-wrap items-center justify-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => loadSampleFileForAnalysis('docx')}
                    className="rounded-lg border border-[#07517A]/30 bg-white px-2.5 py-1 text-xs font-bold text-[#07517A] hover:bg-[#07517A] hover:text-white"
                  >
                    Probar .docx real
                  </button>
                  <button
                    type="button"
                    onClick={() => loadSampleFileForAnalysis('pdf')}
                    className="rounded-lg border border-[#07517A]/30 bg-white px-2.5 py-1 text-xs font-bold text-[#07517A] hover:bg-[#07517A] hover:text-white"
                  >
                    Probar .pdf real
                  </button>
                  <button
                    type="button"
                    onClick={() => loadSampleFileForAnalysis('rich_demo')}
                    className="rounded-lg border border-[#E93416]/40 bg-[#FFF5F2] px-2.5 py-1 text-xs font-bold text-[#E93416] hover:bg-[#E93416] hover:text-white"
                  >
                    Simular 6 imágenes + 4 tablas
                  </button>
                </div>
              </div>

              {isAnalyzing && (
                <div role="status" className="rounded-lg bg-[#07517A] p-3 text-xs font-bold text-white">
                  Analizando estructura interna del documento...
                </div>
              )}

              {analysisResult && (
                <div className="rounded-xl border border-[#28765A]/40 bg-[#E8F2ED] p-3.5 text-xs text-[#193847]">
                  <strong className="text-[#28765A]">✓ {analysisResult.fileName}:</strong>{' '}
                  {analysisResult.details.join(' · ')}
                </div>
              )}

              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl border border-[#DCE4E4] bg-[#F7F4EE]/50 p-3">
                  <label htmlFor="detectedPages" className="block text-[11px] font-bold text-[#07517A]">
                    Páginas
                  </label>
                  <input
                    id="detectedPages"
                    type="number"
                    min={1}
                    value={detectedPages}
                    onChange={(e) => setDetectedPages(Math.max(1, Number(e.target.value)))}
                    className="mt-1 w-full rounded-lg border border-[#767676] bg-white px-2.5 py-1.5 text-sm font-bold text-[#07517A]"
                  />
                </div>
                <div className="rounded-xl border border-[#DCE4E4] bg-[#F7F4EE]/50 p-3">
                  <label htmlFor="detectedImages" className="block text-[11px] font-bold text-[#07517A]">
                    Imágenes
                  </label>
                  <input
                    id="detectedImages"
                    type="number"
                    min={0}
                    value={detectedImages}
                    onChange={(e) => {
                      const val = Math.max(0, Number(e.target.value));
                      setDetectedImages(val);
                      if (val > 0) {
                        setWantsToAddImagesWhenZero(false);
                        setImagesToAdd(0);
                      }
                    }}
                    className="mt-1 w-full rounded-lg border border-[#767676] bg-white px-2.5 py-1.5 text-sm font-bold text-[#07517A]"
                  />
                </div>
                <div className="rounded-xl border border-[#DCE4E4] bg-[#F7F4EE]/50 p-3">
                  <label htmlFor="detectedTables" className="block text-[11px] font-bold text-[#07517A]">
                    Tablas
                  </label>
                  <input
                    id="detectedTables"
                    type="number"
                    min={0}
                    value={detectedTables}
                    onChange={(e) => setDetectedTables(Math.max(0, Number(e.target.value)))}
                    className="mt-1 w-full rounded-lg border border-[#767676] bg-white px-2.5 py-1.5 text-sm font-bold text-[#07517A]"
                  />
                </div>
              </div>

              {/* Pregunta condicional: Si tiene imágenes */}
              {detectedImages > 0 && (
                <div className="rounded-xl border border-[#07517A]/30 bg-[#F0F6FA] p-4">
                  <label className="flex cursor-pointer items-center gap-3 text-sm font-bold text-[#07517A]">
                    <input
                      type="checkbox"
                      checked={wantsImageEditing}
                      onChange={(e) => setWantsImageEditing(e.target.checked)}
                      className="h-4 w-4 accent-[#E93416]"
                    />
                    <span>
                      Detectamos {detectedImages} imágenes. ¿Deseas edición y retoque profesional? (+ USD{' '}
                      {(detectedImages * pricing.image_edit_cost).toFixed(2)})
                    </span>
                  </label>
                </div>
              )}

              {/* Pregunta condicional: Si NO tiene imágenes */}
              {detectedImages === 0 && (
                <div className="rounded-xl border border-[#E93416]/30 bg-[#FFF6F3] p-4 space-y-3">
                  <label className="flex cursor-pointer items-center gap-3 text-sm font-bold text-[#07517A]">
                    <input
                      type="checkbox"
                      checked={wantsToAddImagesWhenZero}
                      onChange={(e) => {
                        setWantsToAddImagesWhenZero(e.target.checked);
                        if (e.target.checked && imagesToAdd === 0) setImagesToAdd(4);
                        if (!e.target.checked) setImagesToAdd(0);
                      }}
                      className="h-4 w-4 accent-[#E93416]"
                    />
                    <span>
                      No se detectaron imágenes. ¿Deseas agregar imágenes al libro? (USD{' '}
                      {pricing.image_insert_cost}/img)
                    </span>
                  </label>
                  {wantsToAddImagesWhenZero && (
                    <div className="flex items-center gap-3 pl-7">
                      <label htmlFor="imagesToAddInput" className="text-xs font-bold text-[#193847]">
                        ¿Cuántas imágenes agregarás?:
                      </label>
                      <input
                        id="imagesToAddInput"
                        type="number"
                        min={1}
                        value={imagesToAdd}
                        onChange={(e) => setImagesToAdd(Math.max(1, Number(e.target.value)))}
                        className="w-24 rounded-lg border border-[#767676] bg-white px-2.5 py-1 text-sm font-bold"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Pregunta condicional: Si tiene tablas */}
              {detectedTables > 0 && (
                <div className="rounded-xl border border-[#07517A]/35 bg-[#F7F4EE] p-4">
                  <label htmlFor="tableSpecifications" className="block text-xs font-bold text-[#07517A]">
                    Especificación obligatoria de las {detectedTables} tablas detectadas (+ USD{' '}
                    {(detectedTables * pricing.table_layout_cost).toFixed(2)}): *
                  </label>
                  <textarea
                    id="tableSpecifications"
                    rows={2}
                    required={detectedTables > 0}
                    value={tableSpecifications}
                    onChange={(e) => setTableSpecifications(e.target.value)}
                    placeholder="Indica estructura, columnas o estilo de las tablas..."
                    className="mt-2 w-full rounded-lg border border-[#767676] bg-white p-2.5 text-xs"
                  />
                </div>
              )}
            </div>
          </details>

          {/* ACORDEÓN 3: Datos del Autor + Canal Único Obligatorio (WhatsApp o Email) */}
          <details
            open
            className="editorial-disclosure rounded-2xl border border-[#DCE4E4] bg-white p-6 shadow-xs"
          >
            <summary className="text-lg font-bold text-[#07517A]">
              <div className="flex flex-1 flex-wrap items-center justify-between gap-2">
                <span>3. Datos de la Obra y Canal Único de Correcciones</span>
                <span className="rounded-full bg-[#F7F4EE] px-3 py-1 text-xs font-bold text-[#07517A]">
                  {correctionChannel
                    ? `Canal: ${correctionChannel.toUpperCase()}`
                    : 'Selecciona canal único'}
                </span>
              </div>
            </summary>

            <div className="mt-6 border-t border-[#DCE4E4] pt-5 space-y-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label htmlFor="bookTitle" className="block text-xs font-bold text-[#193847]">
                    Título del libro *
                  </label>
                  <input
                    id="bookTitle"
                    type="text"
                    required
                    value={bookTitle}
                    onChange={(e) => setBookTitle(e.target.value)}
                    placeholder="Ej. El jardín de las voces"
                    className="mt-1 w-full rounded-lg border border-[#767676] px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="clientName" className="block text-xs font-bold text-[#193847]">
                    Nombre del Autor / Cliente *
                  </label>
                  <input
                    id="clientName"
                    type="text"
                    required
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Ej. Camila Mendoza"
                    className="mt-1 w-full rounded-lg border border-[#767676] px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="clientEmail" className="block text-xs font-bold text-[#193847]">
                    Email (Usuario para /mi-proyecto) *
                  </label>
                  <input
                    id="clientEmail"
                    type="email"
                    autoCorrect="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    required
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    placeholder="autor@correo.com"
                    className="mt-1 w-full rounded-lg border border-[#767676] px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="clientPhone" className="block text-xs font-bold text-[#193847]">
                    WhatsApp / Teléfono *
                  </label>
                  <input
                    id="clientPhone"
                    type="tel"
                    required
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    placeholder="59171234567"
                    className="mt-1 w-full rounded-lg border border-[#767676] px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="bookSize" className="block text-xs font-bold text-[#193847]">
                    Formato del Libro
                  </label>
                  <select
                    id="bookSize"
                    value={bookSize}
                    onChange={(e) => setBookSize(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-[#767676] bg-white px-3 py-2 text-sm"
                  >
                    <option value="14 x 21 cm (Novela / Ensayo)">14 × 21 cm (Novela / Ensayo)</option>
                    <option value="15 x 21 cm (Estándar Editorial)">15 × 21 cm (Estándar Editorial)</option>
                    <option value="17 x 24 cm (Académico / Técnico)">17 × 24 cm (Académico / Técnico)</option>
                  </select>
                </div>
              </div>

              {/* Selector de Canal Único Obligatorio */}
              <fieldset className="pt-2">
                <legend className="text-xs font-bold uppercase tracking-wider text-[#E93416] mb-2">
                  Canal Único Obligatorio de Correcciones (al elegir uno, el otro queda bloqueado):
                </legend>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div
                    onClick={() => setCorrectionChannel('whatsapp')}
                    className={`cursor-pointer rounded-xl border-2 p-4 transition ${
                      correctionChannel === 'whatsapp'
                        ? 'border-[#28765A] bg-[#E8F2ED]'
                        : correctionChannel === 'email'
                        ? 'border-[#DCE4E4] bg-gray-100 opacity-55'
                        : 'border-[#DCE4E4] hover:border-[#07517A]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-2 text-sm font-bold text-[#07517A]">
                        <MessageCircle className="h-4 w-4 text-[#28765A]" /> WhatsApp Exclusivo
                      </span>
                      <input
                        type="radio"
                        name="correctionChannel"
                        checked={correctionChannel === 'whatsapp'}
                        onChange={() => setCorrectionChannel('whatsapp')}
                        className="h-4 w-4 accent-[#28765A]"
                      />
                    </div>
                    {correctionChannel === 'email' && (
                      <span className="mt-2 inline-flex items-center gap-1 rounded bg-[#193847] px-2 py-0.5 text-[10px] font-bold text-white">
                        <Lock className="h-3 w-3" /> BLOQUEADO
                      </span>
                    )}
                  </div>

                  <div
                    onClick={() => setCorrectionChannel('email')}
                    className={`cursor-pointer rounded-xl border-2 p-4 transition ${
                      correctionChannel === 'email'
                        ? 'border-[#07517A] bg-[#F0F6FA]'
                        : correctionChannel === 'whatsapp'
                        ? 'border-[#DCE4E4] bg-gray-100 opacity-55'
                        : 'border-[#DCE4E4] hover:border-[#07517A]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-2 text-sm font-bold text-[#07517A]">
                        <Mail className="h-4 w-4 text-[#07517A]" /> Email Exclusivo
                      </span>
                      <input
                        type="radio"
                        name="correctionChannel"
                        checked={correctionChannel === 'email'}
                        onChange={() => setCorrectionChannel('email')}
                        className="h-4 w-4 accent-[#07517A]"
                      />
                    </div>
                    {correctionChannel === 'whatsapp' && (
                      <span className="mt-2 inline-flex items-center gap-1 rounded bg-[#193847] px-2 py-0.5 text-[10px] font-bold text-white">
                        <Lock className="h-3 w-3" /> BLOQUEADO
                      </span>
                    )}
                  </div>
                </div>
              </fieldset>
            </div>
          </details>

          {/* ACORDEÓN 4: Firma Electrónica en Pantalla (Canvas) + Emisión de Contrato PDF */}
          <details
            open
            className="editorial-disclosure rounded-2xl border border-[#DCE4E4] bg-white p-6 shadow-xs"
          >
            <summary className="text-lg font-bold text-[#07517A]">
              <div className="flex flex-1 flex-wrap items-center justify-between gap-2">
                <span>4. Firma Electrónica en Pantalla y Contrato PDF</span>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                    signatureStampedUrl
                      ? 'bg-[#E8F2ED] text-[#28765A]'
                      : 'bg-[#FFF5F2] text-[#E93416]'
                  }`}
                >
                  {signatureStampedUrl ? '✓ Contrato Firmado' : 'Pendiente de firma'}
                </span>
              </div>
            </summary>

            <div className="mt-6 border-t border-[#DCE4E4] pt-5">
              <div className="flex items-center justify-between text-xs font-bold text-[#07517A]">
                <span className="inline-flex items-center gap-1.5">
                  <PenTool className="h-4 w-4 text-[#E93416]" /> Dibuja tu firma aquí para estamparla
                  en el PDF:
                </span>
                <button
                  type="button"
                  onClick={clearSignature}
                  className="inline-flex items-center gap-1 text-[#E93416] hover:underline"
                >
                  <Eraser className="h-3.5 w-3.5" /> Limpiar
                </button>
              </div>

              <div className="mt-2 overflow-hidden rounded-xl border-2 border-[#07517A] bg-white">
                <canvas
                  ref={canvasRef}
                  width={600}
                  height={155}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="h-36 w-full cursor-crosshair touch-none bg-white"
                />
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleGenerateAndStampPdf(true)}
                  disabled={isGeneratingPdf}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#07517A] px-5 py-3 text-xs font-bold text-white shadow-xs hover:bg-[#07517A]/90 disabled:opacity-50 sm:text-sm"
                >
                  <FileCheck className="h-4 w-4" />
                  {isGeneratingPdf
                    ? 'Estampando firma en PDF...'
                    : 'Estampar Firma en Contrato PDF y Desbloquear Pago 50 %'}
                </button>
                <button
                  type="button"
                  onClick={() => handleGenerateAndStampPdf(false)}
                  disabled={isGeneratingPdf}
                  className="rounded-xl border border-[#07517A] px-4 py-3 text-xs font-bold text-[#07517A] hover:bg-[#F7F4EE]"
                >
                  Ver borrador PDF
                </button>
              </div>
            </div>
          </details>
        </div>

        {/* COLUMNA DERECHA STICKY (5 cols): Tarjeta Limpia de Liquidación, Contrato PDF y Pago 50 % */}
        <div className="lg:sticky lg:top-24 lg:col-span-5">
          <div className="rounded-3xl border border-[#DCE4E4] bg-white p-7 shadow-xl space-y-6">
            <div className="flex items-center justify-between border-b border-[#DCE4E4] pb-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-widest text-[#E93416]">
                  RESUMEN EN TIEMPO REAL
                </span>
                <h3 className="font-editorial text-2xl font-bold text-[#07517A]">
                  Tu Cotización gmDEI
                </h3>
              </div>
              <span className="rounded-lg bg-[#F7F4EE] px-2.5 py-1 font-mono text-xs font-bold text-[#07517A]">
                {projectCode}
              </span>
            </div>

            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between">
                <span className="text-[#526C7A]">
                  Diagramación ({detectedPages} págs × USD {pricing.base_rate_per_page.toFixed(2)})
                </span>
                <span className="font-bold">USD {breakdown.pagesCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#526C7A]">
                  Condición de entrada ({breakdown.conditionObj.badge})
                </span>
                <span className="font-bold">USD {breakdown.conditionSurcharge.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#526C7A]">Tratamiento de imágenes / tablas</span>
                <span className="font-bold">
                  USD{' '}
                  {(
                    breakdown.imageEditCost +
                    breakdown.imageInsertCost +
                    breakdown.tableCost
                  ).toFixed(2)}
                </span>
              </div>

              <div className="pt-3 border-t border-[#DCE4E4]">
                <div className="flex items-baseline justify-between">
                  <span className="font-bold text-[#07517A]">Total Proyecto Editorial</span>
                  <span className="font-editorial text-3xl font-bold text-[#07517A]">
                    USD {breakdown.totalCost.toFixed(2)}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between rounded-2xl bg-[#07517A] px-5 py-3.5 text-white">
                  <span className="text-xs font-bold uppercase tracking-wider">
                    Anticipo 50 % para Iniciar
                  </span>
                  <span className="font-editorial text-2xl font-bold text-[#FFC0AE]">
                    USD {breakdown.deposit50.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {pdfBlobUrl && (
              <div className="rounded-2xl border border-[#07517A]/30 bg-[#F0F6FA] p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#07517A]">
                    {signatureStampedUrl ? '✓ PDF Oficial Firmado' : 'Vista Previa Contrato PDF'}
                  </span>
                  <a
                    href={pdfBlobUrl}
                    download={`Contrato_${projectCode}.pdf`}
                    className="inline-flex items-center gap-1 rounded-lg bg-[#07517A] px-3 py-1.5 text-xs font-bold text-white"
                  >
                    <Download className="h-3.5 w-3.5" /> Descargar PDF
                  </a>
                </div>
                <iframe
                  src={pdfBlobUrl}
                  title="Contrato Editorial PDF"
                  className="mt-3 h-48 w-full rounded-xl border border-[#DCE4E4] bg-white"
                />
              </div>
            )}

            <div>
              <label
                htmlFor="clientPassword"
                className="block text-xs font-bold uppercase tracking-wider text-[#07517A]"
              >
                Contraseña para tu nuevo usuario en /mi-proyecto
              </label>
              <input
                id="clientPassword"
                type="text"
                required
                minLength={6}
                value={clientPassword}
                onChange={(e) => setClientPassword(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-[#767676] bg-white px-3.5 py-2 font-mono text-sm font-bold"
              />
            </div>

            {formError && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-xl border border-[#E93416] bg-[#FFF5F2] p-3.5 text-xs font-bold text-[#A23A1F]"
              >
                <AlertCircle className="h-4 w-4 shrink-0 text-[#E93416]" />
                <span>{formError}</span>
              </div>
            )}

            {!signatureStampedUrl ? (
              <div className="rounded-2xl border border-dashed border-[#E93416] bg-[#FFF8F6] p-4 text-center">
                <Lock className="mx-auto h-5 w-5 text-[#E93416]" />
                <p className="mt-1 text-xs font-bold text-[#A23A1F]">
                  Link de pago del 50 % bloqueado hasta firmar el PDF en el bloque 4
                </p>
              </div>
            ) : (
              <button
                type="submit"
                disabled={isProcessingPayment}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#E93416] px-6 py-4 text-base font-bold text-white shadow-lg transition hover:bg-[#d12c10] disabled:opacity-50"
              >
                <CreditCard className="h-5 w-5" />
                {isProcessingPayment
                  ? 'Activando cuenta y proyecto...'
                  : `Pagar 50 % (USD ${breakdown.deposit50.toFixed(2)}) e Ir a /mi-proyecto →`}
              </button>
            )}
          </div>
        </div>
      </form>

      {createdCredentialsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#193847]/75 p-4">
          <div className="max-w-md w-full rounded-2xl border border-[#DCE4E4] bg-white p-7 shadow-2xl">
            <div className="flex items-center gap-2 text-[#28765A]">
              <CheckCircle2 className="h-6 w-6" />
              <span className="text-xs font-bold uppercase tracking-widest">
                CUENTA CREADA EN SUPABASE AUTH
              </span>
            </div>
            <h3 className="font-editorial mt-2 text-2xl font-bold text-[#07517A]">
              ¡Proyecto Editorial Activado!
            </h3>
            <div className="mt-4 space-y-1.5 rounded-xl bg-[#F7F4EE] p-4 font-mono text-xs">
              <div>
                Proyecto: <strong className="text-[#07517A]">{createdCredentialsModal.code}</strong>
              </div>
              <div>
                Usuario: <strong className="text-[#07517A]">{createdCredentialsModal.email}</strong>
              </div>
              <div>
                Clave: <strong className="text-[#E93416]">{createdCredentialsModal.password}</strong>
              </div>
            </div>
            <button
              type="button"
              onClick={() => router.push('/mi-proyecto')}
              className="mt-5 w-full rounded-xl bg-[#07517A] py-3.5 text-sm font-bold text-white"
            >
              Entrar a /mi-proyecto →
            </button>
          </div>
        </div>
      )}
      </div>
    </section>
  );
}
