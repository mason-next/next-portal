import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// Intentionally unauthenticated — email clients (Outlook, Gmail, etc.) fetch linked images
// outside the user's browser session. This endpoint exposes only the avatar binary for a
// given userId; no other user data is returned.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;

  let avatarUrl: string | null = null;
  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { avatarUrl: true },
    });
    avatarUrl = user?.avatarUrl ?? null;
  } catch {
    // DB error — fall through to transparent pixel
  }

  if (!avatarUrl) {
    return transparentPixel();
  }

  // Stored as a data URL: data:<mime>;base64,<data>
  const match = avatarUrl.match(/^data:([^;]+);base64,([\s\S]+)$/);
  if (match) {
    const contentType = match[1];
    const buffer = Buffer.from(match[2], "base64");
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
        "Content-Length": String(buffer.length),
      },
    });
  }

  // Absolute URL stored directly — redirect to it
  if (avatarUrl.startsWith("https://") || avatarUrl.startsWith("http://")) {
    return NextResponse.redirect(avatarUrl);
  }

  return transparentPixel();
}

// 1×1 transparent PNG — returned when a user has no avatar, preventing broken-image icons.
function transparentPixel(): NextResponse {
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
    "base64"
  );
  return new NextResponse(png, {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
