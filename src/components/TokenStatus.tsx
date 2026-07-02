"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

const API = "https://voltzw-vend.appwrite.network";

type StatusResp = {
  ok: boolean;
  status?: "pending" | "processing" | "delivered" | "vend_failed" | "cancelled";
  token?: string;
  units?: number;
  meter?: string;
  error?: string;
};

function formatToken(t: string) {
  const digits = t.replace(/\D/g, "");
  return digits.replace(/(\d{4})(?=\d)/g, "$1 ").trim() || t;
}

export default function TokenStatus() {
  const [state, setState] = useState<StatusResp | null>(null);
  const [noRef, setNoRef] = useState(false);
  const [copied, setCopied] = useState(false);
  const tries = useRef(0);

  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get("ref");
    let stop = false;
    if (!ref) {
      const t = setTimeout(() => setNoRef(true), 0);
      return () => clearTimeout(t);
    }

    async function poll() {
      if (stop) return;
      tries.current += 1;
      try {
        const res = await fetch(`${API}/status?ref=${encodeURIComponent(ref!)}`);
        const data = (await res.json()) as StatusResp;
        setState(data);
        if (data.status === "delivered" || data.status === "vend_failed" || data.status === "cancelled") return;
      } catch { /* retry */ }
      if (tries.current < 60) setTimeout(poll, 5000);
    }
    poll();
    return () => { stop = true; };
  }, []);

  async function copy() {
    if (!state?.token) return;
    try {
      await navigator.clipboard.writeText(state.token.replace(/\D/g, ""));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  }

  if (noRef) {
    return (
      <div className="rounded-xl border border-line bg-card p-8 text-center">
        <p className="font-display text-lg font-semibold">No purchase reference found</p>
        <p className="mt-2 text-sm text-dim">
          Start a purchase from the <Link href="/buy/" className="text-volt-deep underline">buy page</Link>.
        </p>
      </div>
    );
  }

  const status = state?.status;

  if (status === "delivered" && state?.token) {
    return (
      <div className="animate-rise rounded-xl border border-volt/50 bg-card p-8 text-center shadow-sm">
        <p className="text-sm font-medium uppercase tracking-wider text-volt-deep">Token delivered ⚡</p>
        <p className="mt-4 select-all break-all font-mono text-2xl font-bold tracking-wider sm:text-3xl">
          {formatToken(state.token)}
        </p>
        {typeof state.units === "number" && state.units > 0 && (
          <p className="mt-3 text-sm text-dim">
            {state.units.toFixed(1)} kWh for meter <span className="font-mono">{state.meter}</span>
          </p>
        )}
        <button
          onClick={copy}
          className="mt-6 rounded-lg bg-ink px-6 py-2.5 font-display font-semibold text-white transition hover:bg-ink/85"
        >
          {copied ? "Copied ✓" : "Copy token"}
        </button>
        <p className="mt-4 text-xs text-dim">
          We also sent it by SMS. Enter the 20 digits on your meter keypad.
        </p>
      </div>
    );
  }

  if (status === "vend_failed") {
    return (
      <div className="rounded-xl border border-red-200 bg-card p-8 text-center">
        <p className="font-display text-lg font-semibold">Payment received — token delayed</p>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-dim">
          Your payment went through but ZETDC&apos;s vending platform didn&apos;t issue the token
          immediately. This usually resolves within minutes — we&apos;re on it and you&apos;ll get the
          token by SMS. Nothing else to do, and your money is safe.
        </p>
      </div>
    );
  }

  if (status === "cancelled") {
    return (
      <div className="rounded-xl border border-line bg-card p-8 text-center">
        <p className="font-display text-lg font-semibold">Payment cancelled</p>
        <p className="mt-2 text-sm text-dim">
          No money moved. <Link href="/buy/" className="text-volt-deep underline">Try again</Link> whenever you&apos;re ready.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-line bg-card p-8 text-center">
      <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-line border-t-volt" />
      <p className="mt-4 font-display text-lg font-semibold">
        {status === "processing" ? "Generating your token…" : "Waiting for payment confirmation…"}
      </p>
      <p className="mt-2 text-sm text-dim">
        This page updates automatically — hang tight, it usually takes under a minute.
      </p>
    </div>
  );
}
