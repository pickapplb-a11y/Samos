import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export const ok = (data: unknown, init?: ResponseInit) => NextResponse.json(data, init);
export const fail = (status: number, error: string) => NextResponse.json({ error }, { status });

export function handle<A extends unknown[]>(fn: (...a: A) => Promise<Response>) {
  return async (...a: A) => {
    try {
      return await fn(...a);
    } catch (e) {
      if (e instanceof HttpError) return fail(e.status, e.message);
      if (e instanceof SyntaxError) return fail(400, "Malformed request body");
      if (e instanceof ZodError) return fail(422, e.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "));
      console.error(e);
      return fail(500, "Something went wrong");
    }
  };
}
