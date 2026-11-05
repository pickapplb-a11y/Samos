import "server-only";
import sharp from "sharp";
import DOMPurify from "isomorphic-dompurify";
import { randomBytes } from "crypto";
import { db } from "./db";
import { putObject } from "./storage";
import { HttpError } from "./http";
import type { AssetKind } from "@prisma/client";

export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
export const MIN_PRINT_PX = 600; // warn below this on the long edge

function sniff(buf: Buffer): "image/png" | "image/jpeg" | "image/svg+xml" | null {
  if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  const head = buf.subarray(0, 1024).toString("utf8").replace(/^﻿/, "").trimStart();
  if (/^(<\?xml[^>]*>\s*)?(<!--[\s\S]*?-->\s*)*(<!DOCTYPE svg[^>]*>\s*)?<svg[\s>]/i.test(head)) return "image/svg+xml";
  return null;
}

/** Strip scripts, event handlers, foreignObject and any external references from an SVG. */
export function sanitizeSvg(svg: string) {
  if (/<!ENTITY/i.test(svg)) throw new HttpError(415, "SVG entities are not allowed");
  const clean = DOMPurify.sanitize(svg, {
    USE_PROFILES: { svg: true, svgFilters: true },
    FORBID_TAGS: ["script", "foreignObject", "iframe", "embed", "object", "use", "image", "a", "style", "animate", "set", "animateTransform", "animateMotion"],
    // No external references at all: href/xlink:href are dropped (url(#local) fills are kept below).
    FORBID_ATTR: ["style", "href", "xlink:href"],
  });
  if (!/^<svg[\s>]/i.test(clean.trim())) throw new HttpError(415, "SVG could not be sanitized");
  // Belt and braces: no url() references to anything other than local fragments.
  return clean.replace(/url\(\s*(['"]?)(?!#)[^)]*\)/gi, "none");
}

export async function storeImage(opts: {
  data: Buffer;
  kind: AssetKind;
  ownerId?: string | null;
  guestId?: string | null;
  allowSvg?: boolean;
  meta?: Record<string, unknown>;
}) {
  if (opts.data.length > MAX_UPLOAD_BYTES) throw new HttpError(413, "File too large (max 15 MB)");
  const type = sniff(opts.data);
  if (!type || (type === "image/svg+xml" && !opts.allowSvg)) throw new HttpError(415, "Only PNG, JPG or SVG files are supported");

  let body: Buffer;
  let mime = type;
  let width: number | undefined;
  let height: number | undefined;

  if (type === "image/svg+xml") {
    const clean = sanitizeSvg(opts.data.toString("utf8"));
    body = Buffer.from(clean, "utf8");
    const m = await sharp(body).metadata().catch(() => null);
    if (!m?.width || !m?.height) throw new HttpError(415, "SVG has no usable dimensions");
    width = m.width;
    height = m.height;
  } else {
    // Decode and re-encode rasters: strips metadata/EXIF and neutralises polyglot files.
    const img = sharp(opts.data, { limitInputPixels: 80_000_000 }).rotate();
    const m = await img.metadata().catch(() => null);
    if (!m?.width || !m?.height) throw new HttpError(415, "Image could not be decoded");
    if (m.width > 8000 || m.height > 8000) throw new HttpError(413, "Image dimensions too large (max 8000px)");
    body = type === "image/png" || m.hasAlpha ? await img.png({ compressionLevel: 8 }).toBuffer() : await img.jpeg({ quality: 92 }).toBuffer();
    mime = type === "image/png" || m.hasAlpha ? "image/png" : "image/jpeg";
    const after = await sharp(body).metadata();
    width = after.width;
    height = after.height;
  }

  const ext = { "image/png": "png", "image/jpeg": "jpg", "image/svg+xml": "svg" }[mime];
  const key = `${opts.kind.toLowerCase()}/${new Date().toISOString().slice(0, 7)}/${randomBytes(16).toString("hex")}.${ext}`;
  await putObject(key, body, mime);
  return db.asset.create({
    data: { key, kind: opts.kind, mime, size: body.length, width, height, ownerId: opts.ownerId ?? null, guestId: opts.ownerId ? null : opts.guestId ?? null, meta: (opts.meta ?? undefined) as object | undefined },
  });
}
