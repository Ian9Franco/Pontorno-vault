import type { Metadata } from 'next';
import './globals.css';
import { VaultProvider } from '@/context/VaultContext';

export const metadata: Metadata = {
  title: 'Family Vault — Zero-Knowledge Password Manager',
  description: 'Bóveda familiar de contraseñas con arquitectura Zero-Knowledge y Envelope Encryption.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="dark">
      <body className="bg-gray-950 text-gray-100 min-h-screen selection:bg-emerald-500/30 selection:text-emerald-300">
        <VaultProvider>{children}</VaultProvider>
      </body>
    </html>
  );
}
