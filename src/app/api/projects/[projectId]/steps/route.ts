import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/server";
import { db } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const session = await getServerSession();
  if (!session) return new NextResponse("Unauthorized", { status: 401 });
  const { projectId } = await params;
  const steps = await db.workflowStep.findMany({
    where: { projectId },
    select: { id: true, name: true },
    orderBy: { sortOrder: "asc" },
  });
  return NextResponse.json(steps);
}
