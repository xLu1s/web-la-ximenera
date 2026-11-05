export const json = (data: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers } });

export async function readBody(request: Request): Promise<Record<string, unknown>> {
  const ct = request.headers.get('content-type') ?? '';
  if (ct.includes('application/json')) {
    try { const b = await request.json(); return b && typeof b === 'object' ? (b as Record<string, unknown>) : {}; } catch { return {}; }
  }
  if (ct.includes('form')) {
    const fd = await request.formData();
    const o: Record<string, unknown> = {};
    fd.forEach((v, k) => { o[k] = typeof v === 'string' ? v : ''; });
    return o;
  }
  return {};
}

export const siteOrigin = (request: Request, configured: string) => configured || new URL(request.url).origin;
