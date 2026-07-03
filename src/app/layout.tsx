import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Inter } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const display = Space_Grotesk({ variable: "--font-display", subsets: ["latin"] });
const body = Inter({ variable: "--font-body", subsets: ["latin"] });

const SITE = "https://zesa.tapiwa.me";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: {
    default: "VoltZW — Free ZESA Calculator, Tariffs & Token Help for Zimbabwe",
    template: "%s · VoltZW",
  },
  description:
    "Free ZESA electricity calculator with current ZETDC stepped tariffs, token retrieval help, and smart tips to stay in the cheap bands. Built for Zimbabwe.",
  keywords: [
    "ZESA calculator", "ZESA tariffs", "ZESA token", "retrieve ZESA token",
    "ZETDC", "check ZESA balance online", "ZESA units calculator", "electricity Zimbabwe",
  ],
  openGraph: {
    type: "website",
    url: SITE,
    siteName: "VoltZW",
    title: "VoltZW — ZESA electricity, made simple",
    description: "Calculator with live tariffs, token retrieval help, and the stepped-tariff tricks that save you money.",
  },
  twitter: {
    card: "summary_large_image",
    title: "VoltZW — ZESA electricity, made simple",
    description: "Calculator with live tariffs, token retrieval help, and the stepped-tariff tricks that save you money.",
  },
  robots: { index: true, follow: true },
};

// Next.js 16: viewport options (incl. themeColor) are exported separately
// from metadata — see node_modules/next/dist/docs/.../generate-viewport.md
export const viewport: Viewport = {
  themeColor: "#16181d",
};

function Header() {
  return (
    <header className="border-b border-line bg-paper/90 sticky top-0 z-40 backdrop-blur">
      <div className="container-page flex h-14 items-center justify-between gap-3">
        <Link href="/" className="font-display text-lg font-bold tracking-tight">
          <span className="bg-volt px-1.5 py-0.5 mr-0.5">Volt</span>ZW
        </Link>
        {/* min-h-11 (44px) hit areas — WCAG 2.5.8 / mobile touch targets */}
        <nav aria-label="Primary" className="flex items-center gap-1.5 text-[13px] font-medium sm:gap-4 sm:text-sm">
          <Link href="/" className="inline-flex min-h-11 items-center px-1.5 hover:text-volt-deep sm:px-2"><span className="sm:hidden">Calc</span><span className="hidden sm:inline">Calculator</span></Link>
          <Link href="/zesa-tariffs/" className="inline-flex min-h-11 items-center px-1.5 hover:text-volt-deep sm:px-2">Tariffs</Link>
          <Link href="/retrieve-zesa-token/" className="inline-flex min-h-11 items-center px-1.5 hover:text-volt-deep sm:px-2"><span className="sm:hidden">Retrieve</span><span className="hidden sm:inline">Retrieve token</span></Link>
          <Link href="/buy/" className="inline-flex min-h-11 items-center whitespace-nowrap rounded-md bg-volt px-2.5 font-semibold text-ink transition hover:bg-volt-deep hover:text-white sm:px-3"><span className="sm:hidden">Buy</span><span className="hidden sm:inline">Buy tokens</span></Link>
        </nav>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="mt-20 border-t border-line bg-ink text-white/80">
      <div className="container-page grid gap-8 py-12 sm:grid-cols-3">
        <div>
          <p className="font-display text-lg font-bold text-white">
            <span className="bg-volt px-1.5 py-0.5 mr-0.5 text-ink">Volt</span>ZW
          </p>
          <p className="mt-3 text-sm leading-relaxed">
            The fastest, smartest way to manage prepaid electricity in Zimbabwe.
            Buy tokens with EcoCash, Zimswitch or bank in USD or ZWG — calculator, tariffs and retrieval help are free, forever.
          </p>
        </div>
        <div className="text-sm">
          <p className="font-semibold text-white">Tools</p>
          {/* 44px rows for touch targets — spacing comes from the row height */}
          <ul className="mt-1">
            <li><Link href="/buy/" className="inline-flex min-h-11 items-center hover:text-volt">Buy ZESA tokens</Link></li>
            <li><Link href="/" className="inline-flex min-h-11 items-center hover:text-volt">ZESA calculator</Link></li>
            <li><Link href="/zesa-tariffs/" className="inline-flex min-h-11 items-center hover:text-volt">Current ZESA tariffs</Link></li>
            <li><Link href="/retrieve-zesa-token/" className="inline-flex min-h-11 items-center hover:text-volt">Retrieve a lost token</Link></li>
          </ul>
        </div>
        <div className="text-sm">
          <p className="font-semibold text-white">About</p>
          <p className="mt-3 leading-relaxed">
            VoltZW is an independent tool and is not affiliated with ZESA Holdings or ZETDC.
            Tariff data is checked against ZERA-approved rates.
          </p>
          <p className="mt-1">
            <a href="mailto:silentics.org@gmail.com" className="inline-flex min-h-11 items-center underline hover:text-volt">Contact</a>
          </p>
        </div>
      </div>
      <div className="border-t border-white/10 py-4 text-center text-xs text-white/50">
        © {new Date().getFullYear()} VoltZW · Made in Zimbabwe 🇿🇼
      </div>
    </footer>
  );
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${body.variable} font-sans antialiased`}>
        {/* Keyboard users can jump past the sticky header (WCAG 2.4.1). */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-ink focus:px-4 focus:py-2.5 focus:font-display focus:text-sm focus:font-semibold focus:text-white"
        >
          Skip to content
        </a>
        <Header />
        <main id="main">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
