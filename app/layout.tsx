import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'inkcal',
  description: 'E-Ink desk calendar backend',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
