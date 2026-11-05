"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useStudio } from "./store";
import { drawZone } from "@/lib/design/render";
import { hitTest } from "@/lib/design/geometry";
import { ZONES, zoneUnits, UNITS_PER_INCH } from "@/lib/design/zones";
import type { Layer } from "@/lib/design/schema";
import { getImage, useAssetVersion } from "./zoneCanvas";

type Drag =
  | { kind: "move"; id: string; dx: number; dy: number }
  | { kind: "scale"; id: string; startDist: number; w: number; h: number; fontSize?: number }
  | { kind: "rotate"; id: string; startAngle: number; rot: number };

export const DND_MIME = "application/x-vanta-element";

/** Precision 2D editor for the active print zone. Everything is clamped to the printable area. */
export default function ZoneEditor({ onDropElement, compact = false }: { onDropElement?: (payload: string, x: number, y: number) => void; compact?: boolean }) {
  const { style, activeZone, layers, selectedId, select, updateLayer, beginGesture, endGesture, colorHex } = useStudio();
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [box, setBox] = useState({ w: 300, h: 350 });
  const [drag, setDrag] = useState<Drag | null>(null);
  const [dropHover, setDropHover] = useState(false);
  const version = useAssetVersion();
  const { w: W, h: H } = zoneUnits(style, activeZone);
  const zoneLayers = layers.filter((l) => l.zone === activeZone);
  const selected = zoneLayers.find((l) => l.id === selectedId);
  const spec = ZONES[style][activeZone];

  // Fit artboard into the available space, keeping the real print aspect ratio.
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      const s = Math.min((r.width - 16) / W, (r.height - 16) / H);
      setBox({ w: Math.max(40, W * s), h: Math.max(40, H * s) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [W, H]);

  const scale = box.w / W;

  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = Math.round(box.w * dpr);
    c.height = Math.round(box.h * dpr);
    const ctx = c.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, box.w, box.h);
    drawZone(ctx, zoneLayers, scale, getImage);
  }, [zoneLayers, box, scale, version]);

  const toZone = useCallback(
    (clientX: number, clientY: number) => {
      const r = canvas.current!.getBoundingClientRect();
      return { x: ((clientX - r.left) / r.width) * W, y: ((clientY - r.top) / r.height) * H };
    },
    [W, H],
  );

  function onPointerDown(e: React.PointerEvent) {
    const p = toZone(e.clientX, e.clientY);
    const hit = [...zoneLayers].reverse().find((l) => l.visible !== false && hitTest(l, p.x, p.y));
    select(hit?.id ?? null);
    if (hit && !hit.locked) {
      (e.target as Element).setPointerCapture(e.pointerId);
      beginGesture();
      setDrag({ kind: "move", id: hit.id, dx: p.x - hit.x, dy: p.y - hit.y });
    }
  }

  function startHandle(e: React.PointerEvent, kind: "scale" | "rotate") {
    e.stopPropagation();
    if (!selected || selected.locked) return;
    (e.target as Element).setPointerCapture(e.pointerId);
    const p = toZone(e.clientX, e.clientY);
    beginGesture();
    if (kind === "scale")
      setDrag({ kind, id: selected.id, startDist: Math.hypot(p.x - selected.x, p.y - selected.y), w: selected.width, h: selected.height, fontSize: selected.type === "text" ? selected.fontSize : undefined });
    else setDrag({ kind, id: selected.id, startAngle: Math.atan2(p.y - selected.y, p.x - selected.x), rot: selected.rotation });
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!drag) return;
    const p = toZone(e.clientX, e.clientY);
    const l = layers.find((x) => x.id === drag.id);
    if (!l) return;
    if (drag.kind === "move") {
      let x = p.x - drag.dx;
      let y = p.y - drag.dy;
      // snap to centre lines
      if (Math.abs(x - W / 2) < 8 / scale) x = W / 2;
      if (Math.abs(y - H / 2) < 8 / scale) y = H / 2;
      updateLayer(l.id, { x, y });
    } else if (drag.kind === "scale") {
      const k = Math.max(0.05, Math.hypot(p.x - l.x, p.y - l.y) / Math.max(1, drag.startDist));
      const patch: Partial<Layer> = { width: drag.w * k, height: drag.h * k };
      if (drag.fontSize) (patch as Partial<Extract<Layer, { type: "text" }>>).fontSize = Math.max(8, drag.fontSize * k);
      updateLayer(l.id, patch);
    } else {
      let deg = drag.rot + ((Math.atan2(p.y - l.y, p.x - l.x) - drag.startAngle) * 180) / Math.PI;
      deg = ((deg + 540) % 360) - 180;
      if (e.shiftKey) deg = Math.round(deg / 15) * 15;
      else for (const s of [-180, -90, 0, 90, 180]) if (Math.abs(deg - s) < 3) deg = s;
      updateLayer(l.id, { rotation: deg });
    }
  }

  function onPointerUp() {
    if (drag) endGesture();
    setDrag(null);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDropHover(false);
    const payload = e.dataTransfer.getData(DND_MIME);
    if (!payload || !onDropElement) return;
    const p = toZone(e.clientX, e.clientY);
    onDropElement(payload, p.x, p.y);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-1 pb-2 text-[10px] uppercase tracking-[0.2em] text-mist">
        <span>{spec.label} · print area</span>
        <span>
          {spec.widthIn}″ × {spec.heightIn}″
        </span>
      </div>
      <div
        ref={wrap}
        className="relative grid min-h-0 flex-1 place-items-center"
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes(DND_MIME)) {
            e.preventDefault();
            setDropHover(true);
          }
        }}
        onDragLeave={() => setDropHover(false)}
        onDrop={onDrop}
      >
        <div
          className="relative touch-none select-none"
          style={{ width: box.w, height: box.h, background: colorHex, boxShadow: dropHover ? "0 0 0 2px #FF6B00" : undefined }}
          role="application"
          aria-label={`${spec.label} print area editor. Drag elements to move them; use the handles to resize or rotate.`}
        >
          <canvas
            ref={canvas}
            className="absolute inset-0 h-full w-full cursor-move"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          />
          {/* printable boundary */}
          <div className="pointer-events-none absolute inset-0 outline-dashed outline-1 outline-blaze/80" />
          <div className="pointer-events-none absolute left-1/2 top-0 h-full w-px bg-white/10" />
          <div className="pointer-events-none absolute left-0 top-1/2 h-px w-full bg-white/10" />
          {!compact && (
            <div className="pointer-events-none absolute -bottom-5 left-0 right-0 flex justify-between text-[9px] text-white/30">
              {Array.from({ length: Math.floor(W / UNITS_PER_INCH) + 1 }, (_, i) => (
                <span key={i}>{i % 2 === 0 ? i : ""}</span>
              ))}
            </div>
          )}
          {selected && selected.visible !== false && (
            <div
              className="pointer-events-none absolute"
              style={{
                left: selected.x * scale,
                top: selected.y * scale,
                width: selected.width * scale,
                height: selected.height * scale,
                transform: `translate(-50%,-50%) rotate(${selected.rotation}deg)`,
              }}
            >
              <div className={`absolute inset-0 border ${selected.locked ? "border-white/50 border-dashed" : "border-blaze"}`} />
              {!selected.locked && (
                <>
                  {(["-left-1.5 -top-1.5", "-right-1.5 -top-1.5", "-left-1.5 -bottom-1.5", "-right-1.5 -bottom-1.5"] as const).map((pos) => (
                    <button
                      key={pos}
                      aria-label="Resize"
                      className={`pointer-events-auto absolute ${pos} h-3 w-3 cursor-nwse-resize rounded-sm border border-blaze bg-white`}
                      onPointerDown={(e) => startHandle(e, "scale")}
                      onPointerMove={onPointerMove}
                      onPointerUp={onPointerUp}
                    />
                  ))}
                  <div className="absolute -top-6 left-1/2 h-5 w-px -translate-x-1/2 bg-blaze" />
                  <button
                    aria-label="Rotate"
                    className="pointer-events-auto absolute -top-8 left-1/2 h-4 w-4 -translate-x-1/2 cursor-grab rounded-full border-2 border-blaze bg-ink"
                    onPointerDown={(e) => startHandle(e, "rotate")}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                  />
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
