"use client";

/**
 * The stepped tariff as a real 3D object: six bars, one per band, heights to
 * scale from tariffs.json — so the daily tariff sync literally reshapes it.
 * Pure CSS 3D (no WebGL, no canvas): a preserve-3d scene the visitor can tilt
 * with a finger or pointer. Costs a few KB and nothing at idle beyond one
 * slow keyframe animation, which prefers-reduced-motion turns off.
 */
import { useCallback, useRef } from "react";
import { BANDS, bandColor, fmt } from "@/lib/tariff";

const W = 46;      // bar footprint, px
const D = 46;
const GAP = 8;
const H_MIN = 34;  // entry band height
const H_MAX = 148; // top band height

export default function TariffStaircase() {
  const scene = useRef<HTMLDivElement>(null);

  const tilt = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const el = scene.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = e.currentTarget.getBoundingClientRect();
    const dx = (e.clientX - r.left) / r.width - 0.5;   // -0.5 … 0.5
    const dy = (e.clientY - r.top) / r.height - 0.5;
    el.style.setProperty("--rx", `${62 - dy * 14}deg`);
    el.style.setProperty("--rz", `${-45 + dx * 22}deg`);
  }, []);

  const reset = useCallback(() => {
    const el = scene.current;
    if (!el) return;
    el.style.removeProperty("--rx");
    el.style.removeProperty("--rz");
  }, []);

  const max = BANDS[BANDS.length - 1].inclLevyZwg;
  const min = BANDS[0].inclLevyZwg;
  const height = (v: number) => H_MIN + ((v - min) / (max - min)) * (H_MAX - H_MIN);

  return (
    <div className="stairs-wrap" onPointerMove={tilt} onPointerLeave={reset} aria-hidden>
      <div ref={scene} className="stairs-scene">
        {BANDS.map((b, i) => {
          const h = height(b.inclLevyZwg);
          const c = bandColor(i);
          return (
            <div
              key={b.label}
              className="stairs-bar"
              style={{ transform: `translateX(${i * (W + GAP)}px)`, ["--h" as string]: `${h}px` }}
              title={`${b.label}: ZWG ${fmt(b.inclLevyZwg, 4)}/unit`}
            >
              <div className="stairs-face stairs-top" style={{ width: W, height: D, background: `color-mix(in srgb, ${c} 88%, white)` }} />
              <div className="stairs-face stairs-south" style={{ width: W, background: `color-mix(in srgb, ${c} 78%, black)` }} />
              <div className="stairs-face stairs-east" style={{ width: D, background: `color-mix(in srgb, ${c} 55%, black)` }} />
            </div>
          );
        })}
      </div>
      <p className="stairs-caption">
        The stepped tariff, to scale — ZWG {fmt(min, 2)} to {fmt(max, 2)} per unit
      </p>
    </div>
  );
}
