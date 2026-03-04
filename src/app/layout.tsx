import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { TopNav } from "@/components/TopNav";

const inter = Inter({ 
  subsets: ["latin"],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: "AI Research Assistant",
  description: "Your intelligent companion for research and analysis",
  authors: [{ name: "AI Research Team" }],
  keywords: ["AI", "chatbot", "research"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="bg-slate-900">
      <body className={`${inter.variable} font-sans`}>
        <TopNav />
        {children}
      </body>
    </html>
  );
}