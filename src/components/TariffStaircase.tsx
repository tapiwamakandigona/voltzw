"use client";

/**
 * The stepped tariff as a live 3D visualization INSIDE the result card:
 * six bars (heights = the real per-band rates from tariffs.json), and the
 * bands your purchase actually reaches light up while the rest stay ghosted.
 * Type a different amount and you watch your money climb the price staircase.
 * Pure CSS 3D — no WebGL, nothing at idle, tilt gated by reduced-motion.
 */
import { useCallback, useRef } from "react";
import { BANDS, bandColor, fmt, type BandSlice } from "@/lib/tariff";

const W = 40;      // bar footprint, px
const GAP = 7;
const H_MIN = 26;
const H_MAX = 104;

export default function TariffStaircase({ slices }: { slices: BandSlice[] }) {
  const scene = useRef<HTMLDivElement>(null);

  const tilt = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const el = scene.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = e.currentTarget.getBoundingClientRect();
    const dx = (e.clientX - r.left) / r.width - 0.5;
    const dy = (e.clientY - r.top) / r.height - 0.5;
    el.style.setProperty("--rx", `${62 - dy * 12}deg`);
    el.style.setProperty("--rz", `${-45 + dx * 20}deg`);
  }, []);

  const reset = useCallback(() => {
    const el = scene.current;
    if (el) { el.style.removeProperty("--rx"); el.style.removeProperty("--rz"); }
  }, []);

  const max = BANDS[BANDS.length - 1].inclLevyZwg;
  const min = BANDS[0].inclLevyZwg;
  const height = (v: number) => H_MIN + ((v - min) / (max - min)) * (H_MAX - H_MIN);

  // How much of each band this purchase uses (0..1); partial fill on the
  // last band reached, so the climb reads precisely.
  const fillFor = (band: (typeof BANDS)[number]) => {
    const slice = slices.find((s) => s.band.label === band.label);
    if (!slice) return 0;
    const cap = band.to === null ? slice.units : band.to - band.from;
    return Math.min(1, slice.units / Math.max(cap, 0.0001));
  };

  const reached = slices.length;

  return (
    <div className="stairs-wrap" onPointerMove={tilt} onPointerLeave={reset} aria-hidden>
      <div ref={scene} className="stairs-scene">
        {BANDS.map((b, i) => {
          const h = height(b.inclLevyZwg);
          const c = bandColor(i);
          const fill = fillFor(b);
          const on = fill > 0;
          return (
            <div
              key={b.label}
              className={`stairs-bar${on ? " stairs-on" : ""}`}
              style={{ transform: `translateX(${i * (W + GAP)}px)`, ["--h" as string]: `${h}px` }}
              title={`${b.label}: ZWG ${fmt(b.inclLevyZwg, 4)}/unit`}
            >
              <div className="stairs-face stairs-top" style={{ width: W, height: W, background: on ? `color-mix(in srgb, ${c} 88%, white)` : undefined }} />
              <div className="stairs-face stairs-south" style={{ width: W, background: on ? `color-mix(in srgb, ${c} 78%, black)` : undefined }} />
              <div className="stairs-face stairs-east" style={{ width: W, background: on ? `color-mix(in srgb, ${c} 55%, black)` : undefined }} />
            </div>
          );
        })}
      </div>
      <p className="stairs-caption">
        {reached > 0
          ? `Your purchase climbs ${reached} of 6 price bands`
          : "The 6 price bands, to scale"}
      </p>
    </div>
  );
}
