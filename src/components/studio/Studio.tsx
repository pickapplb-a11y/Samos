"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { useStudio, newId, type AssetMeta } from "./store";
import { useZoneTextures, preloadImage, loadFonts, renderPrintZone, effectiveDpi, layerBoundsInches } from "./zoneCanvas";
import ZoneEditor, { DND_MIME } from "./ZoneEditor";
import FlatPreview from "./FlatPreview";
import { STUDIO_COLORS, STYLE_LABELS, FONTS, SIZES, ZONES, ZONE_IDS, zoneUnits, UNITS_PER_INCH, type Style, type ZoneId } from "@/lib/design/zones";
import { priceCustom, type PricingConfig } from "@/lib/design/pricing";
import { measureTextBox, normalizeTextLayers } from "@/lib/design/render";
import type { Layer, TextLayer } from "@/lib/design/schema";
import { money, cn } from "@/lib/format";
import { constrainLayer } from "@/lib/design/geometry";
import { useCart } from "@/components/cart/store";
import { canUse3D } from "@/lib/webgl";
import type { ViewRequest, ZonePointerHandlerType } from "./types";
import { VIEW_AZIMUTH } from "@/components/hoodie/viewConstants";

const HoodieStage = dynamic(() => import("@/components/hoodie/HoodieStage"), {
  ssr: false,
  loading: () => <StageLoading />,
});

function StageLoading() {
  return (
    <div className="grid h-full place-items-center">
      <div className="flex flex-col items-center gap-3 text-mist">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-blaze" />
        <span className="text-xs uppercase tracking-[0.2em]">Loading 3D studio</span>
      </div>
    </div>
  );
}

export interface StudioProps {
  pricing: PricingConfig;
  aiEnabled: boolean;
  signedIn: boolean;
  library: AssetMeta[];
  initial?: {
    designId?: string | null;
    name?: string;
    style?: Style;
    colorHex?: string;
    colorName?: string;
    layers?: Layer[];
    productId?: string | null;
    baseOverride?: number | null;
    colors?: { name: string; hex: string }[];
    assets?: AssetMeta[];
  };
}

type Tab = "product" | "upload" | "text" | "graphics";
const VIEW_LABEL: Record<ZoneId, string> = { front: "Front", back: "Back", leftSleeve: "Left sleeve", rightSleeve: "Right sleeve" };

export default function Studio({ pricing, aiEnabled, signedIn, library, initial }: StudioProps) {
  const s = useStudio();
  const [tab, setTab] = useState<Tab>("product");
  const [mobilePane, setMobilePane] = useState<"create" | "edit" | "order">("create");
  const [view, setView] = useState<ViewRequest>({ azimuth: 0, nonce: 0 });
  const [zoom, setZoom] = useState(1);
  const [turn, setTurn] = useState(0);
  const [auto, setAuto] = useState(false);
  const [mode3d, setMode3d] = useState<boolean | null>(null);
  const [showFlat, setShowFlat] = useState(true);
  const [size, setSize] = useState<string>("L");
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState<null | "save" | "cart" | "upload" | "ai">(null);
  const [toast, setToast] = useState<{ msg: string; tone?: "error" } | null>(null);
  const controls = useRef<OrbitControlsImpl | null>(null);
  const glRef = useRef<THREE.WebGLRenderer | null>(null);
  const dragRef = useRef<{ id: string; dx: number; dy: number } | null>(null);
  const addToCart = useCart((c) => c.add);
  const [desktop, setDesktop] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const f = () => setDesktop(mq.matches);
    f();
    mq.addEventListener("change", f);
    return () => mq.removeEventListener("change", f);
  }, []);

  const colors = initial?.colors?.length ? initial.colors : STUDIO_COLORS;
  const lockedStyle = initial?.productId ? initial.style ?? null : null;

  // init
  useEffect(() => {
    setMode3d(canUse3D());
    s.load({
      designId: initial?.designId ?? null,
      name: initial?.name ?? "Untitled design",
      style: initial?.style ?? "OVERSIZED",
      colorHex: initial?.colorHex ?? colors[0].hex,
      colorName: initial?.colorName ?? colors[0].name,
      layers: initial?.layers ?? [],
      productId: initial?.productId ?? null,
      baseOverride: initial?.baseOverride ?? null,
      assets: [...library, ...(initial?.assets ?? [])],
    });
    for (const a of [...library, ...(initial?.assets ?? [])]) preloadImage(a.id, a.url);
    loadFonts().then(() => {
      const st = useStudio.getState();
      if (st.layers.some((l) => l.type === "text" && l.width <= 1)) useStudio.setState({ layers: normalizeTextLayers(st.layers).map((l) => { const { w, h } = zoneUnits(st.style, l.zone as ZoneId); return constrainLayer(l, w, h); }) });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const flash = useCallback((msg: string, tone?: "error") => {
    setToast({ msg, tone });
    window.setTimeout(() => setToast(null), 3800);
  }, []);

  const textures = useZoneTextures({ style: s.style, layers: s.layers, selectedId: s.selectedId, activeZone: s.activeZone, guides: true });
  const selected = s.layers.find((l) => l.id === s.selectedId) ?? null;
  const price = useMemo(() => priceCustom(pricing, { style: s.style, layers: s.layers, size, baseOverride: s.baseOverride }), [pricing, s.style, s.layers, size, s.baseOverride]);

  const goView = useCallback((z: ZoneId) => {
    useStudio.getState().setZone(z);
    setAuto(false);
    setTurn(VIEW_AZIMUTH[z]);
    setView((v) => ({ azimuth: VIEW_AZIMUTH[z], nonce: v.nonce + 1, targetY: z.includes("Sleeve") ? -0.05 : 0 }));
  }, []);

  // ----- keyboard shortcuts -----
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, select, [contenteditable]")) return;
      const st = useStudio.getState();
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        e.shiftKey ? st.redo() : st.undo();
      } else if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault();
        st.redo();
      } else if (st.selectedId && (e.key === "Delete" || e.key === "Backspace")) {
        e.preventDefault();
        st.remove(st.selectedId);
      } else if (st.selectedId && mod && e.key.toLowerCase() === "d") {
        e.preventDefault();
        st.duplicate(st.selectedId);
      } else if (st.selectedId && e.key.startsWith("Arrow")) {
        e.preventDefault();
        const l = st.layers.find((x) => x.id === st.selectedId)!;
        const step = e.shiftKey ? 25 : 5;
        const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key]!;
        st.updateLayer(l.id, { x: l.x + d[0], y: l.y + d[1] });
      } else if (e.key === "Escape") st.select(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ----- adding elements -----
  const placeImage = useCallback((a: AssetMeta, zone: ZoneId, at?: { x: number; y: number }) => {
    const st = useStudio.getState();
    st.registerAsset(a);
    preloadImage(a.id, a.url);
    const { w, h } = zoneUnits(st.style, zone);
    const k = Math.min((w * 0.6) / a.width, (h * 0.6) / a.height);
    st.addLayer({
      id: newId(),
      type: "image",
      zone,
      assetId: a.id,
      x: at?.x ?? w / 2,
      y: at?.y ?? h * 0.42,
      width: a.width * k,
      height: a.height * k,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      flipX: false,
      name: a.name?.slice(0, 60) || "Image",
    });
  }, []);

  const placeText = useCallback((text: string, zone: ZoneId, opts: Partial<TextLayer> = {}, at?: { x: number; y: number }) => {
    const st = useStudio.getState();
    const { w, h } = zoneUnits(st.style, zone);
    const base = { text, fontFamily: "Anton", fontSize: Math.round(Math.min(w, h) * 0.16), letterSpacing: 0, strokeWidth: 0, ...opts };
    const m = measureTextBox(base);
    st.addLayer({
      id: newId(),
      type: "text",
      zone,
      x: at?.x ?? w / 2,
      y: at?.y ?? h * 0.3,
      width: m.w,
      height: m.h,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      color: "#FFFFFF",
      align: "center",
      name: text.slice(0, 60),
      ...base,
    } as TextLayer);
  }, []);

  const onDropElement = useCallback(
    (payload: string, x: number, y: number) => {
      const p = JSON.parse(payload) as { type: "asset"; asset: AssetMeta } | { type: "text"; text: string; fontFamily: string };
      const zone = useStudio.getState().activeZone;
      if (p.type === "asset") placeImage(p.asset, zone, { x, y });
      else placeText(p.text, zone, { fontFamily: p.fontFamily }, { x, y });
    },
    [placeImage, placeText],
  );

  async function upload(file: File) {
    if (!/^image\/(png|jpeg|svg\+xml)$/.test(file.type) && !/\.(png|jpe?g|svg)$/i.test(file.name)) return flash("Only PNG, JPG or SVG files are supported", "error");
    if (file.size > 15 * 1024 * 1024) return flash("Files must be 15 MB or smaller", "error");
    setBusy("upload");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch("/api/uploads", { method: "POST", body: fd });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Upload failed");
      const a: AssetMeta = { ...j.asset, name: file.name.replace(/\.[^.]+$/, "") };
      setUploads((u) => [a, ...u]);
      placeImage(a, useStudio.getState().activeZone);
      if (j.asset.mime !== "image/svg+xml" && Math.max(j.asset.width, j.asset.height) < 1200) flash("Heads up: this image is low resolution and may print soft. 2000px+ is recommended.");
    } catch (e) {
      flash((e as Error).message, "error");
    } finally {
      setBusy(null);
    }
  }
  const [uploads, setUploads] = useState<AssetMeta[]>([]);
  useEffect(() => {
    fetch("/api/uploads")
      .then((r) => (r.ok ? r.json() : { assets: [] }))
      .then((j) => setUploads(j.assets ?? []))
      .catch(() => {});
  }, []);

  // ----- 3D direct manipulation -----
  const onZonePointer: ZonePointerHandlerType = useCallback((zone, u, v, phase, e) => {
    const st = useStudio.getState();
    const { w, h } = zoneUnits(st.style, zone);
    const x = u * w;
    const y = v * h;
    if (phase === "down") {
      const hit = [...st.layers].reverse().find((l) => l.zone === zone && l.visible !== false && hitTestLayer(l, x, y));
      if (st.activeZone !== zone) st.setZone(zone);
      if (hit) {
        e.stopPropagation();
        st.select(hit.id);
        if (!hit.locked) {
          if (controls.current) controls.current.enabled = false;
          (e.target as unknown as { setPointerCapture?: (id: number) => void }).setPointerCapture?.(e.pointerId);
          st.beginGesture();
          dragRef.current = { id: hit.id, dx: x - hit.x, dy: y - hit.y };
        }
      }
    } else if (phase === "move" && dragRef.current) {
      e.stopPropagation();
      const d = dragRef.current;
      const l = st.layers.find((q) => q.id === d.id);
      if (l && l.zone === zone) st.updateLayer(d.id, { x: x - d.dx, y: y - d.dy });
    } else if (phase === "up" && dragRef.current) {
      dragRef.current = null;
      st.endGesture();
      if (controls.current) controls.current.enabled = true;
    }
  }, []);
  useEffect(() => {
    const up = () => {
      if (dragRef.current) {
        dragRef.current = null;
        useStudio.getState().endGesture();
        if (controls.current) controls.current.enabled = true;
      }
    };
    window.addEventListener("pointerup", up);
    return () => window.removeEventListener("pointerup", up);
  }, []);

  // ----- save / render / cart -----
  async function capturePreview(): Promise<Blob | null> {
    if (mode3d && glRef.current) {
      goView("front");
      setZoom(1);
      await new Promise((r) => setTimeout(r, 900));
      const src = glRef.current.domElement;
      const out = document.createElement("canvas");
      const side = Math.min(src.width, src.height);
      out.width = out.height = 800;
      out.getContext("2d")!.drawImage(src, (src.width - side) / 2, (src.height - side) / 2, side, side, 0, 0, 800, 800);
      return new Promise((r) => out.toBlob((b) => r(b), "image/png"));
    }
    return null;
  }

  async function save(forCart = false): Promise<{ id: string; revision: number; previewId?: string } | null> {
    const st = useStudio.getState();
    const body = { name: st.name, style: st.style, colorHex: st.colorHex, colorName: st.colorName, productId: st.productId, layers: st.layers };
    const r = await fetch(st.designId ? `/api/designs/${st.designId}` : "/api/designs", {
      method: st.designId ? "PUT" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error || "Could not save design");
    const id: string = j.design.id;
    st.markSaved(id);
    window.history.replaceState(null, "", `/studio?design=${id}`);
    // Print-ready files: one 300 DPI transparent PNG per used zone, plus a preview image.
    const fd = new FormData();
    fd.append("revision", String(j.design.revision));
    for (const z of ZONE_IDS) {
      const blob = await renderPrintZone(st.style, z, st.layers);
      if (blob) fd.append(z, blob, `${z}.png`);
    }
    const preview = await capturePreview();
    if (preview) fd.append("preview", preview, "preview.png");
    const rr = await fetch(`/api/designs/${id}/renders`, { method: "POST", body: fd });
    const rj = await rr.json();
    if (!rr.ok) throw new Error(rj.error || "Could not prepare print files");
    if (!forCart) flash(signedIn ? "Design saved to your account" : "Design saved in this browser — sign in to keep it in your account");
    return { id, revision: j.design.revision, previewId: rj.previewId };
  }

  async function onSave() {
    setBusy("save");
    try {
      await save();
    } catch (e) {
      flash((e as Error).message, "error");
    } finally {
      setBusy(null);
    }
  }

  async function onAddToCart() {
    if (!s.layers.some((l) => l.visible !== false)) return flash("Add at least one graphic or text to your hoodie first", "error");
    setBusy("cart");
    try {
      const saved = await save(true);
      if (!saved) return;
      const st = useStudio.getState();
      addToCart({
        kind: "custom",
        designId: saved.id,
        revision: saved.revision,
        productId: st.productId ?? undefined,
        name: st.name === "Untitled design" ? `Custom ${STYLE_LABELS[st.style]} Hoodie` : st.name,
        image: saved.previewId ? `/api/assets/${saved.previewId}` : "/products/placeholder.svg",
        style: st.style,
        colorName: st.colorName,
        colorHex: st.colorHex,
        size,
        qty,
        unitPrice: price.total,
      });
    } catch (e) {
      flash((e as Error).message, "error");
    } finally {
      setBusy(null);
    }
  }

  async function generateAI(prompt: string) {
    setBusy("ai");
    try {
      const r = await fetch("/api/ai/generate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ prompt }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Generation failed");
      setUploads((u) => [j.asset, ...u]);
      placeImage({ ...j.asset, name: "AI graphic" }, useStudio.getState().activeZone);
    } catch (e) {
      flash((e as Error).message, "error");
    } finally {
      setBusy(null);
    }
  }

  // ----- render -----
  const leftPanel = (
    <div className="flex h-full min-h-0 flex-col">
      <div className="grid grid-cols-4 gap-1 border-b border-white/[0.07] p-2" role="tablist" aria-label="Studio tools">
        {(["product", "upload", "text", "graphics"] as Tab[]).map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={cn("rounded-lg py-2 text-[10px] font-semibold uppercase tracking-[0.14em] transition", tab === t ? "bg-white text-ink" : "text-white/60 hover:bg-white/5 hover:text-white")}>
            {t === "product" ? "Hoodie" : t === "graphics" ? (aiEnabled ? "Art + AI" : "Art") : t}
          </button>
        ))}
      </div>
      <div className="scrollbar-thin min-h-0 flex-1 space-y-6 overflow-y-auto p-4">
        {tab === "product" && (
          <>
            <Section title="Style">
              <div className="grid grid-cols-3 gap-2">
                {(["OVERSIZED", "REGULAR", "ZIP"] as Style[]).map((st) => (
                  <button key={st} disabled={!!lockedStyle && lockedStyle !== st} onClick={() => s.setStyle(st)} aria-pressed={s.style === st} className={cn("rounded-xl border px-2 py-3 text-xs transition disabled:cursor-not-allowed disabled:opacity-30", s.style === st ? "border-blaze bg-blaze/10" : "border-white/10 hover:border-white/30")}>
                    <span className="block font-semibold">{STYLE_LABELS[st]}</span>
                    <span className="mt-0.5 block text-[10px] text-mist">{money(s.baseOverride ?? pricing.studioBase[st])}</span>
                  </button>
                ))}
              </div>
              {lockedStyle && <p className="mt-2 text-[11px] text-mist">You&apos;re customising a specific product, so its fit and colours are fixed. <Link href="/studio" className="text-white underline">Start from a blank</Link> for every option.</p>}
              {s.style === "ZIP" && <p className="mt-2 text-[11px] text-mist">The zipper splits the front panel, so zip-ups print a 4.5″ left-chest badge on the front.</p>}
            </Section>
            <Section title={`Color — ${s.colorName}`}>
              <div className="grid grid-cols-6 gap-2" role="radiogroup" aria-label="Hoodie color">
                {colors.map((c) => (
                  <button
                    key={c.hex}
                    role="radio"
                    aria-checked={s.colorHex === c.hex}
                    aria-label={c.name}
                    title={c.name}
                    onClick={() => s.setColor(c.hex, c.name)}
                    className={cn("aspect-square rounded-full border transition hover:scale-110", s.colorHex === c.hex ? "ring-2 ring-blaze ring-offset-2 ring-offset-coal" : "border-white/20")}
                    style={{ background: c.hex }}
                  />
                ))}
              </div>
            </Section>
            <Section title="Print areas">
              <div className="grid grid-cols-2 gap-2">
                {ZONE_IDS.map((z) => {
                  const n = s.layers.filter((l) => l.zone === z).length;
                  return (
                    <button key={z} onClick={() => goView(z)} className={cn("rounded-xl border px-3 py-2.5 text-left text-xs transition", s.activeZone === z ? "border-blaze bg-blaze/10" : "border-white/10 hover:border-white/30")}>
                      <span className="block font-semibold">{ZONES[s.style][z].label}</span>
                      <span className="text-[10px] text-mist">
                        {ZONES[s.style][z].widthIn}″×{ZONES[s.style][z].heightIn}″ · {n ? `${n} item${n > 1 ? "s" : ""}` : `+${money(pricing.zoneFee[z])}`}
                      </span>
                    </button>
                  );
                })}
              </div>
            </Section>
          </>
        )}
        {tab === "upload" && (
          <>
            <Section title="Upload artwork">
              <label
                className={cn("flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-white/20 px-4 py-8 text-center transition hover:border-blaze/70 hover:bg-white/[0.02]", busy === "upload" && "opacity-50")}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const f = e.dataTransfer.files?.[0];
                  if (f) upload(f);
                }}
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-blaze" aria-hidden><path d="M12 16V4m0 0-4 4m4-4 4 4M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" /></svg>
                <span className="mt-3 text-sm font-semibold">{busy === "upload" ? "Uploading…" : "Drop a file or browse"}</span>
                <span className="mt-1 text-[11px] text-mist">PNG, JPG or SVG · max 15 MB · 300 DPI recommended</span>
                <input type="file" accept="image/png,image/jpeg,image/svg+xml,.svg" className="sr-only" disabled={!!busy} onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
              </label>
              <p className="mt-2 text-[11px] text-mist">
                It goes onto the <b className="text-white">{ZONES[s.style][s.activeZone].label}</b>. SVGs are sanitised, and files stay private to you. Only upload artwork you own or have rights to.
              </p>
            </Section>
            {uploads.length > 0 && (
              <Section title="Your uploads — drag onto the print area">
                <AssetGrid assets={uploads} onPick={(a) => placeImage(a, s.activeZone)} />
              </Section>
            )}
          </>
        )}
        {tab === "text" && <TextTools onAdd={(t, f) => placeText(t, s.activeZone, { fontFamily: f })} />}
        {tab === "graphics" && (
          <>
            {aiEnabled && <AiPanel busy={busy === "ai"} signedIn={signedIn} onGenerate={generateAI} />}
            <Section title="Graphics library — drag or tap">
              <AssetGrid assets={library} onPick={(a) => placeImage(a, s.activeZone)} />
            </Section>
          </>
        )}
      </div>
    </div>
  );

  const rightPanel = (
    <div className="scrollbar-thin flex h-full min-h-0 flex-col overflow-y-auto">
      <div className="space-y-6 p-4">
        {selected ? <LayerProperties layer={selected} asset={selected.type === "image" ? s.assets[selected.assetId] : undefined} /> : <p className="rounded-xl border border-white/[0.07] p-4 text-xs text-mist">Select an element on the hoodie or in the layers list to edit it. Drag directly on the 3D hoodie or in the flat editor.</p>}
        <LayersList onFocus={goView} />
      </div>
    </div>
  );

  const orderPanel = (
    <div className="space-y-4 border-t border-white/[0.07] p-4">
      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="label mb-0">Size</span>
          <Link href="/size-guide" target="_blank" className="text-[11px] text-mist underline-offset-2 hover:text-white hover:underline">Size guide</Link>
        </div>
        <div className="grid grid-cols-7 gap-1" role="radiogroup" aria-label="Size">
          {SIZES.map((z) => (
            <button key={z} role="radio" aria-checked={size === z} onClick={() => setSize(z)} className={cn("h-9 rounded-lg border text-[11px] font-semibold transition", size === z ? "border-white bg-white text-ink" : "border-white/10 hover:border-white/40")}>
              {z}
            </button>
          ))}
        </div>
      </div>
      <details className="group rounded-xl bg-white/[0.03] px-3 py-2 text-xs">
        <summary className="flex cursor-pointer list-none items-center justify-between">
          <span className="text-mist">Price breakdown</span>
          <span className="text-mist transition group-open:rotate-180">⌄</span>
        </summary>
        <ul className="mt-2 space-y-1">
          {price.lines.map((l, i) => (
            <li key={i} className="flex justify-between"><span className="text-white/70">{l.label}</span><span>{money(l.amount)}</span></li>
          ))}
        </ul>
      </details>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-mist">Total</p>
          <p className="font-display text-4xl tabular-nums" aria-live="polite">{money(price.total * qty)}</p>
        </div>
        <div className="flex h-10 items-center rounded-full border border-white/15">
          <button className="h-10 w-9" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease quantity">−</button>
          <span className="w-6 text-center text-sm">{qty}</span>
          <button className="h-10 w-9" onClick={() => setQty((q) => Math.min(20, q + 1))} aria-label="Increase quantity">+</button>
        </div>
      </div>
      <div className="grid grid-cols-[auto_1fr] gap-2">
        <button className="btn-ghost h-12 px-4" onClick={onSave} disabled={!!busy}>{busy === "save" ? "Saving…" : "Save"}</button>
        <button className="btn-accent" onClick={onAddToCart} disabled={!!busy}>{busy === "cart" ? "Preparing print files…" : "Add to cart"}</button>
      </div>
      {!signedIn && <p className="text-center text-[11px] text-mist"><Link href="/account/login?next=/studio" className="text-white underline-offset-2 hover:underline">Sign in</Link> to save designs to your account.</p>}
    </div>
  );

  return (
    <div className="fixed inset-x-0 bottom-0 top-16 flex flex-col bg-ink">
      {/* toolbar */}
      <div className="scrollbar-thin flex h-12 shrink-0 items-center gap-2 overflow-x-auto border-b border-white/[0.07] px-3">
        <input aria-label="Design name" value={s.name} onChange={(e) => s.setName(e.target.value.slice(0, 80))} className="w-28 shrink-0 truncate rounded-lg bg-transparent px-2 py-1 text-sm font-semibold outline-none hover:bg-white/5 focus:bg-white/5 sm:w-52" />
        {s.dirty && <span className="hidden text-[10px] uppercase tracking-widest text-mist sm:inline">Unsaved</span>}
        <div className="mx-auto flex items-center gap-1">
          <IconBtn label="Undo (Ctrl+Z)" onClick={s.undo} disabled={!s.past.length}>↶</IconBtn>
          <IconBtn label="Redo (Ctrl+Shift+Z)" onClick={s.redo} disabled={!s.future.length}>↷</IconBtn>
          <span className="mx-1 h-5 w-px bg-white/10" />
          <div className="hidden items-center gap-1 sm:flex" role="group" aria-label="Camera view">
            {ZONE_IDS.map((z) => (
              <button key={z} onClick={() => goView(z)} className={cn("chip h-8", s.activeZone === z && "chip-on")}>{VIEW_LABEL[z]}</button>
            ))}
          </div>
          <select aria-label="Camera view" className="h-8 rounded-full border border-white/15 bg-transparent px-2 text-xs sm:hidden" value={s.activeZone} onChange={(e) => goView(e.target.value as ZoneId)}>
            {ZONE_IDS.map((z) => <option key={z} value={z} className="bg-coal">{VIEW_LABEL[z]}</option>)}
          </select>
          <span className="mx-1 hidden h-5 w-px bg-white/10 sm:block" />
          <div className="hidden items-center sm:flex">
          <IconBtn label="Zoom out" onClick={() => setZoom((z) => Math.max(0.6, +(z - 0.2).toFixed(2)))}>−</IconBtn>
          <span className="w-10 text-center text-[11px] tabular-nums text-mist">{Math.round(zoom * 100)}%</span>
          <IconBtn label="Zoom in" onClick={() => setZoom((z) => Math.min(3, +(z + 0.2).toFixed(2)))}>+</IconBtn>
          </div>
        </div>
        <button className="chip hidden h-8 lg:inline-flex" onClick={() => setShowFlat((f) => !f)} aria-pressed={showFlat}>Flat editor</button>
        <button
          className="chip h-8 shrink-0"
          onClick={() => {
            const next = !mode3d;
            try { localStorage.setItem("vanta:preview", next ? "3d" : "2d"); } catch {}
            setMode3d(next && canUse3D());
            if (next && !canUse3D()) flash("3D isn't available on this device; using the lightweight preview.", "error");
          }}
        >
          {mode3d ? "2D lite" : "3D"}
        </button>
      </div>

      <div className="relative grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_auto] lg:grid-cols-[300px_minmax(0,1fr)_320px] lg:grid-rows-1">
        {desktop && <aside className="glass z-10 m-3 mr-0 min-h-0 rounded-2xl" aria-label="Customization controls">{leftPanel}</aside>}

        <section className="relative min-h-[300px]" aria-label="Hoodie preview">
          {mode3d === null ? (
            <StageLoading />
          ) : mode3d ? (
            <HoodieStage
              style={s.style}
              color={s.colorHex}
              zoneTextures={textures}
              view={{ ...view, azimuth: view.azimuth }}
              zoom={zoom}
              autoRotate={auto}
              onZonePointer={onZonePointer}
              controlsRef={controls}
              onCreated={(gl) => (glRef.current = gl)}
              preserveDrawingBuffer
              className="!absolute inset-0"
            />
          ) : (
            <div className="absolute inset-0 p-4"><FlatPreview /></div>
          )}
          {mode3d && (
            <div className="glass absolute bottom-4 left-1/2 flex w-[min(92%,420px)] -translate-x-1/2 items-center gap-3 rounded-full px-4 py-2">
              <button onClick={() => setAuto((a) => !a)} className={cn("text-[10px] font-semibold uppercase tracking-[0.18em]", auto ? "text-blaze" : "text-white/70")} aria-pressed={auto}>
                {auto ? "Spinning" : "Spin"}
              </button>
              <label className="sr-only" htmlFor="turn">Rotate hoodie</label>
              <input
                id="turn"
                type="range"
                min={-180}
                max={180}
                value={Math.round((turn * 180) / Math.PI)}
                onChange={(e) => {
                  const a = (+e.target.value * Math.PI) / 180;
                  setAuto(false);
                  setTurn(a);
                  setView((v) => ({ azimuth: a, nonce: v.nonce + 1 }));
                }}
                className="flex-1 accent-[#FF6B00]"
              />
              <span className="w-10 text-right text-[11px] tabular-nums text-mist">{Math.round((turn * 180) / Math.PI)}°</span>
            </div>
          )}
          {mode3d && showFlat && desktop && (
            <div className="glass absolute left-4 top-4 hidden h-[min(52%,380px)] w-[min(36%,300px)] rounded-2xl p-3 pb-6 lg:block">
              <ZoneEditor onDropElement={onDropElement} compact />
            </div>
          )}
          {mode3d && (
            <div className="pointer-events-none absolute right-4 top-4 hidden text-right text-[10px] uppercase tracking-[0.2em] text-white/40 lg:block">
              Drag to orbit · scroll to zoom · drag artwork to move it
            </div>
          )}
          {!mode3d && mode3d !== null && <div className="absolute bottom-3 left-3 right-3 hidden" />}
        </section>

        {desktop && (
          <aside className="glass z-10 m-3 ml-0 flex min-h-0 flex-col rounded-2xl" aria-label="Design details and checkout">
            <div className="min-h-0 flex-1">{rightPanel}</div>
            {orderPanel}
          </aside>
        )}

        {/* mobile bottom sheet */}
        {!desktop && (
        <div className="flex max-h-[52dvh] min-h-0 flex-col border-t border-white/10 bg-coal">
          <div className="grid shrink-0 grid-cols-3 border-b border-white/[0.07]">
            {(["create", "edit", "order"] as const).map((p) => (
              <button key={p} onClick={() => setMobilePane(p)} className={cn("py-3 text-[11px] font-semibold uppercase tracking-[0.16em]", mobilePane === p ? "text-white shadow-[inset_0_-2px_0_#FF6B00]" : "text-white/50")}>
                {p === "create" ? "Create" : p === "edit" ? `Edit${selected ? " •" : ""}` : money(price.total * qty)}
              </button>
            ))}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {mobilePane === "create" && leftPanel}
            {mobilePane === "edit" && (
              <div>
                <div className="h-64 p-3"><ZoneEditor onDropElement={onDropElement} compact /></div>
                {rightPanel}
              </div>
            )}
            {mobilePane === "order" && orderPanel}
          </div>
        </div>
        )}
      </div>

      {toast && (
        <div role="status" className={cn("glass fixed bottom-6 left-1/2 z-[80] -translate-x-1/2 animate-fadeUp rounded-full px-5 py-3 text-sm", toast.tone === "error" && "border-red-500/40 text-red-200")}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

function hitTestLayer(l: Layer, x: number, y: number) {
  const r = (-l.rotation * Math.PI) / 180;
  const dx = x - l.x;
  const dy = y - l.y;
  return Math.abs(dx * Math.cos(r) - dy * Math.sin(r)) <= l.width / 2 && Math.abs(dx * Math.sin(r) + dy * Math.cos(r)) <= l.height / 2;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="label">{title}</h3>
      {children}
    </section>
  );
}

function IconBtn({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button aria-label={label} title={label} onClick={onClick} disabled={disabled} className="grid h-8 w-8 place-items-center rounded-full text-base text-white/80 transition hover:bg-white/10 hover:text-white disabled:opacity-30">
      {children}
    </button>
  );
}

function AssetGrid({ assets, onPick }: { assets: AssetMeta[]; onPick: (a: AssetMeta) => void }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {assets.map((a) => (
        <button
          key={a.id}
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData(DND_MIME, JSON.stringify({ type: "asset", asset: a }));
            e.dataTransfer.effectAllowed = "copy";
          }}
          onClick={() => onPick(a)}
          className="group relative aspect-square overflow-hidden rounded-xl border border-white/10 bg-[repeating-conic-gradient(#1f1f1f_0_25%,#171717_0_50%)] bg-[length:16px_16px] p-2 transition hover:border-blaze/70"
          title={a.name}
          aria-label={`Add ${a.name ?? "graphic"}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={a.url} alt="" className="h-full w-full object-contain transition group-hover:scale-105" draggable={false} loading="lazy" />
        </button>
      ))}
    </div>
  );
}

function TextTools({ onAdd }: { onAdd: (text: string, font: string) => void }) {
  const [text, setText] = useState("");
  const [font, setFont] = useState("Anton");
  return (
    <>
      <Section title="Add text">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (text.trim()) onAdd(text.trim(), font);
            setText("");
          }}
          className="space-y-3"
        >
          <input className="input" value={text} onChange={(e) => setText(e.target.value.slice(0, 80))} placeholder="Your text" aria-label="Text to add" />
          <div className="grid grid-cols-2 gap-2">
            {FONTS.map((f) => (
              <button
                type="button"
                key={f.family}
                onClick={() => setFont(f.family)}
                aria-pressed={font === f.family}
                draggable
                onDragStart={(e) => e.dataTransfer.setData(DND_MIME, JSON.stringify({ type: "text", text: text.trim() || "VANTA", fontFamily: f.family }))}
                className={cn("truncate rounded-xl border px-3 py-2.5 text-left text-lg transition", font === f.family ? "border-blaze bg-blaze/10" : "border-white/10 hover:border-white/30")}
                style={{ fontFamily: `"${f.family}"` }}
              >
                {f.label}
              </button>
            ))}
          </div>
          <button className="btn-primary w-full" disabled={!text.trim()}>Add to hoodie</button>
        </form>
      </Section>
      <Section title="Quick presets — drag or tap">
        <div className="flex flex-wrap gap-2">
          {[["EST. 2026", "Oswald"], ["Mirage", "Pacifico"], ["NO SLEEP", "Anton"], ["Hometown", "UnifrakturMaguntia"], ["MADE BY ME", "Archivo Black"]].map(([t, f]) => (
            <button
              key={t}
              className="chip"
              style={{ fontFamily: `"${f}"` }}
              draggable
              onDragStart={(e) => e.dataTransfer.setData(DND_MIME, JSON.stringify({ type: "text", text: t, fontFamily: f }))}
              onClick={() => onAdd(t, f)}
            >
              {t}
            </button>
          ))}
        </div>
      </Section>
    </>
  );
}

function AiPanel({ busy, signedIn, onGenerate }: { busy: boolean; signedIn: boolean; onGenerate: (p: string) => void }) {
  const [prompt, setPrompt] = useState("");
  return (
    <Section title="AI design assistant">
      <div className="rounded-2xl border border-blaze/30 bg-blaze/[0.06] p-3">
        {signedIn ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (prompt.trim().length >= 4) onGenerate(prompt.trim());
            }}
          >
            <label htmlFor="ai-prompt" className="sr-only">Describe your graphic</label>
            <textarea id="ai-prompt" value={prompt} onChange={(e) => setPrompt(e.target.value.slice(0, 400))} rows={3} className="input h-auto resize-none py-3" placeholder="e.g. A vintage motorsport graphic with red racing typography" />
            <button className="btn-accent mt-2 w-full" disabled={busy || prompt.trim().length < 4}>{busy ? "Generating… (≈20s)" : "Generate graphic"}</button>
            <p className="mt-2 text-[10px] text-mist">Generates an original graphic with a transparent background. Don't ask for logos, trademarks or real people.</p>
          </form>
        ) : (
          <p className="text-xs text-white/80"><Link href="/account/login?next=/studio" className="text-blaze underline">Sign in</Link> to use the AI design assistant.</p>
        )}
      </div>
    </Section>
  );
}

function NumberField({ label, value, onChange, step = 1, min, max, suffix }: { label: string; value: number; onChange: (v: number) => void; step?: number; min?: number; max?: number; suffix?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] uppercase tracking-[0.16em] text-mist">{label}</span>
      <div className="flex h-9 items-center rounded-lg border border-white/10 bg-white/[0.03] pr-2 focus-within:border-blaze/60">
        <input type="number" step={step} min={min} max={max} value={Number.isFinite(value) ? +value.toFixed(2) : 0} onChange={(e) => e.target.value !== "" && onChange(+e.target.value)} className="w-full min-w-0 bg-transparent px-2 text-xs tabular-nums outline-none" />
        {suffix && <span className="text-[10px] text-mist">{suffix}</span>}
      </div>
    </label>
  );
}

function LayerProperties({ layer, asset }: { layer: Layer; asset?: AssetMeta }) {
  const { updateLayer, remove, duplicate, toggle, reorder, moveToZone, style, beginGesture, endGesture } = useStudio();
  const inch = UNITS_PER_INCH;
  const dpi = effectiveDpi(layer, asset);
  const b = layerBoundsInches(layer);
  const setText = (patch: Partial<TextLayer>) => {
    if (layer.type !== "text") return;
    const next = { ...layer, ...patch };
    const m = measureTextBox(next);
    updateLayer(layer.id, { ...patch, width: m.w, height: m.h } as Partial<Layer>);
  };
  const scaleTo = (wIn: number) => {
    const k = (wIn * inch) / layer.width;
    if (!(k > 0)) return;
    const patch: Partial<Layer> = { width: layer.width * k, height: layer.height * k };
    if (layer.type === "text") (patch as Partial<TextLayer>).fontSize = layer.fontSize * k;
    updateLayer(layer.id, patch);
  };
  return (
    <section aria-label="Selected element">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="label mb-0">{layer.type === "text" ? "Text" : "Image"} · {ZONES[style][layer.zone as ZoneId].label}</h3>
        <div className="flex gap-1">
          <IconBtn label={layer.locked ? "Unlock" : "Lock"} onClick={() => toggle(layer.id, "locked")}>{layer.locked ? "🔒" : "🔓"}</IconBtn>
          <IconBtn label="Duplicate (Ctrl+D)" onClick={() => duplicate(layer.id)}>⧉</IconBtn>
          <IconBtn label="Delete (Del)" onClick={() => remove(layer.id)}>🗑</IconBtn>
        </div>
      </div>
      <fieldset disabled={layer.locked} className="space-y-3 disabled:opacity-50">
        {layer.type === "text" && (
          <>
            <input className="input h-10" value={layer.text} onChange={(e) => e.target.value && setText({ text: e.target.value.slice(0, 80) })} aria-label="Text content" />
            <select className="input h-10" value={layer.fontFamily} onChange={(e) => setText({ fontFamily: e.target.value })} aria-label="Font" style={{ fontFamily: `"${layer.fontFamily}"` }}>
              {FONTS.map((f) => <option key={f.family} value={f.family} className="bg-coal">{f.label}</option>)}
            </select>
            <div className="grid grid-cols-3 gap-2">
              <NumberField label="Size" value={layer.fontSize / inch * 72} onChange={(v) => setText({ fontSize: Math.max(8, (v / 72) * inch) })} suffix="pt" />
              <NumberField label="Spacing" value={layer.letterSpacing} onChange={(v) => setText({ letterSpacing: Math.max(-20, Math.min(100, v)) })} />
              <label className="block">
                <span className="mb-1 block text-[10px] uppercase tracking-[0.16em] text-mist">Color</span>
                <input type="color" value={layer.color} onChange={(e) => updateLayer(layer.id, { color: e.target.value } as Partial<Layer>)} className="h-9 w-full cursor-pointer rounded-lg border border-white/10 bg-transparent" aria-label="Text color" />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <NumberField label="Outline" value={layer.strokeWidth} min={0} max={40} onChange={(v) => setText({ strokeWidth: Math.max(0, Math.min(40, v)), strokeColor: layer.strokeColor ?? "#000000" })} />
              <label className="block">
                <span className="mb-1 block text-[10px] uppercase tracking-[0.16em] text-mist">Outline color</span>
                <input type="color" value={layer.strokeColor ?? "#000000"} onChange={(e) => updateLayer(layer.id, { strokeColor: e.target.value } as Partial<Layer>)} className="h-9 w-full cursor-pointer rounded-lg border border-white/10 bg-transparent" aria-label="Outline color" />
              </label>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {["#FFFFFF", "#0B0B0B", "#FF6B00", "#E11D2E", "#F5C518", "#2F6BFF", "#1E9E5A", "#C8B597"].map((c) => (
                <button key={c} aria-label={`Text color ${c}`} onClick={() => updateLayer(layer.id, { color: c } as Partial<Layer>)} className="h-6 w-6 rounded-full border border-white/20" style={{ background: c }} />
              ))}
            </div>
          </>
        )}
        {layer.type === "image" && dpi < 150 && (
          <p className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-2 text-[11px] text-yellow-200">At this size the image prints at about {Math.round(dpi)} DPI and may look soft. Scale it down or upload a larger file.</p>
        )}
        <div className="grid grid-cols-3 gap-2">
          <NumberField label="X" value={layer.x / inch} step={0.1} onChange={(v) => updateLayer(layer.id, { x: v * inch })} suffix="in" />
          <NumberField label="Y" value={layer.y / inch} step={0.1} onChange={(v) => updateLayer(layer.id, { y: v * inch })} suffix="in" />
          <NumberField label="Width" value={layer.width / inch} step={0.1} onChange={scaleTo} suffix="in" />
        </div>
        <label className="block">
          <span className="mb-1 flex justify-between text-[10px] uppercase tracking-[0.16em] text-mist"><span>Rotation</span><span className="tabular-nums">{Math.round(layer.rotation)}°</span></span>
          <input type="range" min={-180} max={180} value={layer.rotation} onPointerDown={beginGesture} onPointerUp={endGesture} onChange={(e) => updateLayer(layer.id, { rotation: +e.target.value })} className="w-full accent-[#FF6B00]" aria-label="Rotation" />
        </label>
        <label className="block">
          <span className="mb-1 flex justify-between text-[10px] uppercase tracking-[0.16em] text-mist"><span>Opacity</span><span className="tabular-nums">{Math.round((layer.opacity ?? 1) * 100)}%</span></span>
          <input type="range" min={10} max={100} value={Math.round((layer.opacity ?? 1) * 100)} onPointerDown={beginGesture} onPointerUp={endGesture} onChange={(e) => updateLayer(layer.id, { opacity: +e.target.value / 100 })} className="w-full accent-[#FF6B00]" aria-label="Opacity" />
        </label>
        <div className="flex flex-wrap gap-1.5">
          <button className="chip" onClick={() => { const { w } = zoneUnits(style, layer.zone as ZoneId); updateLayer(layer.id, { x: w / 2 }); }}>Center H</button>
          <button className="chip" onClick={() => { const { h } = zoneUnits(style, layer.zone as ZoneId); updateLayer(layer.id, { y: h / 2 }); }}>Center V</button>
          <button className="chip" onClick={() => { const { w, h } = zoneUnits(style, layer.zone as ZoneId); const k = Math.min(w / layer.width, h / layer.height) * 0.98; updateLayer(layer.id, { width: layer.width * k, height: layer.height * k, rotation: 0, ...(layer.type === "text" ? { fontSize: layer.fontSize * k } : {}) } as Partial<Layer>); }}>Fit area</button>
          {layer.type === "image" && <button className="chip" onClick={() => updateLayer(layer.id, { flipX: !layer.flipX } as Partial<Layer>)}>Flip</button>}
          <button className="chip" onClick={() => reorder(layer.id, "top")}>To front</button>
          <button className="chip" onClick={() => reorder(layer.id, "bottom")}>To back</button>
        </div>
        <label className="block">
          <span className="mb-1 block text-[10px] uppercase tracking-[0.16em] text-mist">Move to print area</span>
          <select className="input h-9 text-xs" value={layer.zone} onChange={(e) => moveToZone(layer.id, e.target.value as ZoneId)}>
            {ZONE_IDS.map((z) => <option key={z} value={z} className="bg-coal">{ZONES[style][z].label}</option>)}
          </select>
        </label>
        <p className="text-[10px] text-mist">Printed size: {b.w.toFixed(1)}″ × {b.h.toFixed(1)}″</p>
      </fieldset>
    </section>
  );
}

function LayersList({ onFocus }: { onFocus: (z: ZoneId) => void }) {
  const { layers, selectedId, select, toggle, reorder, remove, style } = useStudio();
  if (!layers.length) return <section><h3 className="label">Layers</h3><p className="text-xs text-mist">No elements yet. Add text, upload artwork or pick a graphic.</p></section>;
  return (
    <section aria-label="Design layers">
      <h3 className="label">Layers</h3>
      {ZONE_IDS.map((z) => {
        const zl = layers.filter((l) => l.zone === z);
        if (!zl.length) return null;
        return (
          <div key={z} className="mb-3">
            <button onClick={() => onFocus(z)} className="mb-1 text-[10px] uppercase tracking-[0.18em] text-white/40 hover:text-white">{ZONES[style][z].label}</button>
            <ul className="space-y-1">
              {[...zl].reverse().map((l) => (
                <li key={l.id} className={cn("group flex items-center gap-2 rounded-lg border px-2 py-1.5 text-xs transition", selectedId === l.id ? "border-blaze/60 bg-blaze/10" : "border-transparent hover:bg-white/5")}>
                  <button className="flex min-w-0 flex-1 items-center gap-2 text-left" onClick={() => select(l.id)}>
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded bg-white/5 text-[10px]">{l.type === "text" ? "T" : "▣"}</span>
                    <span className={cn("truncate", l.visible === false && "text-white/30 line-through")} style={l.type === "text" ? { fontFamily: `"${l.fontFamily}"` } : undefined}>{l.type === "text" ? l.text : l.name || "Image"}</span>
                  </button>
                  <div className="flex shrink-0 items-center opacity-60 group-hover:opacity-100">
                    <button aria-label="Move up" className="px-1 hover:text-blaze" onClick={() => reorder(l.id, "up")}>▲</button>
                    <button aria-label="Move down" className="px-1 hover:text-blaze" onClick={() => reorder(l.id, "down")}>▼</button>
                    <button aria-label={l.visible === false ? "Show" : "Hide"} className="px-1 hover:text-blaze" onClick={() => toggle(l.id, "visible")}>{l.visible === false ? "◌" : "◉"}</button>
                    <button aria-label={l.locked ? "Unlock" : "Lock"} className={cn("px-1 hover:text-blaze", l.locked && "text-blaze")} onClick={() => toggle(l.id, "locked")}>{l.locked ? "■" : "□"}</button>
                    <button aria-label="Delete" className="px-1 hover:text-red-400" onClick={() => remove(l.id)}>✕</button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </section>
  );
}
