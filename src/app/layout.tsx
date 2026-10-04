import { Suspense } from "react";
import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { MotionProvider } from "@/components/motion";
import { PreferencesProvider } from "@/components/preferences/preferences-provider";
import { TopProgressBar } from "@/components/ui/TopProgressBar";

export const metadata: Metadata = {
  title: {
    default: 'DSA Club — Structured DSA Learning System',
    template: '%s — DSA Club',
  },
  description: 'A structured DSA learning system that tells you what to learn, practice, and revise—based on your actual progress.',
  icons: {
    icon: [
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon.ico' },
    ],
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'DSA Club',
  },
  keywords: ["DSA", "data structures", "algorithms", "interview prep", "guided learning", "revision system", "coding practice", "spaced repetition", "learning path"],
  authors: [{ name: "DSA Club" }],
  creator: "DSA Club",
  publisher: "DSA Club",
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'),
  alternates: {
    canonical: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
  },
  openGraph: {
    title: "DSA Club — Know what to learn, practice, and revise next.",
    description: "Structured missions, pattern recognition, and spaced revision. Never ask \"what should I study?\" again.",
    type: "website",
    siteName: "DSA Club",
    url: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
    images: [
      {
        url: '/icons/dsa-club-logo-text.png',
        width: 1200,
        height: 630,
        alt: 'DSA Club',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DSA Club',
    description: 'A structured learning OS for software engineers.',
    images: ['/icons/dsa-club-logo-text.png'],
    creator: '@dsaclub',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export const viewport: Viewport = {
  themeColor: '#0B0F14',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'DSA Club',
    description: 'A structured learning OS for software engineers.',
    url: baseUrl,
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Web',
    browserRequirements: 'Requires JavaScript. Requires HTML5.',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    author: {
      '@type': 'Organization',
      name: 'DSA Club',
    },
    publisher: {
      '@type': 'Organization',
      name: 'DSA Club',
    },
  };

  return (
    <html lang="en" className="dark" data-theme="dark" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icons/dsa-club-icon.png" type="image/png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var r=document.documentElement;var s=localStorage.getItem("dsa-club-preferences-v2");var t="dark";var p=null;if(s){try{p=JSON.parse(s);}catch(e){}}if(p&&p.theme){if(p.theme==="system"){t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";}else if(p.theme==="light"){t="light";}else{t="dark";}}r.setAttribute("data-theme",t);if(t==="dark"){r.classList.add("dark");r.classList.remove("light");}else{r.classList.add("light");r.classList.remove("dark");}if(p){if(p.accentColor)r.setAttribute("data-accent",p.accentColor);if(p.interfaceDensity)r.setAttribute("data-density",p.interfaceDensity);if(p.uiScale)r.setAttribute("data-ui-scale",p.uiScale);if(p.borderRadius)r.setAttribute("data-radius",p.borderRadius);if(p.contrast)r.setAttribute("data-contrast",p.contrast);if(p.motionPreference)r.setAttribute("data-motion",p.motionPreference);}}catch(e){}})();`,
          }}
        />
      </head>
      <body suppressHydrationWarning>
        <Suspense fallback={null}>
          <TopProgressBar />
        </Suspense>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <PreferencesProvider>
            <MotionProvider>{children}</MotionProvider>
          </PreferencesProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
