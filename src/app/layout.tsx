import type { Metadata } from "next";
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
  robots: { index: true, follow: true },
};

function Header() {
  return (
    <header className="border-b border-line bg-paper/90 sticky top-0 z-40 backdrop-blur">
      <div className="container-page flex h-14 items-center justify-between">
        <Link href="/" className="font-display text-lg font-bold tracking-tight">
          <span className="bg-volt px-1.5 py-0.5 mr-0.5">Volt</span>ZW
        </Link>
        <nav className="flex items-center gap-4 text-sm font-medium sm:gap-6">
          <Link href="/" className="hover:text-volt-deep">Calculator</Link>
          <Link href="/zesa-tariffs/" className="hover:text-volt-deep">Tariffs</Link>
          <Link href="/retrieve-zesa-token/" className="hover:text-volt-deep">Retrieve token</Link>
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
            Token purchases are coming soon — calculator, tariffs and retrieval help are free, forever.
          </p>
        </div>
        <div className="text-sm">
          <p className="font-semibold text-white">Tools</p>
          <ul className="mt-3 space-y-2">
            <li><Link href="/" className="hover:text-volt">ZESA calculator</Link></li>
            <li><Link href="/zesa-tariffs/" className="hover:text-volt">Current ZESA tariffs</Link></li>
            <li><Link href="/retrieve-zesa-token/" className="hover:text-volt">Retrieve a lost token</Link></li>
          </ul>
        </div>
        <div className="text-sm">
          <p className="font-semibold text-white">About</p>
          <p className="mt-3 leading-relaxed">
            VoltZW is an independent tool and is not affiliated with ZESA Holdings or ZETDC.
            Tariff data is checked against ZERA-approved rates.
          </p>
          <p className="mt-3">
            <a href="mailto:silentics.org@gmail.com" className="underline hover:text-volt">Contact</a>
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
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
