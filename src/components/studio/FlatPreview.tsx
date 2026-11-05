"use client";

import { useEffect, useRef, useState } from "react";
import { useStudio } from "./store";
import { drawZone } from "@/lib/design/render";
import { ZONES, UNITS_PER_INCH, type ZoneId } from "@/lib/design/zones";
import { DIMS } from "@/components/hoodie/geometry";
import { getImage, useAssetVersion } from "./zoneCanvas";
import ZoneEditor from "./ZoneEditor";

const M_PER_UNIT = 0.0254 / UNITS_PER_INCH;

/** Lightweight 2D preview (no WebGL): flat front/back garment illustration + the precision editor. */
export default function FlatPreview() {
  const { style, colorHex, layers, activeZone, setZone } = useStudio();
  const ref = useRef<HTMLCanvasElement>(null);
  const v = useAssetVersion();
  const [side, setSide] = useState<"front" | "back">("front");
  useEffect(() => setSide(activeZone === "back" ? "back" : "front"), [activeZone]);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const S = 600; // px per metre
    c.width = 900;
    c.height = 640;
    const ctx = c.getContext("2d")!;
    ctx.clearRect(0, 0, c.width, c.height);
    const d = DIMS[style];
    const cx = 450;
    const base = 600;
    const X = (x: number) => cx + x * S;
    const Y = (y: number) => base - y * S;
    const sleeveEnd = (sgn: number) => [X(sgn * (d.halfW - 0.02 + Math.sin(d.sleeveAngle) * d.sleeveLen)), Y(d.shoulderY - 0.04 - Math.cos(d.sleeveAngle) * d.sleeveLen)];
    ctx.fillStyle = colorHex;
    ctx.strokeStyle = "rgba(255,255,255,.15)";
    ctx.lineWidth = 2;
    // sleeves
    for (const sgn of [-1, 1]) {
      const [ex, ey] = sleeveEnd(sgn);
      ctx.beginPath();
      ctx.moveTo(X(sgn * (d.halfW - 0.01)), Y(d.shoulderY + 0.02));
      ctx.lineTo(ex + sgn * d.r1 * S * 0.9, ey + 10);
      ctx.lineTo(ex - sgn * d.r1 * S * 0.9, ey - 10 + d.r1 * S * 0.6);
      ctx.lineTo(X(sgn * d.halfW * 0.92), Y(d.shoulderY - 0.25));
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    // body
    ctx.beginPath();
    ctx.moveTo(X(-d.halfW), Y(0));
    ctx.lineTo(X(-d.halfW), Y(d.shoulderY - 0.02));
    ctx.quadraticCurveTo(X(-d.halfW), Y(d.shoulderY + 0.05), X(-d.neckR * 1.4), Y(d.neckY - 0.01));
    ctx.quadraticCurveTo(X(0), Y(side === "front" ? d.neckY - 0.07 : d.neckY - 0.01), X(d.neckR * 1.4), Y(d.neckY - 0.01));
    ctx.quadraticCurveTo(X(d.halfW), Y(d.shoulderY + 0.05), X(d.halfW), Y(d.shoulderY - 0.02));
    ctx.lineTo(X(d.halfW), Y(0));
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    if (side === "back") {
      ctx.beginPath();
      ctx.ellipse(X(0), Y(d.neckY - 0.08), d.neckR * 2 * S, d.neckR * 1.1 * S, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    const drawZoneAt = (zone: ZoneId, left: number, top: number) => {
      const z = ZONES[style][zone];
      const w = z.widthIn * 0.0254 * S;
      const h = z.heightIn * 0.0254 * S;
      ctx.save();
      ctx.translate(left, top);
      drawZone(ctx, layers.filter((l) => l.zone === zone), M_PER_UNIT * S, getImage);
      ctx.setLineDash([6, 5]);
      ctx.strokeStyle = zone === activeZone ? "rgba(255,107,0,.9)" : "rgba(255,255,255,.25)";
      ctx.strokeRect(0, 0, w, h);
      ctx.restore();
    };
    if (side === "front") {
      const z = ZONES[style].front;
      const w = z.widthIn * 0.0254 * S;
      drawZoneAt("front", (style === "ZIP" ? X(0.13) : cx) - w / 2, Y(d.frontTop - (style === "ZIP" ? 0.01 : 0)));
      if (style === "ZIP") {
        ctx.strokeStyle = "#bbb";
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(cx, Y(d.neckY - 0.07));
        ctx.lineTo(cx, Y(0));
        ctx.stroke();
      }
    } else {
      const z = ZONES[style].back;
      drawZoneAt("back", cx - (z.widthIn * 0.0254 * S) / 2, Y(d.backTop));
    }
    // ribbed hem
    ctx.fillStyle = "rgba(0,0,0,.18)";
    ctx.fillRect(X(-d.halfW), Y(0.065), d.halfW * 2 * S, 0.065 * S);
  }, [style, colorHex, layers, activeZone, side, v]);

  return (
    <div className="grid h-full gap-4 lg:grid-cols-[1fr_340px]">
      <div className="flex min-h-0 flex-col">
        <div className="mb-2 flex gap-2">
          {(["front", "back"] as const).map((s) => (
            <button key={s} className={`chip ${side === s ? "chip-on" : ""}`} onClick={() => { setSide(s); setZone(s); }}>{s === "front" ? "Front" : "Back"}</button>
          ))}
          <span className="ml-auto self-center text-[10px] uppercase tracking-[0.2em] text-mist">Lite preview</span>
        </div>
        <canvas ref={ref} className="min-h-0 w-full flex-1 object-contain" aria-label={`Flat ${side} preview of your hoodie`} role="img" />
      </div>
      <div className="glass hidden min-h-0 rounded-2xl p-3 pb-6 lg:block">
        <ZoneEditor />
      </div>
    </div>
  );
}
