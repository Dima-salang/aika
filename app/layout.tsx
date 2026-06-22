import type { Metadata } from "next";
import { Share_Tech_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/app/providers";
import { RootProvider } from "fumadocs-ui/provider/next";

const shareTechMono = Share_Tech_Mono({
  weight: "400",
  variable: "--font-share-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Aika // Time Log and Task Manager",
  description: "Web-based team-oriented time logging and task management platform",
};

import { Toaster } from "sonner";
import { ConfirmDialog } from "@/components/ui-components/confirm-dialog";
import { Analytics } from "@vercel/analytics/next";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${shareTechMono.variable} h-full antialiased`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const storedTheme = localStorage.getItem('theme');
                if (storedTheme === 'dark' || (!storedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              } catch (_) {}
            `,
          }}
        />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet"/>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet"/>
      </head>
      <body className="min-h-screen flex flex-col w-full bg-background text-foreground antialiased font-sans">
        <RootProvider>
          <Providers>{children}</Providers>
        </RootProvider>
        <Toaster richColors position="top-right" />
        <ConfirmDialog />
        <Analytics />
      </body>
    </html>
  );
}
