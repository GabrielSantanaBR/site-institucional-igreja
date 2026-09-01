import { NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME } from "../../../../lib/admin-session";
import { rejectCrossSiteMutation } from "../../../../lib/request-security";

function signOut(request: Request) {
  const response = NextResponse.redirect(new URL("/alteracao-de-dados", request.url), 303);
  response.cookies.set(ADMIN_COOKIE_NAME, "", { httpOnly: true, secure: true, sameSite: "strict", path: "/", maxAge: 0, priority: "high" });
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function POST(request: Request) {
  const rejected = rejectCrossSiteMutation(request);
  if (rejected) return rejected;
  return signOut(request);
}

export async function GET() {
  return Response.json({ error: "Método não permitido." }, {
    status: 405,
    headers: { "Allow": "POST", "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow, noarchive" },
  });
}
