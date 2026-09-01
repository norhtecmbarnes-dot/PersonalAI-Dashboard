import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { TopNav } from '@/components/TopNav';
import { ModelProvider } from '@/lib/context/ModelContext';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'Proposal Genie',
  description: 'Your private government contracting strategist — capture management, proposal writing, and compliance.',
  authors: [{ name: 'Proposal Genie' }],
  keywords: ['proposals', 'government contracting', 'RFP', 'capture management', 'compliance'],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="bg-slate-900" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans`}>
        <ModelProvider>
          <TopNav />
          {children}
        </ModelProvider>
      </body>
    </html>
  );
}
