import type { NextRequest } from "next/server";
import type { ZodSchema } from "zod";

type SafeParseResult<T> = { success: true; data: T } | { success: false; response: Response };

export function validateSearchParams<T>(
  req: NextRequest,
  schema: ZodSchema<T>,
): SafeParseResult<T> {
  const params = Object.fromEntries(req.nextUrl.searchParams);
  const result = schema.safeParse(params);
  if (result.success) return { success: true, data: result.data };
  return {
    success: false,
    response: Response.json({ error: result.error.flatten().fieldErrors }, { status: 400 }),
  };
}

export async function validateBody<T>(
  req: NextRequest,
  schema: ZodSchema<T>,
): Promise<SafeParseResult<T>> {
  const body = await req.json();
  const result = schema.safeParse(body);
  if (result.success) return { success: true, data: result.data };
  return {
    success: false,
    response: Response.json({ error: result.error.flatten().fieldErrors }, { status: 400 }),
  };
}

export function validateParams<T>(
  params: Record<string, string>,
  schema: ZodSchema<T>,
): SafeParseResult<T> {
  const result = schema.safeParse(params);
  if (result.success) return { success: true, data: result.data };
  return {
    success: false,
    response: Response.json({ error: result.error.flatten().fieldErrors }, { status: 400 }),
  };
}
