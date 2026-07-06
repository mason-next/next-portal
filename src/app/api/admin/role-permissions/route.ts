import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "@/lib/auth/server";
import { DEFAULT_ROLE_PERMISSIONS, type RolePermissionsConfig } from "@/lib/module-permissions";

const SETTINGS_KEY = "role-permissions:config";

export async function GET() {
  const session = await getServerSession();
  // Any authenticated user can read the config (needed for client-side permission checks).
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const row = await db.appSetting.findUnique({ where: { key: SETTINGS_KEY } });
  const config: RolePermissionsConfig =
    row?.value && typeof row.value === "object"
      ? (row.value as unknown as RolePermissionsConfig)
      : DEFAULT_ROLE_PERMISSIONS;
  return NextResponse.json(config);
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession();
  if (!session || !session.roleTypes.includes("Administrator")) {
    return new NextResponse("Forbidden", { status: 403 });
  }
  const body = (await req.json()) as RolePermissionsConfig;
  await db.appSetting.upsert({
    where: { key: SETTINGS_KEY },
    create: { key: SETTINGS_KEY, value: body as Parameters<typeof db.appSetting.upsert>[0]["create"]["value"] },
    update: { value: body as Parameters<typeof db.appSetting.upsert>[0]["update"]["value"] },
  });
  return NextResponse.json(body);
}
