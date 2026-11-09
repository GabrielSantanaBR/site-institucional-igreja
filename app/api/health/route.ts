import { getD1 } from '../../../db/runtime';
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    await getD1().prepare('SELECT COUNT(*) AS total FROM site_settings').first();
    return Response.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch { return Response.json({ ok: false }, { status: 503, headers: { 'Cache-Control': 'no-store' } }); }
}
