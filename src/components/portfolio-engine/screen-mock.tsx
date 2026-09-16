"use client";

import type { CSSProperties } from "react";
import type React from "react";
import type { ProjectBrand, ScreenKind } from "@/lib/portfolio/types";

/**
 * Pantallas sintéticas. No hay capturas reales de cada producto, así que la
 * ventana dibuja una miniatura abstracta con la familia de pantalla y los
 * colores de marca del proyecto. Todo es determinista: la misma pantalla se
 * ve igual en servidor y cliente.
 */

type Props = { kind: ScreenKind; brand: ProjectBrand; seed?: number };

function tone(brand: ProjectBrand, alpha: number): string {
  // Tinta sobre la superficie con alpha, sin depender de la foto.
  const hex = brand.ink.replace("#", "");
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function seq(n: number, seed = 1): number[] {
  const out: number[] = [];
  let x = seed * 9301 + 49297;
  for (let i = 0; i < n; i++) {
    x = (x * 9301 + 49297) % 233280;
    out.push(x / 233280);
  }
  return out;
}

function delay(i: number): CSSProperties {
  return { animationDelay: `${60 + i * 45}ms` };
}

function Bar({ w, h = 6, brand, alpha = 0.16, i = 0, style }: { w: string; h?: number; brand: ProjectBrand; alpha?: number; i?: number; style?: CSSProperties }) {
  return <div className="pf-block rounded-[2px]" style={{ width: w, height: h, background: tone(brand, alpha), ...delay(i), ...style }} />;
}

function Accent({ w, h = 8, brand, i = 0, radius = 999 }: { w: string; h?: number; brand: ProjectBrand; i?: number; radius?: number }) {
  return <div className="pf-block" style={{ width: w, height: h, background: brand.primary, borderRadius: radius, ...delay(i) }} />;
}

function AreaSvg({ brand, seed = 3, height = 56 }: { brand: ProjectBrand; seed?: number; height?: number }) {
  const pts = seq(12, seed).map((v, i) => [i * (100 / 11), 100 - (18 + v * 55 + i * 2)] as const);
  const d = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x},${y}`).join(" ");
  const area = `${d} L100,100 L0,100 Z`;
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full" style={{ height }} aria-hidden>
      <path d={area} fill={brand.primary} opacity={0.14} />
      <path d={d} fill="none" stroke={brand.primary} strokeWidth={2.2} vectorEffect="non-scaling-stroke" pathLength={1} className="pf-draw" />
    </svg>
  );
}

function BarsSvg({ brand, seed = 5, height = 56, n = 9 }: { brand: ProjectBrand; seed?: number; height?: number; n?: number }) {
  const vals = seq(n, seed);
  const gap = 100 / n;
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full" style={{ height }} aria-hidden>
      {vals.map((v, i) => (
        <rect
          key={i}
          x={i * gap + gap * 0.18}
          y={100 - (25 + v * 70)}
          width={gap * 0.64}
          height={25 + v * 70}
          fill={i === n - 2 ? brand.primary : tone(brand, 0.22)}
          className="pf-grow"
          style={{ animationDelay: `${i * 50}ms` }}
        />
      ))}
    </svg>
  );
}

function Nav({ brand, dark }: { brand: ProjectBrand; dark?: boolean }) {
  return (
    <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: `1px solid ${tone(brand, 0.08)}` }}>
      <div className="flex items-center gap-2">
        <div className="h-3 w-3 rounded-sm" style={{ background: brand.primary }} />
        <Bar w="34px" h={5} brand={brand} alpha={dark ? 0.5 : 0.7} />
      </div>
      <div className="flex gap-2">
        {[0, 1, 2].map((i) => <Bar key={i} w="18px" h={4} brand={brand} alpha={0.3} i={i} />)}
        <Accent w="26px" h={8} brand={brand} i={3} />
      </div>
    </div>
  );
}

function Sidebar({ brand, active = 1 }: { brand: ProjectBrand; active?: number }) {
  return (
    <div className="flex w-[22%] flex-col gap-2 p-2.5" style={{ borderRight: `1px solid ${tone(brand, 0.08)}` }}>
      <div className="mb-1 h-3 w-3 rounded-sm" style={{ background: brand.primary }} />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="pf-block flex items-center gap-1.5 rounded-[3px] px-1.5 py-1" style={{ background: i === active ? tone(brand, 0.08) : "transparent", ...delay(i) }}>
          <div className="h-1.5 w-1.5 rounded-[2px]" style={{ background: i === active ? brand.primary : tone(brand, 0.3) }} />
          <div className="h-[4px] rounded-full" style={{ width: `${40 + (i * 13) % 35}%`, background: tone(brand, i === active ? 0.6 : 0.25) }} />
        </div>
      ))}
    </div>
  );
}

function Landing({ brand }: { brand: ProjectBrand }) {
  return (
    <div className="flex h-full flex-col">
      <Nav brand={brand} />
      <div className="flex flex-1 flex-col justify-center gap-2.5 px-5 pt-5">
        <Accent w="42px" h={4} brand={brand} i={0} />
        <Bar w="72%" h={14} brand={brand} alpha={0.85} i={1} />
        <Bar w="54%" h={14} brand={brand} alpha={0.85} i={2} />
        <Bar w="60%" h={5} brand={brand} alpha={0.3} i={3} style={{ marginTop: 4 }} />
        <Bar w="46%" h={5} brand={brand} alpha={0.3} i={4} />
        <div className="mt-2 flex gap-2">
          <Accent w="52px" h={14} brand={brand} i={5} radius={4} />
          <div className="pf-block h-[14px] w-[44px] rounded-[4px]" style={{ border: `1px solid ${tone(brand, 0.3)}`, ...delay(6) }} />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 px-5 pb-4 pt-6">
        {[0, 1, 2].map((i) => (
          <div key={i} className="pf-block rounded-[4px] p-2" style={{ background: tone(brand, 0.06), ...delay(7 + i) }}>
            <div className="mb-2 h-8 rounded-[3px]" style={{ background: `linear-gradient(135deg, ${brand.primary}55, ${brand.secondary}33)` }} />
            <div className="h-[4px] w-[70%] rounded-full" style={{ background: tone(brand, 0.5) }} />
            <div className="mt-1 h-[4px] w-[50%] rounded-full" style={{ background: tone(brand, 0.25) }} />
          </div>
        ))}
      </div>
    </div>
  );
}

function Dashboard({ brand }: { brand: ProjectBrand }) {
  return (
    <div className="flex h-full">
      <Sidebar brand={brand} />
      <div className="flex flex-1 flex-col gap-2.5 p-3">
        <div className="flex items-center justify-between">
          <Bar w="80px" h={7} brand={brand} alpha={0.8} />
          <Accent w="40px" h={10} brand={brand} i={1} />
        </div>
        <div className="grid grid-cols-4 gap-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="pf-block rounded-[4px] p-2" style={{ background: tone(brand, 0.06), ...delay(2 + i) }}>
              <div className="h-[4px] w-[60%] rounded-full" style={{ background: tone(brand, 0.3) }} />
              <div className="mt-1.5 h-[7px] w-[45%] rounded-[2px]" style={{ background: tone(brand, 0.8) }} />
            </div>
          ))}
        </div>
        <div className="grid flex-1 grid-cols-5 gap-2">
          <div className="col-span-3 rounded-[4px] p-2" style={{ background: tone(brand, 0.05) }}>
            <AreaSvg brand={brand} seed={7} height={64} />
          </div>
          <div className="col-span-2 rounded-[4px] p-2" style={{ background: tone(brand, 0.05) }}>
            <BarsSvg brand={brand} seed={2} height={64} n={7} />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="pf-block flex items-center gap-2" style={delay(8 + i)}>
              <div className="h-[4px] w-[35%] rounded-full" style={{ background: tone(brand, 0.35) }} />
              <div className="h-[4px] w-[20%] rounded-full" style={{ background: tone(brand, 0.2) }} />
              <div className="ml-auto h-[6px] w-[24px] rounded-full" style={{ background: i === 1 ? brand.secondary : brand.primary, opacity: 0.8 }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Table({ brand }: { brand: ProjectBrand }) {
  const rows = seq(8, 11);
  return (
    <div className="flex h-full">
      <Sidebar brand={brand} active={2} />
      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="flex items-center justify-between">
          <Bar w="70px" h={7} brand={brand} alpha={0.8} />
          <div className="flex gap-1.5">
            <div className="h-[10px] w-[60px] rounded-[3px]" style={{ border: `1px solid ${tone(brand, 0.2)}` }} />
            <Accent w="34px" h={10} brand={brand} radius={3} />
          </div>
        </div>
        <div className="flex gap-2 px-1 py-1" style={{ borderBottom: `1px solid ${tone(brand, 0.12)}` }}>
          {[28, 20, 16, 14].map((w, i) => <div key={i} className="h-[4px] rounded-full" style={{ width: `${w}%`, background: tone(brand, 0.3) }} />)}
        </div>
        {rows.map((v, i) => (
          <div key={i} className="pf-block flex items-center gap-2 px-1" style={delay(i)}>
            <div className="h-2.5 w-2.5 rounded-full" style={{ background: `linear-gradient(135deg, ${brand.primary}, ${brand.secondary})` }} />
            <div className="h-[4px] rounded-full" style={{ width: `${20 + v * 14}%`, background: tone(brand, 0.55) }} />
            <div className="h-[4px] w-[16%] rounded-full" style={{ background: tone(brand, 0.22) }} />
            <div className="ml-auto h-[8px] w-[26px] rounded-full" style={{ background: v > 0.6 ? `${brand.primary}33` : tone(brand, 0.08), border: `1px solid ${v > 0.6 ? brand.primary : tone(brand, 0.2)}` }} />
          </div>
        ))}
      </div>
    </div>
  );
}

function Store({ brand }: { brand: ProjectBrand }) {
  const vals = seq(6, 13);
  return (
    <div className="flex h-full flex-col">
      <Nav brand={brand} />
      <div className="flex items-center gap-2 px-4 py-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="pf-block h-[10px] rounded-full px-2" style={{ width: 26 + i * 8, background: i === 0 ? brand.primary : tone(brand, 0.08), ...delay(i) }} />
        ))}
        <div className="ml-auto h-[4px] w-[40px] rounded-full" style={{ background: tone(brand, 0.25) }} />
      </div>
      <div className="grid flex-1 grid-cols-3 gap-2.5 px-4 pb-3">
        {vals.map((v, i) => (
          <div key={i} className="pf-block flex flex-col gap-1.5" style={delay(4 + i)}>
            <div className="flex-1 rounded-[4px]" style={{ minHeight: 34, background: `linear-gradient(${120 + i * 40}deg, ${brand.primary}${i % 2 ? "66" : "33"}, ${brand.secondary}44)` }} />
            <div className="h-[4px] rounded-full" style={{ width: `${55 + v * 35}%`, background: tone(brand, 0.6) }} />
            <div className="flex items-center justify-between">
              <div className="h-[5px] w-[28%] rounded-[2px]" style={{ background: tone(brand, 0.85) }} />
              <div className="h-[8px] w-[8px] rounded-full" style={{ background: brand.primary }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Checkout({ brand }: { brand: ProjectBrand }) {
  return (
    <div className="flex h-full flex-col">
      <Nav brand={brand} />
      <div className="grid flex-1 grid-cols-5 gap-4 p-4">
        <div className="col-span-3 flex flex-col gap-2">
          <Bar w="50%" h={7} brand={brand} alpha={0.8} />
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="pf-block flex flex-col gap-1" style={delay(i)}>
              <div className="h-[3px] w-[28%] rounded-full" style={{ background: tone(brand, 0.3) }} />
              <div className="h-[12px] rounded-[3px]" style={{ border: `1px solid ${tone(brand, i === 1 ? 0.5 : 0.18)}`, background: tone(brand, 0.03) }} />
            </div>
          ))}
          <div className="mt-1 flex gap-2">
            {[0, 1, 2].map((i) => <div key={i} className="pf-block h-[14px] w-[36px] rounded-[3px]" style={{ background: i === 0 ? `${brand.primary}33` : tone(brand, 0.06), border: `1px solid ${i === 0 ? brand.primary : tone(brand, 0.14)}`, ...delay(5 + i) }} />)}
          </div>
        </div>
        <div className="col-span-2 flex flex-col gap-2 rounded-[5px] p-3" style={{ background: tone(brand, 0.05) }}>
          <Bar w="60%" h={5} brand={brand} alpha={0.5} />
          {[0, 1].map((i) => (
            <div key={i} className="pf-block flex items-center gap-2" style={delay(2 + i)}>
              <div className="h-6 w-6 rounded-[3px]" style={{ background: `linear-gradient(135deg, ${brand.primary}66, ${brand.secondary}55)` }} />
              <div className="flex-1">
                <div className="h-[4px] w-[70%] rounded-full" style={{ background: tone(brand, 0.5) }} />
                <div className="mt-1 h-[4px] w-[30%] rounded-full" style={{ background: tone(brand, 0.25) }} />
              </div>
            </div>
          ))}
          <div className="mt-auto flex items-center justify-between pt-2" style={{ borderTop: `1px solid ${tone(brand, 0.12)}` }}>
            <div className="h-[4px] w-[30%] rounded-full" style={{ background: tone(brand, 0.35) }} />
            <div className="h-[7px] w-[36px] rounded-[2px]" style={{ background: tone(brand, 0.85) }} />
          </div>
          <Accent w="100%" h={16} brand={brand} i={8} radius={4} />
        </div>
      </div>
    </div>
  );
}

function Calendar({ brand }: { brand: ProjectBrand }) {
  const cells = seq(35, 17);
  return (
    <div className="flex h-full">
      <Sidebar brand={brand} active={3} />
      <div className="flex flex-1 flex-col p-3">
        <div className="mb-2 flex items-center justify-between">
          <Bar w="64px" h={7} brand={brand} alpha={0.8} />
          <div className="flex gap-1">{[0, 1].map((i) => <div key={i} className="h-[10px] w-[10px] rounded-[2px]" style={{ background: tone(brand, 0.12) }} />)}</div>
        </div>
        <div className="grid flex-1 grid-cols-7 gap-[3px]">
          {cells.map((v, i) => (
            <div key={i} className="pf-block relative rounded-[2px]" style={{ background: tone(brand, 0.04), border: `1px solid ${tone(brand, 0.06)}`, animationDelay: `${i * 12}ms` }}>
              {v > 0.68 ? <div className="absolute inset-x-[2px] top-[6px] h-[4px] rounded-full" style={{ background: v > 0.85 ? brand.secondary : brand.primary }} /> : null}
              {v > 0.9 ? <div className="absolute inset-x-[2px] top-[12px] h-[4px] rounded-full" style={{ background: tone(brand, 0.3) }} /> : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MapScreen({ brand }: { brand: ProjectBrand }) {
  const pins = seq(7, 23);
  return (
    <div className="flex h-full">
      <Sidebar brand={brand} active={4} />
      <div className="relative flex-1 overflow-hidden" style={{ background: tone(brand, 0.04) }}>
        <svg viewBox="0 0 200 120" className="absolute inset-0 h-full w-full" aria-hidden>
          <defs>
            <pattern id="pf-grid" width="12" height="12" patternUnits="userSpaceOnUse">
              <path d="M12 0H0V12" fill="none" stroke={tone(brand, 0.06)} strokeWidth="0.6" />
            </pattern>
          </defs>
          <rect width="200" height="120" fill="url(#pf-grid)" />
          {["M-5 70 C 40 60, 60 95, 110 80 S 170 40, 210 55", "M20 -5 C 30 40, 90 30, 100 70 S 150 130, 160 125", "M-5 30 L 80 20 L 130 45 L 205 35"].map((d, i) => (
            <path key={i} d={d} fill="none" stroke={tone(brand, 0.25)} strokeWidth={i === 0 ? 2.4 : 1.2} pathLength={1} className="pf-draw" style={{ animationDelay: `${i * 200}ms` }} />
          ))}
          {pins.map((v, i) => {
            const x = 15 + ((i * 37 + v * 40) % 175);
            const y = 12 + ((i * 23 + v * 60) % 95);
            return (
              <g key={i} className="pf-block" style={{ animationDelay: `${300 + i * 80}ms` }}>
                <circle cx={x} cy={y} r={6} fill={brand.primary} opacity={0.18} />
                <circle cx={x} cy={y} r={2.4} fill={i === 2 ? brand.secondary : brand.primary} />
              </g>
            );
          })}
        </svg>
        <div className="absolute bottom-2 left-2 right-2 flex gap-2">
          {[0, 1].map((i) => (
            <div key={i} className="pf-block flex-1 rounded-[4px] p-1.5" style={{ background: brand.surface, border: `1px solid ${tone(brand, 0.12)}`, ...delay(9 + i) }}>
              <div className="h-[4px] w-[60%] rounded-full" style={{ background: tone(brand, 0.5) }} />
              <div className="mt-1 h-[6px] w-[30%] rounded-[2px]" style={{ background: brand.primary }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Chat({ brand }: { brand: ProjectBrand }) {
  const widths = [58, 42, 66, 38, 50, 44];
  return (
    <div className="flex h-full flex-col">
      <Nav brand={brand} />
      <div className="flex flex-1 flex-col justify-end gap-2 px-5 pb-3 pt-3">
        {widths.map((w, i) => {
          const mine = i % 2 === 1;
          return (
            <div key={i} className={`pf-block flex ${mine ? "justify-end" : ""}`} style={delay(i)}>
              <div className="rounded-[7px] px-2.5 py-1.5" style={{ width: `${w}%`, background: mine ? brand.primary : tone(brand, 0.08), borderBottomRightRadius: mine ? 2 : 7, borderBottomLeftRadius: mine ? 7 : 2 }}>
                <div className="h-[4px] w-[85%] rounded-full" style={{ background: mine ? "rgba(255,255,255,0.75)" : tone(brand, 0.5) }} />
                {i % 3 === 0 ? <div className="mt-1 h-[4px] w-[55%] rounded-full" style={{ background: mine ? "rgba(255,255,255,0.55)" : tone(brand, 0.3) }} /> : null}
              </div>
            </div>
          );
        })}
        <div className="pf-block flex gap-1 px-2" style={delay(7)}>
          {[0, 1, 2].map((i) => <div key={i} className="h-1.5 w-1.5 rounded-full" style={{ background: tone(brand, 0.4) }} />)}
        </div>
        <div className="mt-1 flex items-center gap-2 rounded-full px-3 py-1.5" style={{ border: `1px solid ${tone(brand, 0.18)}` }}>
          <div className="h-[4px] flex-1 rounded-full" style={{ background: tone(brand, 0.15) }} />
          <div className="h-3 w-3 rounded-full" style={{ background: brand.primary }} />
        </div>
      </div>
    </div>
  );
}

function Game({ brand }: { brand: ProjectBrand }) {
  return (
    <div className="relative h-full overflow-hidden" style={{ background: `radial-gradient(ellipse at 50% 120%, ${brand.primary}33, transparent 60%), ${brand.surface}` }}>
      <div className="absolute left-3 top-2 flex items-center gap-2">
        <div className="h-[6px] w-[26px] rounded-[2px]" style={{ background: brand.primary }} />
        <div className="h-[4px] w-[30px] rounded-full" style={{ background: tone(brand, 0.4) }} />
      </div>
      <div className="absolute right-3 top-2 flex gap-1">
        {[0, 1, 2].map((i) => <div key={i} className="pf-block h-2 w-2 rounded-full" style={{ background: i < 2 ? brand.secondary : tone(brand, 0.2), ...delay(i) }} />)}
      </div>
      <svg viewBox="0 0 200 110" className="absolute inset-0 h-full w-full" aria-hidden>
        <path d="M0 110 L60 58 L140 58 L200 110 Z" fill={tone(brand, 0.05)} />
        <path d="M60 58 L140 58" stroke={tone(brand, 0.3)} strokeWidth="1" />
        <rect x="70" y="30" width="60" height="28" fill="none" stroke={tone(brand, 0.7)} strokeWidth="1.6" pathLength={1} className="pf-draw" />
        {[0, 1, 2].map((r) => [0, 1, 2].map((c) => (
          <rect key={`${r}${c}`} x={71 + c * 19.5} y={31 + r * 9} width="19" height="8.5" fill={r === 0 && c === 2 ? `${brand.primary}88` : "transparent"} stroke={tone(brand, 0.12)} strokeWidth="0.4" />
        )))}
        <circle cx="100" cy="88" r="7" fill={brand.secondary} className="pf-block" style={{ animationDelay: "300ms" }} />
        <circle cx="100" cy="88" r="9.5" fill="none" stroke={brand.secondary} strokeWidth="0.8" opacity="0.5" />
      </svg>
      <div className="absolute bottom-2 left-3 right-3 flex justify-between">
        <div className="h-[6px] w-[40%] rounded-full" style={{ background: tone(brand, 0.12) }}>
          <div className="pf-grow h-full w-[65%] rounded-full" style={{ background: brand.primary, transformOrigin: "left", transform: undefined }} />
        </div>
        <div className="h-[6px] w-[22px] rounded-[2px]" style={{ background: tone(brand, 0.6) }} />
      </div>
    </div>
  );
}

function Sheet({ brand }: { brand: ProjectBrand }) {
  const rows = 8;
  const cols = 7;
  const vals = seq(rows * cols, 29);
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-3 py-1.5" style={{ background: tone(brand, 0.04), borderBottom: `1px solid ${tone(brand, 0.1)}` }}>
        <div className="h-3 w-3 rounded-[2px]" style={{ background: "#188038" }} />
        <div className="h-[4px] w-[70px] rounded-full" style={{ background: tone(brand, 0.5) }} />
        <div className="ml-auto flex gap-1">{[0, 1, 2, 3, 4].map((i) => <div key={i} className="h-[4px] w-[14px] rounded-full" style={{ background: tone(brand, 0.2) }} />)}</div>
      </div>
      <div className="flex items-center gap-1 px-3 py-1" style={{ borderBottom: `1px solid ${tone(brand, 0.1)}` }}>
        <div className="h-[8px] w-[22px] rounded-[2px]" style={{ border: `1px solid ${tone(brand, 0.2)}` }} />
        <div className="h-[8px] flex-1 rounded-[2px]" style={{ border: `1px solid ${tone(brand, 0.12)}` }} />
      </div>
      <div className="grid flex-1" style={{ gridTemplateColumns: `18px repeat(${cols}, 1fr)`, gridTemplateRows: `12px repeat(${rows}, 1fr)` }}>
        {Array.from({ length: (rows + 1) * (cols + 1) }).map((_, idx) => {
          const r = Math.floor(idx / (cols + 1));
          const c = idx % (cols + 1);
          const header = r === 0 || c === 0;
          const v = vals[(r * cols + c) % vals.length];
          const selected = r === 3 && c === 3;
          return (
            <div key={idx} className={header ? "" : "pf-block"} style={{ border: `1px solid ${tone(brand, 0.08)}`, background: header ? tone(brand, 0.05) : selected ? `${brand.primary}22` : "transparent", outline: selected ? `1.5px solid ${brand.primary}` : "none", outlineOffset: -1, display: "flex", alignItems: "center", padding: "0 3px", animationDelay: `${idx * 6}ms` }}>
              {!header && c < 5 ? <div className="h-[3px] rounded-full" style={{ width: `${30 + v * 55}%`, background: tone(brand, c === 4 ? 0.55 : 0.3) }} /> : null}
              {!header && c >= 5 ? <div className="ml-auto h-[3px] rounded-full" style={{ width: `${25 + v * 40}%`, background: c === 6 && v > 0.5 ? brand.primary : tone(brand, 0.45) }} /> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Terminal({ brand }: { brand: ProjectBrand }) {
  const lines = [
    [18, 0.9, true], [44, 0.35, false], [60, 0.35, false], [30, 0.35, false], [22, 0.9, true], [52, 0.35, false], [36, 0.6, false], [14, 0.9, true],
  ] as const;
  return (
    <div className="flex h-full flex-col gap-1.5 p-3" style={{ background: "#07090c" }}>
      <div className="mb-1 flex gap-1.5">
        {["#ff5f57", "#febc2e", "#28c840"].map((c) => <div key={c} className="h-2 w-2 rounded-full" style={{ background: c }} />)}
      </div>
      {lines.map(([w, a, prompt], i) => (
        <div key={i} className="pf-block flex items-center gap-1.5" style={delay(i)}>
          {prompt ? <div className="h-[5px] w-[6px] rounded-[1px]" style={{ background: brand.primary }} /> : <div className="w-[6px]" />}
          <div className="h-[5px] rounded-[1px]" style={{ width: `${w}%`, background: prompt ? `rgba(242,243,245,${a})` : `${brand.secondary}${Math.round(a * 255).toString(16).padStart(2, "0")}` }} />
        </div>
      ))}
      <div className="pf-block flex items-center gap-1.5" style={delay(9)}>
        <div className="h-[5px] w-[6px] rounded-[1px]" style={{ background: brand.primary }} />
        <div className="h-[9px] w-[5px] animate-pulse" style={{ background: brand.primary }} />
      </div>
    </div>
  );
}

function Docs({ brand }: { brand: ProjectBrand }) {
  const paras = seq(9, 31);
  return (
    <div className="flex h-full">
      <div className="flex w-[26%] flex-col gap-1.5 p-3" style={{ borderRight: `1px solid ${tone(brand, 0.08)}` }}>
        <div className="mb-1 h-[6px] w-[60%] rounded-full" style={{ background: tone(brand, 0.7) }} />
        {[0, 1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="pf-block h-[4px] rounded-full" style={{ width: `${45 + ((i * 17) % 40)}%`, marginLeft: i % 3 === 0 ? 0 : 6, background: i === 2 ? brand.primary : tone(brand, 0.25), ...delay(i) }} />)}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <Bar w="55%" h={10} brand={brand} alpha={0.85} />
        {paras.map((v, i) => <Bar key={i} w={`${i % 4 === 3 ? 45 + v * 20 : 80 + v * 18}%`} h={4} brand={brand} alpha={0.28} i={i + 1} />)}
        <div className="mt-1 rounded-[4px] p-2" style={{ background: tone(brand, 0.05), borderLeft: `2px solid ${brand.primary}` }}>
          <div className="h-[4px] w-[70%] rounded-full" style={{ background: tone(brand, 0.4) }} />
        </div>
      </div>
    </div>
  );
}

function Login({ brand }: { brand: ProjectBrand }) {
  return (
    <div className="flex h-full items-center justify-center" style={{ background: `radial-gradient(circle at 50% 0%, ${brand.primary}22, transparent 60%)` }}>
      <div className="flex w-[46%] flex-col gap-2 rounded-[6px] p-4" style={{ background: tone(brand, 0.05), border: `1px solid ${tone(brand, 0.12)}` }}>
        <div className="mx-auto mb-1 h-4 w-4 rounded-[3px]" style={{ background: brand.primary }} />
        <Bar w="60%" h={6} brand={brand} alpha={0.8} style={{ alignSelf: "center" }} />
        {[0, 1].map((i) => <div key={i} className="pf-block h-[12px] rounded-[3px]" style={{ border: `1px solid ${tone(brand, i === 0 ? 0.45 : 0.18)}`, ...delay(1 + i) }} />)}
        <Accent w="100%" h={14} brand={brand} i={3} radius={3} />
        <Bar w="45%" h={3} brand={brand} alpha={0.3} i={4} style={{ alignSelf: "center" }} />
      </div>
    </div>
  );
}

function Form({ brand }: { brand: ProjectBrand }) {
  return (
    <div className="flex h-full flex-col">
      <Nav brand={brand} />
      <div className="mx-auto flex w-[64%] flex-1 flex-col gap-2.5 py-4">
        <div className="flex items-center gap-1.5">
          {[0, 1, 2, 3].map((i) => <div key={i} className="pf-block h-[3px] flex-1 rounded-full" style={{ background: i < 2 ? brand.primary : tone(brand, 0.15), ...delay(i) }} />)}
        </div>
        <Bar w="60%" h={8} brand={brand} alpha={0.85} />
        <div className="grid grid-cols-2 gap-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className={`pf-block flex flex-col gap-1 ${i === 4 ? "col-span-2" : ""}`} style={delay(4 + i)}>
              <div className="h-[3px] w-[40%] rounded-full" style={{ background: tone(brand, 0.3) }} />
              <div className="h-[12px] rounded-[3px]" style={{ border: `1px solid ${tone(brand, i === 0 ? 0.5 : 0.18)}` }} />
            </div>
          ))}
        </div>
        <div className="mt-auto flex justify-end gap-2">
          <div className="pf-block h-[14px] w-[40px] rounded-[3px]" style={{ border: `1px solid ${tone(brand, 0.25)}`, ...delay(9) }} />
          <Accent w="64px" h={14} brand={brand} i={10} radius={3} />
        </div>
      </div>
    </div>
  );
}

const SCREENS: Record<ScreenKind, (p: { brand: ProjectBrand }) => React.ReactElement> = {
  landing: Landing,
  dashboard: Dashboard,
  table: Table,
  store: Store,
  checkout: Checkout,
  calendar: Calendar,
  map: MapScreen,
  chat: Chat,
  game: Game,
  sheet: Sheet,
  terminal: Terminal,
  docs: Docs,
  login: Login,
  form: Form,
};

export function ScreenMock({ kind, brand }: Props) {
  const Screen = SCREENS[kind] ?? Landing;
  return (
    <div className="h-full w-full overflow-hidden" style={{ background: brand.surface, color: brand.ink }} aria-hidden>
      <Screen brand={brand} />
    </div>
  );
}
