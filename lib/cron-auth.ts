import { NextRequest } from "next/server";

/**
 * Protects /api/cron/* routes. Accepts either:
 *   - Authorization: Bearer <CRON_SECRET>   (Vercel Cron sends this)
 *   - ?secret=<CRON_SECRET>                  (convenient for GitHub Actions curl)
 */
export function isAuthorizedCron(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const auth = req.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;
  const qp = req.nextUrl.searchParams.get("secret");
  return qp === secret;
}
