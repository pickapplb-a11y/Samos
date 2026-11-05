import { test } from "node:test";
import assert from "node:assert/strict";
import { constrainLayer, isInside, hitTest } from "../src/lib/design/geometry";
import { priceCustom, deliveryFee, DEFAULT_PRICING } from "../src/lib/design/pricing";
import { designInputSchema, type Layer } from "../src/lib/design/schema";
import { sanitizeSvg } from "../src/lib/uploads";

const img = (o: Partial<Layer> = {}) => ({ id: "a", type: "image", zone: "front", assetId: "x", x: 600, y: 700, width: 400, height: 400, rotation: 0, opacity: 1, locked: false, visible: true, flipX: false, ...o }) as Layer;

test("layers are clamped inside the printable area", () => {
  const l = constrainLayer(img({ x: 1190, y: -50 }), 1200, 1400);
  assert.ok(isInside(l, 1200, 1400));
  assert.equal(l.x, 1000);
  assert.equal(l.y, 200);
});

test("oversized layers are shrunk to fit, rotated bounds respected", () => {
  const l = constrainLayer(img({ width: 3000, height: 1000, rotation: 45 }), 1200, 1400);
  assert.ok(isInside(l, 1200, 1400));
  assert.ok(l.width < 3000);
});

test("hit test respects rotation", () => {
  const l = img({ width: 400, height: 40, rotation: 90 });
  assert.ok(hitTest(l, 600, 880));
  assert.ok(!hitTest(l, 780, 700));
});

test("custom pricing: base + zone fees + extra elements + size", () => {
  const layers = [img(), img({ id: "b" }), img({ id: "c", zone: "back" })];
  const p = priceCustom(DEFAULT_PRICING, { style: "OVERSIZED", layers, size: "XXL" });
  assert.equal(p.total, 6900 + 1200 + 200 + 1500 + 400);
  const hidden = priceCustom(DEFAULT_PRICING, { style: "OVERSIZED", layers: [img({ visible: false })] });
  assert.equal(hidden.total, 6900, "hidden layers are not charged");
});

test("delivery: free over threshold, express always charged", () => {
  assert.equal(deliveryFee(DEFAULT_PRICING, "standard", 20000), 0);
  assert.equal(deliveryFee(DEFAULT_PRICING, "standard", 5000), 600);
  assert.equal(deliveryFee(DEFAULT_PRICING, "express", 20000), 1500);
});

test("design schema rejects unknown fonts and bad colours", () => {
  const base = { name: "x", style: "OVERSIZED", colorHex: "#111111", colorName: "Black" };
  const text = { id: "t", type: "text", zone: "front", x: 100, y: 100, width: 100, height: 50, rotation: 0, text: "Hi", fontSize: 40, color: "#fff" };
  assert.equal(designInputSchema.safeParse({ ...base, layers: [{ ...text, fontFamily: "Comic Sans" }] }).success, false);
  assert.equal(designInputSchema.safeParse({ ...base, layers: [{ ...text, fontFamily: "Anton" }] }).success, false, "3-digit hex rejected");
  assert.equal(designInputSchema.safeParse({ ...base, layers: [{ ...text, fontFamily: "Anton", color: "#FFFFFF" }] }).success, true);
});

test("SVG sanitiser strips scripts, handlers, external refs", () => {
  const out = sanitizeSvg(`<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" onload="alert(1)"><script>alert(1)</script><a href="javascript:alert(1)"><rect width="5" height="5" fill="url(http://evil/x)"/></a><foreignObject><img src="x" onerror="alert(1)"/></foreignObject><image href="http://e/x.png"/><rect fill="url(#ok)" width="1" height="1"/></svg>`);
  for (const bad of ["script", "onload", "onerror", "javascript", "foreignObject", "http://evil", "http://e/", "<image"]) assert.ok(!out.includes(bad), `contains ${bad}`);
  assert.ok(out.includes('url(#ok)'), "local gradient refs kept");
  assert.throws(() => sanitizeSvg(`<?xml version="1.0"?><!DOCTYPE svg [<!ENTITY x "y">]><svg/>`));
});
