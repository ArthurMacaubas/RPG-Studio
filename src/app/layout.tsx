import type { Metadata } from 'next';
import '@/styles/globals.css';
import { ToastProvider } from '@/components/ui/ToastProvider';
import { CommandPalette } from '@/components/ui/CommandPalette';

export const metadata: Metadata = {
  title: 'RPG Campaign Studio',
  description: 'Criação, organização e execução de campanhas de RPG.',
  icons: { icon: '/icon.svg' }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" data-theme="dark">
      <body><ToastProvider>{children}<CommandPalette /></ToastProvider></body>
    </html>
  );
}
