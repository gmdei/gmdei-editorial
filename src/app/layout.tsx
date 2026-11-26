import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "gmDEI Editorial · Diagramación Profesional de Libros",
  description:
    "Del manuscrito al libro listo para imprimir. Viaje editorial en 11 etapas, cotizador con análisis automático (.docx/.pdf), contrato PDF con firma electrónica y portal privado de seguimiento.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[#F7F4EE] text-[#193847]">
        {children}
      </body>
    </html>
  );
}
