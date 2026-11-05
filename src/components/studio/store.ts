"use client";

import { create } from "zustand";
import type { Layer } from "@/lib/design/schema";
import { constrainLayer } from "@/lib/design/geometry";
import { zoneUnits, type Style, type ZoneId } from "@/lib/design/zones";

export interface AssetMeta {
  id: string;
  url: string;
  width: number;
  height: number;
  mime: string;
  name?: string;
}

interface Snapshot {
  style: Style;
  colorHex: string;
  colorName: string;
  layers: Layer[];
}

export interface StudioState extends Snapshot {
  designId: string | null;
  name: string;
  productId: string | null;
  baseOverride: number | null;
  selectedId: string | null;
  activeZone: ZoneId;
  assets: Record<string, AssetMeta>;
  past: Snapshot[];
  future: Snapshot[];
  dirty: boolean;
  inGesture: boolean;

  load(s: Partial<Snapshot> & { designId?: string | null; name?: string; productId?: string | null; baseOverride?: number | null; assets?: AssetMeta[] }): void;
  setName(n: string): void;
  setStyle(s: Style): void;
  setColor(hex: string, name: string): void;
  setZone(z: ZoneId): void;
  select(id: string | null): void;
  registerAsset(a: AssetMeta): void;
  addLayer(l: Layer): void;
  updateLayer(id: string, patch: Partial<Layer>): void;
  beginGesture(): void;
  endGesture(): void;
  remove(id: string): void;
  duplicate(id: string): void;
  toggle(id: string, key: "locked" | "visible"): void;
  reorder(id: string, dir: "up" | "down" | "top" | "bottom"): void;
  moveToZone(id: string, zone: ZoneId): void;
  undo(): void;
  redo(): void;
  markSaved(id: string): void;
}

const snap = (s: Snapshot): Snapshot => ({ style: s.style, colorHex: s.colorHex, colorName: s.colorName, layers: s.layers });
const fit = (l: Layer, style: Style) => {
  const { w, h } = zoneUnits(style, l.zone as ZoneId);
  return constrainLayer(l, w, h);
};
export const newId = () => Math.random().toString(36).slice(2, 10);

export const useStudio = create<StudioState>((set, get) => {
  /** Apply a change as one undoable step. */
  const commit = (fn: (s: StudioState) => Partial<StudioState>) =>
    set((s) => {
      const next = fn(s);
      if (s.inGesture) return { ...next, dirty: true };
      return { ...next, past: [...s.past.slice(-79), snap(s)], future: [], dirty: true };
    });

  return {
    style: "OVERSIZED",
    colorHex: "#111111",
    colorName: "Jet Black",
    layers: [],
    designId: null,
    name: "Untitled design",
    productId: null,
    baseOverride: null,
    selectedId: null,
    activeZone: "front",
    assets: {},
    past: [],
    future: [],
    dirty: false,
    inGesture: false,

    load: (s) =>
      set((cur) => ({
        style: s.style ?? cur.style,
        colorHex: s.colorHex ?? cur.colorHex,
        colorName: s.colorName ?? cur.colorName,
        layers: (s.layers ?? cur.layers).map((l) => fit(l, s.style ?? cur.style)),
        designId: s.designId === undefined ? cur.designId : s.designId,
        name: s.name ?? cur.name,
        productId: s.productId === undefined ? cur.productId : s.productId,
        baseOverride: s.baseOverride === undefined ? cur.baseOverride : s.baseOverride,
        assets: { ...cur.assets, ...Object.fromEntries((s.assets ?? []).map((a) => [a.id, a])) },
        past: [],
        future: [],
        selectedId: null,
        dirty: false,
      })),
    setName: (name) => set({ name, dirty: true }),
    setStyle: (style) => commit((s) => ({ style, layers: s.layers.map((l) => fit(l, style)) })),
    setColor: (colorHex, colorName) => commit(() => ({ colorHex, colorName })),
    setZone: (activeZone) => set((s) => ({ activeZone, selectedId: s.layers.find((l) => l.id === s.selectedId)?.zone === activeZone ? s.selectedId : null })),
    select: (selectedId) => {
      const l = get().layers.find((x) => x.id === selectedId);
      set({ selectedId, ...(l ? { activeZone: l.zone as ZoneId } : {}) });
    },
    registerAsset: (a) => set((s) => ({ assets: { ...s.assets, [a.id]: a } })),
    addLayer: (l) => commit((s) => ({ layers: [...s.layers, fit(l, s.style)], selectedId: l.id, activeZone: l.zone as ZoneId })),
    updateLayer: (id, patch) =>
      commit((s) => ({
        layers: s.layers.map((l) => (l.id === id && (!l.locked || "locked" in patch) ? fit({ ...l, ...patch } as Layer, s.style) : l)),
      })),
    beginGesture: () => set((s) => (s.inGesture ? {} : { inGesture: true, past: [...s.past.slice(-79), snap(s)], future: [] })),
    endGesture: () => set({ inGesture: false }),
    remove: (id) => commit((s) => ({ layers: s.layers.filter((l) => l.id !== id), selectedId: s.selectedId === id ? null : s.selectedId })),
    duplicate: (id) =>
      commit((s) => {
        const l = s.layers.find((x) => x.id === id);
        if (!l) return {};
        const copy = fit({ ...l, id: newId(), x: l.x + 40, y: l.y + 40, locked: false, name: l.name ? `${l.name} copy` : undefined } as Layer, s.style);
        const i = s.layers.indexOf(l);
        return { layers: [...s.layers.slice(0, i + 1), copy, ...s.layers.slice(i + 1)], selectedId: copy.id };
      }),
    toggle: (id, key) => commit((s) => ({ layers: s.layers.map((l) => (l.id === id ? ({ ...l, [key]: !(l[key] ?? (key === "visible")) } as Layer) : l)) })),
    reorder: (id, dir) =>
      commit((s) => {
        const arr = [...s.layers];
        const i = arr.findIndex((l) => l.id === id);
        if (i < 0) return {};
        const [l] = arr.splice(i, 1);
        const j = dir === "up" ? Math.min(arr.length, i + 1) : dir === "down" ? Math.max(0, i - 1) : dir === "top" ? arr.length : 0;
        arr.splice(j, 0, l);
        return { layers: arr };
      }),
    moveToZone: (id, zone) =>
      commit((s) => {
        const { w, h } = zoneUnits(s.style, zone);
        return { layers: s.layers.map((l) => (l.id === id ? fit({ ...l, zone, x: w / 2, y: h / 2 } as Layer, s.style) : l)), activeZone: zone };
      }),
    undo: () =>
      set((s) => {
        const prev = s.past[s.past.length - 1];
        if (!prev) return {};
        return { ...prev, past: s.past.slice(0, -1), future: [snap(s), ...s.future], dirty: true, selectedId: prev.layers.some((l) => l.id === s.selectedId) ? s.selectedId : null };
      }),
    redo: () =>
      set((s) => {
        const next = s.future[0];
        if (!next) return {};
        return { ...next, past: [...s.past, snap(s)], future: s.future.slice(1), dirty: true };
      }),
    markSaved: (designId) => set({ designId, dirty: false }),
  };
});
