/* End-to-end API flow against a running server (BASE_URL, default http://localhost:3000). */
import { test } from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";

const BASE = process.env.BASE_URL || "http://localhost:3000";
class Client {
  jar = new Map<string, string>();
  async req(path: string, init: RequestInit = {}) {
    const headers = new Headers(init.headers);
    headers.set("origin", BASE);
    if (this.jar.size) headers.set("cookie", [...this.jar].map(([k, v]) => `${k}=${v}`).join("; "));
    const r = await fetch(BASE + path, { ...init, headers, redirect: "manual" });
    for (const c of r.headers.getSetCookie()) {
      const [kv] = c.split(";");
      const [k, ...v] = kv.split("=");
      this.jar.set(k, v.join("="));
    }
    return r;
  }
  json(path: string, body: unknown, method = "POST") {
    return this.req(path, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  }
}

test("full custom-hoodie order flow", async () => {
  const c = new Client();
  const email = `e2e-${Date.now()}@test.local`;
  let r = await c.json("/api/auth/register", { name: "E2E Tester", email, password: "Sup3rSecretPass" });
  assert.equal(r.status, 201, await r.text());

  // upload artwork
  const png = await sharp({ create: { width: 1200, height: 1200, channels: 4, background: { r: 255, g: 107, b: 0, alpha: 1 } } }).png().toBuffer();
  const fd = new FormData();
  fd.append("file", new Blob([new Uint8Array(png)], { type: "image/png" }), "art.png");
  r = await c.req("/api/uploads", { method: "POST", body: fd });
  assert.equal(r.status, 201);
  const { asset } = await r.json();

  // out-of-bounds layer is rejected server-side
  const layer = { id: "l1", type: "image", zone: "front", assetId: asset.id, x: 600, y: 600, width: 600, height: 600, rotation: 0, opacity: 1, locked: false, visible: true, flipX: false };
  r = await c.json("/api/designs", { name: "E2E", style: "OVERSIZED", colorHex: "#111111", colorName: "Jet Black", layers: [{ ...layer, x: 1100 }] });
  assert.equal(r.status, 422);

  r = await c.json("/api/designs", { name: "E2E", style: "OVERSIZED", colorHex: "#111111", colorName: "Jet Black", layers: [layer] });
  const dt = await r.text();
  assert.equal(r.status, 201, dt);
  const { design } = JSON.parse(dt);

  // wrong-size print file is rejected, correct 300 DPI file accepted
  const bad = new FormData();
  bad.append("revision", String(design.revision));
  bad.append("front", new Blob([new Uint8Array(png)], { type: "image/png" }), "front.png");
  assert.equal((await c.req(`/api/designs/${design.id}/renders`, { method: "POST", body: bad })).status, 422);
  const print = await sharp({ create: { width: 3600, height: 4200, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).png().toBuffer();
  const good = new FormData();
  good.append("revision", String(design.revision));
  good.append("front", new Blob([new Uint8Array(print)], { type: "image/png" }), "front.png");
  r = await c.req(`/api/designs/${design.id}/renders`, { method: "POST", body: good });
  assert.equal(r.status, 200, await r.text());

  // server-side quote ignores any client price
  const items = [{ kind: "custom", designId: design.id, revision: design.revision, size: "L", colorHex: "#111111", qty: 2 }];
  r = await c.json("/api/cart/quote", { items, promo: "WELCOME10", delivery: "standard", payment: "COD" });
  const q = await r.json();
  assert.equal(q.items[0].unitPrice, 6900 + 1200);
  assert.equal(q.discount, Math.round(16200 * 0.1));
  assert.equal(q.delivery, 600, "under $150 after discount -> standard delivery charged");
  assert.equal(q.total, 16200 - q.discount + 600 + 300);

  // another user cannot use this design
  const intruder = new Client();
  await intruder.json("/api/auth/register", { name: "Intruder", email: `x-${Date.now()}@test.local`, password: "An0therSecretPass" });
  const iq = await (await intruder.json("/api/cart/quote", { items })).json();
  assert.equal(iq.items.length, 0);
  assert.equal((await intruder.req(`/api/assets/${asset.id}`)).status, 404, "private upload hidden from others");

  // place order
  r = await c.json("/api/orders", { items, promo: "WELCOME10", delivery: "standard", payment: "COD", email, address: { fullName: "E2E Tester", phone: "+1 555 0100", line1: "1 Test St", city: "Testville", country: "USA" } });
  const ot = await r.text();
  assert.equal(r.status, 201, ot);
  const order = JSON.parse(ot);
  assert.match(order.redirect, /^\/orders\/VN-/);
  assert.equal((await c.req(order.redirect)).status, 200);
  assert.equal((await intruder.req(order.redirect.split("?")[0])).status, 404, "order hidden without token");

  // CSRF: cross-origin POST blocked
  const x = await fetch(`${BASE}/api/orders`, { method: "POST", headers: { origin: "https://evil.example", "content-type": "application/json" }, body: "{}" });
  assert.equal(x.status, 403);

  // admin endpoints are protected
  assert.equal((await c.req(`/api/admin/orders/whatever/artwork`)).status, 401);
  const admin = new Client();
  r = await admin.json("/api/auth/login", { email: process.env.SEED_ADMIN_EMAIL || "admin@vanta.local", password: process.env.SEED_ADMIN_PASSWORD || "ChangeMe!2026" });
  assert.equal(r.status, 200);
  assert.equal((await admin.req("/admin/orders")).status, 200);
});
