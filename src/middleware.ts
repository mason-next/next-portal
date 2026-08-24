import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { isMaintenanceMode, isMasterEmail } from "@/lib/auth/maintenance";

const SESSION_COOKIE = "next-portal-session";
const PUBLIC_PATHS = ["/login", "/access-denied", "/api/auth", "/api/health"];

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("AUTH_SECRET environment variable must be set in production");
    }
    return new TextEncoder().encode("dev-secret-change-in-production-min-32-chars");
  }
  return new TextEncoder().encode(secret);
}

interface SessionSnapshot {
  email: string;
  mustChangePassword?: boolean;
}

async function getSession(request: NextRequest): Promise<SessionSnapshot | null> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return {
      email: typeof payload.email === "string" ? payload.email : "",
      mustChangePassword: payload.mustChangePassword === true,
    };
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const maintenance = isMaintenanceMode();

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  if (isPublic) {
    // Redirect authenticated users away from /login (unless they need to change password).
    // During maintenance, only the master account is auto-forwarded into the app.
    if (pathname === "/login") {
      const session = await getSession(request);
      if (
        session &&
        !session.mustChangePassword &&
        (!maintenance || isMasterEmail(session.email))
      ) {
        return NextResponse.redirect(new URL("/projects", request.url));
      }
    }
    return NextResponse.next();
  }

  // Protected route: require a valid session.
  const session = await getSession(request);
  if (!session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Maintenance lockout: reject any session that isn't the master account and clear
  // its cookie, so existing 30-day sessions stop working immediately.
  if (maintenance && !isMasterEmail(session.email)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("locked", "1");
    const res = NextResponse.redirect(loginUrl);
    res.cookies.delete(SESSION_COOKIE);
    return res;
  }

  // If the user must change their password, gate them to /change-password only.
  if (session.mustChangePassword && pathname !== "/change-password") {
    return NextResponse.redirect(new URL("/change-password", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Run on all routes except Next.js internals and static files
  matcher: ["/((?!_next/static|_next/image|favicon.ico|mason-logo.png|.*\\.png$).*)"],
};
