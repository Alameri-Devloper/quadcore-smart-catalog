import type { Metadata } from "next";
import "./globals.css";
import { RecoveryFlowProvider } from "@/domains/identity/presentation/recovery-flow-context";

export const metadata: Metadata = {
  title: "QSC Platform",
  description: "Quadcore Smart Catalog workspace",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className="h-full antialiased">
      <body className="min-h-full flex flex-col"><RecoveryFlowProvider>{children}</RecoveryFlowProvider></body>
    </html>
  );
}
