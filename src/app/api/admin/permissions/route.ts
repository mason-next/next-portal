import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "@/lib/auth/server";
import { DEFAULT_PERMISSIONS, SETTINGS_KEY } from "@/lib/permissions";
import type { PermissionsConfig } from "@/lib/permissions";

export async function GET() {
  const row = await db.appSetting.findUnique({ where: { key: SETTINGS_KEY } });
  const config: PermissionsConfig = row ? (row.value as PermissionsConfig) : DEFAULT_PERMISSIONS;
  return NextResponse.json(config);
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession();
  if (!session || session.accountType !== "Administrator") {
    return new NextResponse("Forbidden", { status: 403 });
  }
  const body = await req.json() as PermissionsConfig;
  await db.appSetting.upsert({
    where: { key: SETTINGS_KEY },
    create: { key: SETTINGS_KEY, value: body },
    update: { value: body },
  });
  return NextResponse.json(body);
}
