import type { Metadata } from 'next';
import './globals.css';
import { VaultProvider } from '@/context/VaultContext';

// A nonce-based CSP requires request-time rendering so framework scripts receive
// the per-request nonce generated in proxy.ts.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Pontorno Vault — Gestor Familiar de Contraseñas',
  description: 'Bóveda familiar privada y compartida para contraseñas, servicios y códigos de acceso.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="dark">
      <body className="bg-[#0b0f19] text-slate-100 min-h-screen selection:bg-indigo-500/25 selection:text-indigo-200 antialiased font-sans">
        <VaultProvider>{children}</VaultProvider>
      </body>
    </html>
  );
}
