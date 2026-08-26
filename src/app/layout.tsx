import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import { VaultProvider } from '@/context/VaultContext';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
});

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
    <html lang="es" className={`dark ${jakarta.variable}`}>
      <body className="bg-[#0b0f19] text-slate-100 min-h-screen selection:bg-indigo-500/25 selection:text-indigo-200 antialiased font-sans">
        <VaultProvider>{children}</VaultProvider>
      </body>
    </html>
  );
}
