import { NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME } from "../../../../lib/admin-session";

function signOut(request: Request) {
  const response = NextResponse.redirect(new URL("/alteracao-de-dados", request.url), 303);
  response.cookies.set(ADMIN_COOKIE_NAME, "", { httpOnly: true, secure: true, sameSite: "strict", path: "/", maxAge: 0, priority: "high" });
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function GET(request: Request) { return signOut(request); }
export async function POST(request: Request) { return signOut(request); }
