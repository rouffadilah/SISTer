import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SISTer | Sistem Informasi Sekolah Terpadu',
  description: 'Portal layanan digital civitas SMA Islam Cikal Harapan 1.',
  applicationName: 'SISTer',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="id"><body>{children}</body></html>;
}
