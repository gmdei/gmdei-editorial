import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import {
  CorrectionChannel,
  EDITORIAL_STAGES_11,
  ENTRY_CONDITIONS_LADDER,
  EntryConditionId,
  PricingSettings,
} from './editorial-data';

export interface QuoteContractPayload {
  projectCode: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
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
  pricing: PricingSettings;
  stagePrices?: Record<number, number>;
  signatureDataUrl?: string; // PNG base64 del canvas de firma
}

export function calculateQuoteBreakdown(
  payload: Omit<QuoteContractPayload, 'projectCode' | 'signatureDataUrl'>
) {
  const {
    entryCondition,
    detectedPages,
    detectedImages,
    wantsImageEditing,
    imagesToAdd,
    detectedTables,
    pricing,
    stagePrices,
  } = payload;

  const conditionObj =
    ENTRY_CONDITIONS_LADDER.find((c) => c.id === entryCondition) || ENTRY_CONDITIONS_LADDER[0];

  const pagesCost = Math.max(1, detectedPages) * pricing.base_rate_per_page;
  const conditionSurcharge = Number(pricing[conditionObj.surchargeKey] || 0);

  const imageEditCost =
    detectedImages > 0 && wantsImageEditing ? detectedImages * pricing.image_edit_cost : 0;
  const imageInsertCost =
    detectedImages === 0 && imagesToAdd > 0 ? imagesToAdd * pricing.image_insert_cost : 0;
  const tableCost = detectedTables > 0 ? detectedTables * pricing.table_layout_cost : 0;

  // Suma de ajustes por etapa si el Admin personalizó precios de etapas
  let customStagesDelta = 0;
  if (stagePrices) {
    EDITORIAL_STAGES_11.forEach((st) => {
      if (typeof stagePrices[st.id] === 'number') {
        customStagesDelta += stagePrices[st.id] - st.defaultStagePrice;
      }
    });
  }

  const totalCost = Math.max(
    50,
    Number(
      (
        pagesCost +
        conditionSurcharge +
        imageEditCost +
        imageInsertCost +
        tableCost +
        customStagesDelta
      ).toFixed(2)
    )
  );
  const deposit50 = Number((totalCost * 0.5).toFixed(2));

  return {
    conditionObj,
    pagesCost,
    conditionSurcharge,
    imageEditCost,
    imageInsertCost,
    tableCost,
    totalCost,
    deposit50,
  };
}

/**
 * Limpia caracteres fuera de WinAnsi para StandardFonts de pdf-lib
 */
function safePdfText(input: string): string {
  return input
    .replace(/↔/g, '<->')
    .replace(/→/g, '->')
    .replace(/✓/g, '[OK]')
    .replace(/•/g, '-')
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, '');
}

/**
 * Genera el PDF oficial de Cotización y Contrato Editorial de gmDEI con pdf-lib.
 * Si recibe signatureDataUrl (del canvas de firma electrónica), estampa la firma en el documento.
 */
export async function generateContractPdfBytes(
  payload: QuoteContractPayload
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontSerifBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

  const breakdown = calculateQuoteBreakdown(payload);
  const blueColor = rgb(7 / 255, 81 / 255, 122 / 255); // #07517A
  const orangeColor = rgb(233 / 255, 52 / 255, 22 / 255); // #E93416
  const inkColor = rgb(25 / 255, 56 / 255, 71 / 255);
  const mutedColor = rgb(101 / 255, 122 / 255, 131 / 255);
  const paperBg = rgb(247 / 255, 244 / 255, 238 / 255); // #F7F4EE

  // PÁGINA 1: Resumen Ejecutivo, Escalera de Entrada, Etapas Aplicables y Costos
  const page1 = pdfDoc.addPage([595.28, 841.89]); // A4
  const { width, height } = page1.getSize();

  // Banda lateral naranja gmDEI
  page1.drawRectangle({
    x: 0,
    y: 0,
    width: 12,
    height,
    color: orangeColor,
  });

  // Encabezado fondo papel cálido
  page1.drawRectangle({
    x: 12,
    y: height - 95,
    width: width - 12,
    height: 95,
    color: paperBg,
  });

  page1.drawText('gmDEI EDITORIAL', {
    x: 36,
    y: height - 42,
    size: 22,
    font: fontSerifBold,
    color: blueColor,
  });

  page1.drawText(
    safePdfText('CONTRATO Y COTIZACION DE DIAGRAMACION EDITORIAL DE LIBROS'),
    {
      x: 36,
      y: height - 62,
      size: 10,
      font: fontBold,
      color: orangeColor,
    }
  );

  page1.drawText(
    safePdfText(
      `Codigo de Proyecto: ${payload.projectCode}   |   Fecha: ${new Date().toLocaleDateString('es-BO')}`
    ),
    {
      x: 36,
      y: height - 78,
      size: 9,
      font: fontRegular,
      color: mutedColor,
    }
  );

  let y = height - 120;

  // Datos del Cliente y Obra
  page1.drawText(safePdfText('1. DATOS DEL AUTOR / CLIENTE Y OBRA'), {
    x: 36,
    y,
    size: 11,
    font: fontBold,
    color: blueColor,
  });
  y -= 16;

  const clientLines = [
    `Autor / Cliente: ${payload.clientName || 'Por definir'}   |   Email: ${payload.clientEmail || 'Por definir'}   |   Tel: ${payload.clientPhone || 'Por definir'}`,
    `Titulo de la Obra: "${payload.bookTitle || 'Obra en Diagramacion'}"   |   Formato: ${payload.bookSize}`,
    `Condicion de Entrada Elegida: ${breakdown.conditionObj.title}`,
    `Prerrequisitos que aplican: ${breakdown.conditionObj.prerequisiteSteps.join(' -> ')}`,
  ];

  for (const line of clientLines) {
    page1.drawText(safePdfText(line), {
      x: 36,
      y,
      size: 9,
      font: fontRegular,
      color: inkColor,
    });
    y -= 13;
  }

  y -= 6;

  // Canal único obligatorio y Límites de Revisión
  page1.drawRectangle({
    x: 36,
    y: y - 54,
    width: width - 72,
    height: 62,
    color: rgb(1, 0.96, 0.94),
    borderColor: orangeColor,
    borderWidth: 1,
  });

  const channelLabel =
    payload.correctionChannel === 'whatsapp'
      ? `WHATSAPP EXCLUSIVO (+${payload.pricing.whatsapp_official}) — Canal Email BLOQUEADO`
      : `EMAIL EXCLUSIVO (${payload.pricing.email_official}) — Canal WhatsApp BLOQUEADO`;

  page1.drawText(safePdfText(`2. CANAL UNICO OBLIGATORIO Y LIMITES DE REVISIONES`), {
    x: 44,
    y: y - 10,
    size: 10,
    font: fontBold,
    color: orangeColor,
  });
  page1.drawText(safePdfText(`Canal Unico Elegido: ${channelLabel}`), {
    x: 44,
    y: y - 24,
    size: 9,
    font: fontBold,
    color: blueColor,
  });
  page1.drawText(
    safePdfText(
      `- Maximo 3 rondas por etapa general. Hasta 6 correcciones en Digitación y condición JPG.`
    ),
    {
      x: 44,
      y: y - 37,
      size: 8.5,
      font: fontRegular,
      color: inkColor,
    }
  );
  page1.drawText(
    safePdfText(
      `- Hasta 3 correcciones generales de diagramación y hasta 3 muestras físicas impresas por proyecto.`
    ),
    {
      x: 44,
      y: y - 48,
      size: 8.5,
      font: fontRegular,
      color: inkColor,
    }
  );

  y -= 74;

  // Desglose económico
  page1.drawText(safePdfText('3. DESGLOSE ECONOMICO Y DEPOSITO DEL 50 % INICIAL'), {
    x: 36,
    y,
    size: 11,
    font: fontBold,
    color: blueColor,
  });
  y -= 15;

  const costRows: Array<[string, string]> = [
    [
      `Diagramacion base (${payload.detectedPages} paginas x USD ${payload.pricing.base_rate_per_page.toFixed(2)})`,
      `USD ${breakdown.pagesCost.toFixed(2)}`,
    ],
    [
      `Condicion de entrada: ${breakdown.conditionObj.title}`,
      `USD ${breakdown.conditionSurcharge.toFixed(2)}`,
    ],
  ];

  if (payload.detectedImages > 0) {
    costRows.push([
      `Imagenes detectadas en archivo (${payload.detectedImages}) — Edicion solicitada: ${
        payload.wantsImageEditing ? 'SI' : 'NO'
      }`,
      `USD ${breakdown.imageEditCost.toFixed(2)}`,
    ]);
  } else {
    costRows.push([
      `Inclusion de imagenes nuevas solicitadas (${payload.imagesToAdd} x USD ${payload.pricing.image_insert_cost.toFixed(2)})`,
      `USD ${breakdown.imageInsertCost.toFixed(2)}`,
    ]);
  }

  if (payload.detectedTables > 0) {
    costRows.push([
      `Maquetacion de tablas detectadas (${payload.detectedTables} x USD ${payload.pricing.table_layout_cost.toFixed(2)})`,
      `USD ${breakdown.tableCost.toFixed(2)}`,
    ]);
  }

  for (const [label, amount] of costRows) {
    page1.drawText(safePdfText(label), {
      x: 40,
      y,
      size: 9,
      font: fontRegular,
      color: inkColor,
    });
    page1.drawText(safePdfText(amount), {
      x: width - 115,
      y,
      size: 9,
      font: fontBold,
      color: inkColor,
    });
    y -= 13;
  }

  if (payload.detectedTables > 0 && payload.tableSpecifications.trim()) {
    page1.drawText(
      safePdfText(
        `Especificacion de tablas: ${payload.tableSpecifications.trim().slice(0, 95)}`
      ),
      {
        x: 40,
        y,
        size: 8,
        font: fontRegular,
        color: mutedColor,
      }
    );
    y -= 13;
  }

  // Caja de Total y Depósito 50%
  page1.drawRectangle({
    x: 36,
    y: y - 34,
    width: width - 72,
    height: 36,
    color: blueColor,
  });

  page1.drawText(
    safePdfText(`COSTO TOTAL DEL PROYECTO: USD ${breakdown.totalCost.toFixed(2)}`),
    {
      x: 46,
      y: y - 15,
      size: 10.5,
      font: fontBold,
      color: rgb(1, 1, 1),
    }
  );

  page1.drawText(
    safePdfText(
      `DEPOSITO INICIAL REQUERIDO (50 %): USD ${breakdown.deposit50.toFixed(2)}`
    ),
    {
      x: 46,
      y: y - 28,
      size: 10,
      font: fontBold,
      color: rgb(1, 0.82, 0.72),
    }
  );

  y -= 52;

  // Las 11 Etapas Exactas que Aplican al Proyecto
  page1.drawText(
    safePdfText('4. LAS 11 ETAPAS EDITORIALES GMDEI QUE APLICAN AL PROYECTO'),
    {
      x: 36,
      y,
      size: 11,
      font: fontBold,
      color: blueColor,
    }
  );
  y -= 14;

  for (const stage of EDITORIAL_STAGES_11) {
    const maxR =
      stage.id === 3 && breakdown.conditionObj.isJpgOrDigitacion
        ? 'Hasta 6 rondas (Digitacion/JPG)'
        : `Max. ${stage.maxRoundsDefault} rondas`;
    const lineText = `${String(stage.id).padStart(2, '0')}. ${stage.title} [${maxR}]`;
    page1.drawText(safePdfText(lineText), {
      x: 40,
      y,
      size: 8.5,
      font: fontBold,
      color: inkColor,
    });
    y -= 11;
    page1.drawText(safePdfText(`     ${stage.subtitle}`), {
      x: 40,
      y,
      size: 7.8,
      font: fontRegular,
      color: mutedColor,
    });
    y -= 12;
  }

  // Firma Electrónica en Pantalla
  y -= 6;
  page1.drawRectangle({
    x: 36,
    y: 28,
    width: width - 72,
    height: 92,
    color: paperBg,
    borderColor: blueColor,
    borderWidth: 1,
  });

  page1.drawText(safePdfText('5. FIRMA ELECTRONICA DE CONFORMIDAD DEL AUTOR / CLIENTE'), {
    x: 46,
    y: 104,
    size: 9.5,
    font: fontBold,
    color: blueColor,
  });

  page1.drawText(
    safePdfText(
      'Al firmar electronicamente este documento, el autor acepta las 11 etapas, el canal unico y los limites de rondas.'
    ),
    {
      x: 46,
      y: 91,
      size: 8,
      font: fontRegular,
      color: inkColor,
    }
  );

  if (payload.signatureDataUrl && payload.signatureDataUrl.startsWith('data:image/png;base64,')) {
    try {
      const base64Data = payload.signatureDataUrl.replace(/^data:image\/png;base64,/, '');
      const pngImage = await pdfDoc.embedPng(base64Data);
      page1.drawImage(pngImage, {
        x: 52,
        y: 35,
        width: 170,
        height: 50,
      });
      page1.drawText(
        safePdfText(
          `FIRMADO DIGITALMENTE POR: ${payload.clientName.toUpperCase()} (${new Date().toLocaleString('es-BO')})`
        ),
        {
          x: 240,
          y: 55,
          size: 8.5,
          font: fontBold,
          color: orangeColor,
        }
      );
      page1.drawText(
        safePdfText('LINK DE PAGO DEL 50 % INICIAL HABILITADO TRAS FIRMA'),
        {
          x: 240,
          y: 42,
          size: 8,
          font: fontBold,
          color: blueColor,
        }
      );
    } catch {
      page1.drawText(safePdfText('[Firma Electronica Registrada]'), {
        x: 52,
        y: 55,
        size: 10,
        font: fontBold,
        color: orangeColor,
      });
    }
  } else {
    page1.drawText(
      safePdfText('[PENDIENTE DE FIRMA EN PANTALLA — FIRME EN EL LIENZO PARA HABILITAR EL PAGO DEL 50 %]'),
      {
        x: 46,
        y: 55,
        size: 8.5,
        font: fontBold,
        color: orangeColor,
      }
    );
  }

  return pdfDoc.save();
}
